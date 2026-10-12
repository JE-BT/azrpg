// Vessel checks: damage belongs to the vessel; time spent in town counts as time awake; F follows
// the plan's course from wherever the boat lies; the hold keeps what you cannot carry; the hands
// left aboard eat from it and sail when they must; round-the-clock crews keep watches; a fixed
// world has working harbours and markets. Run: node tests/vessels.js out/Pyeongak_rpg.html
const { loadWorld, stubUI } = require("./harness.js");
const ok = (cond, msg) => { console.log(`${cond ? "ok  " : "FAIL"} ${msg}`); if (!cond) process.exitCode = 1; };
(async () => {
  const { AZ, P, w, mk } = await loadWorld(process.argv[2]);
  const jr = new AZ.Journey(w, P.journeys[0]);
  const mkGame = (j, opts = { mode: "journey" }) => {
    const ui = stubUI(); const g = new AZ.Game(w, new AZ.Renderer(w, new AZ.Art(w, mk), mk(10, 10), mk), ui, j, { getItem: () => null, setItem: () => {} });
    AZ.game = g; g.jr0 = jr; g.fresh(3, null, 80, opts); g.started(); g.s.purse = 500; return [g, ui];
  };
  const boatAt = (g, b, mode = "hired", extra = {}) => { const h = w.harbour(b, "boat").t; g.s.vessel = { mode, kind: "Sailing boat", cls: "boat", speed: 6, hpd: 12, crew: 3, morale: 80, c: h[0], r: h[1], wage: 0.1, hire: 0.1, home: b.i, ...extra }; return h; };
  const port = P.burgs.find(b => b && b.port && w.harbour(b, "boat") && b.population > 3);
  let spot = null; // a sea tile beside open land, away from towns, on the same water as the port
  const ph = w.harbour(port, "boat").t;
  for (let r = 0; r < w.rows && !spot; r += 3) for (let c = 0; c < w.cols && !spot; c += 3) {
    if (w.isLand(c, r) || !w.navigable(c, r, "boat") || w.near(c, r, 4).some(n => n.kind === "burg") || !w.sameWater([c, r], ph, "boat")) continue;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!spot && w.isLand(c + a, r + b) && !w.navigable(c + a, r + b, "boat")) spot = { sea: [c, r], land: [c + a, r + b] };
  }

  // 1. damage stays with the boat: losing the boat loses the damage, and a new boat starts sound
  {
    const [g] = mkGame(jr), s = g.s;
    const h = boatAt(g, port); s.aboard = true; s.c = h[0]; s.r = h[1];
    g.events.fx({ cond: "damaged" });
    ok(s.vessel.damaged && s.cond.damaged, "damage is put on the vessel and shown as a condition");
    s.sup.food = 0; s.hunger = 7; await g.collapse("hunger");
    ok(!s.vessel && !s.cond.damaged, "after collapsing aboard a hired boat, the boat and her damage are gone");
    boatAt(g, port); g.afterStep();
    ok(!s.cond.damaged && !s.vessel.damaged, "the next boat starts sound");
    const save = { ...s, vessel: null, cond: { damaged: true } }; g.s = save; g.backfill(); g.s = s;
    ok(!save.cond.damaged, "an old save with damage and no vessel is cleaned on load");
  }
  // 2. an owned boat that collapses at sea is brought into harbour, damage and all
  {
    const [g] = mkGame(jr), s = g.s;
    const h = boatAt(g, port, "owned", { damaged: true });
    let sea = null;
    for (let r = -6; r <= 6 && !sea; r++) for (let c = -6; c <= 6 && !sea; c++) if (Math.abs(r) + Math.abs(c) > 3 && w.navigable(h[0] + c, h[1] + r, "boat") && w.sameWater(h, [h[0] + c, h[1] + r], "boat")) sea = [h[0] + c, h[1] + r];
    s.vessel.c = sea[0]; s.vessel.r = sea[1]; s.aboard = true; s.c = sea[0]; s.r = sea[1];
    await g.collapse("hunger");
    const inPort = g.vesselInPort(s.vessel);
    ok(s.vessel && inPort && s.vessel.damaged && g.burgHere() === inPort, `an owned boat is brought into ${inPort?.name} harbour, still damaged, and you wake there`);
  }
  // 3. repairs take twelve waking hours; an inn night is sleep
  {
    const [g, ui] = mkGame(jr), s = g.s;
    const h = boatAt(g, port, "hired", { damaged: true }); s.aboard = true; s.c = h[0]; s.r = h[1]; g.afterStep();
    s.awake = 2; ui.script = [/Have the boat repaired/, /Leave/]; await g.town(port);
    ok(!s.vessel.damaged && Math.round(s.awake) === 14, `a repair keeps you awake twelve hours (awake ${Math.round(s.awake)} h)`);
    ui.script = [/^Inn/, /Leave/]; await g.town(port);
    ok(s.awake === 0, "a night at the inn is sleep");
  }
  // 4. F follows the plan's course from the boat harbour, and rejoins it after a detour
  {
    const leg = jr.segs.find(sg => sg.moving && /boat/i.test(sg.transport) && sg.fromHarbour), cp = jr.cps.find(c => c.legIn === leg);
    if (leg && cp) {
      const [g] = mkGame(jr), s = g.s;
      const from = w.P.burgs[w.C.burg[leg.from]], h = boatAt(g, from); s.cp = cp.i; s.aboard = true; s.c = h[0]; s.r = h[1];
      const onChain = p => p.filter(([c, r]) => leg.chainPos.has(w.idx(c, r))).length / p.length;
      const path = g.planAuto(), straight = w.waterPath(h, path[path.length - 1], "boat");
      ok(path && onChain(path) > 0.8, `from ${from.name}'s boat harbour F keeps to the plan's course (${Math.round(onChain(path) * 100)}% on it; the shortest way is ${Math.round(onChain(straight) * 100)}%)`);
      const k = Math.floor(leg.chain.length / 2), mid = leg.chain[k];
      let off = null;
      for (let d = 4; d < 12 && !off; d++) for (const [a, b] of [[d, 0], [-d, 0], [0, d], [0, -d]]) { const t = [mid[0] + a, mid[1] + b]; if (!off && w.navigable(...t, "boat") && !leg.chainPos.has(w.idx(...t)) && w.sameWater(t, mid, "boat")) off = t; }
      if (off) {
        s.c = off[0]; s.r = off[1]; s.vessel.c = off[0]; s.vessel.r = off[1]; s.prog = { cp: s.cp, k };
        const p2 = g.planAuto(), j = p2.findIndex(([c, r]) => leg.chainPos.has(w.idx(c, r)));
        ok(j >= 0 && j < 16 && leg.chainPos.get(w.idx(...p2[j])) >= k - 2 && onChain(p2) > 0.8, `off the course, F rejoins it within ${j} steps, ahead of where it left it`);
      }
    } else console.log("skip no boat leg with a harbour in this journey");
  }
  // 5. going ashore on a beach: you choose what to take; the rest stays in the hold for the crew
  {
    const [g, ui] = mkGame(jr), s = g.s;
    boatAt(g, port); Object.assign(s.vessel, { c: spot.sea[0], r: spot.sea[1], morale: 80 }); s.aboard = true; s.c = spot.sea[0]; s.r = spot.sea[1]; s.sup.food = 200; g.afterStep();
    const run = g.runToPort(s.vessel);
    ui.script = [/take 20 rations/]; await g.goAshore(spot.land);
    ok(!s.aboard && s.sup.food === 20 && s.vessel.hold.food === 180 && g.capacity().food === 20 && g.eaters() === 1, `ashore with 20 rations; 180 in the hold; you carry ${g.capacity().food} and feed only yourself`);
    s.sup.food = 120; g.afterStep();
    ok(s.sup.food === 20 && s.vessel.hold.food === 180 && ui.said.some(x => /More than you can carry/.test(x)), "food found away from the boat is limited to what you carry; the hold is untouched");
    const before = s.vessel.hold.food; g.newDay();
    ok(s.vessel.hold.food === before - 3 && s.sup.food === 19, `the three hands aboard eat from the hold (${before} → ${s.vessel.hold.food}); you eat from your pack`);
    s.c = s.vessel.c; s.r = s.vessel.r; s.aboard = true; g.afterStep();
    ok(s.sup.food === 19 + before - 3 && s.vessel.hold.food === 0 && g.eaters() === 4, `back aboard, the hold is yours again (${s.sup.food} rations) and you feed the crew`);
    // the crew waits while the food allows, and sails for port with enough for the run
    s.sup.food = run.food + 3 * 2 + 20; ui.script = [/take 20 rations/]; await g.goAshore(spot.land);
    let days = 0; while (s.vessel && days < 40) { g.newDay(); days++; }
    ok(!s.vessel && ui.said.some(x => /Word reaches you: the crew of your hired sailing boat sailed her back/.test(x)), `left ${run.food + 6} rations (the run to ${run.port.name} is ${run.food}), the hired crew waited ${days - 1} days and took the boat home`);
    // too little for the run: the mate blocks the way
    boatAt(g, port); Object.assign(s.vessel, { c: spot.sea[0], r: spot.sea[1], morale: 80 }); s.aboard = true; s.c = spot.sea[0]; s.r = spot.sea[1]; s.sup.food = 20; g.afterStep();
    const run2 = g.runToPort(s.vessel);
    ui.script = [/take 20 rations/, /Go anyway/]; await g.goAshore(spot.land);
    ok(run2.food > 0 && !s.vessel && ui.said.some(x => /The mate blocks the way/.test(x)), `leaving the crew too little for the run (${run2.food} rations) means they take the boat at once`);
  }
  // 6. a crew that sails round the clock keeps watches; you sleep below while she sails
  {
    const [g, ui] = mkGame(jr), s = g.s;
    const h = boatAt(g, port, "company", { kind: "Sailing Ship", cls: "ship", speed: 10, hpd: 24, crew: 4 });
    const sea = spot.sea; void h;
    Object.assign(s.vessel, { c: sea[0], r: sea[1] }); s.aboard = true; s.c = sea[0]; s.r = sea[1]; s.awake = 21; s.wxKey = g.weather().key;
    g.tick();
    ok(s.awake === 0 && s.watchBelow > s.clock && ui.said.some(x => /You turn in below/.test(x)), "at 21 hours awake aboard the company's ship, you turn in below");
    g.awakeTick(5);
    ok(s.awake === 0, "hours below are sleep");
    s.clock = s.watchBelow + 1; g.awakeTick(2);
    ok(s.awake === 2 && !s.watchBelow, "after the watch below, the hours count again");
  }
  // 7. a fixed world: harbours and markets work without the simulation
  {
    const [g, ui] = mkGame(null, { mode: "sandbox", start: port.i, static: true });
    let err = null;
    try { ui.script = [/Back/]; await g.harbour(port); ui.script = [/Food for 1 day/, /Back/]; await g.market(port); } catch (e) { err = e; }
    ok(!g.sim && !err && g.s.sup.food > 3, `a fixed world's harbour and market open and sell food${err ? ` (${err.message})` : ""}`);
  }
  console.log(process.exitCode ? "vessels: FAILED" : "vessels: all ok");
})().catch(e => { console.error(e); process.exit(1); });
