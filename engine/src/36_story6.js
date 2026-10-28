// =============================================================================================
// 36_story6.js · Alpha 6, first playtest round.
//   Three levels. The inner world (Memory, Inventory): the clock stands still. The interactable
//   world (Story): the clock runs at one second a second and cannot be changed. The planned world
//   (World, Journey): the clock runs at the pace you set and can be paused; only here do pop-ups and
//   alarms appear, so a pop-up that arises on Story brings up World (on foot) or Journey (carried).
//   Story gathers decisions from every system into one Decision panel, and every option answers in
//   the Information panel, where it can be noted down. The day ends with a routine: heading to bed,
//   sleeping (one option: wake up), waking at the hour you set. Tasks such as writing in the notebook
//   take the character for a while: carried, the vehicle goes on; on foot, you stop by the road.
// =============================================================================================
(() => {
  const G = AZ.Game.prototype, U = AZ.U, T = AZ.T;
  const $ = id => (typeof document !== "undefined" ? document.getElementById(id) : null);
  const span = h => AZ.Clock.span(Math.max(0, h));
  const hhmm = h => { h = ((h % 24) + 24) % 24; const hh = Math.floor(h), mm = Math.floor((h - hh) * 60); return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`; };
  const plain = h => AZ.plain(h);
  AZ.ROUTINE0 = { bed: "dawn-8", wake: "dawn", crew: "ask", party: "sleep" };
  AZ.ROUTINE_OPTS = {
    bed: [["dawn-8", "Eight hours before dawn"], ["dusk+2", "Two hours after dusk"], ["22", "At 22:00"], ["24", "At midnight"]],
    wake: [["dawn", "At dawn"], ["dawn-1", "An hour before dawn"], ["dawn+1", "An hour after dawn"]],
    crew: [["ask", "Ask me each night"], ["anchor", "Anchor at dusk"], ["sail", "Sail on through the night in watches"]],
    party: [["sleep", "Sleep when you sleep"], ["watch", "Keep watch in turns"]],
  };
  G._interactRaw = G.interact; // the old Space: towns, marked places, boarding and going ashore; now options on Story
  G.routine = function () { const s = this.s; s.routine = { ...AZ.ROUTINE0, ...(s.routine || {}) }; return s.routine; };

  // ------------------------------------------------------------------ the clock, by level
  G.tlRate = function () {
    const t = this.tl; if (!t) return 0;
    const sc = this.screen;
    if (sc === "memory" || sc === "inventory") return 0;      // the inner world: the clock stands still
    if (sc === "story") return 1 / 3600;                       // the interactable world: one second a second
    return t.paused ? 0 : 24 / Math.max(1, +this.set.paceSecs[t.pace - 1] || 12);
  };
  G.readPaused = function () { return false; };
  G.planned = function () { return this.screen === "world" || this.screen === "journey"; };
  const show6 = G.showScreen;
  G.showScreen = function (name, o = {}) {
    const prev = this.screen;
    if (this.a6 && this.tl && (name === "world" || name === "journey") && prev && prev !== "world" && prev !== "journey" && !o.keep) this.tl.paused = true;
    if (this.a6 && prev === "story" && name !== "story" && this._deck) this.deckRelease();
    show6.call(this, name);
    if (this.a6 && name === "story" && this.s) setTimeout(() => this.storyLoop(), 0);
  };
  // a pop-up belongs to the planned world: from Story it brings up World or Journey
  G.toPlanned = function () { if (this.screen === "story") this.showScreen(this.s.aboard ? "journey" : "world", { keep: true }); };

  // ------------------------------------------------------------------ the loop, with time passing in place
  G.tlStep = function (rate) {
    const s = this.s, t = this.tl, dt = t.dt || 0;
    if (rate <= 0) return;
    if (t.pauseAfter) { t.pauseAfter = false; t.paused = true; this.dirty = true; return; }
    const a = t.activity;
    if (a && a.pending) return this.beginActivity();
    let moved = false;
    if (this.riding()) { if (s.voyage.state === "sea") moved = this.stepTimed(() => this.voyageStep()); }
    else if (!(a && a.inPlace)) {
      const v = s.vessel, own = !!(s.aboard && v && !s.voyage);
      if (t.stepOnce && this.planned()) { const d = t.stepOnce; t.stepOnce = null; moved = this.stepTimed(() => this.tryMove(d)); t.pauseAfter = true; if (!moved) { t.paused = true; t.pauseAfter = false; } }
      else if (this.planned() || own) {
        if (own && !t.helm && (v.crew || 0) > 0 && t.crewGoal) this.crewCourse();
        if (s.auto) { const d = this.autoDir(); if (d) moved = this.stepTimed(() => this.tryMove(d)); if (!moved) { this.setAuto(false); s.autoPath = null; if (own && t.crewGoal && t.crewGoal.wp) t.crewGoal = null; } }
      }
    }
    if (!moved && dt > 0) { const h0 = s.clock, h = rate * dt; s.clock += h; t.shown = s.clock; this.tlCrossings(h0, s.clock); } // time passes in place
  };
  // hours awake follow the clock (the rules add hours at each step; waits and voyages fill the rest)
  const awakeT = G.awakeTick;
  G.awakeTick = function (h) { const r = awakeT.call(this, h); if (this.s) this.s.awakeSync = this.s.clock; return r; };
  const slept6 = G.slept;
  G.slept = function () { const r = slept6.call(this); if (this.s) { this.s.awakeSync = this.s.clock; this.s.sleptAt = this.s.clock; } return r; };
  G.syncAwake = function () {
    const s = this.s; if (!s) return;
    if (s.awakeSync == null || s.awakeSync > s.clock) { s.awakeSync = s.clock; return; }
    const gap = s.clock - s.awakeSync;
    if (gap <= 0.05) return;
    if (s.sleep && s.clock <= s.sleep.until + 0.01) { s.awakeSync = s.clock; return; }
    if (this.blocked()) return;
    this.awakeTick(gap);
  };
  // a decision card or a menu blocks; the Story panels do not
  G.blocked = function () { const a = this.ui.active; return !!(this.ui.modalKey || (a && !a.deck) || (this.tl && this.tl.pend > 0)); };
  G.isAsleep = function () { const s = this.s, t = this.shownClock(); return !!(s.sleep && t >= s.sleep.from - 0.01 && t < s.sleep.until); };
  G.sleepWords = function () {
    const s = this.s, t = this.shownClock();
    if (this.isAsleep()) return { asleep: true, h: t - s.sleep.from };
    return { asleep: false, h: Math.max(0, (s.awake || 0) - this.lag()) };
  };

  // ------------------------------------------------------------------ frame hooks: tasks, sleep, the end of the day, warnings
  const frame6 = G.frame;
  G.frame = function (now) {
    if (!this.a6 || !this.s) return frame6.call(this, now);
    const t = this.tl, s = this.s;
    t.dt = t.last == null ? 0 : Math.min(0.25, Math.max(0, (now - t.last) / 1000));
    const r = frame6.call(this, now);
    let sh = this.shownClock(), caught = s.clock - sh < 1e-4;
    // on Story the panels hold the keyboard, but the clock runs on: one second a second, in place
    const ua = this.ui.active;
    if (this.screen === "story" && caught && ua && (ua.deck || ua.info) && !t.pend && !this.ui.modalKey) {
      const h = this.tlRate() * t.dt;
      if (h > 0) { const h0 = s.clock; s.clock += h; t.shown = s.clock; sh = s.clock; this.tlCrossings(h0, s.clock); if (Math.floor(s.clock / 24) !== Math.floor(h0 / 24)) { this.ui.active = null; this.tick(); if (!this.ui.active && this.screen === "story") this.ui.active = ua; } }
    }
    if (caught && !this.blocked()) this.syncAwake();
    if (s.sleep && sh >= s.sleep.until - 1e-4 && caught) this.wake(false);
    if (s.eod && !s.sleep && !this.blocked()) {
      if ((s.sleptAt || -1) > s.eod.at) { s.eod = null; this.dirty = true; } // the night has already passed
      else if (sh >= s.eod.bedAt) this.beginSleep();
    }
    if (t.pendWarn && caught && !this.ui.busy() && !t.pend && this.planned()) { const wn = t.pendWarn; t.pendWarn = null; this.showWarning(wn); }
    if (t.pendScene && !this.ui.busy() && this.planned()) { const sc = t.pendScene; t.pendScene = null; this.ui.say(sc); }
    if (t.pendAfter && caught && !this.ui.busy() && this.planned()) { const pa = t.pendAfter; t.pendAfter = null; this.afterTaskCard(pa); }
    if (this.screen === "story" && (this.dirty || now - (this._infoT || 0) > 1000)) { this._infoT = now; this.renderInfo(); if (this._deck) this.renderDeck(); }
    return r;
  };

  // ------------------------------------------------------------------ tasks
  G.startActivity = function (label, hours, done, o = {}) {
    const s = this.s, t = this.tl;
    if (!t) { s.clock += hours; if (done) done(); return; }
    if (t.activity) { this.hint(`You are busy: ${U.esc(t.activity.label.toLowerCase())}.`); return; }
    if (this.isAsleep()) { this.hint("You are asleep."); return; }
    t.activity = { label, hours, done, pending: true, verb: o.verb || label.toLowerCase(), cancel: o.cancel !== false };
    this.feedPush({ k: "routine", html: `${U.esc(label)}: ${span(hours)}${this.tlRate() > 0 ? "" : ", when the clock runs"}.` });
    if (this.tlRate() > 0) this.beginActivity();
    this.dirty = true;
  };
  G.beginActivity = function () {
    const s = this.s, t = this.tl, a = t.activity; if (!a || !a.pending) return;
    a.pending = false;
    const ownSailing = s.aboard && s.vessel && !s.voyage && s.auto;
    if ((this.riding() && s.voyage.state === "sea") || ownSailing) { a.t0 = s.clock; a.until = s.clock + a.hours; a.carried = true; } // the vehicle goes on
    else {
      const walking = !s.aboard && (s.auto || t.heading);
      if (walking) { s.auto = false; s.autoPath = null; t.heading = null; a.resumeWalk = true; if (this.planned()) t.pendScene = `${U.esc(this.tv.name)} stops at the side of the road: ${U.esc(a.verb)} (${span(a.hours)}).`; }
      this.events.fx({ time: a.hours }); a.t0 = s.clock - a.hours; a.until = s.clock; a.inPlace = true;
    }
    const done = a.done;
    a.done = () => { if (done) done(); this.feedPush({ k: "note", html: `Done: ${U.esc(a.label.toLowerCase())}.` }); if (a.resumeWalk) t.pendAfter = { label: a.label, wp: s.waypoint }; };
    this.dirty = true;
  };
  G.cancelActivity = function () {
    const s = this.s, t = this.tl, a = t.activity; if (!a) return;
    t.activity = null;
    if (a.inPlace && s.clock > this.shownClock()) s.clock = this.shownClock();
    this.feedPush({ k: "note", html: `You stop: ${U.esc(a.label.toLowerCase())}, unfinished.` });
    this.dirty = true;
  };
  G.afterTaskCard = async function (pa) {
    const s = this.s, k = await this.ui.choose(`Finished: ${U.esc(pa.label.toLowerCase())}. Walk on?`, [{ label: "Continue walking" }, { label: "Options (Story)" }, { label: "Pause here" }], { cancel: 2, who: "The road" });
    if (k === 0) { if (s.waypoint) { this.setAuto(true); this.resume(); } }
    else if (k === 1) this.showScreen("story");
    else this.tl.paused = true;
  };

  // ------------------------------------------------------------------ the end of the day and sleep
  G.bedTime = function (now) {
    const lat = this.lat(), r = this.routine(), dawn = AZ.Clock.nextDawn(now, lat), d = Math.floor(now / 24);
    let bed = dawn - 8;
    if (r.bed === "dusk+2") { const su = AZ.Clock.sun(dawn - 12, lat); bed = Math.floor((dawn - 12) / 24) * 24 + (su.dl > 0 && su.dl < 24 ? su.set : 18) + 2; }
    else if (r.bed === "22" || r.bed === "24") { bed = d * 24 + +r.bed; if (bed > dawn) bed -= 24; }
    return bed < now ? now : bed;
  };
  G.wakeTime = function (from) { const r = this.routine(), dawn = AZ.Clock.nextDawn(from, this.lat()); return Math.max(from + 1, r.wake === "dawn-1" ? dawn - 1 : r.wake === "dawn+1" ? dawn + 1 : dawn); };
  G.sleepMode = function () {
    const s = this.s, w = this.w, b = this.burgHere();
    if (this.riding()) return "aboard";
    if (s.aboard && s.vessel) return "vessel";
    if (b && w.burgAt.get(w.idx(s.c, s.r))) return s.purse >= AZ.Prices.inn(w, b) ? "inn" : "rough";
    return "camp";
  };
  const MODE = { inn: "a room at the inn", camp: "camp here", aboard: "sleep aboard; she sails on", vessel: "the crew's night", rough: "sleep under the eaves" };
  G.endOfDay = function (mode) {
    const s = this.s, t = this.tl, now = this.shownClock();
    mode = mode || this.sleepMode();
    if (mode === "inn" && s.purse < AZ.Prices.inn(this.w, this.burgHere())) mode = "rough";
    const bed = this.bedTime(now);
    s.eod = { mode, bedAt: bed, at: now };
    t.heading = null; if (!s.aboard) { s.auto = false; s.autoPath = null; }
    this.info = { title: "The end of the day", kind: "eod", html: `${this.daySummaryHtml()}<p class="hook">Heading to bed${bed > now + 0.02 ? ` at ${hhmm(bed)}` : " now"}: ${MODE[mode]}.</p>` };
    this.feedPush({ k: "routine", html: `The end of the day: ${MODE[mode]}, to bed at ${hhmm(bed)}.` });
    this.dirty = true;
  };
  G.daySummaryHtml = function () {
    const s = this.s, d = this.dayLog(), card = (s.feed || []).slice().reverse().find(e => e.k === "day" && e.day === Math.floor(this.shownClock() / 24));
    if (card) return `<div class="daycard">${card.html}</div>`;
    return `<div class="daycard"><b class="hook">${AZ.dayWords(this.shownClock())}</b> · ${U.num(Math.round(d.miles))} mi so far · ${U.esc(this.whereWords())}${d.line ? `<div>${U.esc(d.line)}</div>` : ""}</div>`;
  };
  G.innNight = async function (b) {
    const s = this.s, w = this.w, P = AZ.Prices, t0 = s.clock;
    const out = this.events.fx({ coin: -P.inn(w, b), time: Math.max(1, this.wakeTime(s.clock) - s.clock), sleep: true, cure: ["hurt"] });
    this.slept();
    const act = this.doAct("rest", b);
    await this.ui.say(`You sleep at the inn in ${U.esc(b.name)}. ${AZ.Clock.span(s.clock - t0)} pass ${T("mixed")}.${out}${act ? ` <span class="hook">★ ${U.esc(act.label)}</span>` : ""}`);
  };
  G.beginSleep = async function () {
    const s = this.s, w = this.w, e = s.eod || { mode: this.sleepMode() }, b = this.burgHere(), from = this.shownClock();
    s.eod = null;
    const ctx = this._opt; this._opt = true; this._infoOut = true;
    this.info = { title: "Sleeping", kind: "sleep", html: (this.info && this.info.kind === "eod" ? this.info.html.replace(/<p class="hook">Heading to bed[^<]*<\/p>/, "") : this.daySummaryHtml()) };
    try {
      if (e.mode === "inn" && b) { await this.innNight(b); s.sleep = { from, until: s.clock, where: `at the inn in ${b.name}`, jump: true }; }
      else if (e.mode === "camp" && !s.aboard && w.isLand(s.c, s.r)) { await this.campNight(); s.sleep = { from, until: Math.max(s.clock, from + 1), where: "in camp", jump: true }; }
      else if (e.mode === "vessel" && s.vessel) {
        const v = s.vessel, orders = this.routine().crew !== "ask" ? this.routine().crew : v.orders || "anchor";
        if (orders === "sail" && v.crew && this.keepsWatches(v)) { s.sleep = { from, until: this.wakeTime(from), where: `below, while the watch sails the ${v.kind.toLowerCase()}`, jump: false }; }
        else { s.clock = Math.max(s.clock, this.wakeTime(s.clock)); v.anchored = true; v.morale = Math.min(100, (v.morale || 50) + 4); this.slept(); this.doAct("anchor"); s.auto = false; s.sleep = { from, until: s.clock, where: "at anchor", jump: true }; this.infoAdd(`The ${U.esc(v.kind.toLowerCase())} lies at anchor until morning.`); }
      }
      else if (e.mode === "aboard" && this.riding()) s.sleep = { from, until: this.wakeTime(from), where: `aboard ${s.voyage.ship}`, jump: false };
      else { const until = this.wakeTime(s.clock); this.events.fx({ time: Math.max(1, until - s.clock) }); this.slept(); s.sleep = { from, until: s.clock, where: "under the eaves", jump: true }; }
    } finally { this._opt = ctx; this._infoOut = false; }
    this.feedPush({ k: "routine", html: `You sleep ${U.esc(s.sleep ? s.sleep.where : "")}.` });
    this.dirty = true;
  };
  G.wake = function (early) {
    const s = this.s, sl = s.sleep; if (!sl) return;
    const now = this.shownClock(), h = now - sl.from;
    s.sleep = null;
    if (early) {
      if (sl.jump && s.clock > now) s.clock = now;
      if (!sl.jump && h >= 5) this.slept(); else if (!sl.jump) s.awake = Math.max(0, (s.awake || 0) - 2 * h);
      s.awakeSync = s.clock;
    } else if (!sl.jump) this.slept();
    const msg = `You wake ${early ? "early" : this.routine().wake === "dawn" ? "at dawn" : "at the hour you set"}, after ${span(h)} asleep ${U.esc(sl.where)}.${early && this.isNight() ? " The town is still asleep: come back in the morning for most things." : ""}`;
    this.feedPush({ k: "note", html: msg });
    this.info = { title: "Morning", kind: "wake", html: `<p>${msg}</p>` };
    this.dirty = true;
  };
  G.isNight = function () { const t = this.shownClock(), su = AZ.Clock.sun(t, this.lat()); if (su.dl >= 24) return false; if (su.dl <= 0) return true; return su.hour >= su.set + 1.5 || su.hour < su.rise; };

  // ------------------------------------------------------------------ warnings: they stop the clock, and come with options
  G.alarms = function () {
    const s = this.s, t = this.tl, f = t.fired, set = this.set;
    if (this.isAsleep()) return;
    const sea = this.riding() || !!s.aboard, lim = sea ? 5 : 2, days = s.sup.food / Math.max(1, this.eaters());
    const market = !s.aboard && this.burgHere() && this.w.burgAt.get(this.w.idx(s.c, s.r)); // in a market town the warning waits until you leave
    if (days <= lim && !market) { if (!f.food) { f.food = 1; if (set.stopHunger) this.warning("food", days < 1 ? "Food for less than a day." : `Food for ${Math.floor(days)} day${days >= 2 ? "s" : ""}${sea ? ", at sea" : ""}.`); } } else if (days > lim + 0.5) f.food = 0;
    const aw = s.awake || 0;
    if (aw >= 20) { if (!f.aw20) { f.aw20 = 1; if (!this.riding()) this.feedPush({ k: "note", html: `${Math.round(aw)} hours awake. Sleep soon.`, cls: "late" }); } } else f.aw20 = 0;
    if (aw >= AZ.COLLAPSE_H - 4) { if (!f.aw48) { f.aw48 = 1; if (set.stopSleep) this.warning("sleep", `${Math.round(aw)} hours awake: close to collapse. At ${AZ.COLLAPSE_H} hours you drop where you stand.`); } } else f.aw48 = 0;
    for (const k of ["hurt", "fever", "gravely"]) { if (s.cond[k]) { if (!f["c_" + k]) { f["c_" + k] = 1; this.warning("health", `${U.cap(AZ.COND[k].on)}${k === "gravely" ? ": close to collapse" : ""}.`); } } else f["c_" + k] = 0; }
    const v = s.vessel;
    if (v && v.crew && s.aboard && !s.voyage) { if (v.morale < 30) { if (!f.crew) { f.crew = 1; if (set.stopCrew) this.warning("crew", `The crew's patience is nearly gone (morale ${Math.round(v.morale)}${v.strikes ? `, strikes ${v.strikes}/3` : ""}).`); } } else if (v.morale > 40) f.crew = 0; }
  };
  G.warning = function (kind, text) { this.tl.pendWarn = { kind, text }; this.feedPush({ k: "note", html: `⚠ ${U.esc(text)}`, cls: "late" }); };
  G.showWarning = async function (wn) {
    const s = this.s, t = this.tl;
    const go = { food: "Head for the nearest town or port (food)", health: "Head for the nearest town (a healer)", crew: "Head for the nearest port", sleep: "End the day now" }[wn.kind];
    const opts = [{ id: "on", label: "Continue" }, { id: "go", label: go, disabled: this.riding() && wn.kind !== "sleep" }, { id: "story", label: "Options (Story)" }, { id: "pause", label: "Pause here" }];
    const k = await this.ui.choose(`<b class="late">Warning</b> · ${U.esc(wn.text)}`, opts, { cancel: 3, who: "Warning" });
    const id = (opts[k] || opts[3]).id;
    if (id === "pause") t.paused = true;
    else if (id === "story") this.showScreen("story");
    else if (id === "go") { if (wn.kind === "sleep") this.endOfDay(); else this.goNearest(wn.kind === "crew" || s.aboard ? "port" : "town"); }
  };
  G.nearestKnown = function (kind) {
    const s = this.s, w = this.w, cls = s.vessel ? s.vessel.cls : "boat";
    let best = null, bd = Infinity;
    for (const p of this.knownPlaces()) {
      if (!p.burg || (kind === "port" && !p.burg.port)) continue;
      const t = kind === "port" ? (w.harbour(p.burg, cls) || {}).t : p.burg.t; if (!t) continue;
      const d = Math.hypot(t[0] - s.c, t[1] - s.r); if (d < bd && d > 0.5) { bd = d; best = { b: p.burg, t }; }
    }
    return best;
  };
  G.goNearest = function (kind) {
    const s = this.s, own = s.aboard && s.vessel && !s.voyage;
    if (this.riding()) { this.infoAdd("The captain keeps his course: you can buy food at the next port."); return; }
    const n = this.nearestKnown(own ? "port" : kind === "port" ? "port" : "town");
    if (!n) { this.infoAdd("You know of no town near enough. Set a target on World."); return; }
    s.waypoint = n.t.slice();
    if (own) { this.sailOn({ wp: n.t.slice() }); this.showScreen("journey", { keep: true }); }
    else { this.tl.heading = null; this.setAuto(true); this.showScreen("world", { keep: true }); }
    this.resume(); this.tl.chosen = true;
    this.feedPush({ k: "note", html: `Bound for ${U.esc(n.b.name)}, the nearest ${own || kind === "port" ? "port" : "town"} you know.` });
  };

  // ------------------------------------------------------------------ the day card, by how you travel
  G.checkIn = async function (k) {
    const s = this.s, t = this.tl;
    const card = (s.feed || []).slice().reverse().find(e => e.k === "day");
    const dusk = k.kind === "dusk", ride = this.riding(), own = s.aboard && s.vessel && !s.voyage;
    const first = !dusk ? { id: "on", label: "Carry on" } : ride ? { id: "carry", label: "Carry on: sleep while she sails on" } : own ? { id: "eod", label: "End the day" } : { id: "camp", label: "Camp" };
    const opts = [first, { id: "story", label: "Options (Story)" }, { id: "pause", label: "Pause here" }];
    const body = dusk && card && card.day === Math.floor(k.t / 24) ? `<div class="daycard">${card.html}</div>` : "";
    const head = dusk ? "Dusk" : k.kind === "dawn" ? "Dawn" : "Check-in";
    const kk = await this.ui.choose(`<b class="hook">${head}</b> · ${AZ.Clock.fmt(k.t)} · ${U.esc(this.whereWords())}${body}`, opts, { cancel: 2, who: "The day card" });
    const id = (opts[kk] || opts[2]).id;
    if (id === "carry" || id === "eod") this.endOfDay();
    else if (id === "camp") this.endOfDay("camp");
    else if (id === "story") this.showScreen("story");
    else if (id === "pause") { t.paused = true; this.info = { title: "The day card", kind: "card", html: body || this.daySummaryHtml() }; }
  };

  // ------------------------------------------------------------------ the short intro: a hook in five cards, the rest in Memory
  const intro6 = AZ.Know.prototype.intro;
  AZ.Know.prototype.intro = function (g) {
    const pages = [].concat(intro6.call(this, g)).filter(Boolean).map(String);
    if (!g || !g.a6) return pages;
    g.s.intro = pages; g.s.introT = g.s.clock; g.s.introOpen = false;
    const find = rx => pages.find(p => rx.test(plain(p)));
    const two = p => { const parts = plain(p).split(/(?<=[.!?”])\s+/); return U.esc(parts.slice(0, 2).join(" ")); };
    const hook = [pages[0]];
    for (const rx of [/^You are /, /^You (stand|set out|start|wake)/, /goal|bound for|destination/i]) { const p = find(rx); if (p && !hook.includes(p)) hook.push(two(p)); }
    const obj = g.objective ? g.objective() : "";
    hook.push(`<b class="hook">First:</b> ${U.esc(obj || "look about you")}. Space opens the Story screen, where the town and your choices are. The whole introduction is in Memory (1).`);
    return hook;
  };

  // ------------------------------------------------------------------ the Story screen: one loop, two panels
  G.storyLoop = async function () {
    if (this._sloop || !this.a6 || !this.s) return;
    this._sloop = true;
    try {
      while (this.screen === "story" && this.s && !this.ui.modalKey) {
        if (this.ui.active) { await new Promise(r => setTimeout(r, 120)); continue; }
        const w = this.w, s = this.s, b = this.burgHere(), inTown = !!b && !this.riding() && !!w.burgAt.get(w.idx(s.c, s.r)) || (!!b && s.aboard && !this.riding() && !!this.harbourAt.get(w.idx(s.c, s.r)));
        this._extraPick = null;
        if (inTown) { this._inLoop = true; this._townB = b; this.hosting = "town"; this.knowPlace(`b${b.i}`, "seen", "you were there"); try { await this._townRaw(b); } finally { this._inLoop = false; this._townB = null; this.hosting = null; } }
        else { const opts = this.gatherOptions(false); const k = await this.deck(null, opts); if (k != null && opts[k]) this._extraPick = opts[k]; }
        const x = this._extraPick; this._extraPick = null;
        if (x) await this.runOption(x);
        await new Promise(r => setTimeout(r, 0));
      }
    } catch (e) { console.error(e); } finally { this._sloop = false; this._opt = false; }
  };
  G.runOption = async function (o) {
    this._opt = true; this.optOut(o.label);
    try { await o.run(); } catch (e) { console.error(e); } finally { this._opt = false; }
    this.dirty = true;
  };
  // every source of decisions, beside the town's own
  G.gatherOptions = function (inTown) {
    const s = this.s, w = this.w, t = this.tl, O = [], add = (group, label, run, o = {}) => O.push({ group, label, run, ...o });
    const ride = this.riding(), v = s.voyage, own = !!(s.aboard && s.vessel && !s.voyage);
    if (ride) {
      add("The vehicle", `Plan with the ${v.mode === "land" ? "coachman" : "captain"} · 1 h`, () => this.pastime("captain"));
      add("The vehicle", "Gossip with the passengers · 1 h", () => this.pastime("gossip"));
      if (v.state === "sea" && v.mode !== "land") add("The vehicle", "Dice on deck · an evening", () => this.pastime("dice"));
      if (v.state === "port") add("The vehicle", `Wait aboard until she sails (${span(v.departAt - this.shownClock())})`, () => this.pastime("wait"), { cls: "hook" });
    }
    if (own) {
      if (s.vessel.crew > 0) {
        add("The vehicle", t.helm ? "Hand the helm to the crew" : "Take the helm (T)", () => this.takeHelm());
        if (!t.helm) add("The vehicle", "Give the crew a new course", () => this.crewDirections(), { cls: "hook" });
        add("The vehicle", "Talk to the crew · 1 h", () => this.pastime("crew"));
      }
    }
    if (s.party && s.party.length && !ride) {
      add("The company", `Ask ${U.esc(s.party[0].name)} and the others what next`, () => this.advice());
      if (!inTown) add("The company", "Look around together", () => this.ui.say([this.know.describe(s.c, s.r, s.aboard).join(" ")], "Look"));
    }
    if (!inTown && !ride) {
      const here = this.hereProbe(); if (here) add("Here", here, () => this._interactRaw());
      if (!s.aboard && w.isLand(s.c, s.r)) add("Food from the land and water", "Wait, fish or forage…", () => this._restRaw());
      else if (own) add("Food from the land and water", "Heave to, anchor or put lines over…", () => this._restRaw());
    }
    const pend = this.notebookPending().length;
    if (pend) add("Documents", `Write up the notebook · ½ h (${pend} town${pend > 1 ? "s" : ""})`, () => this.pastime("notebook"), { cls: "hook" });
    if (this.boardHere()) add("Documents", "Copy the sailings board · 1 h", () => this.pastime("copy"));
    const mode = this.sleepMode();
    add("The day", `End the day: ${MODE[mode]}`, async () => { this.endOfDay(mode); }, { cls: "hook" });
    add("The day", "Sleep until dawn, now", async () => { this.endOfDay(mode); if (this.s.eod) this.s.eod.bedAt = this.shownClock(); });
    if (!ride) add("The day", own ? "Go to the nearest port" : "Go to the nearest town", async () => this.goNearest(own ? "port" : "town"));
    add("The day", "Set the default sleep routine", async () => this.routineForm());
    return O;
  };
  G.hereProbe = function () {
    const s = this.s, w = this.w, [dc, dr] = AZ.DIRS[s.dir] || [0, 0];
    for (const [c, r] of [[s.c, s.r], [s.c + dc, s.r + dr]]) { if (!w.inb(c, r)) continue; const m = (w.markersAt.get(w.idx(c, r)) || [])[0]; if (m && !s.done_m.includes(m.i)) return `Visit ${/^the /i.test(m.name) ? "" : "the "}${U.esc(m.name)}`; }
    if (s.vessel && !s.aboard && Math.abs(s.vessel.c - s.c) + Math.abs(s.vessel.r - s.r) <= 1) return `Board your ${U.esc(s.vessel.kind.toLowerCase())}`;
    if (s.aboard && s.vessel && !s.voyage && w.isLand(s.c + dc, s.r + dr)) return "Go ashore";
    return null;
  };
  G.crewDirections = async function () {
    const s = this.s, w = this.w, opts = [], cls = s.vessel.cls, next = this.cpNext();
    if (next) opts.push({ label: `★ The next stop of the journey: ${U.esc(next.place.name)}`, goal: { cp: s.cp } });
    const np = this.nearestKnown("port"); if (np) opts.push({ label: `The nearest port you know: ${U.esc(np.b.name)}`, goal: { wp: np.t } });
    const th = this.focusThread ? this.focusThread() : null, tg = th && this.threadGoal ? this.threadGoal(th) : null;
    if (tg) { const near = w.near(tg[0], tg[1], 3).find(n => n.kind === "burg" && n.o.port); const h = near ? w.harbour(near.o, cls) : null; if (h) opts.push({ label: `◆ ${U.esc(th.title)}: ${U.esc(near.o.name)}`, goal: { wp: h.t } }); }
    for (const p of this.knownPlaces().filter(p => p.burg && p.burg.port && (!np || p.burg !== np.b)).slice(0, 10)) { const h = w.harbour(p.burg, cls); if (h) opts.push({ label: `${U.esc(p.name)} (${p.lvl === "heard" ? "heard of" : "seen"})`, goal: { wp: h.t } }); }
    opts.push({ label: "Back" });
    const k = await this.ui.choose("Where should the crew sail?", opts, { cancel: opts.length - 1 });
    const o = opts[k]; if (!o || !o.goal) return;
    if (o.goal.wp) s.waypoint = o.goal.wp.slice();
    this.sailOn(o.goal);
    await this.ui.say(`The mate repeats the course: ${o.label.replace(/^★ |^◆ /, "")}. The crew sails when the clock runs.`);
  };
  G.routineForm = async function () {
    const r = this.routine(), keys = Object.keys(AZ.ROUTINE_OPTS), names = { bed: "Go to bed", wake: "Get up", crew: "The crew at night", party: "The company at night" };
    for (;;) {
      const opts = keys.map(k => ({ label: `${names[k]}: <b>${AZ.ROUTINE_OPTS[k].find(x => x[0] === r[k])?.[1] || r[k]}</b>`, k })).concat([{ label: "Done" }]);
      const k = await this.ui.choose("The default sleep routine. Choose a line to change it.", opts, { cancel: opts.length - 1 });
      const o = opts[k]; if (!o || !o.k) break;
      const list = AZ.ROUTINE_OPTS[o.k], i = list.findIndex(x => x[0] === r[o.k]);
      r[o.k] = list[(i + 1) % list.length][0];
      if (o.k === "crew" && this.s.vessel && r.crew !== "ask") this.s.vessel.orders = r.crew;
    }
    this.infoAdd(`Routine: to bed ${AZ.ROUTINE_OPTS.bed.find(x => x[0] === r.bed)[1].toLowerCase()}, up ${AZ.ROUTINE_OPTS.wake.find(x => x[0] === r.wake)[1].toLowerCase()}; the crew: ${AZ.ROUTINE_OPTS.crew.find(x => x[0] === r.crew)[1].toLowerCase()}.`);
  };

  // ------------------------------------------------------------------ the Decision panel
  const GROUPS = [
    ["The journey and your stories", o => /^[★◆]/.test(o.t) && !o.group],
    ["Lodging and faith", o => !o.group && (/innkeeper|priest|shrine|temple|monk|healer/i.test(o.role) || /^(Inn:|Give alms|Ask the (priest|shrine)|Visit .* \(.*(temple|shrine|church|monastery))/i.test(o.t))],
    ["Trade", o => !o.group && (/merchant|factor|banker/i.test(o.role) || /^(Market|Warehouse|Trade|Counting)/i.test(o.t))],
    ["Passage", o => !o.group && (/harbour|shipwright|wainwright|stable|coach/i.test(o.role) || /^(Harbour|Coach office|Shipwright|Wainwright|Stables|Board|Have the|Night orders|Your (boat|vessel|ship))/i.test(o.t))],
    ["Work, news and people", o => !o.group],
    ["The vehicle", o => o.group === "The vehicle"], ["The company", o => o.group === "The company"], ["Here", o => o.group === "Here"],
    ["Food from the land and water", o => o.group === "Food from the land and water"], ["Documents", o => o.group === "Documents"], ["The day", o => o.group === "The day"],
  ];
  const NIGHT_SHUT = /^(Market|Merchant|Warehouse|Harbour|Coach office|Shipwright|Wainwright|Stables|Harbourmaster|Notice board|Counting|Have the|Elder|Watch|Banker|Factor|Townsfolk|★ Book)/i;
  G.deck = function (town, options) {
    return new Promise(res => { this._deck = { town, options, sel: null, res }; this._opt = false; this.renderDeck(); });
  };
  G.deckRelease = function () { const d = this._deck; if (!d) return; this._deck = null; this.ui.active = null; d.res(d.town ? d.town.leave : null); };
  G.deckItems = function () {
    const d = this._deck; if (!d) return [];
    const s = this.s, night = this.isNight(), items = [];
    const src = d.town ? d.town.options.map((o, k) => ({ ...o, k, src: "town" })).filter(o => !/^(Leave)$/.test(plain(o.label))).concat(d.town.extras.map((o, k) => ({ ...o, k, src: "extra" }))) : d.options.map((o, k) => ({ ...o, k, src: "extra" }));
    for (const o of src) {
      const t = plain(o.label), role = (o.act && o.act.role) || "";
      let dis = !!o.disabled, label = o.label;
      if (night && o.src === "town" && (NIGHT_SHUT.test(t) || (role && !/innkeeper|priest|shrine/i.test(role)))) { dis = true; label += ` <span class="dim">· asleep: come back in the morning</span>`; }
      items.push({ ...o, t, role, dis, label });
    }
    const out = [];
    for (const [name, f] of GROUPS) { const g = items.filter(o => !o._g && f(o)); g.forEach(o => (o._g = name)); if (g.length) out.push([name, g]); }
    return out;
  };
  G.renderDeck = function () {
    const el = $("story-left"), d = this._deck, s = this.s; if (!el || !d) return;
    const t = this.tl, sleeping = this.isAsleep(), act = t.activity, busy = this.lag() > 0.02 && !sleeping && !(act && act.carried), eod = s.eod;
    const groups = sleeping || (act && !act.carried) ? [] : this.deckItems(), flat = [];
    const special = [];
    if (sleeping) special.push({ id: "wake", label: `Wake up <span class="dim">(asleep ${span(this.shownClock() - s.sleep.from)}, ${U.esc(s.sleep.where)})</span>`, cls: "hook" });
    else if (act) special.push({ id: "stop", label: `Stop: ${U.esc(act.label.toLowerCase())}${act.pending ? " (waits for the clock)" : ` · ${span(act.until - this.shownClock())} left`}`, cls: "hook", dis: !act.cancel });
    else if (eod) special.push({ id: "bed", label: `Go to bed now <span class="dim">(planned ${hhmm(eod.bedAt)})</span>`, cls: "hook" }, { id: "noeod", label: "Not yet: keep the day going" });
    for (const x of special) flat.push({ special: x.id, dis: x.dis });
    for (const [, g] of groups) for (const o of g) flat.push(o);
    if (d.sel == null || d.sel >= flat.length || (flat[d.sel] && flat[d.sel].dis)) d.sel = Math.max(0, flat.findIndex(o => !o.dis && !busy));
    const btn = (o, i, label, cls) => `<button type="button" class="opt ${i === d.sel ? "sel " : ""}${cls || ""}" data-i="${i}" ${o.dis || (busy && !o.special) ? "disabled" : ""}>${label}</button>`;
    let i = 0, h = `<div style="display:flex;justify-content:space-between;align-items:baseline"><span class="hook" style="font-size:18px">${U.esc(d.town ? d.town.b.name : U.cap(this.whereWords()))}</span><span class="dim small">${sleeping ? "asleep" : busy ? `busy · ${span(this.lag())} left` : "what you can do"}</span></div>`;
    if (special.length) h += `<div class="grp">${special.map(x => btn(flat[i], i++, x.label, x.cls)).join("")}</div>`;
    for (const [name, g] of groups) h += `<div class="grp"><div class="lbl">${name}</div>${g.map(o => btn(o, i++, o.label, o.cls)).join("")}</div>`;
    if (busy) h += `<p class="dim small">The hours pass at one second a second here. World (4) or Journey (5) pass them faster.</p>`;
    const y = el.scrollTop; el.innerHTML = h; el.scrollTop = y;
    el.querySelectorAll("[data-i]").forEach(b => (b.onclick = () => { d.sel = +b.dataset.i; this.deckPick(flat); }));
    const sb = el.querySelector(".opt.sel"); if (sb && sb.scrollIntoView && this._deckMoved) { sb.scrollIntoView({ block: "nearest" }); this._deckMoved = false; }
    if (!this.ui.active || this.ui.active.deck) this.ui.active = { type: "choose", deck: true, move: dd => { for (let k = 0; k < flat.length; k++) { d.sel = (d.sel + dd + flat.length) % flat.length; if (!flat[d.sel].dis) break; } this._deckMoved = true; this.renderDeck(); }, pick: () => this.deckPick(flat), cancel: () => {} };
  };
  G.deckPick = function (flat) {
    const d = this._deck, o = flat[d.sel], s = this.s; if (!d || !o || o.dis) return;
    if (o.special === "wake") { this.wake(true); return this.renderDeck(); }
    if (o.special === "stop") { this.cancelActivity(); return this.renderDeck(); }
    if (o.special === "bed") { if (s.eod) s.eod.bedAt = this.shownClock(); return this.renderDeck(); }
    if (o.special === "noeod") { s.eod = null; this.info = null; this.dirty = true; return this.renderDeck(); }
    if (this.lag() > 0.02 && !this.isAsleep()) return;
    if (d.town && o.src === "town" && /^Inn:/.test(o.t)) { this.endOfDay("inn"); return this.renderDeck(); } // the inn is the end of the day
    this._deck = null; this.ui.active = null;
    if (o.src === "extra") { this._extraPick = d.town ? d.town.extras[o.k] : d.options[o.k]; d.res(d.town ? d.town.leave : o.k); }
    else { this._opt = true; this.optOut(plain(o.label).replace(/\s*·\s*asleep.*$/, "")); d.res(o.k); }
  };
  // the town loop's menu lands on the Decision panel, with every other source beside it
  G.hostFor = function (prompt) { if (this.a6 && this._inLoop && this._townB && String(prompt).startsWith(`<b>${U.esc(this._townB.name)}</b> · `)) return { kind: "town", b: this._townB }; return null; };
  G.hostChoose = function (host, prompt, options) {
    const leave = options.findIndex(o => o.act === "leave" || /^Leave$/.test(plain(o.label)));
    return this.deck({ b: host.b, options, extras: this.gatherOptions(true), leave: leave < 0 ? options.length - 1 : leave }, null);
  };

  // ------------------------------------------------------------------ the Information panel
  G.optOut = function (title) { this.info = { title, kind: "opt", html: "" }; this.lastInfo = this.info; this.dirty = true; };
  G.infoAdd = function (html) { if (!this.info || !/opt|sleep|eod|wake|card/.test(this.info.kind)) this.info = { title: this.lastOptLabel || "", kind: "opt", html: "" }; this.info.html += `<div class="infopage">${html}</div>`; this.lastInfo = this.info; this.dirty = true; };
  // the narrator's hooks: on Story an option answers in the Information panel; anything else is a pop-up, in the planned world
  G.storySay = function (pages, who) {
    if (!this.a6) return null;
    const s = this.s, list0 = [].concat(pages).flat().filter(Boolean);
    // the story's opening beat joins the introduction in Memory; only the company's line is shown
    if (s && s.intro && !s.introOpen && list0.length >= 3 && s.clock - (s.introT ?? s.clock) < 2) {
      s.introOpen = true; s.intro.push(...list0.map(String));
      const co = list0.map(x => plain(x)).find(x => /with you go|company|companions/i.test(x));
      return co ? Promise.resolve(this.ui.toast(U.esc(AZ.firstSentence(co.replace(/^.*?(With you go|with you go)/, "With you go"))), "teal")) : Promise.resolve();
    }
    if (this.screen === "story" && (this._opt || this._infoOut)) { const list = [].concat(pages).flat().filter(Boolean); this.infoAdd(`${who ? `<div class="lbl">${who}</div>` : ""}${list.join("</div><div class=\"infopage\">")}`); this.feedPush({ k: "scene", html: `${who ? `<b>${who}</b>: ` : ""}${list[0]}` }); return Promise.resolve(); }
    if (this._infoOut) { const list = [].concat(pages).flat().filter(Boolean); this.infoAdd(list.join("</div><div class=\"infopage\">")); this.feedPush({ k: "scene", html: list[0] }); return Promise.resolve(); }
    if (this.screen === "story") this.toPlanned();
    return null;
  };
  G.storyChoose = function (prompt, options, opts) {
    if (!this.a6) return null;
    if (this.screen === "story" && this._opt) return this.infoChoose(prompt, options, opts);
    if (this.screen === "story") this.toPlanned();
    return null;
  };
  G.infoChoose = function (prompt, options, opts = {}) {
    return new Promise(res => {
      let sel = Math.max(0, options.findIndex(o => !o.disabled));
      const el = () => $("info-choose");
      const render = () => {
        const e = el(); if (!e) return;
        e.innerHTML = `<div class="small">${prompt || ""}</div>${options.map((o, k) => `<button type="button" class="opt ${k === sel ? "sel " : ""}${o.cls || ""}" data-k="${k}" ${o.disabled ? "disabled" : ""}>${o.label}</button>`).join("")}`;
        e.querySelectorAll("[data-k]").forEach(b => (b.onclick = () => pick(+b.dataset.k)));
        const sb = e.querySelector(".opt.sel"); if (sb && sb.scrollIntoView) sb.scrollIntoView({ block: "nearest" });
      };
      const pick = k => { if (!options[k] || options[k].disabled) return; this._infoChoose = null; this.ui.active = null; this.infoAdd(`<span class="dim">→ ${plain(options[k].label)}</span>`); res(k); };
      this._infoChoose = render;
      this.ui.active = { type: "choose", info: true, move: d => { for (let i = 0; i < options.length; i++) { sel = (sel + d + options.length) % options.length; if (!options[sel].disabled) break; } render(); }, pick: () => pick(sel), cancel: () => pick(opts.cancel != null ? opts.cancel : options.length - 1) };
      this.renderInfo(); render();
    });
  };
  G.renderInfo = function () {
    const el = $("story-right"); if (!el || !this.s) return;
    const s = this.s, t = this.tl, act = t.activity, I = this.info, L = [];
    if (this.isAsleep()) L.push(`<div class="win arrival"><div class="lbl">Sleeping</div><div class="hook">Asleep ${U.esc(s.sleep.where)} · ${span(this.shownClock() - s.sleep.from)} so far · wake ${AZ.Clock.fmt(s.sleep.until)}</div><div class="dim small">Wake up early from the Decision panel. Journey (5) or World (4) pass the night faster.</div></div>`);
    else if (act) L.push(`<div class="win arrival"><div class="lbl">Busy</div><div class="hook">${U.esc(act.label)} · ${act.pending ? `${span(act.hours)}, when the clock runs` : `${span(act.until - this.shownClock())} left`}</div>${act.carried ? `<div class="dim small">The vessel goes on meanwhile.</div>` : ""}</div>`);
    else if (this.lag() > 0.02) L.push(`<div class="win arrival"><div class="lbl">Busy</div><div class="hook">${U.esc(this.lastInfo ? this.lastInfo.title : "The hours pass")} · ${span(this.lag())} left</div><div class="dim small">One second a second here: World (4) or Journey (5) pass the time faster.</div></div>`);
    else if (s.eod) L.push(`<div class="win arrival"><div class="lbl">The end of the day</div><div class="hook">Heading to bed at ${hhmm(s.eod.bedAt)}: ${MODE[s.eod.mode]}.</div></div>`);
    const arr = this.arrivalHtml && this.arrivalHtml(); if (arr) L.push(arr);
    if (I && (I.html || this._infoChoose)) L.push(`<div class="win infobox"><div class="lbl">${U.esc(I.title || "")}</div>${I.html}<div id="info-choose"></div>${I.html ? `<div class="tc-btns"><button type="button" class="actbtn" data-note="1">Make a note (N)</button><button type="button" class="actbtn" data-clear="1">Clear</button></div>` : ""}</div>`);
    L.push(this.planHtml());
    L.push(`<h3>The story so far</h3>${this.feedHtml(50, ["scene", "note", "day"])}`);
    const y = el.scrollTop; el.innerHTML = L.join(""); el.scrollTop = y;
    this.wireLinks(el);
    const nb = el.querySelector("[data-note]"); if (nb) nb.onclick = () => this.makeNote();
    const cb = el.querySelector("[data-clear]"); if (cb) cb.onclick = () => { this.info = null; this.renderInfo(); };
    if (this._infoChoose) this._infoChoose();
  };
  G.makeNote = function () {
    const I = this.info; if (!I || !I.html) return;
    const K = this.kn(); K.notes = K.notes || [];
    K.notes.push({ t: this.shownClock(), title: I.title || "A note", text: plain(I.html).slice(0, 1600) });
    if (K.notes.length > 120) K.notes.splice(0, K.notes.length - 120);
    this.feedPush({ k: "routine", html: `Noted: ${U.esc(I.title || "a note")}.` });
    this.hint("Written in your notebook (Memory and Inventory).");
  };
  // Story keeps the town's arrival and the old renderStory out of the way: the loop draws both panels
  G.renderStory = function () { if (this._deck) this.renderDeck(); this.renderInfo(); };
  const paint6 = G.paintWindow;
  G.paintWindow = function () {
    paint6.call(this);
    if (this.screen !== "story" || !this.s) return;
    const cv = $("svwin"), p = this.windowParams(); if (cv) AZ.ViewWin.draw(cv, p);
    const lab = $("svwin-label"); if (lab) lab.textContent = `${p.label} · ${p.phase}${p.damaged ? " · damaged" : ""}`;
  };
})();
