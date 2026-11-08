// =============================================================================================
// 32_quests.js · Alpha 7: the journey as a quest log.
//   Each checkpoint of the map's journey is a quest step: reach the place, then do what the plan
//   does there (book passage, give alms, rest, gather the company, read the bounty). The objective
//   in the corner is the first thing not yet done. Side quests (10_quests) sit beside it; one of
//   them can be tracked. Some journeys bring their own transport: a company's vessel for raids and
//   campaigns, an airship, a teleport circle; those are offered in the town where the leg begins.
// =============================================================================================
(() => {
  const G = AZ.Game.prototype, U = AZ.U, T = AZ.T;

  G.trackedThread = function () {
    const s = this.s, act = s.threads.filter(t => !t.done);
    return act.find(t => t.id === s.track) || null;
  };
  G.objective = function () {
    const s = this.s, jr = this.jr;
    if (!s) return null;
    if (!jr) {
      const th = this.trackedThread() || s.threads.find(t => !t.done);
      if (!th) return { text: "Explore as you please", short: "the road ahead" };
      const tg = this.threadTarget(th);
      return { text: `◆ ${th.steps[th.phase].text}`, short: th.title, tile: tg.tile, name: tg.name, burg: tg.burg };
    }
    if (s.done) return { text: `The ${AZ.noun(jr)} is complete. Explore as you please.`, short: "the road ahead" };
    const here = this.cpHere(), acts = here ? this.pendingActs() : [];
    if (here && acts.length) return { text: `★ ${acts[0].label}`, short: acts[0].label.replace(/\s*\(R\)$/, "").toLowerCase(), tile: here.tile, name: here.place.name, burg: here.place.at ? here.place.burg : null, here: true };
    const cp = this.cpNext();
    if (!cp) return null;
    return { text: `→ ${cp.place.at ? "Go to" : "Make for a point"} ${cp.place.name}`, short: `the way to ${cp.place.name}`, tile: cp.tile, name: cp.place.name, burg: cp.place.at ? cp.place.burg : null, leg: cp.legIn };
  };
  // the journal's quest log: one entry per checkpoint
  G.journeyEntries = function () {
    const s = this.s, jr = this.jr;
    if (!jr) return [];
    return jr.cps.map((cp, i) => {
      const rec = s.cpRec[i], arrived = !!(rec && rec.arrive != null), skipped = !!(rec && rec.skipped);
      const acts = cp.acts.map(a => ({ a, done: !!(rec && rec.acts && rec.acts[a.id]) }));
      const head = i === 0 ? `Set out from ${cp.place.name}` : `${cp.place.at ? "Reach" : "Pass"} ${cp.place.name}${cp.legIn ? ` by ${cp.legIn.transport.toLowerCase()}` : ""}`;
      const status = skipped ? "skipped" : arrived && acts.every(x => x.done) ? "done" : arrived ? "here" : i === s.cp ? "next" : "later";
      return { i, cp, head, day: Math.floor((arrived ? rec.arrive : cp.parArrive) / 24) + 1, planDay: Math.floor(cp.parArrive / 24) + 1, acts, status, arrived };
    });
  };

  // ------------------------------------------------------------------ the journey's own transport
  G.journeyVesselOptions = function (b) {
    const s = this.s, cp = this.cpHere(), out = [];
    if (!cp || cp.place.burg !== b || !cp.legOut || s.voyage) return out;
    const seg = cp.legOut, dest = seg.place, cls = AZ.vesselClass(seg.transport), arch = AZ.archOf(this.jr);
    if (AZ.isTeleport(seg.transport)) out.push({ label: `★ Step through the circle to ${U.esc(dest.name)}`, detail: "the journey", cls: "hook", desc: "A teleport crosses the leg at once.", run: () => this.teleportLeg(seg) });
    else if (cls === "air") out.push({ label: `★ Board the ${U.esc(seg.transport.toLowerCase())} for ${U.esc(dest.name)}`, detail: "the journey's own craft", cls: "hook", desc: "The company's craft flies the plan's line.", run: () => this.airLeg(seg, b) });
    else if (seg.domain === "water" && (AZ.OWN_TRANSPORT.has(arch) || cp.acts.some(a => a.id === "board")) && !(s.vessel && s.vessel.mode === "company")) {
      const vc = AZ.classOf(seg.transport);
      out.push({ label: `★ The company's ${U.esc(this.realise(vc, b).kind.toLowerCase())} waits at the quay`, detail: "board her", cls: "hook", desc: "The journey's own vessel, with her hands. You command her.", run: () => this.companyVessel(seg, b) });
    }
    return out;
  };
  G.companyVessel = async function (seg, b) {
    const s = this.s, w = this.w;
    let vc = AZ.classOf(seg.transport);
    if (!AZ.VCLASS[vc] || !w.harbour(b, AZ.VCLASS[vc].nav)) vc = "boat";
    if (!w.harbour(b, AZ.VCLASS[vc].nav)) return this.ui.say("There is no water here that the company's vessel can use.");
    const v = this.newVessel(vc, "company", b, AZ.VCLASS[vc].crew || 3);
    v.wage = 0; s.vessel = v; s.aboard = true; s.c = v.c; s.r = v.r; this.anim = null;
    const act = this.doAct("board", b);
    this.log(`Boarded the company's ${U.esc(v.kind.toLowerCase())} in ${U.esc(b.name)}.`, "hook");
    if (act) this.ui.toast(`<span class="hook">★ ${U.esc(act.label)}</span>`, "gold");
    this.afterStep();
  };
  G.airLeg = async function (seg, b) {
    const s = this.s, w = this.w, dest = seg.place.burg || this.jr.nearestBurg(seg.endTile);
    s.voyage = { ship: `the ${seg.transport.toLowerCase()}`, captain: this.know.person(`air:${seg.k}`, b.culture), flag: b.state, role: "passenger", fare: 0, cls: "air", mode: "air", speed: seg.speed, hpd: 24,
      stops: [{ b: dest.i, name: seg.place.name, stay: 0 }], leg: 0, state: "sea", at: b.t.slice(), portBurg: b.i, departAt: s.clock, course: seg.chain, pos: 0, boarded: true, greeted: true,
      milesPerStep: seg.miles / Math.max(1, seg.chain.length - 1), planned: true, from: b.i, why: `the journey's own craft, bound for ${seg.place.name}` };
    s.aboard = true; s.c = seg.chain[0][0]; s.r = seg.chain[0][1]; this.anim = null;
    this.doAct("board", b);
    this.log(`Boarded the ${U.esc(seg.transport.toLowerCase())} in ${U.esc(b.name)}.`, "hook");
    this.afterStep();
    await this.departScene();
  };
  G.teleportLeg = async function (seg) {
    const s = this.s;
    s.c = seg.endTile[0]; s.r = seg.endTile[1]; this.anim = null;
    const out = this.events.fx({ time: 1 }, `Stepped through the circle to ${U.esc(seg.place.name)}.`);
    this.afterStep();
    await this.scene(seg.place.name, () => this.ui.say(`The air folds. You stand ${U.esc(seg.place.name)}, ${U.num(Math.round(seg.miles))} miles from where you were ${T("data")}.${out}`));
  };
})();
