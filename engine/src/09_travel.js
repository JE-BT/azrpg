AZ.COLLAPSE_H = 52; // hours awake before you fall asleep where you stand (Alpha 6: a warning comes four hours before)
// ---------------------------------------------------------------------------------------------
// Travel, supplies and money.
//   Booked ship: a captain with his own itinerary (a cargo to land, ports to call at); a fixed
//   departure; the passenger cannot steer and the ship does not wait.
//   Hired or owned boat: the traveller steers; the crew eats from the traveller's stores, draws
//   daily wages, calls for anchor at dusk and for shelter in storms, and can be overruled at a
//   cost to morale. Low morale ends in mutiny.
//   Days: everyone eats once a day. Hunger slows you;
//   in the end you collapse and wake somewhere else, poorer and later.
//   Your own vessel has a hold. What you cannot carry on foot stays in it when you leave her, and
//   the hands who stay aboard eat from it while you are away. They wait as long as the food (and
//   their patience) allows, keeping enough for the run to the nearest harbour; then they sail.
//   Crews that sail round the clock keep watches: aboard, you sleep below while the watch sails.
// ---------------------------------------------------------------------------------------------
AZ.CARRY = { foot: { food: 20, goods: 6 }, passage: { food: 60, goods: 10 }, vessel: { food: 220, goods: 30 } };
Object.assign(AZ.COND, {
  hungry: { on: "you are hungry", off: "you have eaten", slow: 1.2, label: "hungry" },
  starving: { on: "you are starving", off: "you have eaten", slow: 1.5, label: "starving" },
  thirsty: { on: "you are thirsty", off: "you have drunk", slow: 1.4, label: "thirsty" },
});

