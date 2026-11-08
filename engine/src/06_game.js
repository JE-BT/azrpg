// =============================================================================================
// 06_game.js · Alpha 7: the game.
//   The clock is a number. A step adds its hours at once (terrain, transport, weather, the dark);
//   choices that take time add theirs; standing still costs nothing. The renderer reads the clock.
//   The map's journey is a line of checkpoints with tasks; 32_quests shows them as a quest log.
//   Journeys of every kind share one system (34_scene): a booked passage (the captain steers) or
//   a journey you plan yourself (you walk, ride or sail on your own; Space pauses with options).
// =============================================================================================
AZ.DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

AZ.Game = class {
  constructor(w, ren, ui, jr, store) {
    this.w = w; this.ren = ren; this.ui = ui; this.jr = jr; this.store = store;
    this.held = []; this.anim = null; this.s = null; this.fast = false; this._later = []; this._speech = [];
    this.walkSpeed = (w.W.transports.find(t => t.name === "On foot (light)") || { speed: 5 }).speed;
    // harbours for every class of vessel; towns that are not ports still have a landing for skiffs and boats
    this.harbourAt = new Map();
    for (const b of w.P.burgs) if (b) for (const cls of AZ.WATER_NAV || ["boat", "ship"]) {
      if (!b.port && cls !== "skiff" && cls !== "boat") continue;
      const h = w.harbour(b, cls);
      if (h && !this.harbourAt.has(w.idx(h.t[0], h.t[1]))) this.harbourAt.set(w.idx(h.t[0], h.t[1]), b);
    }
    ren.piers = new Set(this.harbourAt.keys());
    if (ren.cache) ren.cache.clear();
  }
  get key() { return `azrpg7:${this.w.P.world.seed}:${this.jr ? this.jr.J.name : "free"}`; }

  // ------------------------------------------------------------------ state
  fresh(seed, kindId, doy0 = 80, start = null) {
    const w = this.w, jr = this.jr;
    AZ.Clock.doy0 = doy0;
    if (jr) { jr.replan(); jr.fixCourses(); }
    const t0 = jr ? jr.t0 : 6;
    const home = jr ? jr.origin.burg : w.P.burgs[start] || w.P.burgs.find(b => b && b.capital);
    const tile = jr ? jr.origin.tile : home.t;
    this.tv = AZ.makeTraveller(w, jr, seed, kindId, home ? home.i : null);
    this.know = new AZ.Know(w, jr, this.tv);
    this.events = new AZ.Events(this);
    this.s = { seed, kind: this.tv.kind, doy0, start: home ? home.i : null, c: tile[0], r: tile[1], dir: "down", aboard: false, vessel: null, voyage: null,
      clock: t0, lastDay: Math.floor(t0 / 24), cp: 1, cpRec: [{ arrive: t0, acts: {} }], log: [],
      seen: { m: [], u: [], b: [], z: [], st: [], cu: [], re: [], bi: [] }, waypoint: null, auto: false, autoPath: null, trip: null, region: "", done: false };
    this.backfill();
    const s = this.s;
    s.purse = this.tv.purse; s.sup = { food: this.tv.food ?? 3 }; s.goods = {}; s.basis = {};
    if (this.tv.cargo != null && home) { s.flags.cargo = true; s.goods[this.tv.cargo] = 4; try { s.basis[this.tv.cargo] = AZ.Prices.goodPrice(w, home, this.tv.cargo) || 1; } catch (e) { s.basis[this.tv.cargo] = 1; } }
    if (this.tv.boat && home && w.harbour(home, "boat") && this.newVessel) s.vessel = this.newVessel("boat", "owned", home, 3);
    this.explored = new Uint8Array(Math.ceil((w.cols * w.rows) / 8));
    this.reveal();
    // the company forms at the journey's gathering, if it has one; otherwise it sets out with you
    if (jr && this.formParty && !jr.cps.some(cp => cp.acts.some(a => a.id === "gather"))) this.formParty(home, true);
    if (this.tv.thread) this.startThread(this.tv.thread, true);
  }
  backfill() {
    const s = this.s;
    const def = { purse: 10, stand: { f: {}, s: {} }, cond: {}, flags: {}, threads: [], leads: [], done_m: [], done_z: [], sup: { food: 3 }, hunger: 0, taken: [], goods: {}, basis: {}, awake: 0, met: [], party: [], said: {}, track: null };
    for (const [k, v] of Object.entries(def)) if (s[k] === undefined) s[k] = JSON.parse(JSON.stringify(v));
    if (!(s.vessel && s.vessel.damaged)) delete s.cond.damaged;
    s.tvFaith = this.tv.faith;
  }
  saveGame() {
    if (!this.s) return false;
    const runs = [];
    for (let i = 0; i < this.explored.length;) { let j = i; while (j < this.explored.length && this.explored[j] === this.explored[i] && j - i < 65535) j++; runs.push(this.explored[i], j - i); i = j; }
    try {
      this.store.setItem(this.key, JSON.stringify({ v: 7, s: this.s, ex: runs }));
      this.store.setItem(`azrpg7:last:${this.w.P.world.seed}`, JSON.stringify(this.jr ? this.w.P.journeys.indexOf(this.jr.J) : -1));
      return true;
    } catch (e) { return false; }
  }
  loadGame() {
    let data = null;
    try { data = JSON.parse(this.store.getItem(this.key) || "null"); } catch (e) { data = null; }
    if (!data || !data.s) return false;
    this.s = data.s;
    AZ.Clock.doy0 = this.s.doy0 ?? 80;
    if (this.jr) { this.jr.replan(); this.jr.fixCourses(); }
    this.tv = AZ.makeTraveller(this.w, this.jr, this.s.seed, this.s.kind, this.s.start);
    this.know = new AZ.Know(this.w, this.jr, this.tv);
    this.events = new AZ.Events(this);
    this.backfill();
    Object.assign(this.s, { auto: false, autoPath: null, trip: null }); // a journey under way stops on loading
    this.explored = new Uint8Array(Math.ceil((this.w.cols * this.w.rows) / 8));
    let o = 0;
    for (let k = 0; k < data.ex.length; k += 2) { this.explored.fill(data.ex[k], o, o + data.ex[k + 1]); o += data.ex[k + 1]; }
    return true;
  }
  hasSave() { try { return !!this.store.getItem(this.key); } catch (e) { return false; } }
  log(html, cls = "") { this.s.log.push({ t: this.s.clock, html, cls }); if (this.s.log.length > 500) this.s.log.shift(); }
  later(f) { this._later.push(f); }
  lat() { return this.w.latlon(this.s.c, this.s.r)[0]; }
  burgHere() { const id = this.w.idx(this.s.c, this.s.r); return this.w.burgAt.get(id) || (this.s.aboard ? this.harbourAt.get(id) : null) || null; }
  weather() { return AZ.Weather.at(this.w, this.s.c, this.s.r, this.s.clock); }
  started() { this._steps = 0; this.dirty = true; this.s.region = ""; this.afterStep(); }

  // ------------------------------------------------------------------ checkpoints: the quest steps
  cpNext() { return this.jr && !this.s.done ? this.jr.cps[this.s.cp] || null : null; }
  cpHere() {
    if (!this.jr) return null;
    for (let k = this.s.cp - 1; k >= 0; k--) if (this.atCp(this.jr.cps[k], 2)) return this.jr.cps[k];
    return null;
  }
  atCp(cp, rad = 1) {
    const s = this.s, w = this.w;
    if (cp.place.burg && cp.place.at) return this.burgHere() === cp.place.burg;
    return Math.abs(s.c - cp.tile[0]) <= rad && Math.abs(s.r - cp.tile[1]) <= rad && w.isLand(s.c, s.r) === w.isLand(...cp.tile);
  }
  checkCheckpoints() {
    const s = this.s, jr = this.jr, U = AZ.U, w = this.w;
    if (!jr || s.done) return;
    for (let k = s.cp; k < jr.cps.length; k++) {
      const cp = jr.cps[k];
      // the next checkpoint counts when you reach it; a later one only if you go into its town
      if (k > s.cp && !(cp.place.burg && cp.place.at && (this.inTownOf === cp.place.burg || w.burgAt.get(w.idx(s.c, s.r)) === cp.place.burg))) continue;
      if (!this.atCp(cp, 1)) continue;
      for (let j = s.cp; j < k; j++) { s.cpRec[j] = { skipped: true, acts: {} }; this.log(`Passed by: ${U.esc(jr.cps[j].place.name)}.`, "hook"); }
      s.cpRec[k] = { arrive: s.clock, acts: {} };
      s.cp = k + 1;
      this.log(`Reached ${U.esc(cp.place.name)}, ${AZ.Clock.fmt(s.clock)}.`, "hook");
      if (k === jr.cps.length - 1) { this.finish(); return; }
      const acts = cp.acts.map(a => a.label);
      this.ui.toast(`<b class="hook">Quest updated.</b> ${U.esc(cp.place.name)}${acts.length ? `: ${U.esc(acts.join("; "))}` : ""}.`, "gold");
      this.saveGame();
      return;
    }
  }
  doAct(id, where) {
    const s = this.s, cp = this.cpHere();
    if (!cp) return null;
    const act = cp.acts.find(a => a.id === id);
    if (!act) return null;
    const rec = s.cpRec[cp.i] = s.cpRec[cp.i] || { acts: {} };
    rec.acts = rec.acts || {};
    if (rec.acts[id]) return null;
    rec.acts[id] = s.clock;
    this.log(`★ ${AZ.U.esc(act.label)} (${AZ.U.esc(cp.place.name)}).`, "hook");
    if (id === "alms" && where) {
      const rel = this.w.C.religion[where.cell], destRel = this.w.C.religion[this.jr.segs[this.jr.segs.length - 1].to];
      if (rel === destRel) this.events.fx({ stand: [["f", rel, 1]] }, "A rite of the journey.");
    }
    this.dirty = true;
    return act;
  }
  pendingActs(b) {
    const cp = this.cpHere();
    if (!cp || (b && cp.place.burg !== b)) return [];
    const rec = this.s.cpRec[cp.i] || { acts: {} };
    return cp.acts.filter(a => !(rec.acts || {})[a.id]);
  }
  async finish() {
    const s = this.s, U = AZ.U, jr = this.jr;
    s.done = true; this.saveGame();
    const acts = jr.cps.reduce((a, cp) => a + cp.acts.length, 0), done = s.cpRec.reduce((a, r) => a + Object.keys(r?.acts || {}).length, 0);
    const skipped = s.cpRec.filter(r => r && r.skipped).length, plan = Math.floor(jr.planEnd / 24) + 1, day = Math.floor(s.clock / 24) + 1;
    await this.ui.say([`<b class="hook">${U.esc(jr.J.name)}: the ${AZ.noun(jr)} is complete.</b> ${U.esc(this.tv.name)} reaches ${U.esc(jr.dest.name)} on day ${day}. The plan reckoned day ${plan} ${AZ.T("mixed")}.`,
      `Tasks of the plan done: ${done} of ${acts}${skipped ? `; stops passed by: ${skipped}` : ""}. Side quests finished: ${s.threads.filter(t => t.outcome === "done").length}. Purse: 🟡 ${U.rn(s.purse, 1)}. The world goes on: explore as you please.`]);
  }

  // ------------------------------------------------------------------ movement
  passable(c, r) {
    const w = this.w, s = this.s;
    if (!w.inb(c, r)) return { ok: false, why: "The edge of the known world." };
    if (this.riding()) return { ok: false, why: "You are a passenger. Space for the options." };
    if (s.aboard && s.vessel) {
      if (w.navigable(c, r, s.vessel.cls)) return { ok: true };
      return { ok: false, why: w.isLand(c, r) ? (w.bits(c, r).river ? `Too shallow for a ${s.vessel.kind.toLowerCase()}.` : "Land ahead. Space to go ashore; she waits.") : "Shoal water." };
    }
    const v = s.vessel;
    if (v && v.c === c && v.r === r) return { ok: true, board: true };
    if (!w.isLand(c, r)) return { ok: false, why: "Too deep to wade. You need a boat." };
    const B = w.bits(c, r);
    if (B.river && !B.road && !B.trail && !w.burgAt.has(w.idx(c, r))) {
      const rv = w.river(c, r);
      if ((rv?.discharge || 0) >= 1500 * (AZ.Clock.season(w.latlon(c, r)[0], s.clock) === "spring" ? 0.6 : 1)) return { ok: false, why: `The ${rv.name} is too wide and fast to ford here. Find a bridge (a road crosses it) or a boat.` };
    }
    return { ok: true };
  }
  legFor(c, r) { // the plan's leg whose course this tile is on (steps along it cost the course's own miles)
    if (!this.jr) return null;
    const i = this.w.idx(c, r);
    return this.jr.segs.find(sg => sg.moving && sg.chainPos && sg.chainPos.has(i)) || null;
  }
  stepHours(c, r, dc, dr) {
    const w = this.w, U = AZ.U, s = this.s, lat = w.latlon(c, r)[0], wx = AZ.Weather.at(w, c, r, s.clock);
    if (this.riding() || (s.aboard && s.vessel)) {
      const v = this.riding() ? s.voyage : s.vessel, wd = v.mode === "land" ? null : w.wind(lat);
      let f = 1;
      if (wd != null) { const hd = Math.atan2(dc, -dr), wr = (wd * Math.PI) / 180; f = 1 + 0.1 * Math.cos(hd - wr); }
      let miles = w.miles;
      const seg = this.legFor(c, r);
      if (seg) { const a = seg.chainPos.get(w.idx(s.c, s.r)), b = seg.chainPos.get(w.idx(c, r)); if (a !== undefined && b !== undefined && Math.abs(a - b) === 1) miles = seg.miles / Math.max(1, seg.chain.length - 1); }
      else if (s.auto && s.autoPath && s.autoPath.mps) miles = s.autoPath.mps;
      if (this.riding()) miles = s.voyage.milesPerStep || miles;
      return (miles / v.speed / f) * wx.sail * (!this.riding() && s.vessel && s.vessel.damaged ? AZ.COND.damaged.slow : 1);
    }
    const cell = w.cell(c, r), b = w.P.biomes[w.C.biome[cell]], B = w.bits(c, r);
    let f = B.road ? 0.8 : B.trail ? 1 : U.clamp((b.cost || 50) / 50, 1, 4);
    const rel = w.reliefAt(c, r);
    if (rel && !B.road) f *= /mount/i.test(rel.icon) ? 1.6 : 1.2;
    let h = ((s.auto && s.autoPath && s.autoPath.mps ? s.autoPath.mps : w.miles) / this.walkSpeed) * f * wx.walk;
    if (B.river && !B.road && !B.trail) { const q = w.river(c, r)?.discharge || 0; h += q < 100 ? 0.5 : q < 500 ? 1.5 : 3; }
    if (this.tv.trait === "long-legged") h /= 1.15;
    if (AZ.Clock.light(s.clock, lat).phase === "night") h *= 1.5;
    for (const k of Object.keys(s.cond)) if (AZ.COND[k]?.slow && k !== "damaged") h *= this.tv.trait === "hardy" && /hungry|starving|fever|gravely/.test(k) ? 1 + (AZ.COND[k].slow - 1) / 2 : AZ.COND[k].slow;
    return h;
  }
  tryMove(dir, forced) {
    if (this.anim || this.ui.busy() || !this.s) return false;
    const [dc, dr] = AZ.DIRS[dir], s = this.s, U = AZ.U;
    s.dir = dir;
    const c = s.c + dc, r = s.r + dr, p = forced ? { ok: true } : this.passable(c, r);
    if (!p.ok) {
      if (s.auto) { const t = s.trip; s.auto = false; s.trip = null; s.autoPath = null; this.ui.toast(`The journey${t ? ` to ${U.esc(t.name)}` : ""} stops here: ${p.why}`); return false; }
      if (this._lastWhy !== p.why || performance.now() - (this._whyT || 0) > 2500) { this.ui.toast(p.why); this._lastWhy = p.why; this._whyT = performance.now(); }
      return false;
    }
    const hours = this.stepHours(c, r, dc, dr), auto = s.auto;
    this.anim = { from: [s.c, s.r], to: [c, r], t0: performance.now(), dur: auto || forced ? (this.fast ? 24 : 70) : s.aboard ? 110 : 140 };
    s.c = c; s.r = r; s.clock += hours;
    this.awakeTick(hours);
    if (s.aboard && s.vessel && !s.voyage) { s.vessel.c = c; s.vessel.r = r; s.vessel.anchored = false; }
    if (p.board) { s.aboard = true; this.ui.toast(`Aboard the ${U.esc(s.vessel.kind.toLowerCase())}.`); }
    this.afterStep();
    // stepping into a town opens it; a journey under way passes through, unless the town is its end
    const b = this.burgHere();
    if (b && !forced) {
      if (!auto) this.later(() => this.town(b));
      else if (!(s.trip && s.trip.bi === b.i)) this.ui.toast(`Passing ${U.esc(b.name)}.`);
    }
    return true;
  }
  afterStep() {
    const s = this.s, w = this.w, U = AZ.U, T = AZ.T;
    this.reveal();
    const cell = w.cell(s.c, s.r), id = w.idx(s.c, s.r);
    const b = w.burgAt.get(id), hb = s.aboard ? this.harbourAt.get(id) : null;
    let key, title, sub;
    if (b || hb) { const x = b || hb; key = "b" + x.i; title = hb && !b ? `${x.name} harbour` : x.name; sub = `${U.cap(x.group.replace("_", " "))} · ${w.P.states[x.state]?.fullName || "unclaimed"}`; }
    else if (w.isLand(s.c, s.r)) {
      const st = w.C.state[cell], pv = w.C.province[cell];
      key = `l${st}:${pv}`; title = pv ? w.P.provinces[pv].fullName : st ? w.P.states[st].fullName : "Neutral lands";
      sub = `${st ? w.P.states[st].fullName + " · " : ""}${w.P.cultures[w.C.culture[cell]].name} · ${w.P.religions[w.C.religion[cell]].name}`;
    } else { key = "f" + w.C.feature[cell]; title = w.waterName(s.c, s.r); sub = this.riding() ? `aboard ${s.voyage.ship}` : s.aboard && s.vessel ? s.vessel.kind : ""; }
    if (key !== s.region) { s.region = key; this.ui.banner(U.esc(title), U.esc(sub)); }
    const addSeen = (k, v) => { if (v != null && !s.seen[k].includes(v)) { s.seen[k].push(v); return true; } return false; };
    if (w.isLand(s.c, s.r)) { addSeen("st", w.C.state[cell]); addSeen("cu", w.C.culture[cell]); addSeen("re", w.C.religion[cell]); addSeen("bi", w.C.biome[cell]); }
    if ((b || hb) && addSeen("b", (b || hb).i)) this.log(`Reached ${U.esc((b || hb).name)} (${(b || hb).group}).`);
    for (const n of w.near(s.c, s.r, this.know.sightTiles(s.c, s.r, s.aboard))) {
      if (n.kind === "marker" && addSeen("m", n.o.i)) {
        this.addLead({ key: "m" + n.o.i, name: n.o.name, type: n.o.type, t: n.o.t, from: "sighted" });
        this.ui.toast(`Sighted <b class="side">${U.esc(n.o.name)}</b>, ${this.know.dirDist(s.c, s.r, n.o.t).txt} ${T("data")}`, "teal");
        this.log(`Sighted ${U.esc(n.o.name)} (${n.o.type}).`, "side");
      } else if (n.kind === "unit" && addSeen("u", `${n.o.state}:${n.o.i}`)) {
        this.ui.toast(`${n.o.naval ? "Sails" : "Tents"}: the ${U.esc(n.o.name)} of ${U.esc(w.P.states[n.o.state].name)}, ${this.know.dirDist(s.c, s.r, n.o.t).txt} ${T("data")}`, "teal");
        this.log(`Sighted the ${U.esc(n.o.name)} of ${U.esc(w.P.states[n.o.state].name)}.`, "side");
      }
    }
    if (s.waypoint && Math.abs(s.waypoint[0] - s.c) <= 1 && Math.abs(s.waypoint[1] - s.r) <= 1 && !s.auto) { s.waypoint = null; this.ui.toast("You reach the place you marked."); }
    const legNow = this.cpNext()?.legIn, kNow = legNow && legNow.chainPos ? legNow.chainPos.get(id) : undefined;
    if (kNow !== undefined && (!s.prog || s.prog.cp !== s.cp || kNow > s.prog.k)) s.prog = { cp: s.cp, k: kNow };
    this.checkCheckpoints();
    if (this.events) this.events.onStep();
    this.dirty = true;
    this._steps = (this._steps || 0) + 1;
    if (this._steps % 25 === 0) this.saveGame();
  }
  reveal() {
    const s = this.s, w = this.w, R = this.know ? this.know.sightTiles(s.c, s.r, s.aboard) : 4;
    for (let dr = -R; dr <= R; dr++) for (let dc = -R; dc <= R; dc++) {
      if (dc * dc + dr * dr > R * R) continue;
      const c = s.c + dc, r = s.r + dr;
      if (!w.inb(c, r)) continue;
      const i = w.idx(c, r);
      this.explored[i >> 3] |= 1 << (i & 7);
    }
  }
  isExplored(i) { return (this.explored[i >> 3] >> (i & 7)) & 1; }

  // ------------------------------------------------------------------ the course of a journey you lead
  // setAuto(true) is how the crew's own calls (make for harbour, a promised port) divert you: it
  // becomes a journey to the place in s.waypoint. Journeys you plan start in 34_scene (setOut).
  setAuto(on) {
    const s = this.s;
    if (!on) { s.auto = false; this.dirty = true; return; }
    if (s.waypoint) { const nb = this.w.near(s.waypoint[0], s.waypoint[1], 3).find(n => n.kind === "burg"); s.trip = { name: nb ? nb.o.name : "the place you marked", tile: s.waypoint.slice(), bi: nb ? nb.o.i : null, t0: s.clock, from: [s.c, s.r] }; }
    const path = this.planAuto();
    if (!path || path.length < 2) { s.trip = null; this.ui.toast("There is no way there from here."); return; }
    s.autoPath = path; this._autoK = 0; s.auto = true; this.dirty = true;
  }
  planAuto() {
    const s = this.s, w = this.w, here = [s.c, s.r], t = s.trip, goal = t ? t.tile : s.waypoint;
    if (s.aboard && s.vessel) {
      const cls = s.vessel.cls;
      if (!goal || (t && t.plan)) return this.followPlan(cls);
      let g = goal;
      if (!w.navigable(...g, cls)) { const b = w.near(g[0], g[1], 8).find(n => n.kind === "burg" && (n.o.port || cls === "air" || cls === "boat" || cls === "skiff")); const h = b && w.harbour(b.o, cls); g = h ? h.t : null; }
      return g ? w.waterPath(here, g, cls) : null;
    }
    if (!s.aboard && goal) {
      if (!w.isLand(...goal)) return null;
      return w.withMiles(w.path(here, goal, (c, r) => w.isLand(c, r), { limit: 400000, cost: (c, r) => { const B = w.bits(c, r); return B.road ? 0.6 : B.trail ? 0.8 : AZ.U.clamp((w.P.biomes[w.C.biome[w.cell(c, r)]].cost || 50) / 50, 1, 4); } }));
    }
    return null;
  }
  // the plan's course to the next checkpoint (the gold line), joined at the nearest usable point at
  // or beyond the furthest already reached on this leg; stretches she cannot use are bridged by water
  followPlan(cls) {
    const s = this.s, w = this.w, here = [s.c, s.r], cp = this.cpNext();
    if (!cp) return null;
    const goal = cp.place.burg && cp.place.at ? w.harbour(cp.place.burg, cls)?.t : cp.tile;
    const direct = () => (goal ? w.waterPath(here, goal, cls) : null);
    const seg = cp.legIn, ch = seg && seg.chain;
    if (!ch || !ch.length) return direct();
    const nav = (c, r) => w.navigable(c, r, cls);
    const usable = i => nav(ch[i][0], ch[i][1]) && w.sameWater(here, ch[i], cls);
    const k0 = seg.chainPos ? seg.chainPos.get(w.idx(s.c, s.r)) : undefined;
    let join = k0 !== undefined && usable(k0) ? k0 : -1;
    const from = s.prog && s.prog.cp === s.cp ? s.prog.k : 0;
    for (const lo of join < 0 ? [from, 0] : []) {
      let bd = Infinity;
      for (let i = lo; i < ch.length; i++) { const d = (ch[i][0] - s.c) ** 2 + (ch[i][1] - s.r) ** 2; if (d < bd && usable(i)) { bd = d; join = i; } }
      if (join >= 0) break;
    }
    if (join < 0) return direct();
    const out = join === k0 ? [here] : w.path(here, ch[join], nav, { limit: 400000, greed: 1.2 });
    if (!out) return direct();
    for (let i = join + 1; i < ch.length; i++) {
      const t = ch[i], last = out[out.length - 1];
      if (!nav(t[0], t[1]) || (last[0] === t[0] && last[1] === t[1])) continue;
      if (Math.abs(last[0] - t[0]) + Math.abs(last[1] - t[1]) === 1) { out.push(t); continue; }
      const p = w.path(last, t, nav, { limit: 60000 });
      if (p) out.push(...p.slice(1));
    }
    const last = out[out.length - 1];
    if (goal && (last[0] !== goal[0] || last[1] !== goal[1])) { const p = w.waterPath(last, goal, cls); if (p) out.push(...p.slice(1)); }
    return w.withMiles(out);
  }
  autoDir() {
    const s = this.s, p = s.autoPath;
    if (!p || !p.length) return null;
    let k = -1;
    for (let i = Math.max(0, (this._autoK || 0) - 2); i < Math.min(p.length, (this._autoK || 0) + 6); i++) if (p[i][0] === s.c && p[i][1] === s.r) { k = i; break; }
    if (k < 0) k = p.findIndex(([c, r]) => c === s.c && r === s.r);
    if (k < 0) { const np = this.planAuto(); s.autoPath = np; this._autoK = 0; return np && np.length > 1 ? this.autoDir() : null; }
    this._autoK = k;
    const t = p[k + 1];
    if (!t) return null;
    for (const [d, [dc, dr]] of Object.entries(AZ.DIRS)) if (s.c + dc === t[0] && s.r + dr === t[1]) return d;
    return null;
  }
  autoDone() {
    const s = this.s, t = s.trip;
    s.auto = false; s.autoPath = null; s.trip = null; this.fast = false; this.dirty = true;
    if (t && this.tripArrived) this.tripArrived(t);
  }

  // ------------------------------------------------------------------ Space: whatever is here
  async interact() {
    const s = this.s;
    if (this.riding()) return this.rideMenu();
    if (s.auto && s.trip) return this.tripMenu();
    const b = this.burgHere();
    if (b) return this.town(b);
    if (s.aboard && s.vessel) return this.helmMenu();
    return this.fieldMenu();
  }

  // ------------------------------------------------------------------ the loop
  update(now) {
    const s = this.s;
    if (this.anim && now - this.anim.t0 >= this.anim.dur) this.anim = null;
    if (this.anim || this.ui.busy()) return;
    this.tick();
    if (this.ui.busy()) return;
    if (this._later.length) { this._later.shift()(); return; }
    if (this._speech.length) { this.ui.say(this._speech.splice(0), this.voiceName()); return; }
    if (this.riding()) { if (s.voyage.state === "sea") this.voyageStep(); return; }
    if (s.auto) { const d = this.autoDir(); if (d) this.tryMove(d); else this.autoDone(); return; }
    if (this.held.length) this.tryMove(this.held[this.held.length - 1]);
  }
  draw(now) {
    const s = this.s;
    let cx = s.c, cy = s.r;
    if (this.anim) { const t = Math.min(1, (now - this.anim.t0) / this.anim.dur); cx = this.anim.from[0] + (this.anim.to[0] - this.anim.from[0]) * t; cy = this.anim.from[1] + (this.anim.to[1] - this.anim.from[1]) * t; }
    const frame = this.anim ? 1 + (Math.floor(now / 120) % 2) : 0, sprites = [], art = this.ren.art;
    if (this.sim) for (const r of this.sim.regs) if (r.a > 200 && Math.abs(r.t[0] - s.c) < 45 && Math.abs(r.t[1] - s.r) < 28) sprites.push({ img: art.unit({ state: r.state, naval: false }), c: r.t[0], r: r.t[1] });
    if (s.vessel && !(s.aboard && !this.riding())) sprites.push({ img: this.vesselArt(s.vessel, "left"), c: s.vessel.c, r: s.vessel.r });
    if (s.voyage && !this.riding() && s.voyage.state === "port" && s.voyage.at) sprites.push({ img: art.vessel(s.voyage.mode === "land" ? "wagon" : "ship", "left"), c: s.voyage.at[0], r: s.voyage.at[1] });
    const face = s.dir === "left" ? "left" : "right";
    const me = this.riding() ? art.vessel(s.voyage.mode === "land" ? "wagon" : "ship", face) : s.aboard && s.vessel ? this.vesselArt(s.vessel, face) : art.walker(s.dir, frame, this.tv.pal);
    sprites.push({ img: me, c: cx, r: cy });
    const obj = this.objective ? this.objective() : null, leg = this.cpNext()?.legIn;
    this.ren.draw({ camX: cx + 0.5, camY: cy + 0.5, sprites, lens: AZ.LENSES[0], light: AZ.Clock.light(s.clock, this.lat()),
      course: s.voyage && s.voyage.course ? s.voyage.course : leg ? leg.chain : null, goal: obj && obj.tile, waypoint: s.waypoint, time: now,
      weather: this.weather().kind, nights: leg && leg.nights ? leg.nights.map(n => n.tile) : null, path: s.auto && !s.voyage ? s.autoPath : null });
    if (now - (this._pf || 0) > 60) { this._pf = now; this.ren.prefetch(cx + 0.5, cy + 0.5); }
  }
  frame(now) {
    if (!this.s) return;
    this.update(now);
    this.draw(now);
    if (this.dirty) { this.dirty = false; if (this.hud) this.hud(); }
  }
};
