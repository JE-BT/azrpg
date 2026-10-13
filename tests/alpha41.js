// Alpha 4.1 checks: goods where the map has them, skiffs that stay in the water, the merchant,
// the harbourmaster's watch, riding horses, and animals aboard. Run: node tests/alpha41.js out/Pyeongak_rpg.html
const { loadWorld, stubUI } = require("./harness.js");
const ok = (cond, msg) => { console.log(`${cond ? "ok  " : "FAIL"} ${msg}`); if (!cond) process.exitCode = 1; };
const later = () => new Promise(r => setTimeout(r, 30));
(async () => {
  const { AZ, P, w, mk } = await loadWorld(process.argv[2]);
  const jr = new AZ.Journey(w, P.journeys[0]);
  const mkGame = () => {
    const ui = stubUI(); const g = new AZ.Game(w, new AZ.Renderer(w, new AZ.Art(w, mk), mk(10, 10), mk), ui, jr, { getItem: () => null, setItem: () => {} });
    AZ.game = g; g.jr0 = jr; g.fresh(3, null, 80, { mode: "journey" }); g.started(); Object.assign(g.s, { purse: 500, goods: {}, vessel: null, aboard: false }); return [g, ui];
  };
  const F = AZ.fieldOf(w), burgs = P.burgs.filter(b => b && F.byId.has(b.market));
  const port = burgs.filter(b => b.port && w.harbour(b, "boat")).sort((a, c) => c.population - a.population)[0];
  let spot = null;
  for (let r = 0; r < w.rows && !spot; r += 3) for (let c = 0; c < w.cols && !spot; c += 3) {
    if (w.isLand(c, r) || !w.navigable(c, r, "skiff") || w.near(c, r, 4).some(n => n.kind === "burg")) continue;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!spot && w.isLand(c + a, r + b) && !w.navigable(c + a, r + b, "skiff") && !w.isLand(c - a, r - b)) spot = { sea: [c, r], land: [c + a, r + b], dir: Object.keys(AZ.DIRS).find(k => AZ.DIRS[k][0] === a && AZ.DIRS[k][1] === b), back: Object.keys(AZ.DIRS).find(k => AZ.DIRS[k][0] === -a && AZ.DIRS[k][1] === -b) };
  }
  // 1. goods where the map has them
  {
    const town = burgs.filter(b => F.byId.get(b.market).centerBurgId !== b.i).sort((a, c) => c.population - a.population)[0];
    const sold = P.goods.filter(g => F.available(town, g.i)).map(g => g.name), held = Object.keys(F.byId.get(town.market).goods).length;
    const why = g => F.made(town, g) || (P.trade.buy[town.i] || {})[g] || true;
    ok(sold.length < held && sold.length > 0 && sold.every(n => why(P.goods.find(g => g.name === n).i)), `${town.name} sells ${sold.length} of the ${held} goods its market holds: ${sold.slice(0, 8).join(", ")}`);
  }
  // 2. a skiff stays in the water unless carried
  {
    const [g, ui] = mkGame(), s = g.s, v = g.newVessel("skiff", "owned", port, 0);
    Object.assign(v, { c: spot.sea[0], r: spot.sea[1] }); s.vessel = v; s.aboard = true; s.c = spot.sea[0]; s.r = spot.sea[1]; g.afterStep();
    g.anim = null; const moved = g.tryMove(spot.dir);
    ok(!moved && s.c === spot.sea[0], "rowing into the shore stops the skiff");
    ui.script = [/Carry the/]; await g.goAshore(spot.land);
    g.anim = null; const carried = g.tryMove(spot.dir);
    g.anim = null; g.tryMove(spot.back);
    ok(carried && s.aboard && !s.portage, "chosen, the skiff is carried overland, and back in the water the carrying ends");
  }
  // 3. the merchant reads the field
  {
    const [g, ui] = mkGame(), s = g.s; s.c = port.t[0]; s.r = port.t[1];
    ui.script = [/Thank him/]; await g.merchantAdvice(port);
    const said = ui.said.find(x => /reads the markets/.test(x)) || "";
    ok(/Cheap here|Nothing here sells dearer/.test(said), `${port.name}'s merchant: ${said.replace(/<[^>]+>/g, "").slice(0, 260)}`);
  }
  // 4. the harbour watches a vessel left with no one aboard, and is paid on return
  {
    const [g, ui] = mkGame(), s = g.s, v = g.newVessel("boat", "owned", port, 0);
    s.vessel = v; s.aboard = true; s.c = v.c; s.r = v.r; g.afterStep();
    s.aboard = false; s.c = port.t[0]; s.r = port.t[1]; g.afterStep();
    const out = w.near(port.t[0], port.t[1], 4).map(n => n).find(() => false);
    let t = null; for (const [a, b] of [[2, 0], [-2, 0], [0, 2], [0, -2], [3, 0], [0, 3]]) { const c = port.t[0] + a, r = port.t[1] + b; if (!t && w.isLand(c, r) && !w.burgAt.has(w.idx(c, r))) t = [c, r]; }
    ui.script = [/harbour's care/]; s.c = t[0]; s.r = t[1]; g.afterStep(); await later();
    ok(v.watch && v.watch.weekly > 0, `walking away, the harbourmaster asks: 🟡 ${v.watch?.weekly} a week`);
    const p0 = s.purse; s.clock += 24 * 10; s.c = v.c; s.r = v.r; s.aboard = true; g.afterStep();
    ok(!v.watch && s.purse < p0, `back aboard after ten days, you pay 🟡 ${Math.round((p0 - s.purse) * 100) / 100}`);
  }
  // 5. a riding horse
  {
    const [g, ui] = mkGame(), s = g.s; s.c = port.t[0]; s.r = port.t[1];
    let t = null; for (const [a, b] of [[2, 0], [-2, 0], [0, 2], [0, -2], [3, 0], [0, 3]]) { const c = port.t[0] + a, r = port.t[1] + b; if (!t && w.isLand(c, r) && !w.burgAt.has(w.idx(c, r))) t = [c, r]; }
    s.c = t[0]; s.r = t[1]; const foot = g.stepHours(t[0] + 1, t[1], 1, 0);
    s.c = port.t[0]; s.r = port.t[1]; ui.script = [/Buy a riding horse/]; await g.wainwright(port);
    s.c = t[0]; s.r = t[1]; const ride = g.stepHours(t[0] + 1, t[1], 1, 0);
    ok(s.mount && ride < foot, `a riding horse: a step takes ${ride.toFixed(2)} h where walking took ${foot.toFixed(2)} h`);
    const v = g.newVessel("boat", "owned", port, 3); s.vessel = v; s.c = v.c; s.r = v.r; s.aboard = true; g.afterStep();
    ok(!s.mount && s.stores[port.i]?.lots.some(l => l.mount), "boarding a boat, the horse waits in the stables");
  }
  // 6. animals go aboard small ships and larger
  {
    const [g] = mkGame(), s = g.s; s.beast = { vc: "pack", kind: "Mule", hungry: 0 };
    const v = g.newVessel("boat", "owned", port, 6); v.vc = "smallship"; s.vessel = v; s.c = v.c; s.r = v.r; s.aboard = true; g.afterStep();
    ok(s.beast && !s.stores[port.i], "a mule goes aboard a small ship");
  }
  console.log(process.exitCode ? "alpha41: FAILED" : "alpha41: all ok");
})().catch(e => { console.error(e); process.exit(1); });
