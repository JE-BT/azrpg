// =============================================================================================
// 34_scene.js · Alpha 7: journeys and scenes.
//   One journey system. A journey is booked (a passage on a ship, a coach, the company's airship:
//   the captain or driver steers and keeps an itinerary) or planned by you (F: you choose where to,
//   and you walk, ride or sail there on your own; your crew sails the course). Starting and ending
//   a journey is a scene: the viewing window fills the screen, like a battle in old games, and the
//   captain, mate or a companion speaks. On the way the world map watches you move; Space pauses
//   with the options of the journey (talk, supplies, wait, stop or get off at the next port).
//   Also here: Space on foot (the field menu) and aboard your own vessel (the helm), Look (L),
//   and events that fire when you walk up to a marked place.
// =============================================================================================
(() => {
  const G = AZ.Game.prototype, U = AZ.U, T = AZ.T;
  const span = h => AZ.Clock.span(Math.max(0, h));
  const days = h => (h < 30 ? `${Math.max(1, Math.round(h))} hours` : `${Math.round(h / 24 * 2) / 2} days`);

  // ------------------------------------------------------------------ the scene: the viewing window fills the screen
  G.scene = async function (label, fn, force) {
    const doc = typeof document !== "undefined" ? document : null, el = doc && doc.getElementById("scene");
    if (!el || this.ui.sceneOn) return fn();
    const ui = this.ui, cv = doc.getElementById("scene-cv"), lab = doc.getElementById("scene-label");
    ui.sceneOn = true; this._sceneForce = force || null;
    const draw = () => { const p = this.windowParams(); if (this._sceneForce) p.scene = this._sceneForce; AZ.ViewWin.draw(cv, p); lab.textContent = label || p.label; };
    draw();
    el.classList.add("on"); doc.body.classList.add("in-scene");
    const iv = setInterval(draw, 120);
    try { return await fn(); }
    finally { clearInterval(iv); el.classList.remove("on"); doc.body.classList.remove("in-scene"); ui.sceneOn = false; this._sceneForce = null; this.dirty = true; }
  };

  // ------------------------------------------------------------------ booked journeys: casting off, port calls, arrival
  G.voyageEta = function () {
    const s = this.s, v = s.voyage, w = this.w, P = w.P;
    if (!v) return null;
    let miles = v.course && v.state === "sea" ? Math.max(0, v.course.length - 1 - v.pos) * (v.milesPerStep || w.miles) : 0, stays = 0;
    let prev = v.state === "sea" ? v.stops[v.leg].b : v.portBurg;
    for (let i = v.state === "sea" ? v.leg + 1 : v.leg; i < v.stops.length; i++) {
      const A = P.burgs[prev], B = P.burgs[v.stops[i].b];
      if (A && B) miles += Math.hypot(A.t[0] - B.t[0], A.t[1] - B.t[1]) * w.miles * 1.2;
      if (i > v.leg || v.state !== "sea") stays += i < v.stops.length - 1 ? v.stops[i].stay || 0 : 0;
      prev = v.stops[i].b;
    }
    if (v.state === "sea" && v.leg < v.stops.length - 1) stays += v.stops[v.leg].stay || 0;
    const hours = (miles / (v.speed || 10)) * (v.hpd >= 24 ? 1 : 24 / (v.hpd || 12)) + stays + (v.state === "port" ? Math.max(0, v.departAt - s.clock) : 0);
    return { miles, hours, arrive: s.clock + hours };
  };
  const role = v => (v.mode === "land" ? "driver" : v.mode === "air" ? "pilot" : "master");
  G.departScene = async function () {
    const s = this.s, v = s.voyage, w = this.w;
    if (!v) return;
    const who = `${U.esc(v.captain)} · ${role(v)}`, dest = v.stops[v.stops.length - 1], eta = this.voyageEta(), land = v.mode === "land";
    const label = land ? `Aboard ${v.ship}` : v.mode === "air" ? `The rail of ${v.ship}` : `The deck of ${v.ship}`;
    let say = `“${land ? "Up you get" : "Welcome aboard"}. ${U.cap(U.esc(v.ship))}, bound for ${U.esc(dest.name)}${v.stops.length > 1 ? `, calling at ${v.stops.slice(0, -1).map(x => U.esc(x.name)).join(", ")}` : ""}. With fair ${land ? "roads" : "winds"}, ${days(eta.hours)}: we should be there ${AZ.dayWords(eta.arrive).toLowerCase()}.” ${T("mixed")}`;
    await this.scene(label, async () => {
      for (;;) {
        const k = await this.ui.choose(say, [
          { label: "Ask about the route", desc: "The itinerary, the flag and the cargo." },
          { label: "Ask about food", desc: "Whether your rations will last." },
          { label: land ? "Ask about the road" : "Ask about the way", desc: "Weather, and what lies near the course." },
          { label: "That is all", desc: "Watch the world go by. Press Space under way for the options." }], { cancel: 3, who });
        if (k === 3) break;
        if (k === 0) say = `“We fly the flag of ${U.esc(w.P.states[v.flag]?.fullName || "no state")}. ${U.cap(U.esc(v.why || "We have a cargo to land"))}.” Itinerary: ${v.stops.map((x, i) => `${i < v.leg ? "<s>" : ""}${U.esc(x.name)}${x.stay ? ` (${x.stay} h in port)` : ""}${i < v.leg ? "</s>" : ""}`).join(" → ")} ${T("mixed")}.`;
        if (k === 1) { const need = Math.ceil(eta.hours / 24) * this.eaters(); say = `“${v.role === "crew" ? "You eat with the crew." : "Passengers feed themselves."} Reckon ${Math.ceil(eta.hours / 24)} days: ${need} rations.” You carry ${s.sup.food}${s.sup.food < need && v.role !== "crew" ? ": <b class=\"late\">not enough</b>. The cook sells at sea prices" : ""} ${T("mixed")}.`; }
        if (k === 2) {
          const hz = new Map();
          for (const [c, r] of (v.course || []).filter((_, i) => i % 3 === 0)) for (const n of w.near(c, r, 3)) if (n.kind === "marker" && /pirate|monster|brigand/.test(n.o.type)) hz.set(n.o.i, n.o);
          const lat = this.lat(), season = AZ.Clock.season(lat, s.clock);
          say = `“It is ${season}. ${hz.size ? `We pass near ${[...hz.values()].slice(0, 3).map(m => U.esc(m.name)).join(", ")}; I will decide what we do about it.` : "Nothing on this course worries me."}${land ? ` We stop each night: ${v.hpd} hours a day on the road.` : ""}” ${T("data")}`;
        }
      }
    });
  };
  const depart7 = G.depart;
  G.depart = function () {
    const s = this.s, v0 = s.voyage, r = depart7.call(this), v = s.voyage;
    if (v && v === v0 && v.state === "sea" && this.riding()) {
      if (!v.greeted) { v.greeted = true; this.departScene(); }
      else this.ui.toast(`${U.cap(U.esc(v.ship))} sets out again for ${U.esc(v.stops[v.leg].name)}.`);
    }
    return r;
  };
  G.dock = async function () {
    const s = this.s, v = s.voyage, w = this.w;
    const stop = v.stops[v.leg], b = w.P.burgs[stop.b], who = `${U.esc(v.captain)} · ${role(v)}`;
    v.state = "port"; v.at = [s.c, s.r]; v.portBurg = b.i; v.course = null; v.boarded = true;
    if (this._toPort) { this._toPort = false; this.fast = false; }
    v.leg++;
    this.log(`${U.cap(U.esc(v.ship))} came in to ${U.esc(b.name)}.`);
    if (v.leg >= v.stops.length || v.leaveAt === v.leg - 1) {
      const end = v.leg >= v.stops.length;
      s.voyage = null; s.aboard = false; s.c = b.t[0]; s.r = b.t[1]; this.anim = null; this.fast = false;
      if (v.role === "crew" && v.earned) s.purse = U.rn(s.purse + v.earned, 2);
      await this.scene(`${b.name}`, () => this.ui.say(`“${end ? `${U.esc(b.name)}, and the end of our road` : `${U.esc(b.name)}: this is where you leave us`}. Fair travels.”${v.role === "crew" && v.earned ? ` You are paid off: 🟡 ${v.earned}.` : ""}`, who), v.mode === "land" ? "town" : "quay");
      this.afterStep();
      this.later(() => this.town(b));
      return;
    }
    v.departAt = s.clock + stop.stay;
    this.afterStep();
    await this.scene(`${b.name}`, async () => {
      const k = await this.ui.choose(`“We lie in ${U.esc(b.name)} until ${AZ.Clock.fmt(v.departAt)}, ${stop.stay} hours. Be aboard by then: we do not wait.”`,
        [{ label: "Wait aboard until she sails", detail: `${stop.stay} h` }, { label: `Go ashore into ${U.esc(b.name)}`, detail: `back by ${AZ.hhmm(v.departAt)}` }], { cancel: 0, who });
      if (k === 1) { s.aboard = false; v.boarded = false; s.c = b.t[0]; s.r = b.t[1]; this.anim = null; this.afterStep(); this.later(() => this.town(b)); }
      else s.clock = v.departAt;
    }, "quay");
  };
  // Space under way, or waiting aboard in port
  G.rideMenu = async function () {
    const s = this.s, v = s.voyage, w = this.w, atSea = v.state === "sea", who = `${U.esc(v.captain)} · ${role(v)}`;
    const next = v.stops[v.leg], eta = this.voyageEta(), more = v.leg < v.stops.length - 1;
    const opts = [{ label: `Talk to ${U.esc(v.captain)}`, detail: role(v), act: "cap" }, { label: "Talk to the other passengers", detail: "1 h", act: "pax" }, { label: "Check your supplies", act: "sup" }];
    if (atSea) {
      opts.push({ label: "Rest three hours", detail: "the journey goes on", act: 3 }, { label: "Sleep until dawn", act: "dawn" }, { label: `Let the days pass until ${U.esc(next.name)}`, act: "port" });
      if (more) opts.push({ label: v.leaveAt === v.leg ? `Stay aboard past ${U.esc(next.name)}` : `Get off at ${U.esc(next.name)}`, detail: v.leaveAt === v.leg ? "you meant to get off" : "the next port", act: "off" });
      opts.push({ label: this.fast ? "Watch at the usual pace" : "Let the days pass quickly", act: "pace" });
    } else opts.push({ label: "Wait aboard until she sails", detail: span(v.departAt - s.clock), act: "wait" }, { label: `Go ashore into ${U.esc(w.P.burgs[v.portBurg].name)}`, detail: `back by ${AZ.hhmm(v.departAt)}`, act: "ashore" });
    opts.push({ label: "Carry on", act: "back" });
    const k = await this.ui.choose(`Bound for <b>${U.esc(next ? next.name : "?")}</b> · about ${days(eta.hours)} to the end of the journey · ${AZ.Clock.fmt(s.clock)}`, opts, { cancel: opts.length - 1, title: U.cap(U.esc(v.ship)), sub: `${v.role} · ${U.esc(v.transport || (v.mode === "land" ? "coach" : v.mode === "air" ? "airship" : "ship"))}` });
    const o = opts[k];
    if (o.act === "cap") return this.ui.say(`“${U.cap(U.esc(v.why || "We have a cargo to land"))}. ${next ? `Next is ${U.esc(next.name)}` : ""}; the end of the road ${AZ.dayWords(eta.arrive).toLowerCase()}, if all goes well.” ${T("mixed")}`, who);
    if (o.act === "pax") { const rm = this.know.rumour(s.c, s.r, U.rng(`${s.seed}:pax:${Math.floor(s.clock / 24)}`), this); s.clock += 1; return this.ui.say(rm ? `A fellow passenger: “${rm}` : "They are travel-sick and say nothing."); }
    if (o.act === "sup") { const need = Math.ceil(eta.hours / 24) * this.eaters(); return this.ui.say(`You carry ${s.sup.food} rations and 🟡 ${U.rn(s.purse, 1)}. To the end of the journey, reckon ${need} rations${v.role === "crew" ? "; the ship feeds its crew" : ""} ${T("mixed")}.`); }
    if (o.act === 3) { this.advanceVoyage(3); this.slept(); return; }
    if (o.act === "dawn") { this.advanceVoyage(Math.max(1, AZ.Clock.nextDawn(s.clock, this.lat()) - s.clock)); this.slept(); return; }
    if (o.act === "port") { this.fast = true; this._toPort = true; return; }
    if (o.act === "off") { v.leaveAt = v.leaveAt === v.leg ? null : v.leg; return this.ui.toast(v.leaveAt === v.leg ? `You will get off at ${U.esc(next.name)}.` : "You stay aboard."); }
    if (o.act === "pace") { this.fast = !this.fast; return; }
    if (o.act === "wait") { s.clock = v.departAt; this.dirty = true; return; }
    if (o.act === "ashore") { const b = w.P.burgs[v.portBurg]; s.aboard = false; v.boarded = false; s.c = b.t[0]; s.r = b.t[1]; this.anim = null; this.afterStep(); this.later(() => this.town(b)); }
  };

  // ------------------------------------------------------------------ journeys you plan yourself
  G.journeyPlanner = async function (pre) {
    const s = this.s, w = this.w, vessel = s.aboard && s.vessel ? s.vessel : null, opts = [];
    if (this.riding()) return this.rideMenu();
    const add = (label, dest, cls, desc) => { if (dest.tile[0] === s.c && dest.tile[1] === s.r) return; opts.push({ label, detail: this.know.dirDist(s.c, s.r, dest.tile).txt, cls, desc, dest }); };
    if (pre) add(U.esc(pre.name), pre, "", "The place you chose.");
    const cp = this.cpNext(), obj = this.objective();
    if (cp) add(`The journey's next stop: ${U.esc(cp.place.name)}`, { tile: cp.tile, name: cp.place.name, bi: cp.place.at && cp.place.burg ? cp.place.burg.i : null, plan: !!vessel }, "hook", vessel ? "Your crew follows the plan's course, the gold line." : "The shortest way on foot.");
    const th = this.trackedThread();
    if (th) { const tg = this.threadTarget(th); if (tg.tile) add(`Your quest: ${U.esc(th.title)}`, { tile: tg.tile, name: tg.name, bi: tg.burg ? tg.burg.i : null }, "side", U.esc(th.steps[th.phase].text)); }
    if (s.waypoint) add("The place you marked on the map", { tile: s.waypoint, name: "the place you marked", bi: null }, "side");
    for (const b of s.seen.b.map(i => w.P.burgs[i]).filter(b => b && !(obj && obj.burg === b)).sort((a, c) => Math.hypot(a.t[0] - s.c, a.t[1] - s.r) - Math.hypot(c.t[0] - s.c, c.t[1] - s.r)).slice(0, 8))
      add(U.esc(b.name), { tile: b.t, name: b.name, bi: b.i }, "", `${U.cap(b.group)} of ${U.esc(w.P.states[b.state]?.fullName || "unclaimed land")}: you have been there.`);
    opts.push({ label: "Choose a place on the map", map: true, desc: "The map opens: move the cursor and press Enter." }, { label: "Not now" });
    const k = await this.ui.choose(vessel ? `Your ${U.esc(vessel.kind.toLowerCase())}${vessel.crew ? ` and ${vessel.crew} hands` : ""} await your word.` : "Where to? You walk on your own until you arrive or stop (Space).", opts, { cancel: opts.length - 1, title: vessel ? "Set a course" : "Plan a journey" });
    const o = opts[k];
    if (o.map) return this.openMenu("map");
    if (o.dest) return this.setOut(o.dest);
  };
  G.tripEstimate = function (path) {
    const s = this.s, w = this.w, v = s.aboard && s.vessel;
    let h = 0;
    const save = [s.c, s.r];
    for (let i = 1; i < path.length && i < 4000; i++) { const [c, r] = path[i]; h += this.stepHours(c, r, c - path[i - 1][0], r - path[i - 1][1]); s.c = c; s.r = r; }
    [s.c, s.r] = save;
    const hpd = v ? (this.keepsWatches(v) ? 24 : Math.min(v.hpd || 12, 14)) : 9;
    return { hours: h, miles: (path.length - 1) * (path.mps || w.miles), hpd, days: h / hpd };
  };
  G.setOut = async function (dest) {
    const s = this.s, w = this.w, v = s.aboard && s.vessel ? s.vessel : null;
    s.trip = { ...dest, t0: s.clock, from: [s.c, s.r] };
    const path = this.planAuto();
    s.trip = null;
    if (!path || path.length < 2) return this.ui.say(v ? `There is no way by water from here to ${U.esc(dest.name)} for a ${U.esc(v.kind.toLowerCase())}.` : `There is no way on foot from here to ${U.esc(dest.name)}.${w.isLand(...dest.tile) ? "" : " It lies on the water."} Across the sea, book a passage or take a vessel.`);
    const est = this.tripEstimate(path), eat = this.eaters(), need = Math.ceil(est.days) * eat;
    const who = v ? (v.crew ? `The mate of the ${U.esc(v.kind.toLowerCase())}` : this.voiceName()) : this.voiceName();
    const self = !v && !s.party.length;
    const words = `${U.esc(dest.name)}: about ${U.num(Math.round(est.miles / 5) * 5)} miles, ${days(est.hours)} of ${v ? "sailing" : "walking"}; ${est.hpd >= 24 ? "round the clock, in watches" : `at ${est.hpd} hours a day, call it ${Math.max(1, Math.round(est.days))} days`}. ${s.sup.food >= need ? `The food will last: ${s.sup.food} rations, ${need} needed.` : `<b class="late">The food will not last: ${s.sup.food} rations, ${need} needed.</b>`}`;
    const k = await this.scene(v ? `Aboard your ${v.kind.toLowerCase()}` : "Setting out", () => this.ui.choose(self ? `<i>${words}</i>` : `“${words}” ${T("mixed")}`,
      [{ label: "Set out", desc: "Space on the way pauses: camp, check supplies, stop." }, { label: "Set out, and let the days pass quickly" }, { label: "Not now" }], { cancel: 2, who }));
    if (k === 2) return;
    s.trip = { ...dest, t0: s.clock, from: [s.c, s.r] };
    s.autoPath = path; this._autoK = 0; s.auto = true; this.fast = k === 1; this.dirty = true;
    this.log(`Set out for ${U.esc(dest.name)}${v ? ` in the ${U.esc(v.kind.toLowerCase())}` : ""}.`);
  };
  G.resumeTrip = function () {
    const s = this.s;
    if (!s.trip) return;
    const p = this.planAuto();
    if (p && p.length > 1) { s.autoPath = p; this._autoK = 0; s.auto = true; } else s.trip = null;
    this.dirty = true;
  };
  G.stopTrip = function (why) { const s = this.s; if (!s.auto) return; s.auto = false; s.trip = null; s.autoPath = null; this.fast = false; if (why) this.ui.toast(why); this.dirty = true; };
  G.tripMenu = async function () {
    const s = this.s, t = s.trip, v = s.aboard && s.vessel, left = s.autoPath ? Math.max(0, s.autoPath.length - 1 - (this._autoK || 0)) : 0;
    const opts = [{ label: "Carry on", act: "go" }, { label: this.fast ? "Travel at the usual pace" : "Let the days pass quickly", act: "pace" },
      { label: v ? "Anchor until dawn, then go on" : "Make camp until dawn, then go on", act: "camp" }, { label: "Check your supplies", act: "sup" }];
    if (s.party.length) opts.push({ label: `Talk to ${U.esc(s.party[0].name)}`, detail: s.party[0].role, act: "talk" });
    opts.push({ label: "Stop here", desc: "The journey ends here; plan another at any time (F).", act: "stop" });
    const k = await this.ui.choose(`Bound for <b>${U.esc(t.name)}</b> · about ${U.num(Math.round(left * (s.autoPath?.mps || this.w.miles) / 5) * 5)} mi to go · ${AZ.Clock.fmt(s.clock)}`, opts, { cancel: 0, title: "On the way" });
    const o = opts[k];
    if (o.act === "pace") this.fast = !this.fast;
    if (o.act === "camp") { if (v) { s.clock = AZ.Clock.nextDawn(s.clock, this.lat()); this.slept(); v.anchored = true; this.ui.toast("At anchor until dawn."); } else await this.campNight(); this.resumeTrip(); }
    if (o.act === "sup") await this.ui.say(`You carry ${s.sup.food} rations: ${Math.floor(s.sup.food / this.eaters())} days for ${this.eaters() === 1 ? "you" : `${this.eaters()} mouths`}. Purse 🟡 ${U.rn(s.purse, 1)}.`);
    if (o.act === "talk") await this.ui.say(this.questHelp({ role: s.party[0].role }, { t: [s.c, s.r], i: -1, cell: this.w.cell(s.c, s.r) }, { tile: t.tile, name: t.name }), this.voiceName());
    if (o.act === "stop") this.stopTrip(`You stop. ${U.esc(t.name)} is ${this.know.dirDist(s.c, s.r, t.tile).txt}.`);
  };
  G.tripArrived = async function (t) {
    const s = this.s, b = this.burgHere(), near = Math.hypot(s.c - t.tile[0], s.r - t.tile[1]) <= 2 || (b && b.i === t.bi);
    const label = b ? (s.aboard ? `${b.name} harbour` : `${b.name}`) : s.aboard ? "At anchor" : "Journey's end";
    await this.scene(label, () => this.ui.say(`${near ? "You reach" : "You come as near as you can to"} ${U.esc(t.name)}, ${span(s.clock - t.t0)} after setting out.`, this.voiceName()));
    if (b) this.later(() => this.town(b));
  };

  // ------------------------------------------------------------------ Space at the helm, and on foot
  G.helmMenu = async function () {
    const s = this.s, w = this.w, v = s.vessel, [dc, dr] = AZ.DIRS[s.dir];
    const land = [[s.c + dc, s.r + dr], [s.c, s.r - 1], [s.c + 1, s.r], [s.c, s.r + 1], [s.c - 1, s.r]].find(t => w.isLand(...t) && !w.navigable(...t, v.cls));
    const opts = [{ label: "Set a course", detail: "F", act: "trip", desc: "Your crew sails to a place you choose; Space on the way pauses." }];
    if (land) opts.push({ label: "Go ashore here", act: "ashore" });
    opts.push({ label: "Anchor, wait or fish", detail: "R", act: "rest" }, { label: "The crew", act: "crew" }, { label: "Take the helm", desc: "Steer her yourself with the arrow keys.", act: "back" });
    const k = await this.ui.choose("", opts, { cancel: opts.length - 1, title: `Your ${U.esc(v.kind.toLowerCase())}`, sub: `${v.mode} · ${v.crew} hands · morale ${Math.round(v.morale ?? 70)}${v.damaged ? " · damaged" : ""}` });
    const o = opts[k];
    if (o.act === "trip") return this.journeyPlanner();
    if (o.act === "ashore") return this.goAshore(land);
    if (o.act === "rest") return this.rest();
    if (o.act === "crew") return this.ui.say(`${v.crew} hands; morale ${Math.round(v.morale ?? 70)}${v.strikes ? `, strikes ${v.strikes} of 3` : ""}. Wages 🟡 ${U.rn(v.crew * (v.wage || 0) + (v.hire || 0), 2)} a day${v.owed ? `; owed 🟡 ${v.owed}` : ""}. They ${this.keepsWatches(v) ? "sail round the clock in watches" : `sail ${v.hpd} hours a day and call for a stop at dusk`} ${T("mixed")}.`, "The mate");
  };
  G.fieldMenu = async function () {
    const s = this.s, w = this.w, opts = [];
    const ms = w.near(s.c, s.r, 1.5).filter(n => n.kind === "marker");
    for (const n of ms) opts.push({ label: U.esc(n.o.name), detail: n.o.type, cls: "side", act: "marker", m: n.o });
    if (s.vessel && Math.abs(s.vessel.c - s.c) + Math.abs(s.vessel.r - s.r) <= 1) opts.push({ label: `Board your ${U.esc(s.vessel.kind.toLowerCase())}`, cls: "hook", act: "board" });
    opts.push({ label: "Plan a journey", detail: "F", act: "trip", desc: "Choose where to; you walk there on your own." });
    opts.push({ label: "Camp, wait, fish or forage", detail: "R", act: "rest" }, { label: "Look around", detail: "L", act: "look" });
    for (const p of s.party) opts.push({ label: `Talk to ${U.esc(p.name)}`, detail: p.role, act: "talk", p });
    opts.push({ label: "Back", act: "back" });
    const k = await this.ui.choose("", opts, { cancel: opts.length - 1, title: U.esc(w.isLand(s.c, s.r) ? this.know.regionName(w.cell(s.c, s.r)) : w.waterName(s.c, s.r)), sub: `${AZ.Clock.fmt(s.clock)} · ${this.weather().label}` });
    const o = opts[k];
    if (o.act === "marker") return this.events.marker(o.m, false);
    if (o.act === "board") { s.aboard = true; s.c = s.vessel.c; s.r = s.vessel.r; this.anim = null; this.afterStep(); return; }
    if (o.act === "trip") return this.journeyPlanner();
    if (o.act === "rest") return this.rest();
    if (o.act === "look") return this.lookAround();
    if (o.act === "talk") {
      const obj = this.objective(), who = `${U.esc(o.p.name)} · ${U.esc(o.p.role)}`;
      return this.ui.say(obj && obj.tile ? [`“${U.esc(obj.text.replace(/^[★→◆]\s*/, ""))}: that is what we are about.”`, ...this.questHelp({ role: o.p.role }, { t: [s.c, s.r], i: -1, cell: w.cell(s.c, s.r) }, obj)] : "“Where you lead, we follow.”", who);
    }
  };
  // L: the tile, and how long a step takes each way
  G.lookAround = async function () {
    const s = this.s, w = this.w, steps = Object.entries(AZ.DIRS).map(([d, [dc, dr]]) => {
      const p = this.passable(s.c + dc, s.r + dr), arrow = { up: "↑", down: "↓", left: "←", right: "→" }[d];
      return p.ok ? `${arrow} ${U.rn(this.stepHours(s.c + dc, s.r + dr, dc, dr), 1)} h` : `${arrow} no way`;
    });
    const k = await this.ui.choose(`${this.know.describe(s.c, s.r, s.aboard).join(" ")}<br><span class="dim">One step: ${steps.join(" · ")} ${T("mixed")}</span>`, [{ label: "Survey every layer of the map here", desc: "The tile report: land, realm, settlement, economy, what lies near." }, { label: "Close" }], { cancel: 1, title: "Look around", wide: true });
    if (k === 0) await this.ui.say(this.know.inspect(s.c, s.r, this), "Survey");
  };

  // ------------------------------------------------------------------ arrivals aboard, the dark, and marked places
  const after7 = G.afterStep;
  G.afterStep = function (...a) {
    after7.apply(this, a);
    const s = this.s;
    if (!s) return;
    const own = !!(s.aboard && s.vessel && !this.riding());
    if (own && !this._wasOwn && s.vessel.crew > 0 && !s.auto) this.later(() => this.helmScene());
    this._wasOwn = own;
    if (!s.aboard && !s.auto && !this.burgHere()) {
      const sun = AZ.Clock.sun(s.clock, this.lat());
      if (sun.dl < 24 && sun.hour >= sun.set - 0.5 && sun.hour < sun.set + 1.5) this.speak("The light is going. I should find a place to camp.", `dusk${sun.day}`, "It is getting dark. We should make camp.");
    }
  };
  G.helmScene = async function () {
    const s = this.s, v = s.vessel;
    if (!v || !s.aboard) return;
    const k = await this.scene(`Aboard your ${v.kind.toLowerCase()}`, () => this.ui.choose(`“${v.crew} hands aboard and ready. Where do we sail?” ${T("new")}`,
      [{ label: "Set a course", desc: "Choose where to; the crew sails her there." }, { label: "I will take the helm", desc: "Steer her yourself with the arrow keys." }], { cancel: 1, who: "The mate" }));
    if (k === 0) await this.journeyPlanner();
  };
  // events at marked places, in zones and aboard play as scenes, like an encounter in an old game
  const scene0 = AZ.Events.prototype.scene;
  AZ.Events.prototype.scene = function (head, body, options, key) {
    const label = String(head).replace(/<span class="tag[^>]*>[^<]*<\/span>/g, "").replace(/<[^>]+>/g, "").trim();
    return this.g.scene(label, () => scene0.call(this, head, body, options, key));
  };
  AZ.Events.prototype.onStep = async function () {
    const g = this.g, s = this.s, w = this.w;
    if (g.riding() && !s.voyage) return;
    const cell = w.cell(s.c, s.r);
    for (const z of w.zonesOfCell(cell)) if (!s.done_z.includes(z.i)) { s.done_z.push(z.i); g.later(() => this.zone(z)); return; }
    for (const n of w.near(s.c, s.r, 3)) {
      if (n.kind !== "marker" || s.done_m.includes(n.o.i)) continue;
      const M = AZ.MARKERS[n.o.type];
      if (M && M.auto) { if (n.d > (M.radius ?? 2) || (M.sea && !s.aboard) || (M.land && s.aboard)) continue; }
      else if (n.d > 1.01 || s.aboard) continue;
      s.done_m.push(n.o.i);
      g.later(() => this.marker(n.o, true));
      return;
    }
  };
})();
