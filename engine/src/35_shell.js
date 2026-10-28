// =============================================================================================
// 35_shell.js · Alpha 6: five screens in a frame that never changes.
//   Memory (1) what the character knows · Inventory (2) what he carries · World (3) the tiles, and
//   zoomed out the mental map · Journey (4) the leg, the vehicle and the viewing window · Story (5)
//   events and the people and places open to you, with the planning window. The frame: the next stop
//   and its par and the side story in focus at the top; the clock, the pace, food and purse, and the
//   screen buttons at the bottom. Decisions arrive as a card over whichever screen is open.
// =============================================================================================
(() => {
  const G = AZ.Game.prototype, U = AZ.U, T = AZ.T;
  const $ = id => (typeof document !== "undefined" ? document.getElementById(id) : null);
  const span = h => AZ.Clock.span(Math.max(0, h));
  const tod = h => (h < 4 ? "night" : h < 7 ? "early morning" : h < 11 ? "morning" : h < 13 ? "midday" : h < 16 ? "afternoon" : h < 18 ? "late afternoon" : h < 21 ? "evening" : "night");
  AZ.dayWords = t => `Day ${Math.floor(t / 24) + 1}, ${tod(((t % 24) + 24) % 24)}`;
  const HEAD = { up: "north", down: "south", left: "west", right: "east" };
  const OPP = { up: "down", down: "up", left: "right", right: "left" };
  const SCREENS = ["memory", "inventory", "story", "world", "journey"];
  const latStr = lat => `${U.rn(Math.abs(lat), 1)}°${lat >= 0 ? "N" : "S"}`;
  const hhmm = h => { h = ((h % 24) + 24) % 24; const hh = Math.floor(h), mm = Math.floor((h - hh) * 60); return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`; };

  // ------------------------------------------------------------------ screens
  G.showScreen = function (name) {
    if (!this.a6 || !SCREENS.includes(name)) return;
    if (name === "journey" && !this.s) return;
    this.screen = name;
    document.body.dataset.screen = name;
    document.querySelectorAll("#tabs [data-scr]").forEach(b => b.classList.toggle("on", b.dataset.scr === name));
    const card = $("world-card"); if (card) card.classList.remove("on");
    this.renderScreen(true);
    this.dirty = true;
    if (this.layoutVars) this.layoutVars();
  };
  G.renderScreen = function (force) {
    if (!this.s) return;
    const scr = this.screen;
    const keep = el => { const y = el ? el.scrollTop : 0; return () => { if (el) el.scrollTop = y; }; };
    if (scr === "journey") { const el = $("j-body"), r = keep(el); el.innerHTML = this.journeyBody(); r(); this.wireLinks(el); }
    else if (scr === "memory" && (force || this.feedDirty)) { const el = $("mem-body"), r = keep(el); el.innerHTML = this.memoryHtml(); r(); this.wireLinks(el); }
    else if (scr === "inventory") { const el = $("inv-body"), r = keep(el); el.innerHTML = this.inventoryHtml(); r(); this.wireLinks(el); }
    else if (scr === "story") this.renderStory();
    this.feedDirty = false;
  };
  // links inside a screen: targets on World, pastimes, actions
  G.wireLinks = function (el) {
    if (!el) return;
    el.querySelectorAll("[data-goto]").forEach(a => (a.onclick = () => { const [c, r] = a.dataset.goto.split(",").map(Number); this.s.waypoint = [c, r]; this.feedPush({ k: "routine", html: `Target set: ${U.esc(a.dataset.name || "a place")}.` }); this.showScreen("world"); }));
    el.querySelectorAll("[data-past]").forEach(a => (a.onclick = () => this.pastime(a.dataset.past)));
    el.querySelectorAll("[data-focus]").forEach(a => (a.onclick = () => { const th = this.s.threads.find(x => String(x.id) === a.dataset.focus); if (!th) return; this.s.focus = th.id; const t = this.threadGoal ? this.threadGoal(th) : null; if (t) this.s.waypoint = [t[0], t[1]]; this.dirty = true; this.renderScreen(true); }));
  };

  // ------------------------------------------------------------------ the frame
  G.layoutVars = function () {
    const top = $("top"), bot = $("bottom");
    if (!top || !bot) return;
    const r = document.documentElement.style;
    r.setProperty("--topH", `${Math.round(top.getBoundingClientRect().height + 16)}px`);
    r.setProperty("--botH", `${Math.round(bot.getBoundingClientRect().height + 16)}px`);
  };
  const hud5 = G.hud;
  G.hud = function () {
    if (!this.a6) return hud5.call(this);
    const s = this.s, w = this.w;
    if (!s) return;
    this.topHud(); this.clockHud(); this.locHud(); this.chipsHud(); this.stripHud(); this.toolsHud(); this.tickerHud();
    const th = ($("top") || {}).offsetHeight || 0, bh = ($("bottom") || {}).offsetHeight || 0;
    if (th !== this._th || bh !== this._bh) { this._th = th; this._bh = bh; this.layoutVars(); }
    const lens = AZ.LENSES[this.lensIdx], el = this.ui.el, cell = w.cell(s.c, s.r);
    if (lens.id !== "none") { el.legend.style.display = "block"; el.legend.innerHTML = `<b>${lens.name}</b> (L)<br>${U.esc(lens.label(w, cell, s.c, s.r) ?? "")}`; } else el.legend.style.display = "none";
    if (this.inspectOn) el.panel.innerHTML = this.know.inspect(s.c, s.r, this) + `<p class="dim">I to close · tags: ${T("data")} file ${T("mixed")} rule on data ${T("new")} invented</p>`;
    if (this.screen !== "world") this.renderScreen(false);
  };
  G.topHud = function () {
    const s = this.s, jr = this.jr, el = this.ui.el.trip, side = $("top-side");
    let h = "";
    if (jr && this.mode !== "sandbox") {
      const next = this.cpNext();
      if (s.done) h = `<div class="lbl">${U.esc(jr.J.name)}</div><div class="big">The journey is complete</div><div class="dim">The report card and the record are in Memory (1).</div>`;
      else if (next) {
        const dd = this.know.dirDist(s.c, s.r, next.tile), dir = U.compass(next.tile[0] - s.c, next.tile[1] - s.r);
        h = `<div class="lbl">${U.esc(jr.J.name)} · stop ${next.i} of ${jr.cps.length - 1}</div><div><span class="big">${U.esc(next.place.name)}</span> <span class="hook">${U.arrow(next.tile[0] - s.c, next.tile[1] - s.r)} ${dir}</span> · ${U.num(dd.mi)} mi</div><div class="dim">par ${AZ.Clock.fmt(next.parArrive)}${this.objective && this.objective() ? ` · <span class="hook">◇ ${U.esc(this.objective())}</span>` : ""}</div>`;
      }
      const v = s.voyage;
      if (v && v.state === "port" && !s.done) h += `<div class="hook small">Booked: ${U.esc(v.ship)} sails ${AZ.Clock.fmt(v.departAt)} · in ${span(v.departAt - this.shownClock())}</div>`;
    } else {
      h = `<div class="lbl">Sandbox · ${this.sim ? "a changing world" : "a fixed world"}${this.atlas ? " · Atlas" : ""}</div><div class="big">${U.esc(this.w.P.world.name)}</div><div class="dim">${s.waypoint ? `Your aim: the target ${this.know.dirDist(s.c, s.r, s.waypoint).txt}` : "No aim set: pick a place on World."}</div>`;
    }
    el.innerHTML = h;
    const th = this.focusThread ? this.focusThread() : null;
    if (side) {
      if (th) { const t = this.threadGoal ? this.threadGoal(th) : null, dd = t ? this.know.dirDist(s.c, s.r, t) : null; side.innerHTML = `<div class="lbl">Side story in focus</div><div class="side">◆ ${U.esc(th.title)}</div><div class="dim small">${U.esc(th.steps[th.phase].text)}${dd ? ` · ${U.num(dd.mi)} mi` : ""}${th.deadline ? ` · ${s.clock > th.deadline ? "late" : `${Math.ceil((th.deadline - s.clock) / 24)} d left`}` : ""}</div>`; }
      else side.innerHTML = "";
    }
  };
  G.clockHud = function () {
    const s = this.s, cw = $("clockwin"); if (!s || !cw) return;
    const t = this.shownClock(), lat = this.lat(), su = AZ.Clock.sun(t, lat), h = t - Math.floor(t / 24) * 24;
    const sunTxt = su.dl >= 24 ? "the sun does not set" : su.dl <= 0 ? "no sunrise" : `☀ ${hhmm(su.rise)}–${hhmm(su.set)}`;
    const sw = this.sleepWords ? this.sleepWords() : { asleep: false, h: s.awake || 0 };
    const awake = ` · <span class="${sw.asleep ? "side" : sw.h >= 20 ? "late" : ""}">${sw.asleep ? "asleep" : "awake"} ${Math.floor(sw.h)} h</span>`;
    cw.innerHTML = `<div class="big">Day ${Math.floor(t / 24) + 1} · ${hhmm(h)}</div><div class="dim small">${tod(h)}${awake}</div><div class="dim small lightline">${sunTxt} · ${latStr(lat)}</div>`;
    const st = $("tstatus"); if (st) st.textContent = this.tstatus();
    const planned = !this.planned || this.planned();
    document.querySelectorAll(".pace [data-pace]").forEach(b => { b.classList.toggle("on", planned && (this.tl.paused ? b.dataset.pace === "0" : +b.dataset.pace === this.tl.pace)); b.disabled = !planned; });
    const pb = document.querySelector(".pace [data-play]"); if (pb) pb.disabled = !planned;
    const cb = $("checkbtn"); if (cb) cb.textContent = `Check in: ${AZ.CHECKINS[this.set.checkin].replace(/^every |^at the next |^at /, "")}`;
    this.waitHud();
    if (this.screen === "journey" && $("stripwin")) this.stripHud();
  };
  G.tstatus = function () {
    const t = this.tl, s = this.s, lag = this.lag(), secs = this.set.paceSecs[t.pace - 1];
    const act = t.activity, sc = this.screen, sleep = this.isAsleep && this.isAsleep();
    const doing = sleep ? `asleep ${s.sleep.where}` : act ? `${act.label.toLowerCase()} · ${act.pending ? "waits for the clock" : `${span(act.until - this.shownClock())} left`}` : s.eod ? `heading to bed at ${AZ.Clock.fmt(s.eod.bedAt).replace(/^Day \d+, /, "")}` : "";
    if (sc === "memory" || sc === "inventory") return `the clock stands still while you read${doing ? ` · ${doing}` : ""}`;
    if (sc === "story") return `one second a second${doing ? ` · ${doing}` : lag > 0.02 ? ` · busy, ${span(lag)} left` : ""}`;
    const pace = `a day in ${secs} s`;
    if (doing && !t.paused) return `${doing} · ${pace}`;
    if (t.paused) return lag > 0.02 ? "paused · ▶ lets the hours pass" : "paused · time stands still";
    if (t.activity) return `${t.activity.label.toLowerCase()} · ${span(t.activity.until - this.shownClock())} left`;
    if (this.riding()) { const v = s.voyage; return v.state === "sea" ? `${v.mode === "land" ? "on the road" : "under sail"} · ${pace}` : `waiting aboard · she sails in ${span(v.departAt - this.shownClock())}`; }
    if (s.auto) return `${s.aboard ? "the crew sails the course" : "walking to the target"} · ${pace}`;
    if (t.heading) return `${s.aboard ? "sailing" : s.mount ? "riding" : "walking"} ${HEAD[t.heading]} · ${pace}`;
    if (lag > 0.05) return `time passing · ${pace}`;
    if (s.aboard && s.vessel && !s.voyage && s.vessel.crew && !t.helm && !t.crewGoal) return "at rest · name a course on Journey";
    return "standing · the clock waits for you";
  };
  G.waitHud = function () {
    const el = $("waitcard"); if (!el) return;
    const t = this.tl, lag = this.lag(), act = t.activity;
    const show = lag > 0.3 && (t.pend > 0 || (act && act.inPlace) || lag > 1.2);
    if (show) el.innerHTML = `⏳ ${U.esc(act ? act.label : "The hours pass")} · ${span(lag)} to go${t.paused ? ` · <span class="hook">paused: ▶</span>` : ""}`;
    else if (act && !act.inPlace) el.innerHTML = `${U.esc(act.label)} · ${span(act.until - this.shownClock())} left · the vessel goes on`;
    el.classList.toggle("on", !!(show || (act && !act.inPlace)));
  };
  G.locHud = function () {
    const s = this.s, w = this.w, el = this.ui.el.loc, cell = w.cell(s.c, s.r), b = this.burgHere(), land = w.isLand(s.c, s.r), t = this.shownClock();
    const place = b ? (w.burgAt.get(w.idx(s.c, s.r)) ? b.name : `${b.name} harbour`) : land ? this.know.regionName(cell) : w.waterName(s.c, s.r);
    const terr = land ? `${w.P.biomes[w.C.biome[cell]].name} · ${w.heightStr(w.h(s.c, s.r))}` : `depth ${w.heightStr(w.h(s.c, s.r), true)}`;
    const lat = this.lat(), today = AZ.Clock.today(w.tempC(s.c, s.r), lat, t, !land), wx = AZ.Weather.at(w, s.c, s.r, t);
    const conds = Object.keys(s.cond).map(k => AZ.COND[k]?.label || k).join(", ");
    const st = land && w.C.state[cell] ? w.P.states[w.C.state[cell]].name : "";
    el.innerHTML = `<div class="big">${U.esc(place)}</div><div class="dim">${U.esc([st, terr, w.temp(today), wx.label].filter(Boolean).join(" · "))}</div>${conds ? `<div class="late small">${U.esc(conds)}</div>` : ""}`;
  };
  G.chipsHud = function () {
    const s = this.s, el = $("chips"); if (!el) return;
    const eat = Math.max(1, this.eaters()), d = Math.floor(s.sup.food / eat);
    el.innerHTML = `<div class="${d <= 2 ? "warn" : ""}">Food · ${d} d${eat > 1 ? ` <span class="dim small">(${eat} eat)</span>` : ""}</div><div>🟡 ${U.rn(s.purse, 1)}</div>`;
  };
  G.stripHud = function () {
    const el = $("stripwin"), s = this.s; if (!el) return;
    const r = this.raceStatus ? this.raceStatus() : null;
    if (!r || !this.jr) { el.innerHTML = this.jr && this.mode !== "sandbox" ? `<div class="dim">${s.done ? "The journey is complete." : ""}</div>` : `<div class="dim">Sandbox: the journey stored in this map is on the Journey screen.</div>`; return; }
    const prev = this.jr.cps[r.cp.i - 1], leg = r.cp.legIn, miles = (leg && leg.miles) || 1;
    let left = Math.hypot(r.cp.tile[0] - s.c, r.cp.tile[1] - s.r) * this.w.miles; const ch = leg && leg.chain;
    if (ch && ch.length > 1) { let bi = 0, bd = Infinity; for (let i = 0; i < ch.length; i += 2) { const dd = Math.abs(ch[i][0] - s.c) + Math.abs(ch[i][1] - s.r); if (dd < bd) { bd = dd; bi = i; } } left = miles * (1 - bi / (ch.length - 1)); }
    const f = U.clamp(1 - left / miles, 0, 1), tol = ((r.rule && r.rule.tol) || 1) * 24;
    const pace = Math.abs(r.ahead) <= Math.min(tol, 12) ? "early" : r.ahead > 0 ? "early" : "late";
    el.innerHTML = `<div class="small" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${U.esc(prev ? prev.place.name : "")} → <span class="hook">${U.esc(r.cp.place.name)}</span> <span class="dim">· ${U.num(miles)} mi by ${U.esc((leg ? leg.transport : "").toLowerCase())}</span></div>
      <div class="strip"><div class="rail"></div><div class="done" style="width:${f * 100}%"></div><div class="you" style="left:${f * 100}%"></div></div>
      <div class="small"><span class="${pace}">◯ on pace: ${AZ.dayWords(r.eta)}</span> · <span class="dim">par ${AZ.Clock.fmt(r.cp.parArrive)}</span> · ${U.esc(this.paceWords(r))}</div>`;
  };
  G.toolsHud = function () {
    const el = $("worldtools"); if (!el) return;
    const Z = AZ.ZOOMS[this.zoomIdx ?? 4], lens = AZ.LENSES[this.lensIdx];
    el.innerHTML = `<button type="button" data-tool="lens" title="L">Lens: ${U.esc(lens.name)} ▸</button><button type="button" data-tool="info" class="${this.inspectOn ? "on" : ""}" title="I">Info</button>` +
      `${this.s && !this.s.aboard ? `<button type="button" data-tool="reach" class="${this.set.reach ? "on" : ""}" title="Today's reach">Reach</button><button type="button" data-tool="hours" class="${this.set.hours ? "on" : ""}" title="Hours to here">Hours</button>` : ""}` +
      `<button type="button" data-tool="out" title="−">−</button><button type="button" data-tool="in" title="+">+</button><button type="button" data-tool="map" class="${Z.map ? "on" : ""}" title="M">${Z.map ? "Tiles" : "Map"}</button>${this._pan && Z.map ? `<button type="button" data-tool="home">⌖</button>` : ""}`;
    el.querySelectorAll("[data-tool]").forEach(b => (b.onclick = e => { e.stopPropagation(); this.tool(b.dataset.tool); }));
  };
  G.tool = function (id) {
    if (id === "lens") this.cycleLens(1);
    else if (id === "info") this.toggleInspect();
    else if (id === "reach" || id === "hours") { this.set[id] = !this.set[id]; AZ.saveSettings(this.store, this.set); }
    else if (id === "in") this.zoomBy(1);
    else if (id === "out") this.zoomBy(-1);
    else if (id === "map") this.toggleMap();
    else if (id === "home") this._pan = null;
    this.dirty = true;
  };
  G.zoomBy = function (d) { this.zoomIdx = U.clamp((this.zoomIdx ?? 4) + d, 0, AZ.ZOOMS.length - 1); if (!AZ.ZOOMS[this.zoomIdx].map) this._pan = null; this.dirty = true; };
  G.toggleMap = function () { const Z = AZ.ZOOMS[this.zoomIdx ?? 4]; this.zoomIdx = Z.map ? (this._tileZoom ?? 4) : ((this._tileZoom = this.zoomIdx ?? 4), 1); this._pan = null; if (this.screen !== "world") this.showScreen("world"); this.dirty = true; };
  G.tickerHud = function () {
    const el = $("ticker"); if (!el) return;
    const f = (this.s.feed || []).filter(e => e.k !== "routine").slice(-2).reverse();
    el.innerHTML = f.map(e => `<div><span class="dim">${hhmm(e.t)}</span> ${e.k === "day" ? AZ.plain(e.html) : e.html}</div>`).join("");
    el.onclick = () => this.showScreen("journey");
  };
  G.hint = function (html) {
    if (!this.a6) return;
    const el = $("hint"); if (!el) return;
    el.innerHTML = html; el.classList.add("on");
    clearTimeout(this._hintT); this._hintT = setTimeout(() => el.classList.remove("on"), 3200);
  };
  const mini5 = G.mini;
  G.mini = function () { if (!this.a6) return mini5.call(this); };

  // ------------------------------------------------------------------ the feed, as HTML
  G.feedHtml = function (n = 50, kinds) {
    const f = (this.s.feed || []).filter(e => !kinds || kinds.includes(e.k)).slice(-n).reverse();
    if (!f.length) return `<p class="dim">Nothing yet. Day cards are filed at dusk.</p>`;
    return `<div class="feed">${f.map(e => `<div class="e ${e.k}">${e.k === "day" ? `<div class="daycard">${e.html}</div>` : `<span class="t">${AZ.Clock.fmt(e.t).replace(/^Day \d+, /, (m) => (Math.floor(e.t / 24) === Math.floor(this.shownClock() / 24) ? "" : m))}</span>${e.html}`}</div>`).join("")}</div>`;
  };

  // ------------------------------------------------------------------ Journey (4)
  G.journeyBody = function () {
    const s = this.s, w = this.w, jr = this.jr, L = [];
    const p = this.windowParams();
    const lab = $("vwin-label"); if (lab) lab.textContent = `${p.label} · ${p.phase} · ${AZ.Weather.KINDS[p.wx]?.label || p.wx}`;
    const where = $("j-where"); if (where) where.innerHTML = `${U.esc(U.cap(this.whereWords()))} · ${U.esc(AZ.Clock.season(this.lat(), this.shownClock()))}`;
    if (jr && this.mode !== "sandbox") {
      const r = this.raceStatus ? this.raceStatus() : null;
      if (r) {
        const tol = ((r.rule && r.rule.tol) || 1) * 24;
        L.push(`<div class="lbl">The race</div><div><span class="hook">${U.esc(r.cp.place.name)}</span> · par ${AZ.Clock.fmt(r.cp.parArrive)}</div><div>Your pace: ${AZ.dayWords(r.eta)} · <span class="${r.ahead >= -tol ? "early" : "late"}">${r.ahead >= 0 ? `${span(r.ahead)} of slack` : `${span(-r.ahead)} behind`}</span></div>`);
        const rows = jr.cps.slice(1).map(cp => { const rec = s.cpRec[cp.i] || {}; const cur = cp.i === s.cp; return `<tr class="${cur ? "cur" : ""}"><td>${U.esc(cp.place.name)}</td><td>${AZ.Clock.fmt(cp.parArrive)}</td><td>${rec.skipped ? "skipped" : rec.arrive != null ? `✓ ${AZ.Clock.fmt(rec.arrive)}` : cur ? AZ.dayWords(r.eta) : ""}</td></tr>`; }).join("");
        L.push(`<table class="plan"><tr><th>Stop</th><th>Par</th><th>Arrived / pace</th></tr>${rows}</table>`);
      } else if (s.done) L.push(`<div class="hook">The journey is complete.</div>`);
    } else if (this.jr0 || jr) {
      const J0 = this.jr0 || jr;
      L.push(`<div class="lbl">The journey stored in this map: ${U.esc(J0.J.name)}</div><p class="dim">In Sandbox the map's journey is a view only: it cannot be followed and carries no par.</p><table class="plan"><tr><th>Stop</th><th>Leg</th><th>Miles</th></tr>${J0.cps.map(cp => `<tr><td>${U.esc(cp.place.name)}</td><td>${cp.legIn ? U.esc(cp.legIn.transport) : "start"}</td><td>${cp.legIn ? U.num(cp.legIn.miles) : ""}</td></tr>`).join("")}</table>`);
    }
    L.push(`<h3>${this.riding() ? "The vessel" : s.aboard && s.vessel ? "Your vessel" : "On the road"}</h3>${this.vehicleCard()}`);
    const pr = this.provisions && jr && this.mode !== "sandbox" ? this.provisions(s.cp) : null;
    if (pr) { const short = pr.rations - s.sup.food; L.push(`<div class="lbl" style="margin-top:8px">Stores ahead</div><div>${s.sup.food} rations; ${pr.days} days to ${U.esc(pr.to)} ${U.esc(pr.how)} for ${pr.eaters === 1 ? "you" : `${pr.eaters}`}: ${short > 0 ? `<span class="late">${short} short</span>` : `<span class="early">enough</span>`}.</div>`); }
    L.push(`<div class="dim small" style="margin-top:6px">Pastimes, plans and the people here: Story (5). What you know: Memory (1).</div>`);
    L.push(`<h3>The days</h3>${this.feedHtml(40, ["day", "note", "scene"])}`);
    return L.join("");
  };
  G.vehicleCard = function () {
    const s = this.s, v = s.voyage, o = s.vessel, t = this.tl, B = (id, label, cls = "") => `<button type="button" class="actbtn ${cls}" data-past="${id}">${label}</button>`;
    if (this.riding()) {
      const next = v.stops[v.leg];
      return `<div>Aboard <b>${U.esc(v.ship)}</b>, ${U.esc(v.role)} · ${U.esc(v.captain)} master · bound for ${U.esc(next ? next.name : "?")}</div><div class="dim small">${v.mode === "land" ? "The coachman drives and keeps his timetable; you eat your own stores." : "The captain steers and keeps his itinerary; you eat your own stores; she sails on time, with or without you."}</div>${v.state === "port" ? `<div class="hook">In port: she sails ${AZ.Clock.fmt(v.departAt)}.</div>` : ""}`;
    }
    if (s.aboard && o) {
      const goal = t.crewGoal ? (t.crewGoal.cp != null ? `the next stop, ${U.esc(this.cpNext()?.place.name || "?")}` : "the place you named") : null;
      return `${o.damaged || s.cond.damaged ? `<div class="win arrival late" style="border-color:var(--late)"><b>Damaged.</b> Everything she does takes longer (×${AZ.COND.damaged.slow}). A shipwright in a port can repair her: a town option.</div>` : ""}<div><b>${U.esc(o.kind)}</b> (${U.esc(o.mode)}${o.damaged ? ", damaged" : ""})${o.crew ? ` · crew ${o.crew}, morale ${Math.round(o.morale)}${o.strikes ? `, strikes ${o.strikes}/3` : ""}` : " · no crew"}${o.orders ? ` · night orders: ${U.esc(o.orders)}` : ""}</div>
        <div>${t.helm ? `<span class="hook">You have the helm.</span> The arrows set her heading.` : goal ? `The crew sails for ${goal}.` : o.crew ? `The crew waits for a course.` : "You sail her yourself."}${t.noCourse ? ` <span class="late">No course by water from here.</span>` : ""}</div>
        <div>${o.crew ? (t.helm ? B("helm", "Hand the helm to the crew") : B("helm", "Take the helm (T)", "gold")) : ""}${o.crew && this.cpNext() ? B("sailon", `Sail on to ${U.esc(this.cpNext().place.name)}`) : ""}</div>`;
    }
    const tl = this.tl;
    return `<div>${s.mount ? `Riding · ${s.mount.speed} mph` : `On foot · ${this.walkSpeed} mph on open ground`}${tl.heading ? ` · heading ${HEAD[tl.heading]}` : s.auto ? " · walking to the target" : ""}</div><div class="dim small">Arrows set a heading; a tile on World can be walked to. The clock waits while you stand.</div>`;
  };
  G.paintWindow = function () {
    if (this.screen !== "journey" || !this.s) return;
    const cv = $("vwin"); if (cv) AZ.ViewWin.draw(cv, this.windowParams());
  };

  // ------------------------------------------------------------------ Memory (1)
  G.memoryHtml = function () {
    const s = this.s, w = this.w, jr = this.jr, K = this.kn(), now = s.clock, today = Math.floor(now / 24), L = [];
    L.push(`<h2>Memory</h2>`);
    if (s.intro && s.intro.length) L.push(`<h3>The beginning</h3>${s.intro.map(p => `<p>${p}</p>`).join("")}`);
    else L.push(`<p class="dim">What ${U.esc(this.tv.name)} knows.</p>`);
    if (jr && this.mode !== "sandbox") {
      const rows = jr.cps.map(cp => { const rec = s.cpRec[cp.i] || {}; return `<tr class="${cp.i === s.cp ? "cur" : ""}"><td>${U.esc(cp.place.name)}</td><td>${cp.i ? `par ${AZ.Clock.fmt(cp.parArrive)}` : "start"}</td><td>${rec.skipped ? "skipped" : rec.arrive != null ? `✓ ${AZ.Clock.fmt(rec.arrive)}` : ""}</td><td>${cp.acts.map(a => `${(rec.acts || {})[a.id] ? "✓" : "·"} ${U.esc(a.label)}`).join("<br>")}</td></tr>`; }).join("");
      L.push(`<h3>The journey</h3><p>${U.esc(this.tv.tie ? this.tv.tie.text : U.cap(this.tv.why || ""))}${this.measureWords && this.measureWords() ? ` <span class="dim">${U.esc(this.measureWords())}</span>` : ""}</p><table class="plan"><tr><th>Stop</th><th>Par</th><th>Record</th><th>The plan's tasks</th></tr>${rows}</table>`);
    }
    // documents carried or present
    const docs = [], here = this.burgHere();
    if (here) { const bv = this.boardView(here.i); if (bv && /here and now/.test(bv.src)) docs.push(`<b>The sailings board at ${U.esc(here.name)}</b> <span class="dim">(here, current)</span>${this.boardTable(bv.rec, true)}`); const pv = this.priceView(here.i); if (pv && /today/.test(pv.src)) docs.push(`<b>The market at ${U.esc(here.name)}</b> <span class="dim">(today's prices)</span>${this.priceTable(pv)}`); }
    for (const d of K.docs.filter(x => x.kind === "handbill").slice(-6).reverse()) docs.push(`<b>Handbill: sailings from ${U.esc(d.at)}</b> <span class="dim">(copied ${AZ.Clock.fmt(d.t)}, carried)</span>${this.boardTable(d, true)}`);
    L.push(`<h3>Documents you carry or stand by</h3>${docs.length ? docs.map(x => `<div style="margin:6px 0">${x}</div>`).join("") : `<p class="dim">None. Copy a sailings board at a harbour (Inventory), or write prices into your notebook.</p>`}`);
    // prices
    const pb = [...new Set([...Object.keys(K.prices), ...Object.keys(K.notebook)])].map(Number).map(bi => [bi, this.priceView(bi)]).filter(([, v]) => v).sort((a, b) => b[1].rec.t - a[1].rec.t).slice(0, 14);
    L.push(`<h3>Prices you know</h3>${pb.length ? pb.map(([bi, v]) => `<div><b>${U.esc(w.P.burgs[bi].name)}</b> <span class="dim">· ${U.esc(v.src)}</span>${this.priceLine(v)}</div>`).join("") : `<p class="dim">None yet. Look at a market.</p>`}`);
    // sailings
    const bb = Object.keys(K.boards).map(Number).map(bi => [bi, this.boardView(bi)]).filter(([, v]) => v && v.rec.lines.length).sort((a, b) => b[1].rec.t - a[1].rec.t).slice(0, 10);
    L.push(`<h3>Sailings and coaches you know</h3>${bb.length ? bb.map(([bi, v]) => `<div><b>From ${U.esc(w.P.burgs[bi].name)}</b> <span class="dim">· ${U.esc(v.src)}</span>${v.exact ? this.boardTable(v.rec, false) : `<div>${U.esc(this.blurBoard(v.rec))}</div>`}</div>`).join("") : `<p class="dim">None yet. Read the board at a harbour or coach office.</p>`}${this.linesHtml()}`);
    // news
    if (this.newsHtml) L.push(this.newsHtml().replace("<h3>News, as it reached you</h3>", "<h3>News heard</h3>"));
    const gossip = (s.feed || []).filter(e => /“/.test(e.html) && e.k === "note").slice(-6).reverse();
    if (gossip.length) L.push(`<h3>Gossip</h3>${gossip.map(e => `<div><span class="dim">${AZ.Clock.fmt(e.t)}</span> ${e.html}</div>`).join("")}`);
    // places
    const places = this.knownPlaces().sort((a, b) => (b.day || 0) - (a.day || 0)).slice(0, 40);
    L.push(`<h3>Places you know</h3><div class="cols2">${places.map(p => `<div><span class="go" data-goto="${p.tile[0]},${p.tile[1]}" data-name="${U.esc(p.name)}">${U.esc(p.name)}</span> <span class="${p.lvl === "heard" ? "heard" : "dim"} small">· ${p.lvl === "heard" ? `heard of (${U.esc(p.src || "")})` : `seen, Day ${(p.day || 0) + 1}`}</span></div>`).join("")}</div>`);
    // leads and side stories
    const leads = (s.leads || []).filter(l => l && l.t && !(l.key.startsWith("m") && s.done_m.includes(+l.key.slice(1)))).slice(-14).reverse();
    L.push(`<h3>Side stories and leads</h3>${(s.threads || []).map(th => `<div class="${th.done ? "dim" : "side"}">${th.done ? "◇" : `<span class="go" data-focus="${th.id}">◆</span>`} ${U.esc(th.title)}: ${th.done ? U.esc(th.outcome || "done") : U.esc(th.steps[th.phase].text)}${th.deadline && !th.done ? ` <span class="dim">(by ${AZ.Clock.fmt(th.deadline)})</span>` : ""}${!th.done && th.id === s.focus ? ` <span class="hook small">in focus</span>` : ""}</div>`).join("") || `<p class="dim">None yet: notice boards in towns.</p>`}
      ${leads.map(l => `<div><span class="go" data-goto="${l.t[0]},${l.t[1]}" data-name="${U.esc(l.name)}">${U.esc(l.name)}</span> <span class="dim small">(${U.esc(l.type || "")}, ${U.esc(l.from)}) · ${U.esc(this.know.dirDist(s.c, s.r, l.t).txt)}</span></div>`).join("")}`);
    if (this.knownHtml) L.push(this.knownHtml());
    const notes = (K.notes || []).slice(-20).reverse();
    if (notes.length) L.push(`<h3>Your notes</h3>${notes.map(n => `<div><span class="dim">${AZ.Clock.fmt(n.t)} · ${U.esc(n.title)}</span><div class="small">${U.esc(n.text)}</div></div>`).join("")}`);
    if (s.party && s.party.length) L.push(`<h3>The company</h3><p>${s.party.map(p => `${U.esc(p.name)} (${U.esc(p.tie || p.role)})`).join(", ")}</p>`);
    L.push(`<h3>The traveller</h3><p><b>${U.esc(this.tv.name)}</b>, ${this.tv.age}, ${U.esc(this.tv.trade)} · ${U.esc(w.P.cultures[this.tv.culture].name)} · ${U.esc(w.P.religions[this.tv.faith]?.name || "no faith")}. ${U.cap(U.esc(this.tv.why || ""))}.</p>`);
    const seen = s.seen; L.push(`<h3>Seen so far</h3><p class="dim">States ${seen.st.length} · cultures ${seen.cu.length} · faiths ${seen.re.length} · towns ${seen.b.length} · marked places ${seen.m.length} · forces ${seen.u.length}</p>`);
    L.push(`<h3>The log</h3><div class="feed">${s.log.slice(-60).reverse().map(e => `<div class="e routine"><span class="t">${AZ.Clock.fmt(e.t)}</span>${e.html}</div>`).join("")}</div>`);
    void today;
    return L.join("");
  };
  G.priceTable = function (v) { const r = v.rec, gs = Object.entries(r.goods || {}).slice(0, 16); return `<div class="small">Food 🟡 ${r.ration} a day · ${gs.map(([g, p]) => `${U.esc(this.goodName(g).toLowerCase())} 🟡 ${p}`).join(" · ")}</div>`; };
  G.priceLine = function (v) {
    const r = v.rec, gs = Object.entries(r.goods || {}).slice(0, 12);
    if (v.exact) return `<div class="small">food 🟡 ${r.ration} · ${gs.map(([g, p]) => `${U.esc(this.goodName(g).toLowerCase())} 🟡 ${p}`).join(" · ") || "no goods for sale"}</div>`;
    return `<div class="small">food ${this.priceWord("ration", r.ration)} · ${gs.map(([g, p]) => `${U.esc(this.goodName(g).toLowerCase())} ${this.priceWord(g, p)}`).join(" · ")}</div>`;
  };
  G.boardTable = function (rec, exact) {
    const L = (rec.lines || []).slice(0, 12);
    if (!L.length) return `<div class="dim small">No departures.</div>`;
    return `<table class="plan small"><tr><th>Vessel</th><th>To</th><th>Sails</th><th>Every</th></tr>${L.map(x => `<tr class="${this.isNextStopBurg(x.toB) ? "cur" : ""}"><td>${x.mode === "land" ? "🐎" : "⛵"} ${U.esc(x.ship || "")}</td><td>${U.esc(x.to || "?")}</td><td>${exact && x.dep ? AZ.Clock.fmt(x.dep) : ""}</td><td>${x.every ? `${x.every} d` : "once"}</td></tr>`).join("")}</table>`;
  };
  G.blurBoard = function (rec) {
    const by = {}; for (const x of rec.lines || []) { by[x.to] = by[x.to] || []; by[x.to].push(x); }
    return Object.entries(by).map(([to, xs]) => `to ${to}, ${AZ.oftenWords(xs[0].every)}`).join("; ") || "no sailings remembered";
  };
  G.linesHtml = function () { // passenger lines read or heard of: exact for two weeks, then blurred
    const s = this.s, w = this.w;
    if (!this.sim) return "";
    const rows = Object.entries(s.lineSeen || {}).map(([id, seen]) => [this.sim.lines[+id], seen]).filter(([L]) => L).sort((a, b) => b[1].t - a[1].t).slice(0, 24);
    if (!rows.length) return "";
    return `<div class="lbl" style="margin-top:6px">Lines you have read of or heard of</div><table class="plan small"><tr><th>Line</th><th>From → to</th><th>When</th><th>Last word</th></tr>${rows.map(([L, seen]) => {
      const exact = s.clock - seen.t <= AZ.BLUR.sailDays * 24 && !seen.heard, per = L.period * 24, next = L.phase + Math.ceil((s.clock - L.phase) / per) * per;
      return `<tr class="${this.isNextStopBurg(L.to) ? "cur" : ""}"><td>${L.mode === "sea" ? "⛵" : "🐎"} ${U.esc(L.ship)}</td><td>${U.esc(w.P.burgs[L.from].name)} → ${U.esc(w.P.burgs[L.to].name)}</td><td>${exact ? `every ${L.period} d · next ${AZ.Clock.fmt(next)}` : AZ.oftenWords(L.period)}</td><td class="${seen.ok ? "" : "late"}">${seen.ok ? "running" : U.esc(seen.why)} <span class="dim">(${seen.heard ? "heard" : "read"} ${AZ.Clock.fmt(seen.t)})</span></td></tr>`;
    }).join("")}</table>`;
  };
  G.isNextStopBurg = function (bi) { const cp = this.cpNext(); return bi != null && cp && cp.place.burg && cp.place.burg.i === bi; };

  // ------------------------------------------------------------------ Inventory (2)
  G.inventoryHtml = function () {
    const s = this.s, K = this.kn(), L = [];
    L.push(`<h2>Inventory</h2><div class="dim small">What ${U.esc(this.tv.name)} carries. Carried things are exact and dated, and can be lost.</div>`);
    L.push(this.carryHtml ? this.carryHtml() : "");
    const nb = Object.entries(K.notebook), bills = K.docs.filter(d => d.kind === "handbill");
    L.push(`<h3>Documents</h3><ul class="carry"><li>Your notebook: ${(K.notes || []).length} note${(K.notes || []).length === 1 ? "" : "s"} (Memory); ${nb.length ? `prices at ${nb.length} town${nb.length > 1 ? "s" : ""}, exact (${nb.slice(-4).map(([bi, r]) => `${U.esc(this.w.P.burgs[bi].name)}, ${AZ.Clock.fmt(r.t)}`).join("; ")})` : "empty"}</li>${bills.map(d => `<li>Handbill: sailings from ${U.esc(d.at)}, copied ${AZ.Clock.fmt(d.t)}</li>`).join("")}</ul>`);
    const acts = [], pend = this.notebookPending().length, board = this.boardHere();
    acts.push(`<button type="button" class="actbtn ${pend ? "gold" : ""}" data-past="notebook" ${pend ? "" : "disabled"}>Write up the notebook · ½ h${pend ? ` (${pend} town${pend > 1 ? "s" : ""})` : ": nothing new"}</button>`);
    if (board) acts.push(`<button type="button" class="actbtn gold" data-past="copy">Copy the sailings board at ${U.esc(board.b.name)} · 1 h</button>`);
    L.push(`<h3>Use</h3><div>${acts.join("")}</div><p class="dim small">Prices you have seen stay exact in memory for three weeks; written in the notebook they stay exact. A handbill keeps a sailings board exact.</p>`);
    return L.join("");
  };

  // ------------------------------------------------------------------ Story (5)
  G.renderStory = function () {
    const left = $("story-left"), right = $("story-right"); if (!left || !right || !this.s) return;
    const y = right.scrollTop; right.innerHTML = this.planHtml(); right.scrollTop = y; this.wireLinks(right);
    if (this.hosting) return; // the town or camp menu is drawn there by hostChoose
    const s = this.s, L = [];
    const arr = this.arrivalHtml(); if (arr) L.push(arr);
    const past = this.pastimes().filter(p => p.ok);
    if (past.length) L.push(`<div class="lbl">Pastimes and tasks</div><div>${past.map(p => `<button type="button" class="actbtn ${p.cls || ""}" data-past="${p.id}">${p.label}</button>`).join("")}</div>`);
    const b = this.burgHere();
    if (b && !this.riding()) L.push(`<div class="grp"><button type="button" class="opt hook" data-past="town">Go into ${U.esc(b.name)} (Space)</button></div>`);
    if (!s.aboard && !b) L.push(`<div class="grp"><button type="button" class="opt" data-past="camp">Make camp, wait, fish or forage (R)</button></div>`);
    L.push(`<h3 style="color:var(--teal);font-weight:normal">The story so far</h3>${this.feedHtml(60, ["scene", "note", "day"])}`);
    const yl = left.scrollTop; left.innerHTML = L.join(""); left.scrollTop = yl; this.wireLinks(left);
  };
  G.arrivalHtml = function () {
    const a = this.lastArrival, s = this.s;
    if (!a || s.clock - a.t > 36) return "";
    return `<div class="win arrival">${a.html}</div>`;
  };
  G.planHtml = function () {
    const s = this.s, w = this.w, jr = this.jr, L = [];
    L.push(`<div class="lbl">The planning window</div><div class="dim small">Reads only what you know: boards and markets here, your notebook and handbills, what people told you.</div>`);
    const next = jr && this.mode !== "sandbox" ? this.cpNext() : null, here = this.burgHere();
    if (next) {
      const pr = this.provisions ? this.provisions(next.i) : null;
      L.push(`<h3>The next leg: ${U.esc(here ? here.name : "here")} to ${U.esc(next.place.name)}</h3><div class="dim small">par ${AZ.Clock.fmt(next.parArrive)} · you carry ${s.sup.food} rations · 🟡 ${U.rn(s.purse, 1)}</div>`);
      const rows = [];
      if (pr) { const arrive = this.shownClock() + pr.days * 24, d = arrive - next.parArrive; rows.push([`★ The plan's way: ${U.esc(next.legIn ? next.legIn.transport : "")}`, `${pr.days} d · ${AZ.dayWords(arrive)}`, d > 24 ? `<span class="late">${span(d)} behind par</span>` : `<span class="early">${d < -24 ? `${span(-d)} early` : "on par"}</span>`, `${pr.rations} rations${pr.rations > s.sup.food ? ` <span class="late">(${pr.rations - s.sup.food} short)</span>` : ""}`, "the journey's plan"]); }
      const v = s.voyage, ride = this.riding();
      if (ride && v.stops.some(x => this.isNextStopBurg(x.b))) { const r = this.raceStatus ? this.raceStatus() : null; if (r) rows.unshift([`Aboard ${U.esc(v.ship)}, now`, AZ.dayWords(r.eta), r.ahead < -24 ? `<span class="late">${span(-r.ahead)} behind par</span>` : `<span class="early">${r.ahead > 24 ? `${span(r.ahead)} early` : "on par"}</span>`, v.role === "crew" ? "the ship feeds you" : "your own stores", `${U.esc(v.captain)}'s itinerary`]); if (pr) rows.splice(1, 1); }
      else if (here) {
        const bv = this.boardView(here.i);
        if (bv) for (const x of bv.rec.lines.filter(x => this.isNextStopBurg(x.toB)).slice(0, 4)) rows.push([`Book ${U.esc(x.ship)} (${x.mode === "land" ? "coach" : "ship"}) to ${U.esc(x.to)}`, bv.exact && x.dep ? `sails ${AZ.Clock.fmt(x.dep)}` : AZ.oftenWords(x.every), "", x.fare ? `fare 🟡 ${x.fare}` : "", U.esc(bv.src)]);
        if (!bv) rows.push([`Passage from ${U.esc(here.name)}`, "unknown", "", "", here.port ? "read the board at the harbour" : "ask at the coach office"]);
      } else if (!ride) {
        const known = Object.entries(this.kn().boards).flatMap(([bi, bd]) => bd.lines.filter(x => this.isNextStopBurg(x.toB)).map(x => [bi, x, bd])).slice(0, 3);
        for (const [bi, x, bd] of known) { const v = this.boardView(bi); rows.push([`${U.esc(x.ship)} from ${U.esc(w.P.burgs[bi].name)}`, v && v.exact && x.dep ? `sails ${AZ.Clock.fmt(x.dep)}` : AZ.oftenWords(x.every), "", "", U.esc(v ? v.src : `seen ${AZ.Clock.fmt(bd.t)}`)]); }
      }
      if (s.vessel) rows.push([`Your ${U.esc(s.vessel.kind.toLowerCase())}`, this.withVessel() ? "here" : "waiting elsewhere", "", s.vessel.crew ? `${this.crewFed()} eat with you` : "", "yours"]);
      L.push(`<table class="plan"><tr><th>Way</th><th>Arrives</th><th>Par</th><th>Food and cost</th><th>You know it from</th></tr>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</table>`);
      const later = jr.cps.slice(next.i + 1).map(cp => `${U.esc(cp.place.name)}, par ${AZ.Clock.fmt(cp.parArrive)}`);
      if (later.length) L.push(`<div class="dim small" style="margin-top:4px">Later: ${later.join(" · ")}</div>`);
    } else if (this.mode === "sandbox" || !jr) L.push(`<p class="dim">Sandbox: set an aim by choosing a place on World. Passage from here is at the harbour or coach office.</p>`);
    // the road ahead: food for every leg
    if (next && this.provisions) {
      const rows = []; for (let i = next.i; i < jr.cps.length && rows.length < 4; i++) { const p = this.provisions(i); if (p) rows.push(`<tr><td>${U.esc(p.to)}</td><td>${U.esc(p.how)}</td><td>${U.num(p.miles)} mi</td><td>${p.days} d</td><td>${p.rations}</td></tr>`); }
      if (rows.length) L.push(`<h3>Stores ahead</h3><table class="plan"><tr><th>To</th><th>How</th><th>Miles</th><th>Days</th><th>Rations for ${this.eaters()}</th></tr>${rows.join("")}</table>`);
    }
    // side stories and leads against the route
    const th = (s.threads || []).filter(t => !t.done);
    if (th.length) L.push(`<h3>Side stories</h3>${th.map(t => { const g = this.threadGoal ? this.threadGoal(t) : null, dd = g ? this.know.dirDist(s.c, s.r, g) : null, days = dd ? Math.max(0.5, Math.round((dd.mi / (this.walkSpeed * 8)) * 2) / 2) : null; return `<div class="side"><span class="go" data-focus="${t.id}">◆ ${U.esc(t.title)}</span>: ${U.esc(t.steps[t.phase].text)}${dd ? ` <span class="dim">· ${U.esc(dd.txt)}, about ${days} d on foot</span>` : ""}${t.deadline ? ` <span class="dim">· by ${AZ.Clock.fmt(t.deadline)}</span>` : ""}${g ? ` <span class="go" data-goto="${g[0]},${g[1]}" data-name="${U.esc(t.title)}">target</span>` : ""}</div>`; }).join("")}`);
    return L.join("");
  };
  // pastimes and tasks: each plays out over its hours; carried, the vessel goes on meanwhile
  G.pastimes = function () {
    const s = this.s, v = s.voyage, ride = this.riding(), atSea = ride && v.state === "sea", own = s.aboard && s.vessel && !s.voyage, t = this.tl;
    const pend = this.notebookPending().length, board = this.boardHere();
    return [
      { id: "captain", label: `Plan with the ${v && v.mode === "land" ? "coachman" : "captain"} · 1 h`, ok: ride },
      { id: "gossip", label: "Gossip with the passengers · 1 h", ok: ride },
      { id: "dice", label: "Dice on deck · an evening", ok: atSea && v.mode !== "land" },
      { id: "crew", label: "Talk to the crew · 1 h", ok: own && s.vessel.crew > 0 },
      { id: "notebook", label: `Write up the notebook · ½ h (${pend})`, ok: pend > 0, cls: "gold" },
      { id: "copy", label: "Copy the sailings board · 1 h", ok: !!board, cls: "gold" },
      { id: "rest", label: "Rest · 3 h", ok: ride || own },
      { id: "sleep", label: "Sleep until dawn", ok: ride || (own && s.vessel.crew > 0) },
      { id: "wait", label: `Wait aboard until she sails (${v && v.state === "port" ? span(v.departAt - s.clock) : ""})`, ok: ride && v.state === "port", cls: "gold" },
      { id: "helm", label: t.helm ? "Hand the helm to the crew" : "Take the helm (T)", ok: own && s.vessel.crew > 0 },
      { id: "sailon", label: `Sail on to ${U.esc(this.cpNext()?.place.name || "")}`, ok: own && s.vessel.crew > 0 && !!this.cpNext() },
    ];
  };
  G.pastime = async function (id) {
    const s = this.s, v = s.voyage, w = this.w;
    if (this.ui.busy()) return;
    if (id === "town") { const b = this.burgHere(); if (b) return this.town(b); return; }
    if (id === "camp") return this.rest();
    if (id === "helm") return this.takeHelm();
    if (id === "sailon") return this.sailOn({ cp: s.cp });
    if (id === "notebook") return this.startActivity("Writing up your notebook", 0.5, () => { this.writeNotebook(); this.dirty = true; this.renderScreen(true); });
    if (id === "copy") return this.startActivity("Copying the sailings board", 1, () => { this.copyBoard(); this.renderScreen(true); });
    if (id === "rest") return this.startActivity("Resting", 3, () => { this.slept(); this.feedPush({ k: "routine", html: "You rest three hours." }); });
    if (id === "sleep") { const h = Math.max(1, AZ.Clock.nextDawn(s.clock, this.lat()) - s.clock); return this.startActivity("Sleeping", h, () => { this.slept(); this.feedPush({ k: "routine", html: "You sleep until dawn." }); }); }
    if (id === "wait" && v && v.state === "port") { s.clock = Math.max(s.clock, v.departAt); this.timeChosen(); this.dirty = true; return; }
    if (id === "captain" && v) return this.startActivity(`Planning with ${v.captain}`, 1, () => {
      const left = v.course ? Math.max(0, v.course.length - 1 - v.pos) * (v.milesPerStep || w.miles) : 0, eta = s.clock + left / Math.max(1, v.speed || 6);
      for (const x of v.stops.slice(v.leg)) if (x.b != null) this.knowPlace(`b${x.b}`, "heard", `${v.captain}, ${AZ.Clock.fmt(s.clock)}`);
      this.feedPush({ k: "note", cls: "teal", html: `${U.esc(v.captain)} goes over the course with you: ${v.stops.map((x, i) => `${i < v.leg ? "<s>" : ""}${U.esc(x.name)}${x.stay ? ` (${x.stay} h in port)` : ""}${i < v.leg ? "</s>" : ""}`).join(" → ")}.${v.state === "sea" ? ` He expects to make ${U.esc(v.stops[v.leg]?.name || "port")} ${AZ.dayWords(eta)}.` : ""}` });
    });
    if (id === "gossip" || id === "crew") return this.startActivity(id === "crew" ? "Talking with the crew" : "Gossiping with the passengers", 1, () => {
      const rm = this.know.rumour(s.c, s.r, U.rng(`${s.seed}:pax:${Math.floor(s.clock / 24)}:${id}`), this);
      this.feedPush({ k: "note", cls: "teal", html: rm ? `${id === "crew" ? "A hand" : "A fellow passenger"}: “${rm}` : `${id === "crew" ? "The crew" : "The passengers"} have nothing new to say.` });
    });
    if (id === "dice") return this.startActivity("Dice on deck", 3, () => {
      const r = U.rng(`${s.seed}:dice:${Math.floor(s.clock)}`), stake = U.rn(Math.max(0.2, AZ.Prices.ration(w, this.townNear ? this.townNear() : null) * 2), 2), won = r() < 0.47;
      s.purse = U.rn(Math.max(0, s.purse + (won ? stake : -stake)), 2);
      this.feedPush({ k: "note", html: `Dice by lantern-light: you ${won ? "win" : "lose"} 🟡 ${stake}. ${r() < 0.5 ? "The talk is of the next port's harbour dues." : "Someone swears the coast ahead is watched."}` });
    });
  };
  // ------------------------------------------------------------------ menus drawn on the Story screen
  G.hostFor = function (prompt) {
    if (!this.a6) return null;
    if (this._townB && String(prompt).startsWith(`<b>${U.esc(this._townB.name)}</b> · `)) return { kind: "town", b: this._townB };
    const p = AZ.plain(prompt);
    if (/^(Make camp, wait, or look for food\?|Heave to, anchor, or put lines over\?|Make camp or wait\?|Heave to or anchor\?)/.test(p)) return { kind: "camp" };
    return null;
  };
  const GROUPS = [
    ["The journey and your stories", (o, t) => /^[★◆]/.test(t)],
    ["Lodging and faith", (o, t, role) => /innkeeper|priest|shrine|temple|monk|healer/i.test(role) || /^(Inn:|Give alms|Ask the (priest|shrine)|Visit .* \(.*(temple|shrine|church|monastery))/i.test(t)],
    ["Trade", (o, t, role) => /merchant|factor|banker/i.test(role) || /^(Market|Warehouse|Trade|Counting)/i.test(t)],
    ["Passage", (o, t, role) => /harbour|shipwright|wainwright|stable|coach/i.test(role) || /^(Harbour|Coach office|Shipwright|Wainwright|Stables|Board|Have the|Night orders|Your (boat|vessel|ship))/i.test(t)],
    ["Rest and camp", (o, t) => /^(Camp|Anchor|Wait|Two days|Heave)/i.test(t)],
    ["Food from the land and water", (o, t) => /^(Fish|Forage)/i.test(t)],
    ["Work, news and people", () => true],
  ];
  G.hostChoose = function (host, prompt, options, opts) {
    const ui = this.ui, el = $("story-left");
    if (this.screen !== "story") this.showScreen("story");
    return new Promise(res => {
      let sel = options.findIndex(o => !o.disabled); let done = false;
      const lastIdx = options.length - 1, isLeave = o => /^(Leave|Never mind|Back)$/.test(AZ.plain(o.label));
      const render = () => {
        const groups = GROUPS.map(([name]) => ({ name, items: [] }));
        options.forEach((o, k) => { if (isLeave(o)) return; const t = AZ.plain(o.label), role = (o.act && o.act.role) || ""; const gi = GROUPS.findIndex(([, f]) => f(o, t, role)); groups[gi].items.push(k); });
        const head = host.kind === "town" ? `<div style="display:flex;justify-content:space-between;align-items:baseline"><span class="hook" style="font-size:19px">${U.esc(host.b.name)}</span><span class="dim small">what you can see and do today</span></div><div class="dim small">${String(prompt).split(" · ").slice(1).join(" · ")}</div>` : `<div class="hook" style="font-size:19px">${s0.aboard ? "Aboard" : "Camp"}</div><div class="dim small">${prompt}</div>`;
        const btn = k => { const o = options[k]; return `<button type="button" class="opt ${k === sel ? "sel " : ""}${o.cls || ""}" data-k="${k}" ${o.disabled || done ? "disabled" : ""}>${o.label}</button>`; };
        el.innerHTML = (this.arrivalHtml() || "") + head + groups.filter(g => g.items.length).map(g => `<div class="grp"><div class="lbl">${g.name}</div>${g.items.map(btn).join("")}</div>`).join("") +
          `<div class="grp">${options.map((o, k) => (isLeave(o) ? btn(k) : "")).join("")}</div>`;
        el.querySelectorAll("[data-k]").forEach(b => (b.onclick = () => pick(+b.dataset.k)));
        const sb = el.querySelector(".opt.sel"); if (sb && sb.scrollIntoView) sb.scrollIntoView({ block: "nearest" });
      };
      const s0 = this.s;
      const pick = k => { if (done || !options[k] || options[k].disabled) return; done = true; ui.active = null; render(); res(k); };
      const move = d => { for (let i = 0; i < options.length; i++) { sel = (sel + d + options.length) % options.length; if (!options[sel].disabled) break; } render(); };
      ui.active = { type: "choose", move, pick: () => pick(sel), cancel: () => pick(opts.cancel != null ? opts.cancel : lastIdx) };
      render();
    });
  };
  const town6 = G.town;
  G._townRaw = function (b) { return town6.call(this, b); };
  G.town = async function (b) {
    if (!this.a6) return town6.call(this, b);
    if (this._inLoop) return town6.call(this, b);
    return this.showScreen("story"); // a town opens on the Story screen, whose loop runs it
  };
  G._townOld = async function (b) {
    const s = this.s, t = this.tl;
    t.heading = null; if (!s.aboard) { s.auto = false; s.autoPath = null; }
    this._townB = b; this.hosting = "town";
    this.knowPlace(`b${b.i}`, "seen", "you were there");
    this.showScreen("story");
    try { return await town6.call(this, b); }
    finally {
      this._townB = null; this.hosting = null;
      if (this.screen === "story") this.showScreen(s.aboard ? (this.jr && this.mode !== "sandbox" ? "journey" : "world") : "world"); else this.renderStory();
    }
  };
  const rest6 = G.rest;
  G._restRaw = function () { return rest6.call(this); };
  G.rest = async function () {
    if (!this.a6) return rest6.call(this);
    return this.showScreen("story"); // camp, wait, fish and forage are options on the Story screen
  };
  G._restOld = async function () {
    if (!this.a6 || this.riding()) return rest6.call(this);
    const prev = this.screen, t = this.tl;
    t.heading = null;
    this.hosting = "camp"; this.showScreen("story");
    try { await rest6.call(this); }
    finally { this.hosting = null; this.timeChosen(); if (this.screen === "story") this.showScreen(prev === "story" ? "world" : prev || "world"); }
  };
  const ship6 = G.shipTalk;
  G.shipTalk = async function () { if (!this.a6) return ship6.call(this); this.showScreen("story"); };
  const ap6 = G.arrivalPages;
  G.arrivalPages = function (cp, k, d, L) {
    const pages = ap6 ? ap6.call(this, cp, k, d, L) : L;
    if (this.a6) { this.lastArrival = { k, t: this.s.clock, html: [].concat(pages).join("") }; this.tl.heading = null; setTimeout(() => this.showScreen("story"), 0); }
    return pages;
  };
  const journal6 = G.journal;
  G.journal = function () { if (!this.a6) return journal6.call(this); this.showScreen("memory"); };
  const wmap6 = G.worldMap;
  G.worldMap = function () { if (!this.a6) return wmap6.call(this); this.toggleMap(); };
  const started6 = G.started;
  G.started = function (...a) {
    if (this.a6 && this.tl) { const t = this.tl; t.shown = null; t.heading = null; t.activity = null; t.helm = false; t.crewGoal = null; t.paused = false; t.wasAboard = undefined; t.fired = {}; t.pend = 0; t.waiters = []; this.lastArrival = null; this._pan = null; }
    const r = started6.apply(this, a);
    if (this.a6) { this.kn(); this.showScreen("world"); }
    return r;
  };

  // ------------------------------------------------------------------ the menu, settings, help, about
  const menu5 = G.menu;
  G.menu = async function () {
    if (!this.a6) return menu5.call(this);
    const items = [["resume", "Back to the game"], ["settings", "Settings"], ["help", "How to play"], ["save", "Save now"], ...(this.mode === "sandbox" ? [["atlas", `Atlas mode: ${this.atlas ? "on" : "off"} (the true world)`]] : []), ["about", "About"], ["new", "New game"]];
    this.ui.modal(`<div class="sheet" style="max-width:460px"><h2>Menu</h2>${items.map(([id, l]) => `<button type="button" class="opt" data-m="${id}">${l}</button>`).join("")}</div>`);
    this.ui.modalKey = e => { if (e.key === "Escape") this.ui.closeModal(); };
    this.ui.el.modal.querySelectorAll("[data-m]").forEach(b => (b.onclick = () => {
      const id = b.dataset.m; this.ui.closeModal();
      if (id === "settings") this.settings(); else if (id === "help") this.help(); else if (id === "about") this.about();
      else if (id === "save") this.hint(this.saveGame() ? "Saved in this browser." : "Could not save here.");
      else if (id === "atlas") { this.atlas = !this.atlas; this.fogReset(); this.hint(this.atlas ? "Atlas: the true world, every layer." : "Atlas off: the world as you know it."); }
      else if (id === "new") this.title(true);
    }));
  };
  G.applySettings = function () {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("pad", !!this.set.pad);
    document.body.classList.toggle("notags", this.set.tags === false);
    this.fogReset(); this.dirty = true;
  };
  G.settings = function () {
    const st = this.set, sel = (k, opts) => `<select data-set="${k}">${opts.map(([v, l]) => `<option value="${v}" ${String(st[k]) === String(v) ? "selected" : ""}>${l}</option>`).join("")}</select>`;
    const onoff = k => sel(k, [["true", "On"], ["false", "Off"]]);
    const row = (l, c, note = "") => `<div class="setrow"><div>${l}${note ? `<div class="dim small">${note}</div>` : ""}</div><div>${c}</div></div>`;
    this.ui.modal(`<div class="sheet"><h2>Settings</h2>
      <h3>Pace</h3>${row("A game day in, at ▶ / ▶▶ / ▶▶▶", [0, 1, 2].map(i => `<input type="number" min="2" max="240" data-pace-i="${i}" value="${st.paceSecs[i]}"> s`).join(" "), "Your own slowest and fastest. Nothing in the game changes the pace.")}
      ${row("Check in", sel("checkin", Object.entries(AZ.CHECKINS)), "A stop you chose: the day card, then carry on.")}
      <h3>What stops the clock</h3><p class="dim small">Decisions always stop it, since they need an answer. Each alarm fires once and then stays on the screen.</p>
      ${row("Arriving at a town or stop", onoff("stopArrive"))}${row("Scenes", onoff("stopScenes"), "Off: scenes go to the feed and play goes on; the journey's own pages always stop.")}
      ${row("Hunger: two days of food left", onoff("stopHunger"))}${row("Sleep: 16 hours awake", onoff("stopSleep"))}${row("Crew patience nearly gone", onoff("stopCrew"))}${row("Notes: sightings, catches, weather", onoff("stopNotes"))}
      ${row("Reading pauses the clock", onoff("readPause"), "Memory, Inventory and Story pause movement while open; a wait or a task you chose goes on.")}
      <h3>The map</h3>${row("Fog of war", sel("fog", [["land", "Land shown, the changing world hidden"], ["full", "Full fog"], ["none", "None"]]))}
      ${row("Data tags (data, mixed, new)", sel("tags", [["true", "Shown"], ["false", "Hidden"]]))}
      <h3>Controls</h3>${row("Touch pad for the arrows", onoff("pad"), "Off by default: tap a tile on World and choose Walk there.")}
      <p class="dim">Esc to close</p></div>`);
    const m = this.ui.el.modal;
    m.querySelectorAll("[data-set]").forEach(el => (el.onchange = () => { const v = el.value; st[el.dataset.set] = v === "true" ? true : v === "false" ? false : v; AZ.saveSettings(this.store, st); this.applySettings(); }));
    m.querySelectorAll("[data-pace-i]").forEach(el => (el.onchange = () => { st.paceSecs[+el.dataset.paceI] = U.clamp(+el.value || 12, 2, 240); AZ.saveSettings(this.store, st); this.dirty = true; }));
    this.ui.modalKey = e => { if (e.key === "Escape") this.ui.closeModal(); };
  };
  const help5 = G.help;
  G.help = function () {
    if (!this.a6) return help5.call(this);
    this.ui.modal(`<div class="sheet"><h2>How to play</h2>
      <p>The race against par is the centre: where am I going, will I make it, and what do I know that helps? Only you control time. The clock runs at the pace on the timeline while you move, are carried, or wait; when you stand still, it waits for you.</p>
      <h3>Three levels, five screens</h3><p>Memory and Inventory are the inner world: the clock stands still. Story is the world you can touch: there the clock runs at one second a second. World and Journey are the planned world: the clock runs at the pace you set, and only there do pop-ups and warnings appear.</p><table class="keys">
      <tr><th>1 Memory</th><td>What your traveller knows: the beginning, documents, prices and sailings, news, places, people, side stories, your notes and the log.</td></tr>
      <tr><th>2 Inventory</th><td>What you carry, and the vehicle's hold. Write prices into your notebook; copy a sailings board onto a handbill.</td></tr>
      <tr><th>3 Story</th><td>Every choice open to you (the town, the vehicle, the company, documents, the end of the day) on the left; what each one answers, the plan and the story so far on the right. Make a note (N) copies an answer into your notebook.</td></tr>
      <tr><th>4 World</th><td>The tiles, as far as you can see. Click a tile for hours on foot and Walk there. Zoom out (− or M) for the mental map.</td></tr>
      <tr><th>5 Journey</th><td>The race, the vehicle and the viewing window. On your own vessel, take the helm or let the crew sail the agreed course.</td></tr></table>
      <h3>Keys</h3><table class="keys">
      <tr><th>Arrows / WASD</th><td>Step one tile: the clock runs for that step and stops. Aboard your own vessel, an arrow takes the helm.</td></tr>
      <tr><th>Space</th><td>The Story screen. There, arrows and Enter choose.</td></tr>
      <tr><th>P · [ ] · G</th><td>Pause or play · slower or faster · Play a day (World and Journey only)</td></tr>
      <tr><th>F · T · N</th><td>Walk to your target (aboard: the crew sails the course) · take or hand back the helm · make a note</td></tr>
      <tr><th>M · + − · L · I</th><td>Mental map · zoom · lens · info for the tile you stand on</td></tr>
      <tr><th>1–5 · Esc · H</th><td>Screens · menu · this help</td></tr></table>
      <h3>The end of the day</h3><p>End the day from Story, or from the day card at dusk. You head to bed at the hour of your sleep routine and sleep until the hour you wake; you can wake early. At an inn, the night is the inn's. Carried, the vessel goes on while you sleep.</p>
      <h3>What you know</h3><p>In sight is drawn live; ground you have seen is dimmed and fades with age; places heard of are a dashed ring. Prices stay exact in memory for three weeks, sailings for two; after that they blur unless written down. News keeps its date.</p>
      <p>Tags: ${T("data")} read from the map · ${T("mixed")} a rule applied to the map · ${T("new")} made up for this game. One tile is ${U.num(this.w.miles, 2)} miles.</p>
      <p class="dim">${AZ.VERSION} · Esc to close</p></div>`);
    this.ui.modalKey = e => { if (e.key === "Escape" || e.key === "h" || e.key === "H") this.ui.closeModal(); };
  };
  G.about = function () {
    const w = this.w;
    this.ui.modal(`<div class="sheet"><h2>About</h2><p><b>${U.esc(w.P.world.name)}</b> · year ${w.W.calendar?.year || "?"} ${U.esc(w.W.calendar?.era || "")} · ${U.num(w.cols)} × ${U.num(w.rows)} tiles of ${U.num(w.miles, 2)} mi.</p>
      <p>${AZ.VERSION}. The world comes from Azgaar's Fantasy Map Generator; names are generated with Azgaar's own method from its namebases (MIT licence). The game runs entirely in this file, offline.</p>
      <p>Looking at the true world is never punished: in Sandbox, Atlas mode shows every layer.</p><p class="dim">Esc to close</p></div>`);
    this.ui.modalKey = e => { if (e.key === "Escape") this.ui.closeModal(); };
  };

  // ------------------------------------------------------------------ input
  G.onArrow = function (dir) {
    const s = this.s, t = this.tl;
    if (!s || this.ui.busy()) return;
    if (this.riding()) { this.hint(s.voyage.mode === "land" ? "The coachman drives. Story (3) for pastimes." : "The captain has the helm. Story (3) for pastimes."); return; }
    if (this.anim || t.stepOnce || this.lag() > 0.01) return; // one tile at a time
    if (s.aboard && s.vessel && !t.helm) this.takeHelm(true);
    t.heading = null; s.dir = dir;
    if (s.auto) { s.auto = false; s.autoPath = null; }
    if (s.aboard && s.vessel) t.crewGoal = null;
    t.stepOnce = dir; t.chosen = true; this.resume(); // the clock runs for one step, then stops
    if (!this.planned()) this.showScreen(s.aboard ? "journey" : "world", { keep: true });
    this.dirty = true;
  };
  G.stopMoving = function () { const s = this.s, t = this.tl; if (t.heading || (s.auto && !s.aboard)) { t.heading = null; if (!s.aboard) { s.auto = false; s.autoPath = null; } this.dirty = true; return true; } return false; };
  G.onKey = function (e) {
    const ui = this.ui, k = e.key, g = this;
    if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    if (ui.modalKey) { if (ui.key(e)) e.preventDefault(); return; }
    if (!g.s) return;
    if (/^[1-5]$/.test(k)) { e.preventDefault(); g.showScreen(SCREENS[+k - 1]); return; }
    if (k === "p" || k === "P" || k === "Pause") { e.preventDefault(); g.togglePause(); return; }
    if (k === "[" || k === "]") { const p = g.tl.paused ? 0 : g.tl.pace; g.setPace(U.clamp(p + (k === "]" ? 1 : -1), 0, 3)); return; }
    if ((k === "g" || k === "G") && !ui.active) { g.playDay(); return; }
    if ((k === "n" || k === "N") && g.screen === "story" && g.makeNote && !(ui.active && !ui.active.deck)) { g.makeNote(); return; }
    if (ui.active) { if (ui.key(e)) e.preventDefault(); return; }
    if (g.tl.pend) return;
    const DK = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right", W: "up", S: "down", A: "left", D: "right" };
    if (DK[k]) { e.preventDefault(); g.onArrow(DK[k]); return; }
    if (k === " " || k === "Enter" || k === "z" || k === "Z") { e.preventDefault(); g.stopMoving(); g.showScreen("story"); return; }
    if ((k === "n" || k === "N") && g.screen === "story" && g.makeNote) { g.makeNote(); return; }
    if (k === "f" || k === "F") { if (g.s.aboard && g.s.vessel && !g.s.voyage) g.sailOn(g.s.waypoint && !g.w.isLand(...g.s.waypoint) ? { wp: g.s.waypoint } : { cp: g.s.cp }); else { g.tl.heading = null; g.setAuto(!g.s.auto); if (g.s.auto) { g.tl.chosen = true; g.resume(); } } return; }
    if (k === "t" || k === "T") { g.takeHelm(); return; }
    if (k === "r" || k === "R") { g.rest(); return; }
    if (k === "i" || k === "I") { g.toggleInspect(); return; }
    if (k === "l" || k === "L") { g.cycleLens(e.shiftKey ? -1 : 1); return; }
    if (k === "m" || k === "M") { g.toggleMap(); return; }
    if (k === "j" || k === "J") { g.showScreen("memory"); return; }
    if (k === "h" || k === "H" || k === "?") { g.help(); return; }
    if (k === "+" || k === "=") { g.zoomBy(1); return; }
    if (k === "-" || k === "_") { g.zoomBy(-1); return; }
    if (k === "Escape" || k === "x" || k === "X") { const card = $("world-card"); if (card && card.classList.contains("on")) { card.classList.remove("on"); return; } g.menu(); }
  };
  G.installShell = function () {
    const g = this, cv = this.ren.cv;
    $("menubtn").onclick = () => { if (!g.ui.busy()) g.menu(); };
    document.querySelectorAll("#tabs [data-scr]").forEach(b => (b.onclick = () => g.s && g.showScreen(b.dataset.scr)));
    document.querySelectorAll(".pace [data-pace]").forEach(b => (b.onclick = () => g.setPace(+b.dataset.pace)));
    document.querySelector(".pace [data-play]").onclick = () => g.playDay();
    $("checkbtn").onclick = () => { const ks = Object.keys(AZ.CHECKINS); g.set.checkin = ks[(ks.indexOf(g.set.checkin) + 1) % ks.length]; AZ.saveSettings(g.store, g.set); g.clockHud(); };
    let down = null;
    cv.addEventListener("pointerdown", e => { down = { x: e.clientX, y: e.clientY, pan: g._pan ? g._pan.slice() : [0, 0], moved: false }; });
    cv.addEventListener("pointermove", e => {
      g._hover = g.screen === "world" && e.pointerType === "mouse" ? { x: e.clientX, y: e.clientY } : null;
      if (down && g._cam && g._cam.mode === "map" && g.screen === "world") { const dx = e.clientX - down.x, dy = e.clientY - down.y; if (Math.abs(dx) + Math.abs(dy) > 6) { down.moved = true; g._pan = [down.pan[0] + dx / g._cam.S, down.pan[1] + dy / g._cam.S]; g.dirty = true; } }
    });
    cv.addEventListener("pointerleave", () => { g._hover = null; });
    cv.addEventListener("pointerup", e => {
      const d = down; down = null;
      if (!g.s || (d && d.moved) || g.ui.busy() || !(g.screen === "world" || g.screen === "journey")) return;
      const t = g.tileAtScreen(e.clientX, e.clientY); if (t) g.tileCard(t[0], t[1]);
    });
    cv.addEventListener("wheel", e => { if (g.screen !== "world") return; e.preventDefault(); g.zoomBy(e.deltaY < 0 ? 1 : -1); }, { passive: false });
    document.querySelectorAll("[data-pad]").forEach(btn => btn.addEventListener("pointerdown", e => { e.preventDefault(); g.onArrow(btn.dataset.pad); }));
    this.applySettings();
  };
  // ------------------------------------------------------------------ boot
  const boot5 = AZ.boot;
  AZ.boot = async function (packText) {
    if (typeof document === "undefined" || !document.getElementById("bottom")) return boot5(packText);
    const status = document.getElementById("status");
    try {
      const P = await AZ.loadPack(packText);
      const w = new AZ.World(P);
      const mk = (W, H) => { const c = document.createElement("canvas"); c.width = W; c.height = H; return c; };
      const art = new AZ.Art(w, mk), cv = document.getElementById("view"), ren = new AZ.Renderer(w, art, cv, mk);
      const jr = P.journeys.length ? new AZ.Journey(w, P.journeys[0]) : null;
      let store;
      try { store = window.localStorage; store.getItem("x"); } catch (e) { store = { getItem: () => null, setItem: () => { throw e; } }; }
      const ui = new AZ.UI(), g = new AZ.Game(w, ren, ui, jr, store);
      AZ.game = g;
      g.tlInit(); AZ.installNarrator(g); g.screen = "world"; g.zoomIdx = 4;
      const fit = () => { cv.width = window.innerWidth; cv.height = window.innerHeight; g.dirty = true; g.layoutVars(); };
      window.addEventListener("resize", fit); fit();
      status.remove();
      g.installShell();
      window.addEventListener("keydown", e => g.onKey(e));
      window.addEventListener("blur", () => (g.held = []));
      g.title();
      const loop = now => { try { g.frame(now); } catch (e) { console.error(e); } requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
      setTimeout(() => g.layoutVars(), 300);
    } catch (err) {
      status.textContent = "Could not load the world: " + err.message;
      console.error(err);
    }
  };
})();
