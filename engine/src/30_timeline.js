// =============================================================================================
// 30_timeline.js · Alpha 6: the timeline.
//   Only the player controls time. The clock the player sees runs at the pace set on the timeline
//   (a game day in 24, 12 or 6 seconds) and plays out whatever the last step, wait or task cost: a
//   step lasts its hours at that pace, and a night at the inn plays out in place. Nothing in the
//   game changes the pace; stops are pauses the player chose in Settings.
//   The game's rules are unchanged: a step still adds its hours to s.clock at once. The timeline
//   decides when the next step may start (when the clock on screen has caught up), so the Node
//   tests, which drive tick, tryMove and voyageStep directly, run as before. All of it applies only
//   in the browser shell (g.a6).
// =============================================================================================
(() => {
  const G = AZ.Game.prototype, U = AZ.U;
  AZ.VERSION = "azrpg Alpha 6";
  AZ.SETTINGS_KEY = "azrpg6:settings";
  AZ.SETTINGS0 = { paceSecs: [24, 12, 6], checkin: "dusk", stopArrive: true, stopScenes: true, stopHunger: true, stopSleep: true, stopCrew: true,
                   stopNotes: false, fog: "land", readPause: true, pad: false, reach: false, hours: true };
  AZ.loadSettings = function (store) {
    let o = {};
    try { o = JSON.parse(store.getItem(AZ.SETTINGS_KEY) || "{}") || {}; } catch (e) { o = {}; }
    const st = { ...AZ.SETTINGS0, ...o };
    if (!Array.isArray(st.paceSecs) || st.paceSecs.length !== 3) st.paceSecs = AZ.SETTINGS0.paceSecs.slice();
    return st;
  };
  AZ.saveSettings = function (store, st) { try { store.setItem(AZ.SETTINGS_KEY, JSON.stringify(st)); } catch (e) { /* private browsing */ } };
  AZ.CHECKINS = { six: "every 6 hours", dusk: "at dusk", dawn: "at dawn", town: "at the next town or port", needed: "only when needed" };

  G.tlInit = function () {
    this.a6 = true;
    this.set = AZ.loadSettings(this.store);
    this.tl = { paused: false, pace: 2, shown: null, last: null, heading: null, helm: false, crewGoal: null, pend: 0, waiters: [],
                stopAt: null, activity: null, moved: -1e9, fired: {}, chosen: false, checkPending: null, pendStop: null, wasAboard: undefined };
  };
  // ------------------------------------------------------------------ the clock on screen
  G.tlRate = function () { const t = this.tl; return !t || t.paused ? 0 : 24 / Math.max(1, +this.set.paceSecs[t.pace - 1] || 12); };
  G.shownClock = function () { const s = this.s; if (!s) return 0; const t = this.tl; return t && t.shown != null ? Math.min(t.shown, s.clock) : s.clock; };
  G.lag = function () { return this.s ? Math.max(0, this.s.clock - this.shownClock()) : 0; };
  G.setPace = function (p) { const t = this.tl; if (!t) return; if (!p) t.paused = true; else { t.paused = false; t.pace = p; } t.stopAt = null; this.dirty = true; };
  G.resume = function () { const t = this.tl; if (t && t.paused) { t.paused = false; this.dirty = true; } };
  G.togglePause = function () { const t = this.tl; if (!t) return; t.paused = !t.paused; t.stopAt = null; this.dirty = true; };
  G.playDay = function () { this.resume(); this.tl.stopAt = this.shownClock() + 24; this.dirty = true; };
  // a window waits for the clock on screen: what a choice cost plays out before its result is shown
  G.playout = function () {
    const t = this.tl;
    if (!this.a6 || !t || this.lag() < 1e-4) return Promise.resolve();
    if (t.paused && t.chosen) t.paused = false; // the player chose something that takes time
    t.pend++;
    return new Promise(res => t.waiters.push(res));
  };
  G.timeChosen = function () { if (!this.tl) return; this.tl.chosen = true; if (this.lag() > 1e-4) this.resume(); };
  // reading pauses movement (Memory, Inventory and Story open), never a wait or a task you chose
  G.readPaused = function () { return !!(this.set && this.set.readPause && /^(memory|inventory|story)$/.test(this.screen || "") && !this.tl.activity && !this.hosting); };
  // ------------------------------------------------------------------ tasks: hours spent doing something
  // Carried at sea, the vessel moves on while you do it; anywhere else the hours pass in place.
  G.startActivity = function (label, hours, done) {
    const s = this.s, t = this.tl;
    if (!t) { s.clock += hours; if (done) done(); return; }
    if (t.activity) { this.hint(`You are busy: ${U.esc(t.activity.label.toLowerCase())}.`); return; }
    if (this.riding() && s.voyage.state === "sea") t.activity = { label, t0: s.clock, until: s.clock + hours, done };
    else { this.events.fx({ time: hours, rest: /rest|sleep/i.test(label) }); t.activity = { label, t0: s.clock - hours, until: s.clock, done, inPlace: true }; }
    t.chosen = true; this.resume(); this.dirty = true;
  };
  // ------------------------------------------------------------------ the loop
  const frameA = G.frame;
  G.frame = function (now) {
    if (!this.a6 || !this.s) return frameA.call(this, now);
    const s = this.s, t = this.tl;
    const dt = t.last == null ? 0 : Math.min(0.25, Math.max(0, (now - t.last) / 1000));
    t.last = now;
    if (t.shown == null || t.shown > s.clock) t.shown = s.clock;
    const prev = t.shown, rate = this.tlRate();
    if (rate > 0 && t.shown < s.clock) t.shown = Math.min(s.clock, t.shown + rate * dt);
    if (t.stopAt != null && t.shown >= t.stopAt) { t.stopAt = null; t.paused = true; this.hint("A day played out. ▶ to go on."); this.dirty = true; }
    if (t.shown > prev) this.tlCrossings(prev, t.shown);
    if (Math.floor(t.shown / (1 / 60)) !== Math.floor(prev / (1 / 60))) this.clockDirty = true;
    if (t.activity && t.shown >= t.activity.until) { const a = t.activity; t.activity = null; this.dirty = true; try { if (a.done) a.done(); } catch (e) { console.error(e); } }
    const ab = !!s.aboard;
    if (t.wasAboard !== undefined && ab !== t.wasAboard) this.onBoardChange(ab);
    t.wasAboard = ab;
    const caught = s.clock - t.shown < 1e-4;
    if (caught) {
      if (t.waiters.length) { const ws = t.waiters.splice(0); t.pend = Math.max(0, t.pend - ws.length); ws.forEach(f => f()); this.drawA6(now); return; }
      t.chosen = false;
      this.anim = null;
      if (!this.ui.busy() && !t.pend) {
        if (t.pendStop) { const st = t.pendStop; t.pendStop = null; this.stopFor(st); }
        this.alarms();
        if (t.checkPending && !this.ui.busy()) { const k = t.checkPending; t.checkPending = null; this.checkIn(k); }
        else { this.tick(); if (!this.ui.busy()) this.tlStep(rate); }
      }
    }
    this.drawA6(now);
  };
  // what moves next, once the clock on screen has caught up
  G.tlStep = function (rate) {
    const s = this.s, t = this.tl;
    if (rate <= 0) return;
    if (this.riding()) {
      if (this.readPaused()) return;
      const v = s.voyage;
      if (v.state === "sea") this.stepTimed(() => this.voyageStep());
      else if (v.state === "port" && v.departAt > s.clock) { s.clock += Math.min(0.5, v.departAt - s.clock); this.tl.moved = s.clock; } // carried: waiting aboard for her to sail
      return;
    }
    if (this.readPaused()) return;
    const v = s.vessel, own = !!(s.aboard && v && !s.voyage);
    if (own && !t.helm && (v.crew || 0) > 0 && t.crewGoal) this.crewCourse();
    if (s.auto) {
      const d = this.autoDir();
      if (d) { if (!this.stepTimed(() => this.tryMove(d))) { this.setAuto(false); s.autoPath = null; } }
      else { this.setAuto(false); s.autoPath = null; if (own && t.crewGoal && t.crewGoal.wp) t.crewGoal = null; }
      return;
    }
    if (t.heading) { if (!this.stepTimed(() => this.tryMove(t.heading))) t.heading = null; }
  };
  // the crew sails the agreed course: the plan's next stop, or the place you named
  G.crewCourse = function () {
    const s = this.s, t = this.tl, goal = t.crewGoal;
    if (goal.cp != null && goal.cp !== s.cp) { t.crewGoal = null; s.auto = false; s.autoPath = null; this.feedPush({ k: "note", html: `The crew has brought you to the stop you agreed on. Name the next course on the Journey screen.` }); return; }
    if (s.auto) return;
    const key = `${s.c},${s.r},${goal.cp ?? ""},${(goal.wp || []).join(",")}`;
    if (t.noCourse === key) return;
    const wp = s.waypoint;
    if (goal.cp != null) s.waypoint = null; else if (goal.wp) s.waypoint = goal.wp;
    const p = this.planAuto();
    if (goal.cp != null) s.waypoint = wp;
    if (p && p.length > 1) { s.autoPath = p; this._autoK = 0; s.auto = true; t.noCourse = null; }
    else { t.noCourse = key; this.feedPush({ k: "note", html: `The crew can find no course by water ${goal.cp != null ? "to the next stop" : "to that place"} from here. Take the helm, or name another course.` }); }
  };
  G.stepTimed = function (fn) {
    const s = this.s, c0 = s.clock, at0 = [s.c, s.r], ride = this.riding();
    const ok = fn();
    const moved = s.c !== at0[0] || s.r !== at0[1];
    if (moved || s.clock > c0) {
      if (this.anim) { this.anim.c0 = c0; this.anim.c1 = s.clock; }
      this.tl.moved = s.clock;
      if (moved) {
        const mi = ride ? s.voyage && s.voyage.milesPerStep || this.w.miles : Math.hypot(s.c - at0[0], s.r - at0[1]) * this.w.miles;
        this.dayLog().miles += mi;
        const tr = s.track = s.track || [], last = tr[tr.length - 1];
        if (!last || Math.abs(last[0] - s.c) + Math.abs(last[1] - s.r) >= 2) { tr.push([s.c, s.r]); if (tr.length > 4000) tr.splice(0, tr.length - 4000); }
      }
    }
    return ok !== false && (moved || s.clock > c0);
  };
  // boarding and landing bring up the screen that fits
  G.onBoardChange = function (aboard) {
    const s = this.s, t = this.tl;
    t.heading = null;
    if (aboard) {
      if (s.vessel && !s.voyage) { t.helm = !(s.vessel.crew > 0); t.crewGoal = s.vessel.crew > 0 ? (s.waypoint && !this.w.isLand(...s.waypoint) ? { wp: s.waypoint.slice() } : { cp: s.cp }) : null; t.noCourse = null; }
      if (this.mode !== "sandbox" && this.jr && this.showScreen) this.showScreen("journey");
    } else {
      t.helm = false; t.crewGoal = null; s.auto = false; s.autoPath = null;
      if (this.showScreen && this.screen === "journey") this.showScreen("world");
    }
  };
  G.takeHelm = function (on) {
    const s = this.s, t = this.tl, v = s.vessel;
    if (!v || !s.aboard || s.voyage) return;
    t.helm = on == null ? !t.helm : on;
    if (!t.helm && !(v.crew > 0)) { t.helm = true; this.hint("There is no crew to hand the helm to: you sail her yourself."); }
    s.auto = false; s.autoPath = null; t.heading = null; t.noCourse = null;
    this.feedPush({ k: "routine", html: t.helm ? `You take the helm of the ${U.esc(v.kind.toLowerCase())}. The arrows set her heading.` : `You hand the helm back to the crew.` });
    this.dirty = true;
  };
  G.sailOn = function (goal) { // name the crew's course: the plan's next stop, or a place
    const s = this.s, t = this.tl;
    t.helm = false; t.crewGoal = goal || { cp: s.cp }; t.noCourse = null; s.auto = false; s.autoPath = null; t.chosen = true; this.resume(); this.dirty = true;
  };
  // ------------------------------------------------------------------ dusk, dawn and check-ins
  G.tlCrossings = function (a, b) {
    const lat = this.lat(), d0 = Math.floor(a / 24);
    for (const d of [d0, d0 + 1]) {
      const su = AZ.Clock.sun(d * 24 + 12, lat), ok = su.dl > 0 && su.dl < 24;
      const dusk = d * 24 + (ok ? su.set : 18), dawn = d * 24 + (ok ? su.rise : 6);
      if (a < dusk && b >= dusk) this.atDusk(dusk);
      if (a < dawn && b >= dawn) this.atDawn(dawn);
    }
    if (this.set.checkin === "six" && Math.floor(b / 6) > Math.floor(a / 6) && this.travelling()) this.tl.checkPending = { kind: "six", t: Math.floor(b / 6) * 6 };
  };
  G.travelling = function () { const s = this.s, t = this.tl; return this.riding() || !!s.auto || !!t.heading || this.shownClock() - t.moved < 2; };
  G.atDusk = function (at) {
    const moving = this.travelling();
    this.fileDayCard(at);
    if (this.set.checkin === "dusk" && moving) this.tl.checkPending = { kind: "dusk", t: at };
  };
  G.atDawn = function (at) { if (this.set.checkin === "dawn" && this.travelling()) this.tl.checkPending = { kind: "dawn", t: at }; };
  G.checkIn = async function (k) {
    const s = this.s, t = this.tl, U2 = U, w = this.w;
    const card = (s.feed || []).slice().reverse().find(e => e.k === "day");
    const head = k.kind === "dusk" ? "Dusk" : k.kind === "dawn" ? "Dawn" : "Check-in";
    const opts = [{ id: "on", label: "Carry on" }];
    const ownAfloat = s.aboard && s.vessel && !s.voyage;
    if (this.riding()) opts.push({ id: "sleep", label: "Sleep until dawn (the vessel goes on)" });
    else if (ownAfloat) opts.push({ id: "rest", label: "Anchor, heave to or wait (R)" });
    else opts.push({ id: "camp", label: "Make camp for the night" }, { id: "rest", label: "Wait, fish or forage (R)" });
    opts.push({ id: "plan", label: "Look at the plan (Story)" }, { id: "pause", label: "Pause here" });
    const body = k.kind === "dusk" && card && card.day === Math.floor(k.t / 24) ? `<div class="daycard">${card.html}</div>` : "";
    const where = this.whereWords();
    const kk = await this.ui.choose(`<b class="hook">${head}</b> · ${AZ.Clock.fmt(k.t)} · ${U2.esc(where)}${body}`, opts, { cancel: 0, who: "Your check-in" });
    const o = opts[kk] || opts[0];
    if (o.id === "pause") { t.paused = true; this.dirty = true; }
    else if (o.id === "plan") { t.paused = true; if (this.showScreen) this.showScreen("story"); }
    else if (o.id === "camp") { t.heading = null; s.auto = false; t.chosen = true; await this.campNight(); }
    else if (o.id === "rest") { t.heading = null; s.auto = false; await this.rest(); }
    else if (o.id === "sleep") this.pastime("sleep");
    void w;
  };
  // ------------------------------------------------------------------ stoppers you chose in Settings
  G.stopFor = function (st) {
    const t = this.tl;
    if (st.kind === "arrive") {
      this.feedPush({ k: "note", html: `Arrived at <b>${U.esc(st.name)}</b>. Space to go in.` });
      if (this.set.stopArrive) { t.paused = true; t.heading = null; this.hint(`${U.esc(st.name)}: Space to go into town. ▶ to carry on.`); }
    }
    this.dirty = true;
  };
  G.alarms = function () {
    const s = this.s, t = this.tl, f = t.fired, set = this.set;
    const days = s.sup.food / Math.max(1, this.eaters());
    if (days <= 2 && s.sup.food > 0) { if (!f.hunger) { f.hunger = 1; if (set.stopHunger) this.alarm(days < 1 ? "Food for less than a day." : `Food for ${Math.floor(days)} day${days >= 2 ? "s" : ""} left.`); } } else if (days > 2.5 || s.sup.food <= 0) f.hunger = 0;
    if ((s.awake || 0) >= 16 && !this.riding()) { if (!f.sleep) { f.sleep = 1; if (set.stopSleep) this.alarm(`${Math.round(s.awake)} hours awake. Sleep soon.`); } } else if ((s.awake || 0) < 8) f.sleep = 0;
    const v = s.vessel;
    if (v && v.crew && s.aboard && !s.voyage) { if (v.morale < 30) { if (!f.crew) { f.crew = 1; if (set.stopCrew) this.alarm(`The crew's patience is nearly gone (morale ${Math.round(v.morale)}${v.strikes ? `, strikes ${v.strikes}/3` : ""}).`); } } else if (v.morale > 40) f.crew = 0; }
  };
  G.alarm = function (text) {
    const t = this.tl;
    t.paused = true; t.heading = null;
    this.feedPush({ k: "note", html: `⏸ ${U.esc(text)}`, cls: "late" });
    this.hint(`⏸ ${U.esc(text)} Paused: ▶ to carry on.`);
    this.dirty = true;
  };
  // arriving at a town or harbour is a stop you may choose
  const after6 = G.afterStep;
  G.afterStep = function (...a) {
    const r = after6.apply(this, a), s = this.s, w = this.w;
    if (!this.a6 || !s) return r;
    const id = w.idx(s.c, s.r), b = w.burgAt.get(id) || (s.aboard ? this.harbourAt.get(id) : null);
    const key = b ? `b${b.i}` : null;
    if (key && key !== this.tl.lastStop && !this.riding() && (this.tl.heading || s.auto)) this.tl.pendStop = { kind: "arrive", name: b.name, b };
    this.tl.lastStop = key;
    return r;
  };
  // ------------------------------------------------------------------ in the Node tests nothing changes
  G.hint = G.hint || function () {};
  G.drawA6 = G.drawA6 || function (now) { void now; };
})();