Object.assign(AZ.Game.prototype, {
  // the hands your vessel feeds: companions in the party carry their own food
  // which crews call for stops, and which keep watches round the clock (Alpha 3 reads the control table)
  callsStops(v) { return (v.hpd || 0) < 24; },
  keepsWatches(v) { return (v.hpd || 0) >= 24; },
  footCapacity() { return { ...AZ.CARRY.foot }; },
  repairCost(b) { return AZ.Prices.repair(this.w, b); },
  repairHours() { return 12; },
  crewFed(v = this.s.vessel) { if (!v || !v.crew) return 0; return v.mode === "company" ? Math.max(0, v.crew - (this.s.party || []).length) : v.crew; },
  // with your vessel: aboard her, or in the town whose harbour she lies in
  withVessel() {
    const s = this.s, v = s.vessel;
    if (!v || this.riding()) return false;
    if (s.aboard) return true;
    const b = this.w.burgAt.get(this.w.idx(s.c, s.r));
    return !!(b && this.vesselHere(b));
  },
  eaters() { return 1 + (this.withVessel() ? this.crewFed() : 0); },
  // what you can carry follows how you travel: your vessel's hold, a passenger's baggage, or your back
  capacity() { const s = this.s, ride = this.riding(); return { ...(!ride && this.withVessel() ? AZ.CARRY.vessel : ride || s.voyage ? AZ.CARRY.passage : AZ.CARRY.foot) }; },
  holdOf(v) { v.hold = v.hold || { food: 0, goods: {} }; v.hold.goods = v.hold.goods || {}; return v.hold; },
  // the harbour (or, for an air craft, the town) where a vessel lies, if any
  vesselInPort(v) { const w = this.w, i = w.idx(v.c, v.r); return (v.cls === "air" ? w.burgAt.get(i) : this.harbourAt.get(i)) || null; },
  // how long hands left aboard will wait: longer when morale is high, longer still for the company's own
  patienceOf(v) { const m = v.morale ?? 70, d = m >= 70 ? 21 : m >= 40 ? 10 : 4; return v.mode === "company" ? Math.round(d * 1.5) : d; },
  // the run from where the vessel lies to the nearest harbour she can reach, by her own course over
  // the water (the four nearest harbours as the crow flies are tried), and the food it takes
  runToPort(v) {
    const w = this.w, n = Math.max(1, this.crewFed(v)), here = [v.c, v.r], key = `${v.c},${v.r},${v.cls}`;
    let best = v._run && v._run.key === key ? v._run.best : undefined;
    if (best === undefined) {
      const cands = [];
      for (const b of w.P.burgs) {
        if (!b || !(b.port || v.cls === "air" || v.cls === "skiff" || v.cls === "boat")) continue;
        const h = w.harbour(b, v.cls);
        if (h && w.sameWater(here, h.t, v.cls)) cands.push({ port: b, h: h.t, d: Math.hypot(h.t[0] - v.c, h.t[1] - v.r) });
      }
      best = null;
      for (const c of cands.sort((a, b) => a.d - b.d).slice(0, 4)) {
        const p = v.cls === "air" || c.d < 0.5 ? null : w.waterPath(here, c.h, v.cls);
        const miles = p ? (p.length - 1) * (p.mps || w.miles) : c.d * w.miles;
        if (!best || miles < best.miles) best = { port: c.port, h: c.h, miles };
      }
      Object.defineProperty(v, "_run", { value: { key, best }, enumerable: false, writable: true, configurable: true });
    }
    if (!best) return null;
    // a crew that stops at night sails only the daylight hours of the season; weather costs a fifth more
    const sun = AZ.Clock.sun(this.s.clock, w.latlon(v.c, v.r)[0]), hpd = v.hpd || 12;
    const hours = hpd >= 24 ? 24 : Math.max(4, Math.min(hpd, (sun.dl ?? 12) + 0.75));
    const days = Math.max(1, Math.ceil((best.miles * 1.2) / ((v.speed || 6) * hours)));
    return { port: best.port, h: best.h, miles: Math.round(best.miles), days, food: days * n };
  },
  // each dawn while you are away from your vessel: the hands aboard eat from the hold, or sail
  crewAway(v) {
    const s = this.s, w = this.w, U = AZ.U, n = this.crewFed(v);
    if (!n || s.carefree) return;
    const hold = this.holdOf(v), port = this.vesselInPort(v);
    v.waited = (v.waited || 0) + 1;
    const patience = v.patience ?? this.patienceOf(v);
    if (!port) {
      const run = this.runToPort(v);
      if (run && hold.food - n < run.food) return this.crewSailsOff(v, run, "food");
      if (v.waited > patience || v.morale < 20) return this.crewSailsOff(v, run, "waited");
    } else if (v.morale < 20) return this.crewSailsOff(v, null, "unpaid");
    if (hold.food >= n) { hold.food -= n; return; }
    const short = n - hold.food; hold.food = 0;
    if (port) { // in harbour the hands eat ashore, at your cost
      const cost = U.rn(short * AZ.Prices.ration(w, port), 2);
      if (s.purse >= cost) s.purse = U.rn(s.purse - cost, 2); else { v.owed = U.rn((v.owed || 0) + cost, 2); v.morale -= 10; }
    } else v.morale -= 15;
  },
  async crewSailsOff(v, run, why) {
    const s = this.s, w = this.w, U = AZ.U, kind = U.esc(v.kind.toLowerCase()), hold = this.holdOf(v);
    const port = run ? run.port : this.vesselInPort(v);
    const when = why === "food" ? "while they still had food enough for the run" : why === "unpaid" ? "unpaid and out of patience" : why === "refused" ? "as soon as you were ashore" : `after ${v.waited} days of waiting`;
    if (run) { hold.food = Math.max(0, hold.food - run.food); v.c = run.h[0]; v.r = run.h[1]; }
    v.anchored = true; v.waited = 0; v.patience = null;
    let text;
    if (v.mode === "hired") { s.vessel = null; text = `the crew of your hired ${kind} sailed her back to her owner ${when}. The boat is gone, with whatever was aboard`; }
    else if (v.mode === "owned") { v.crew = 0; v.owed = 0; v.strikes = 0; v.morale = 70; text = port ? `the crew of your ${kind} brought her into ${U.esc(port.name)} ${when}, took their wages and left. She waits there without a crew` : `the crew of your ${kind} walked off ${when}. She lies where you left her, without a crew`; }
    else text = port ? `the company's hands took the ${kind} into ${U.esc(port.name)} ${when}. They wait for you there` : `the company's hands are still aboard the ${kind}, hungry and angry`;
    this.log(`${U.cap(text)}.`, "hook");
    this.ui.toast(`Word reaches you: ${text} ${AZ.T("mixed")}.`);
    this.dirty = true;
  },
  refill() { /* only food is tracked */ },
  tick() {
    const s = this.s, w = this.w, U = AZ.U;
    if (!s || this.ui.busy()) return;
    const day = Math.floor(s.clock / 24);
    if (day > s.lastDay) {
      const n = Math.min(day - s.lastDay, 60); s.lastDay = day;
      for (let i = 0; i < n; i++) if (this.newDay()) return;
      if (this.riding() && s.voyage.state === "sea" && this.shipEvent && U.rnd2(day, s.seed % 100003, 41) < AZ.SHIP_EVENTS.rate) return this.shipEvent();
    }
    if (s.voyage && s.voyage.state === "port" && s.clock >= s.voyage.departAt) return this.depart();
    const wx = this.weather();
    if (wx.key !== s.wxKey) {
      s.wxKey = wx.key;
      if (wx.kind === "storm" && s.aboard && (!w.isLand(s.c, s.r) || (s.vessel && s.vessel.cls === "air" && !this.riding()))) return this.stormCall();
      if (wx.kind !== s.wxKind && ["storm", "snow", "fog", "rain"].includes(wx.kind)) this.ui.toast(`Weather: ${wx.label} ${AZ.T("mixed")}`);
      s.wxKind = wx.kind;
    }
    const v = s.vessel;
    if (v && s.aboard && !this.riding() && v.crew && this.callsStops(v) && v.cls !== "air" && !this.harbourAt.has(w.idx(s.c, s.r)) && w.navigable(s.c, s.r, v.cls)) {
      const sun = AZ.Clock.sun(s.clock, this.lat()), key = Math.floor((s.clock + 12) / 24);
      if (sun.dl < 24 && (sun.hour >= sun.set + 0.75 || sun.hour < sun.rise) && v.nightKey !== key) { v.nightKey = key; return this.crewCall(); }
    }
    // a crew that sails round the clock keeps watches: you turn in below and the watch sails on
    if (v && s.aboard && !this.riding() && v.crew && this.keepsWatches(v) && !s.watchBelow && !this.vesselInPort(v)) {
      const night = AZ.Clock.light(s.clock, this.lat()).phase === "night";
      if ((s.awake || 0) >= 20 || ((s.awake || 0) >= 16 && night)) {
        this.slept(); s.watchBelow = s.clock + 8;
        this.ui.toast(`You turn in below. The watch keeps the ${U.esc(v.kind.toLowerCase())} on her course for eight hours ${AZ.T("mixed")}.`);
      }
    }
    void U;
  },
  newDay() {
    const s = this.s, U = AZ.U, v = s.vessel;
    const eat = this.eaters();
    s.sup.food -= eat;
    if (this.riding()) { if (s.voyage.role === "crew") s.sup.food += eat; this.slept(); } // the ship feeds its crew; passengers sleep aboard
    if (s.sup.food < 0) { s.sup.food = 0; s.hunger++; if (v && v.crew && this.withVessel()) v.morale -= 15; } else s.hunger = 0;
    delete s.cond.hungry; delete s.cond.starving; delete s.cond.thirsty;
    if (s.hunger >= 3) s.cond.starving = true; else if (s.hunger >= 1) s.cond.hungry = true;
    if (v && v.crew && (v.mode === "hired" || v.mode === "owned" || v.mode === "company")) {
      const due = U.rn(v.crew * v.wage + (v.hire || 0), 2);
      if (s.purse >= due) { s.purse = U.rn(s.purse - due, 2); v.morale = Math.min(100, v.morale + 1); }
      else { v.morale -= 20; v.owed = U.rn((v.owed || 0) + due, 2); this.ui.toast(`You cannot pay the crew (🟡 ${due} due). They mutter.`); this.log(`Wages unpaid (🟡 ${due}).`); }
      if (v.promise && s.clock > v.promise.by) { v.morale -= 10; this.ui.toast(`You promised the crew ${U.esc(v.promise.name)} and have not made it.`); v.promise = null; }
      if ((v.strikes || 0) > 0 && v.morale > 60) { v.calm = (v.calm || 0) + 1; if (v.calm >= 10) { v.strikes--; v.calm = 0; this.ui.toast("The crew's grievances fade. One strike forgiven."); } } else v.calm = 0;
    }
    if (v && v.crew && !this.withVessel()) this.crewAway(v);
    if (s.voyage && s.voyage.role === "crew") s.voyage.earned = U.rn((s.voyage.earned || 0) + AZ.Prices.wage(this.w, this.townNear ? this.townNear() : null), 2);
    // fever runs its course unless treated: gravely ill on the third day, collapse on the sixth
    if (s.cond.fever || s.cond.gravely) {
      s.feverDays = (s.feverDays || 0) + 1;
      if (s.feverDays === 3) { delete s.cond.fever; s.cond.gravely = true; this.speak("The fever is worse. I need a priest, a healing spring, or two days' rest.", "gravely", "Your fever is worse. You need a priest, a healing spring, or two days' rest."); }
      if (s.feverDays >= 6) { this.collapse("fever"); return true; }
    } else s.feverDays = 0;
    for (const [g0, rec] of Object.entries(s.mk || {})) for (const r of Object.values(rec)) { r.f = 1 + (r.f - 1) * 0.92; r.taken = Math.max(0, (r.taken || 0) * 0.85); void g0; }
    const left = s.sup.food / eat;
    if (left < 3 && left > 0) { const p = this.nearestPort(v?.cls); this.speak(`Food is running low: about ${Math.floor(left)} day${left >= 2 ? "s" : ""} left${p && s.aboard ? `. Nearest harbour: ${U.esc(p.name)}, ${this.know.dirDist(s.c, s.r, p.t).txt}` : ""}.`); }
    if (s.hunger === 1) this.speak("My food is gone. I must buy more at a market, fish, or forage.", "nofood", "The food is gone. We must buy more at a market, fish, or forage.");
    if (v && v.crew && v.morale < 20 && s.aboard && !s.voyage) { this._ultimatum = true; }
    if (s.hunger >= 7) { this.collapse("hunger"); return true; }
    this.dirty = true;
    return false;
  },
  // ------------------------------------------------------------------ sleep
  awakeTick(h) {
    const s = this.s;
    if (s.watchBelow) { if (s.clock < s.watchBelow && s.aboard && s.vessel && !this.riding()) return; delete s.watchBelow; }
    s.awake = (s.awake || 0) + h;
    if (s.awake >= AZ.COLLAPSE_H && !this.ui.busy()) {
      this.ui.toast("You fall asleep where you stand, and wake ten hours later.");
      s.clock += 10; this.slept();
      if (s.vessel && s.aboard && s.vessel.crew) s.vessel.morale -= 5;
      this.log("Fell asleep from exhaustion.");
      return;
    }
    if (s.awake >= 30) { delete s.cond.tired; s.cond.exhausted = true; }
    else if (s.awake >= 18) { s.cond.tired = true; }
  },
  slept() { const s = this.s; s.awake = 0; delete s.cond.tired; delete s.cond.exhausted; },
  nearestPort(cls) {
    const s = this.s, w = this.w;
    let best = null, bd = 1e9;
    for (const b of w.P.burgs) if (b && b.port) { const h = w.harbour(b, cls || "boat"); if (!h) continue; const d = Math.hypot(h.t[0] - s.c, h.t[1] - s.r); if (d < bd) { bd = d; best = b; } }
    return best;
  },
  // collapse: aboard your own vessel, the crew (or a passing boat) brings her into the nearest
  // harbour; she waits there with her damage. Ashore, you wake in the nearest town.
  async collapse(cause) {
    const s = this.s, w = this.w, U = AZ.U, v = s.vessel;
    const afloat = !!(v && s.aboard && !this.riding());
    let b = null, boat = "";
    if (afloat) {
      const run = this.runToPort(v), kind = U.esc(v.kind.toLowerCase());
      b = run ? run.port : this.nearestPort(v.cls);
      if (run) s.clock += run.miles / (v.speed || 6);
      if (v.mode === "hired") { s.vessel = null; boat = `${v.crew ? "The crew brought you in" : "A fishing boat found you adrift and towed you in"}, and the ${kind} has gone back to her owner.`; }
      else { if (run) { v.c = run.h[0]; v.r = run.h[1]; } v.anchored = true; boat = `${v.crew ? "The crew brought" : "A fishing boat towed"} your ${kind} into ${U.esc(b.name)} harbour, where she waits${v.damaged ? ", still damaged" : ""}.`; }
    }
    b = b || w.near(s.c, s.r, 200).find(n => n.kind === "burg")?.o || this.nearestPort("boat");
    const lost = U.rn(s.purse / 2, 2);
    s.purse = U.rn(s.purse - lost, 2); s.clock += 72; s.hunger = 0; s.feverDays = 0; s.sup.food = Math.max(s.sup.food, 1);
    for (const k of ["hungry", "starving", "thirsty", "fever", "gravely"]) delete s.cond[k];
    this.slept();
    s.voyage = null; s.aboard = false; s.auto = false;
    s.c = b.t[0]; s.r = b.t[1]; this.anim = null;
    this.log(`Collapsed from ${cause || "hunger"}; woke in ${U.esc(b.name)}.`, "hook");
    await this.ui.say([`You collapse${cause === "fever" ? " in the fever" : ""}. Days later you wake in ${U.esc(b.name)}, in a stranger's bed. Someone has been paid for your keep: 🟡 ${lost} is gone from your purse ${AZ.T("mixed")}.`, boat]);
    this.afterStep();
  },
  async mutiny() {
    const s = this.s, w = this.w, U = AZ.U, v = s.vessel;
    const b = this.nearestPort(v.cls) || w.P.burgs.find(x => x && x.port);
    const h = w.harbour(b, v.cls);
    const miles = Math.hypot(h.t[0] - s.c, h.t[1] - s.r) * w.miles;
    s.clock += miles / v.speed;
    s.c = h.t[0]; s.r = h.t[1]; s.auto = false; this.anim = null;
    this.log(`Mutiny: the crew took the boat into ${U.esc(b.name)}.`, "hook");
    if (v.mode === "hired") { s.vessel = null; s.aboard = false; s.c = b.t[0]; s.r = b.t[1]; }
    else { v.crew = 0; v.strikes = 0; v.c = h.t[0]; v.r = h.t[1]; }
    await this.ui.say([`<b class="hook">Mutiny.</b> Third strike: the crew turns the ${U.esc(v.kind.toLowerCase())} for ${U.esc(b.name)} and will not hear another word ${AZ.T("mixed")}.`,
      v.mode === "hired" ? "In harbour they walk off with the boat's owner, and your deposit goes with them. You are ashore." : "In harbour they take their wages in silence and leave. Your boat has no crew; hire one at the harbour."]);
    this.afterStep();
  },
  // three strikes: each time morale breaks, the crew states its terms; the third time they take the boat
  async ultimatum() {
    const s = this.s, v = s.vessel, U = AZ.U, w = this.w, P = AZ.Prices;
    s.auto = false;
    v.strikes = (v.strikes || 0) + 1;
    this.log(`The crew's ultimatum (strike ${v.strikes}).`, "hook");
    if (v.strikes >= 3) return this.mutiny();
    const port = this.nearestPort(v.cls), h = port && w.harbour(port, v.cls);
    const days = h ? Math.ceil((Math.hypot(h.t[0] - s.c, h.t[1] - s.r) * w.miles) / (v.speed * v.hpd)) + 2 : 0;
    const bonus = U.rn(v.crew * (v.wage || 0.2) * 5, 2);
    const k = await this.ui.choose(`<b>The crew has had enough</b> (strike ${v.strikes} of 3). The mate speaks for them: better pay, or a port, or they will take matters into their own hands ${AZ.T("mixed")}.`,
      [{ label: `Pay a bonus of 🟡 ${bonus} (morale +30)`, disabled: s.purse < bonus }, { label: port ? `Promise ${U.esc(port.name)} within ${days} days (morale +15)` : "No port to promise", disabled: !port }, { label: "Refuse, and face them down" }], { cancel: 2 });
    if (k === 0) { s.purse = U.rn(s.purse - bonus, 2); v.morale = Math.min(100, v.morale + 30); this.ui.toast("The money goes round the forecastle. They go back to work."); }
    else if (k === 1) { v.morale += 15; v.promise = { name: port.name, b: port.i, by: s.clock + days * 24 }; s.waypoint = h.t; this.setAuto(true); this.ui.toast(`You give your word: ${U.esc(port.name)}.`); }
    else { v.morale += 5; this.ui.toast("They back down, for now. Nobody meets your eye."); }
    this.dirty = true;
    void P;
  },
  async stormCall() {
    const s = this.s, U = AZ.U, w = this.w;
    const until = (Math.floor(s.clock / 12) + 1) * 12;
    if (s.voyage) {
      const h = Math.max(2, until - s.clock);
      s.clock = until;
      this.log(`Storm: ${U.esc(s.voyage.ship)} hove to for ${Math.round(h)} h.`);
      return this.ui.say(`<b>Storm.</b> The captain of ${U.esc(s.voyage.ship)} heaves to and rides it out: ${Math.round(h)} hours lost ${AZ.T("mixed")}.`);
    }
    const v = s.vessel;
    if (!v) return;
    const port = this.nearestPort(v.cls), h = port && w.harbour(port, v.cls);
    const k = await this.ui.choose(`<b>A storm is coming up.</b> ${v.crew ? `The crew wants to run for shelter. Morale ${Math.round(v.morale)}.` : ""}`,
      [{ label: `Heave to until it passes (${Math.round(until - s.clock)} h)` }, { label: port ? `Run for ${U.esc(port.name)} harbour` : "No harbour near", disabled: !port }, { label: "Ride it out under sail (morale −10, risk of damage)" }], { cancel: 0 });
    if (k === 0) { s.clock = until; this.ui.toast("The storm blows itself out."); }
    else if (k === 1) { s.waypoint = h.t; this.setAuto(true); }
    else { v.morale -= 10; if (AZ.U.rnd2(s.c, s.r, Math.floor(s.clock) + 5) < 0.3) this.events.fx({ cond: "damaged" }, "Storm damage."), this.ui.toast("A spar carries away. The boat is damaged."); }
    this.dirty = true;
  },
  // ------------------------------------------------------------------ harbour
  canCrew() { return /deck|net|sail|fish|cook|supercargo|shipmaster/i.test(this.tv.trade) || this.tv.kind === "shipmaster"; },
  vesselHere(b) { const v = this.s.vessel; if (!v) return false; if (v.cls === "air") return v.c === b.t[0] && v.r === b.t[1]; return ["boat", "ship"].some(cls => { const h = this.w.harbour(b, cls); return h && h.t[0] === v.c && h.t[1] === v.r; }); },
  boardOptions(b) {
    const s = this.s, U = AZ.U, opts = [];
    const v = s.voyage;
    if (v && v.state === "port" && v.portBurg === b.i) {
      if (!this.riding()) opts.push({ label: `Board ${U.esc(v.ship)} (sails ${AZ.Clock.fmt(v.departAt)}, in ${AZ.Clock.span(v.departAt - s.clock)})`, cls: "hook", act: { go: async () => { s.aboard = true; v.boarded = true; s.c = v.at[0]; s.r = v.at[1]; this.ui.toast(`Aboard ${U.esc(v.ship)}.`); this.afterStep(); } } });
      opts.push({ label: `Wait aboard until ${U.esc(v.ship)} sails (${AZ.Clock.span(v.departAt - s.clock)})`, act: { go: async () => { s.aboard = true; v.boarded = true; s.c = v.at[0]; s.r = v.at[1]; s.clock = v.departAt; this.afterStep(); } } });
      if (this.riding()) opts.push({ label: "Go ashore and walk (mind the sailing time)", act: { go: async () => { s.aboard = false; v.boarded = false; s.c = b.t[0]; s.r = b.t[1]; this.afterStep(); } } });
    }
    if (s.vessel && this.vesselHere(b)) {
      if (!s.aboard || this.riding()) opts.push({ label: `Board your ${U.esc(s.vessel.kind.toLowerCase())}${s.vessel.crew ? "" : " (no crew!)"}`, act: { go: async () => { if (s.voyage) s.voyage.boarded = false; s.aboard = true; s.c = s.vessel.c; s.r = s.vessel.r; this.afterStep(); } } });
      else opts.push({ label: `Go ashore and walk (the ${U.esc(s.vessel.kind.toLowerCase())} waits ${s.vessel.cls === "air" ? "at her mooring" : "in harbour"})`, act: { go: async () => { s.aboard = false; s.c = b.t[0]; s.r = b.t[1]; this.afterStep(); } } });
    }
    return opts;
  },
  shipWarn() { const v = this.s.voyage; return v && v.state === "port" && v.departAt < AZ.Clock.nextDawn(this.s.clock, this.lat()) ? " — the ship sails before morning!" : ""; },
  voyageLine() { const v = this.s.voyage; return v && v.state === "port" ? ` · <span class="hook">${AZ.U.esc(v.ship)} sails ${AZ.Clock.fmt(v.departAt)} (in ${AZ.Clock.span(v.departAt - this.s.clock)})</span>` : ""; },
  // ------------------------------------------------------------------ voyages
  depart() {
    const s = this.s, v = s.voyage, U = AZ.U, w = this.w;
    if (!this.riding()) {
      this.log(`Missed ${U.esc(v.ship)}: she sailed ${AZ.Clock.fmt(v.departAt)} without you.`, "hook");
      s.voyage = null; this.dirty = true;
      return this.ui.say(`<b class="hook">${U.esc(v.ship)} has sailed without you.</b> The fare is gone. Book another ship at the harbour.`);
    }
    const stop = v.stops[v.leg], tb = w.P.burgs[stop.b], th = w.harbour(tb, "ship");
    let course = null;
    const plan = v.planned && this.jr && this.jr.segs.find(sg => sg.moving && sg.fromHarbour && sg.fromHarbour[0] === v.at[0] && sg.fromHarbour[1] === v.at[1] && sg.place.burg === tb);
    if (plan) { course = plan.chain; v.milesPerStep = plan.miles / Math.max(1, plan.chain.length - 1); }
    else { course = th ? w.waterPath(v.at, th.t, "ship") : null; v.milesPerStep = course ? course.mps : w.miles; }
    if (!course) {
      const port = w.P.burgs[v.portBurg];
      this.log(`${U.esc(v.ship)} could not find a way to ${U.esc(tb.name)}.`);
      s.voyage = null; s.aboard = false; s.purse = U.rn(s.purse + (v.leg === 0 ? v.fare : 0), 2);
      if (port) { s.c = port.t[0]; s.r = port.t[1]; }
      this.anim = null; this.afterStep();
      return this.ui.say(`The captain will not risk it: there is no way by sea to ${U.esc(tb.name)} from here. The voyage is off${v.leg === 0 ? " and your fare is returned" : ""}; you are put ashore.`);
    }
    v.course = course; v.pos = 0; v.state = "sea"; v.to = th.t;
    s.c = course[0][0]; s.r = course[0][1];
    this.log(`${U.esc(v.ship)} cast off for ${U.esc(tb.name)}.`);
    this.ui.toast(`${U.esc(v.ship)} casts off for ${U.esc(tb.name)}. Space for the voyage's options.`);
    this.dirty = true;
  },
  voyageStep() {
    const s = this.s, v = s.voyage, U = AZ.U, w = this.w;
    const next = v.course[v.pos + 1];
    if (!next) return this.dock();
    const dc = next[0] - s.c, dr = next[1] - s.r;
    s.dir = dc < 0 ? "left" : dc > 0 ? "right" : s.dir;
    const hours = this.stepHours(next[0], next[1], dc, dr);
    this.anim = { from: [s.c, s.r], to: [next[0], next[1]], t0: performance.now(), dur: this.fast ? 22 : 70 };
    s.c = next[0]; s.r = next[1]; s.clock += hours; v.pos++;
    this.afterStep();
    void U; void w;
  },
  // let a number of hours pass aboard: the ship sails on without drawing every step
  advanceVoyage(hours) {
    const s = this.s, v = s.voyage;
    if (!v || v.state !== "sea") return;
    const until = s.clock + hours;
    let guard = 0;
    while (s.voyage === v && v.state === "sea" && guard++ < 5000) {
      if (!v.course[v.pos + 1]) { this.dock(); break; }
      if (s.clock >= until && hours > 0) break;
      this.anim = null; this.voyageStep(); this.anim = null;
      if (this.ui.busy()) break;
      if (hours === 0) break;
    }
    this.dirty = true;
  },
  goodsCount() { return Object.values(this.s.goods || {}).reduce((a, n) => a + n, 0); },
  cheapFood(b) {
    const w = this.w, mk = AZ.Prices.market(w, b);
    if (!mk) return "no market";
    const f = w.P.goods.filter(g => (g.tags || []).includes("food") && mk.goods[g.i]).sort((a, c) => mk.goods[a.i][1] - mk.goods[c.i][1])[0];
    return f ? `${f.name.toLowerCase()} at ${mk.goods[f.i][1]} a unit, ${Math.round((this.w.P.states[b.state]?.salesTax || 0) * 100)}% tax` : "no food on the market";
  },
});
