// Alpha 3 checks: vessel classes, realisation, the control table, the shipwright, courses and storms
// by class, rowing and portage, watches, porters, the warehouse, the stables, craft that land at
// night, and saves from Alpha 2. Run: node tests/alpha3.js out/Pyeongak_rpg.html
const { loadWorld, stubUI } = require("./harness.js");
const ok = (cond, msg) => { console.log(`${cond ? "ok  " : "FAIL"} ${msg}`); if (!cond) process.exitCode = 1; };
const tickOver = () => new Promise(r => setImmediate(r));
(async () => {
  const { AZ, P, w, mk } = await loadWorld(process.argv[2]);
  const jr = new AZ.Journey(w, P.journeys[0]);
  const mkGame = () => {
    const ui = stubUI(); const g = new AZ.Game(w, new AZ.Renderer(w, new AZ.Art(w, mk), mk(10, 10), mk), ui, jr, { getItem: () => null, setItem: () => {} });
    AZ.game = g; g.jr0 = jr; g.fresh(3, null, 80, { mode: "journey" }); g.started(); g.s.purse = 5000; return [g, ui];
  };
  const ports = P.burgs.filter(b => b && b.port && w.harbour(b, "boat") && b.population > 3);
  const port = ports.sort((a, b) => b.population - a.population).find(b => (AZ.YARDS[P.cultures[b.culture]?.type] || AZ.YARDS.Generic).includes("ship")) || ports[0];
  const ph = w.harbour(port, "boat").t;
  let spot = null; // a sea tile beside open land, away from towns, on the port's water
  for (let r = 0; r < w.rows && !spot; r += 3) for (let c = 0; c < w.cols && !spot; c += 3) {
    if (w.isLand(c, r) || !w.navigable(c, r, "boat") || w.near(c, r, 4).some(n => n.kind === "burg") || !w.sameWater([c, r], ph, "boat")) continue;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!spot && w.isLand(c + a, r + b) && !w.navigable(c + a, r + b, "boat")) spot = { sea: [c, r], land: [c + a, r + b], dir: Object.keys(AZ.DIRS).find(k => AZ.DIRS[k][0] === a && AZ.DIRS[k][1] === b) };
  }
  const place = (g, v, t) => { Object.assign(v, { c: t[0], r: t[1] }); g.s.vessel = v; g.s.aboard = true; g.s.c = t[0]; g.s.r = t[1]; g.afterStep(); };

  // 1. the tables
  {
    const rows = Object.values(AZ.CONTROL), cols = AZ.CONTROL_COLS.map(c => c[0]);
    ok(rows.length === 6 && rows.every(R => cols.every(k => typeof R.text[k] === "string" && R.text[k].length > 2)), "the control table has six rows, each answering all eleven columns");
    const map = { "Rowboat": "skiff", "Sailing boat": "boat", "Sailing Ship": "ship", "Steamship": "ship", "Modern Ship": "greatship", "Dirigible": "airship", "Aircraft": "light", "Galley": "galley", "Sloop": "smallship" };
    ok(Object.entries(map).every(([k, v]) => AZ.classOf(k) === v), `the map's transports take classes: ${Object.keys(map).map(k => `${k} → ${AZ.classOf(k)}`).join(", ")}`);
    ok(["German", "Arabic", "Chinese", "Hawaiian", "English", "Draconic", "Elven"].map(AZ.hullFamily).join() === "norse,arab,east,isles,west,invented,invented", "namebases fall into hull families");
  }
  // 2. the shipwright: buy, hire, crew, sell; names from the port's culture
  {
    const [g, ui] = mkGame(), s = g.s;
    s.c = port.t[0]; s.r = port.t[1]; s.aboard = false;
    const list = g.yardClasses(port), loc = g.realise("boat", port), nb = P.namebases?.[P.cultures[port.culture].base]?.name;
    ok(list.includes("skiff") && list.includes("boat"), `${port.name}'s yard (${P.cultures[port.culture].type}, ${nb}) builds ${list.join(", ")}; its boat is a ${loc.kind.toLowerCase()}`);
    const p0 = s.purse; ui.script = [/^Buy a .*(skiff|rowboat|faering|sampan|hawari|outrigger)/i, /Back/]; await g.shipwright(port);
    ok(s.vessel && s.vessel.vc === "skiff" && s.vessel.mode === "owned" && s.vessel.crew === 0 && s.purse < p0, `bought a ${s.vessel?.kind.toLowerCase()} (skiff, owned, no hands) for 🟡 ${Math.round((p0 - s.purse) * 100) / 100}`);
    ui.script = [/^Sell your/, /Back/]; await g.shipwright(port);
    ok(!s.vessel, "sold her back to the yard");
    ui.script = [/^Hire a .*with 3 hands/, /Back/]; await g.shipwright(port);
    ok(s.vessel && s.vessel.vc === "boat" && s.vessel.mode === "hired" && s.vessel.crew === 3 && g.ctlKey() === "hirer", "hired a boat with three hands: control row Hirer");
    s.vessel = null; ui.script = [/^Buy a .*\(boat\)|^Buy a (sailing boat|knarr|felucca|fishing junk|double canoe)/i, /^Hire 2 hands/, /Back/]; await g.shipwright(port);
    ok(s.vessel && s.vessel.mode === "owned" && s.vessel.crew === 2 && g.ctlKey() === "owner", `bought a boat and hired two hands: control row Owner (crew ${s.vessel?.crew})`);
  }
  // 3. capacity by class, and watches by class and control
  {
    const [g] = mkGame(), s = g.s;
    for (const [vc, food] of [["skiff", 20], ["boat", 220], ["ship", 1500]]) { const v = g.newVessel(vc === "ship" ? "boat" : vc, "owned", port, 0); v.vc = vc; place(g, v, ph); ok(g.capacity().food === food, `aboard a ${vc} you can hold ${g.capacity().food} rations`); }
    const ship = { mode: "hired", vc: "ship", cls: "ship", kind: "Brig", hpd: 24, crew: 15 };
    ok(g.keepsWatches(ship) && !g.keepsWatches({ ...ship, crew: 10 }) && g.keepsWatches({ ...ship, mode: "company", crew: 4 }), "a hired ship keeps watches with 15 hands and calls stops with 10; the company's own keeps watches");
  }
  // 4. courses by class: boats keep to the coast, ships keep off it
  {
    const far = ports.filter(b => b !== port && w.harbour(b, "ship") && w.harbour(port, "ship") && w.sameWater(w.harbour(port, "ship").t, w.harbour(b, "ship").t, "ship"))
      .sort((a, b) => Math.hypot(b.t[0] - port.t[0], b.t[1] - port.t[1]) - Math.hypot(a.t[0] - port.t[0], a.t[1] - port.t[1]))[Math.floor(ports.length / 4)];
    if (far) {
      const a = w.harbour(port, "ship").t, b = w.harbour(far, "ship").t, mean = p => p.reduce((t, [c, r]) => t + Math.min(12, w.landDist(c, r)), 0) / p.length;
      const pb = w.waterPath(a, b, "boat"), ps = w.waterPath(a, b, "ship");
      ok(pb && ps && mean(pb) < mean(ps), `from ${port.name} to ${far.name}, a boat keeps ${pb ? mean(pb).toFixed(1) : "?"} tiles from land on average, a ship ${ps ? mean(ps).toFixed(1) : "?"}`);
    } else console.log("skip no second port for courses");
  }
  // 5. storms by class
  {
    const [g, ui] = mkGame(), s = g.s, V = AZ.VCLASS;
    ok(V.boat.storm.off[0] > V.boat.storm.near[0] && V.ship.storm.near[0] > V.ship.storm.off[0], "a boat is safer near land, a ship safer offshore");
    const v = g.newVessel("boat", "owned", port, 0); v.vc = "ship"; v.cls = "boat"; v.kind = "Brig"; place(g, v, spot.sea);
    const t0 = s.clock; ui.script = [/Claw off/]; await g.stormCall();
    ok(s.clock - t0 >= 6 && ui.said.some(x => /a lee shore is the danger/.test(x)), "a ship caught near land can claw off into open water, at a cost in hours");
  }
  // 6. rowing and portage
  {
    const [g] = mkGame(), s = g.s;
    const v = g.newVessel("skiff", "owned", port, 0); place(g, v, spot.sea);
    const wet = Object.keys(AZ.DIRS).find(k => { const [a, b] = AZ.DIRS[k]; return w.navigable(spot.sea[0] + a, spot.sea[1] + b, "skiff"); });
    s.awake = 0; const t0 = s.clock; g.anim = null; g.tryMove(wet);
    ok(Math.abs(s.awake - 1.5 * (s.clock - t0)) < 0.01, `rowing ${(s.clock - t0).toFixed(2)} h tires you for ${s.awake.toFixed(2)} h`);
    g.anim = null; s.c = spot.sea[0]; s.r = spot.sea[1]; v.c = s.c; v.r = s.r;
    s.portage = true; // Alpha 4.1: carrying is chosen at the shore (Space)
    const moved = g.tryMove(spot.dir);
    ok(moved && s.aboard && v.c === spot.land[0] && v.r === spot.land[1], "a skiff is carried overland");
  }
  // 7. porters: hands brought ashore carry more and eat from your pack
  {
    const [g, ui] = mkGame(), s = g.s;
    const v = g.newVessel("boat", "owned", port, 3); place(g, v, spot.sea); s.sup.food = 200; g.afterStep();
    ui.script = [/Bring 2 hands/, /take 40 rations/]; await g.goAshore(spot.land);
    ok(!s.aboard && v.porters === 2 && s.sup.food === 40 && g.capacity().food === 40 && g.eaters() === 3 && g.crewFed(v) === 1, `two porters: you carry ${g.capacity().food} rations, three eat from your pack, one hand stays aboard`);
    s.c = v.c; s.r = v.r; s.aboard = true; g.afterStep();
    ok(v.porters === 0 && g.eaters() === 4, "back aboard, the porters are hands again");
  }
  // 8. the warehouse: store what you cannot carry, collect it later for the fees
  {
    const [g, ui] = mkGame(), s = g.s;
    s.vessel = null; s.voyage = null; s.aboard = false; s.c = port.t[0]; s.r = port.t[1]; s.sup.food = 50;
    const p0 = s.purse; ui.script = [/warehouse/]; g.afterStep(); await tickOver(); await tickOver();
    const lot = s.stores[port.i];
    ok(s.sup.food === 20 && lot && lot.lots[0].food === 30 && s.purse < p0, `30 rations left in the ${port.name} warehouse for a deposit of 🟡 ${Math.round((p0 - s.purse) * 100) / 100}`);
    s.clock += 24 * 15; const due = g.storeDue(port);
    ui.script = [/^Collect everything/, /^Sell it/]; await g.warehouse(port); await tickOver(); await tickOver();
    ok(due > 0 && !s.stores[port.i] && s.sup.food === 20, `collected after 15 days for 🟡 ${due} due; what you could not carry was offered again, and sold`);
  }
  // 9. the stables: an animal carries more, slows off the road, and waits in town when you board
  {
    const [g, ui] = mkGame(), s = g.s;
    s.vessel = null; s.aboard = false; s.c = port.t[0]; s.r = port.t[1]; s.sup.food = 10;
    ui.script = [/^Buy a .*\(pack animal\)/, /Back/]; await g.stables(port);
    ok(s.beast && s.beast.vc === "pack" && g.capacity().food === 60, `a ${s.beast?.kind.toLowerCase()} adds 40 rations: you carry ${g.capacity().food}`);
    const v = g.newVessel("boat", "hired", port, 3); s.vessel = v; s.c = v.c; s.r = v.r; s.aboard = true; g.afterStep();
    ok(!s.beast && s.stores[port.i]?.lots.some(l => l.beast), `boarding in ${port.name}, the animal is stabled there`);
  }
  // 10. light craft set down at night; saves from Alpha 2 take a class
  {
    const [g] = mkGame(), s = g.s;
    const land = spot.land;
    s.vessel = { mode: "company", kind: "Aircraft", cls: "air", speed: 60, hpd: 4, crew: 2, morale: 80, c: land[0], r: land[1] };
    s.aboard = true; s.c = land[0]; s.r = land[1]; s.awake = 10;
    const sun = AZ.Clock.sun(s.clock, g.lat()); s.clock = Math.floor(s.clock / 24) * 24 + sun.set + 1.5;
    g.tick();
    ok(s.awake === 0 && ((s.clock % 24) + 24) % 24 < 12, "an aircraft sets down for the night over land, and you sleep");
    const old = { mode: "hired", kind: "Sailing boat", cls: "boat", crew: 3, c: ph[0], r: ph[1], morale: 70 };
    g.s.vessel = old; g.backfill();
    ok(old.vc === "boat" && g.s.stores && g.s.beast === null, "an Alpha 2 save's boat takes the boat class");
  }
  console.log(process.exitCode ? "alpha3: FAILED" : "alpha3: all ok");
})().catch(e => { console.error(e); process.exit(1); });
