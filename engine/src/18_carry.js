// ---------------------------------------------------------------------------------------------
// What you carry, how tired you are, who travels with you, and how hard the ground is.
//   Carrying limits follow the way you travel. Leaving your own vessel, what you cannot carry stays
//   in her hold and comes back to you when you return; going ashore where hands stay aboard, you
//   choose how much food to take and how much to leave them. Leaving a booked passage or giving up
//   a vessel, the surplus is sold at the market in a town and left behind elsewhere.
//   The journal lists everything you carry. Exhaustion and falling asleep are announced.
//   The company rests, camps and crosses portals with you. The Effort lens shows how hard each
//   tile is to cross on foot, and steep ground is drawn more clearly.
// ---------------------------------------------------------------------------------------------
(() => {
  const U = AZ.U, T = AZ.T, G = AZ.Game.prototype;

  // ------------------------------------------------------------------ carrying limits
  G.enforceCapacity = function () {
    const s = this.s, w = this.w;
    if (!s || this.ui.busy()) return;
    this.syncVessel();
    const cap = this.capacity(), b = w.burgAt.get(w.idx(s.c, s.r));
    const extraFood = s.sup.food - cap.food, goods = Object.entries(s.goods || {}).filter(([, n]) => n > 0);
    let extraGoods = this.goodsCount() - cap.goods;
    if (extraFood <= 0 && extraGoods <= 0) return;
    const L = [];
    if (extraFood > 0) {
      s.sup.food = cap.food;
      if (b) { const got = U.rn(extraFood * AZ.Prices.ration(w, b) * 0.5, 2); s.purse = U.rn(s.purse + got, 2); L.push(`${extraFood} rations sold at the market for 🟡 ${got}`); }
      else L.push(`${extraFood} rations left behind`);
    }
    for (const [gid, n] of goods.sort((a, c) => (AZ.Prices.goodPrice(w, b, a[0]) || 0) - (AZ.Prices.goodPrice(w, b, c[0]) || 0))) {
      if (extraGoods <= 0) break;
      const k = Math.min(n, extraGoods), q = b && this.goodQuote ? this.goodQuote(b, gid) : null;
      s.goods[gid] -= k; extraGoods -= k;
      if (q) { s.purse = U.rn(s.purse + q.sell * k, 2); L.push(`${k} ${this.know.good(gid).toLowerCase()} sold for 🟡 ${U.rn(q.sell * k, 2)}`); }
      else L.push(`${k} ${this.know.good(gid).toLowerCase()} left behind`);
    }
    this.log(`More than you can carry: ${L.join("; ")}.`);
    this.ui.say(`<b>More than you can carry.</b> On ${s.aboard ? "this vessel" : "foot"} you can take ${cap.food} rations and ${cap.goods} units of goods: ${L.join("; ")} ${T("mixed")}.`);
  };
  const after0 = G.afterStep;
  G.afterStep = function (...a) { after0.apply(this, a); this.enforceCapacity(); };

  // ------------------------------------------------------------------ the vessel's hold
  // back with your vessel, her hold is yours again; on leaving her, what you cannot carry stays aboard
  G.syncVessel = function () {
    const s = this.s, v = s.vessel, withV = this.withVessel();
    if (v && v.damaged) s.cond.damaged = true; else delete s.cond.damaged;
    if (v && withV) this.takeHold();
    else if (v && s.wasWithVessel !== false) this.stowHold();
    s.wasWithVessel = withV;
  };
  G.stowHold = function () {
    const s = this.s, v = s.vessel, hold = this.holdOf(v), cap = this.capacity(), L = [];
    const extra = s.sup.food - cap.food;
    if (extra > 0) { hold.food += extra; s.sup.food = cap.food; L.push(`${extra} rations`); }
    let extraG = this.goodsCount() - cap.goods;
    for (const [gid, n] of Object.entries(s.goods || {}).filter(([, k]) => k > 0).sort((a, c) => ((s.basis || {})[a[0]] || 0) - ((s.basis || {})[c[0]] || 0))) {
      if (extraG <= 0) break;
      const k = Math.min(n, extraG);
      s.goods[gid] -= k; hold.goods[gid] = (hold.goods[gid] || 0) + k; extraG -= k;
      L.push(`${k} ${this.know.good(gid).toLowerCase()}`);
    }
    if (!L.length) return;
    this.log(`Left in the hold of the ${U.esc(v.kind.toLowerCase())}: ${U.esc(L.join(", "))}.`);
    this.ui.toast(`More than you can carry on foot: ${U.esc(L.join(", "))} stay in the hold of the ${U.esc(v.kind.toLowerCase())} ${T("mixed")}.`);
  };
  G.takeHold = function () {
    const s = this.s, v = s.vessel;
    if (!v || !v.hold) return;
    const h = v.hold, L = [], waited = v.waited || 0;
    s.goods = s.goods || {};
    if (h.food > 0) { s.sup.food += h.food; L.push(`${h.food} rations`); }
    for (const [gid, n] of Object.entries(h.goods || {})) if (n > 0) { s.goods[gid] = (s.goods[gid] || 0) + n; L.push(`${n} ${this.know.good(gid).toLowerCase()}`); }
    v.hold = { food: 0, goods: {} }; v.waited = 0; v.patience = null;
    if (L.length || waited) this.ui.toast(`Back with the ${U.esc(v.kind.toLowerCase())}${waited ? ` after ${waited} day${waited > 1 ? "s" : ""}` : ""}${L.length ? `: ${U.esc(L.join(", "))} in the hold` : ""}.`);
  };
  // going ashore (or setting down) where hands stay aboard: how much food do you take?
  G.goAshore = async function (t, confirmed) {
    const s = this.s, v = s.vessel, n = this.crewFed(v), kind = U.esc(v.kind.toLowerCase());
    const air = v.cls === "air", verb = air ? "Set down and step out" : "Go ashore", foot = AZ.CARRY.foot;
    const step = () => { s.aboard = false; s.auto = false; v.anchored = true; v.waited = 0; if (t) { s.c = t[0]; s.r = t[1]; } this.anim = null; this.afterStep(); };
    if (!n) {
      if (confirmed) return step();
      const k = await this.ui.choose(`${verb} here? The ${kind} waits, with no one aboard. On foot you carry up to ${foot.food} rations and ${foot.goods} units of goods; the rest stays in the hold ${T("mixed")}.`, [{ label: verb }, { label: "Stay aboard" }], { cancel: 1 });
      if (k === 0) step();
      return;
    }
    const run = this.runToPort(v), patience = this.patienceOf(v), total = s.sup.food, pname = run ? U.esc(run.port.name) : "";
    const wages = v.mode === "hired" ? " Wages and hire run on." : v.mode === "owned" ? " Wages run on." : "";
    const after = v.mode === "hired" ? "If they sail without you, they take the boat back to her owner, with whatever is aboard." : v.mode === "owned" ? "If they sail without you, they bring her into port, take their wages and leave her there." : "If they sail without you, they take her into port and wait for you there.";
    const opts = [];
    for (const take of [...new Set([Math.min(total, foot.food), Math.min(total, Math.ceil(foot.food / 2)), Math.min(total, 3), 0])].sort((a, c) => c - a)) {
      const leave = total - take, wait = Math.min(patience, Math.floor((leave - (run ? run.food : 0)) / n));
      const what = run && leave < run.food ? `too little for their run to ${pname} (${run.food} rations)` : wait <= 0 ? (run ? `they sail for ${pname} at the next dawn` : "they go hungry from tomorrow") : `they wait about ${wait} day${wait > 1 ? "s" : ""}`;
      opts.push({ label: `${verb}: take ${take} rations and leave ${leave} aboard; ${what}`, take, leave });
    }
    opts.push({ label: "Stay aboard" });
    const head = `<b>${verb} here?</b> ${n} ${n > 1 ? "hands stay" : "hand stays"} aboard the ${kind} and eat${n > 1 ? "" : "s"} from what you leave: ${n} ration${n > 1 ? "s" : ""} a day.${wages} ${run ? `They keep enough for the run to ${pname}, the nearest harbour: ${run.food} rations, ${run.days} day${run.days > 1 ? "s" : ""}.` : "No harbour can be reached from here by water."} At morale ${Math.round(v.morale)} they wait ${patience} days at most. ${after} ${T("mixed")}`;
    const k = await this.ui.choose(head, opts, { cancel: opts.length - 1 });
    const o = opts[k];
    if (o.take == null) return;
    if (run && o.leave < run.food) {
      const enough = total - run.food;
      const k2 = await this.ui.choose(`<b>The mate blocks the way.</b> “${o.leave} rations, and ${run.days} day${run.days > 1 ? "s" : ""} from ${pname}? You are leaving us to die out here.” Morale ${Math.round(v.morale)}${v.strikes ? `, strikes ${v.strikes}/3` : ""} ${T("mixed")}.`,
        [{ label: enough >= 0 ? `Leave them enough for the run (take ${enough} rations)` : `You have too little food to leave them enough (${total} of ${run.food})`, disabled: enough < 0 }, { label: "Go anyway: they will take the boat to port, and it counts as a strike" }, { label: "Stay aboard" }], { cancel: 2 });
      if (k2 === 2) return;
      if (k2 === 0) { o.take = enough; o.leave = run.food; }
      else {
        v.strikes = (v.strikes || 0) + 1; v.morale -= 20;
        this.holdOf(v).food += o.leave; s.sup.food = o.take;
        this.log(`Went ashore and left the crew too little to reach ${pname} (strike ${v.strikes}).`, "hook");
        step();
        return this.crewSailsOff(v, run, "refused");
      }
    }
    this.holdOf(v).food += o.leave; s.sup.food = o.take; v.patience = patience;
    step();
  };

  // ------------------------------------------------------------------ what you carry (journal)
  G.carryHtml = function () {
    const s = this.s, tv = this.tv, U2 = U, items = [];
    items.push(`🟡 ${U2.rn(s.purse, 2)}`, `${s.sup.food} rations (you can carry ${this.capacity().food})`);
    const goods = Object.entries(s.goods || {}).filter(([, n]) => n > 0).map(([g, n]) => `${n} ${U2.esc(this.know.good(g).toLowerCase())} (paid 🟡 ${U2.rn((s.basis || {})[g] || 0, 2)} each)`);
    items.push(goods.length ? `Goods: ${goods.join(", ")} (${this.goodsCount()} of ${this.capacity().goods} units)` : `Goods: none (room for ${this.capacity().goods} units)`);
    items.push(U2.cap(U2.esc(tv.token)));
    const f = s.flags || {};
    if (f.relic) items.push("A relic in rotten cloth, for a temple of your faith");
    if (f.inscription) items.push("A copy of an inscription no one has read");
    if (f.flask) items.push("A flask of water from a healing spring");
    for (const th of s.threads.filter(t => !t.done)) {
      const st = th.steps[th.phase];
      if (/letter|message|dispatch|offering|consignment|papers|report|proof/i.test(st.text)) items.push(`For “${U2.esc(th.title)}”: ${U2.esc(st.text.toLowerCase())}`);
    }
    if (s.vessel) {
      const v = s.vessel, h = this.holdOf(v), g = Object.values(h.goods).reduce((a, k) => a + k, 0), n = this.crewFed(v);
      const port = this.vesselInPort(v), patience = v.patience ?? this.patienceOf(v);
      const away = port ? `waiting in ${U2.esc(port.name)}` : "waiting where you left her";
      items.push(`${U2.esc(v.kind)} (${v.mode}${v.damaged ? ", damaged" : ""}) ${this.withVessel() ? (s.aboard ? "under you" : "in harbour here") : `${away}, with ${h.food} rations${g ? ` and ${g} units of goods` : ""} in the hold${n ? `; ${n} aboard${port ? "" : `, who will wait about ${Math.max(0, patience - (v.waited || 0))} more days if the food lasts`}` : ""}`}`);
    }
    if (s.voyage) items.push(`A ${s.voyage.mode === "land" ? "seat" : "berth"} on ${U2.esc(s.voyage.ship)}`);
    return `<ul class="carry">${items.map(i => `<li>${i}</li>`).join("")}</ul>`;
  };
  const journal0 = G.journal;
  G.journal = function () {
    journal0.call(this);
    const sheet = this.ui.el.modal.querySelector(".sheet");
    if (!sheet) return;
    const h = document.createElement("div");
    h.innerHTML = `<h3>What you carry</h3>${this.carryHtml()}`;
    const first = sheet.querySelector("h3");
    if (first) sheet.insertBefore(h, first); else sheet.appendChild(h);
  };

  // ------------------------------------------------------------------ exhaustion is an event
  const awake0 = G.awakeTick;
  G.awakeTick = function (h) {
    const s = this.s, wasEx = !!s.cond.exhausted, before = s.awake || 0;
    awake0.call(this, h);
    if (!wasEx && s.cond.exhausted && !this.ui.busy()) this.ui.say(`<b class="late">Exhausted.</b> You have been awake ${Math.round(s.awake)} hours. Everything takes longer (×1.4), and at 44 hours you will fall asleep wherever you are. Camp, take a room, or rest six hours (R).`);
    if (before + h >= 44 && (s.awake || 0) === 0 && !this.ui.busy()) this.ui.say(`<b class="late">You fell asleep where you stood</b> and woke ten hours later${s.vessel && s.aboard && s.vessel.crew ? "; the crew kept the watch, and did not like it" : ""}.`);
  };

  // ------------------------------------------------------------------ the company
  const partyLine = g => (g.s.party && g.s.party.length && !g.s.partyAway ? `${g.s.party.map(p => U.esc(p.name)).join(", ")} ` : "");
  const camp0 = G.campNight;
  G.campNight = async function () {
    const s = this.s, say0 = this.ui.say.bind(this.ui), who = partyLine(this);
    if (who) this.ui.say = (p, w2) => say0(String(p).replace(/^You camp in/, `You and the company (${who.trim()}) camp in`), w2);
    try { return await camp0.call(this); } finally { this.ui.say = say0; }
  };
  const portal0 = AZ.MARKERS.portals.run;
  AZ.MARKERS.portals.run = async (ev, m, head) => {
    const g = ev.g, s = g.s, before = [s.c, s.r], t0 = s.clock;
    await portal0(ev, m, head);
    if (!s.party || !s.party.length || (s.c === before[0] && s.r === before[1])) return;
    const remote = !g.w.near(s.c, s.r, 25).some(n => n.kind === "burg"), lostDays = s.clock - t0 > 24;
    if (remote || lostDays) {
      const meet = g.w.P.markers.find(x => x.type === "portals" && x.i !== m.i && Math.hypot(x.t[0] - s.c, x.t[1] - s.r) > 2) || m;
      s.partyAway = { t: meet.t, name: meet.name };
      g.log(`The crossing split the company; they will wait at the ${U.esc(meet.name)}.`, "hook");
      await g.ui.say(`The company is not with you. The crossing split you; they will make for the ${U.esc(meet.name)} and wait there ${T("mixed")}. Until you find them, you travel alone.`);
    }
  };
  const after1 = G.afterStep;
  G.afterStep = function (...a) {
    after1.apply(this, a);
    const s = this.s;
    if (s && s.partyAway && Math.hypot(s.partyAway.t[0] - s.c, s.partyAway.t[1] - s.r) <= 2) { const n = s.partyAway.name; s.partyAway = null; this.log("The company is together again.", "hook"); this.ui.say(`At the ${U.esc(n)} the company is waiting for you. Together again.`); }
  };
  const advice0 = G.advice;
  G.advice = async function () { if (this.s.partyAway) return this.ui.say(`You are alone: the company waits at the ${U.esc(this.s.partyAway.name)}, ${this.know.dirDist(this.s.c, this.s.r, this.s.partyAway.t).txt}.`); return advice0.call(this); };
  const interact1 = G.interact;
  G.interact = async function () {
    const s = this.s;
    if (s.partyAway && s.party?.length) { const keep = s.party; s.party = []; try { return await interact1.call(this); } finally { s.party = keep; } }
    return interact1.call(this);
  };

  // ------------------------------------------------------------------ the Effort lens: how hard each tile is on foot
  const effort = (w, c, r) => {
    if (!w.isLand(c, r)) return null;
    const B = w.bits(c, r), b = w.P.biomes[w.C.biome[w.cell(c, r)]];
    let f = B.road ? 0.8 : B.trail ? 1 : U.clamp((b.cost || 50) / 50, 1, 4);
    const rel = w.reliefAt(c, r);
    if (rel && !B.road) f *= /mount/i.test(rel.icon) ? 1.6 : 1.2;
    return f;
  };
  AZ.LENSES.splice(3, 0, { id: "effort", name: "Effort on foot", tile: true,
    color: (w, cell, c, r) => { const f = effort(w, c, r); return f == null ? null : U.ramp([[0.8, [70, 170, 90]], [1.2, [200, 210, 90]], [2, [230, 150, 60]], [3.5, [190, 60, 50]], [6.4, [110, 30, 60]]], f); },
    label: (w, cell, c, r) => { const f = effort(w, c, r); return f == null ? "water" : `${U.rn(f, 1)}× the time of open grassland${w.reliefAt(c, r) ? " · " + w.reliefAt(c, r).rule.toLowerCase() : ""}${w.bits(c, r).road ? " · road" : ""}`; } });
})();
