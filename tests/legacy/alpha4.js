// Alpha 4 checks: the field, R and W, the money table, the market screen, season and events, your
// own trading, starting money, and three fixes (a rest call for F, errands that buy their goods
// when taken, a meal that is a rest). Run: node tests/alpha4.js out/Pyeongak_rpg.html
const { loadWorld, stubUI } = require("./harness.js");
const ok = (cond, msg) => { console.log(`${cond ? "ok  " : "FAIL"} ${msg}`); if (!cond) process.exitCode = 1; };
const tickOver = () => new Promise(r => setImmediate(r));
const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
(async () => {
  const { AZ, P, w, mk } = await loadWorld(process.argv[2]);
  const jr = new AZ.Journey(w, P.journeys[0]);
  const mkGame = () => {
    const ui = stubUI(); const g = new AZ.Game(w, new AZ.Renderer(w, new AZ.Art(w, mk), mk(10, 10), mk), ui, jr, { getItem: () => null, setItem: () => {} });
    AZ.game = g; g.jr0 = jr; g.fresh(3, null, 80, { mode: "journey" }); g.started(); g.s.purse = 500; g.s.goods = {}; g.s.vessel = null; g.s.aboard = false; return [g, ui];
  };
  const F = AZ.fieldOf(w), U = AZ.U, byName = n => P.burgs.find(b => b && b.name === n), gid = n => P.goods.find(x => x.name === n)?.i;
  const burgs = P.burgs.filter(b => b && F.byId.has(b.market));

  // 1. the field at market centres follows the market
  {
    const dev = [];
    for (const m of F.mk) { const c = P.burgs[m.centerBurgId]; for (const [g, q] of Object.entries(m.goods)) if (q[1] > 0) dev.push(Math.abs(F.base(c, g) - q[1]) / q[1]); }
    const within = dev.filter(d => d <= 0.1).length / dev.length;
    ok(med(dev) < 0.05 && within >= 0.75, `at the ${F.mk.length} market centres, prices stay with their markets: median gap ${(med(dev) * 100).toFixed(1)}%, ${Math.round(within * 100)}% within a tenth`);
  }
  // 2. the worked example's four towns (Pyeongak)
  if (byName("Froi") && byName("Bayfront")) {
    const near = (b, g, v) => Math.abs(F.base(byName(b), gid(g)) - v) < 0.04;
    ok(near("Wildgemea", "Wood", 1.54) && near("Froi", "Wood", 1.40) && near("Bayfront", "Wood", 1.37) && near("Bluszils", "Iron", 3.40),
      `the design's four towns: wood ${["Wildgemea", "Froi", "Bayfront"].map(b => `${b} ${U.rn(F.base(byName(b), gid("Wood")), 2)}`).join(", ")}; iron at Bluszils ${U.rn(F.base(byName("Bluszils"), gid("Iron")), 2)}`);
  }
  // 3. R and W keep Alpha 3's median town
  {
    const mR = med(burgs.map(b => F.R0(b))), mW = med(burgs.map(b => F.W(b)));
    ok(Math.abs(mR - F.medR) < 0.005 && Math.abs(mW - 0.17) < 0.02, `the median town: a day's food 🟡 ${U.rn(mR, 3)}, a day's work 🟡 ${U.rn(mW, 3)} (k ${U.rn(F.kR, 4)}, c ${U.rn(F.cW, 2)})`);
  }
  // 4. the money table, and the mine against a crewed boat
  {
    const [g] = mkGame();
    const towns = ["Durcojhler", "Bluszils", "Bayfront", "Froi"].map(byName).filter(Boolean);
    for (const b of towns.length ? towns : burgs.slice(0, 3)) {
      const rows = Object.keys(AZ.MONEY).filter(id => id !== "delivery").map(id => [id, AZ.money(id, b, id === "fare" || id === "coach" || id === "dispatch" || id === "truth" ? 100 : id === "relief" ? 10 : id === "reward" ? 5 : undefined)]);
      ok(rows.every(([, v]) => isFinite(v) && v >= 0), `${b.name}: ${rows.map(([id, v]) => `${id} ${v}`).join(", ")}`);
    }
    const mine = P.markers.find(m => m.type === "mines");
    if (mine) {
      const b = w.near(mine.t[0], mine.t[1], 60).find(n => n.kind === "burg")?.o;
      const shift = AZ.money("mine", b, mine), boat = AZ.Prices.hire(w, b) + 3 * AZ.Prices.wage(w, b);
      ok(shift < boat && shift > AZ.Prices.wage(w, b), `${mine.name}: a shift pays 🟡 ${shift}; a boat with three hands costs 🟡 ${U.rn(boat, 2)} a day`);
    }
  }
  // 5. the market screen lists every good the town can buy
  {
    const [g, ui] = mkGame(), m = F.mk.slice().sort((a, c) => Object.keys(c.goods).length - Object.keys(a.goods).length)[0], c = P.burgs[m.centerBurgId];
    ui.script = [/Back/]; await g.tradeGoods(c);
    const line = ui.said.find(x => /goods<\/b>/.test(x)) || "", want = Object.entries(m.goods).filter(([, q]) => q[0] > 0 && q[1] > 0).map(([gg]) => P.goods.find(x => x.i === +gg).name);
    const missing = want.filter(n => !line.includes(n));
    ok(want.length > 10 && !missing.length, `${c.name}'s market screen lists all ${want.length} goods its market holds${missing.length ? `; missing ${missing.join(", ")}` : ""}`);
  }
  // 6. famine raises food in its zone, and nowhere else
  {
    const [g] = mkGame(), sim = g.sim, grain = gid("Grain") ?? [...F.food][0];
    const a = burgs.find(b => F.base(b, grain)), far = burgs.slice().sort((x, y) => Math.hypot(y.t[0] - a.t[0], y.t[1] - a.t[1]) - Math.hypot(x.t[0] - a.t[0], x.t[1] - a.t[1]))[0];
    const pa = g.fieldPrice(a, grain), pf = g.fieldPrice(far, grain);
    sim.zones.set(9999, { i: 9999, key: "dearth:test", name: "Test Dearth", type: "Disaster", cells: new Set([a.cell]), orig: new Set([a.cell]), dyn: true });
    sim.rebuildCellZones(); g._ev = null;
    ok(Math.abs(g.fieldPrice(a, grain) / pa - 1.6) < 0.01 && Math.abs(g.fieldPrice(far, grain) - pf) < 1e-9, `a famine in ${a.name} raises grain from ${U.rn(pa, 2)} to ${U.rn(g.fieldPrice(a, grain), 2)}; ${far.name} is untouched`);
  }
  // 7. your own trading: the town first, its neighbours over the week
  {
    const [g] = mkGame(), s = g.s, m = F.mk.find(x => P.burgs.filter(b => b && b.market === x.i).length > 4), c = P.burgs[m.centerBurgId];
    const town = P.burgs.filter(b => b && b.market === m.i && b !== c).sort((x, y) => (y.population || 0) - (x.population || 0))[0];
    const good = Object.keys(m.goods).find(gg => m.goods[gg][1] > 0 && F.base(town, gg));
    s.goods = { [good]: 10 };
    const t0 = g.goodQuote(town, good).sell, n0 = g.goodQuote(c, good).sell;
    g.trade(town, good, -10);
    const t1 = g.goodQuote(town, good).sell, n1 = g.goodQuote(c, good).sell;
    s.clock += 168; g._ev = null;
    const n2 = g.goodQuote(c, good).sell, t2 = g.goodQuote(town, good).sell;
    ok(t1 < t0 && n1 === n0 && n2 < n0 && t2 > t1, `selling 10 ${g.know.good(good).toLowerCase()} in ${town.name}: there ${t0} → ${t1} at once; ${c.name} ${n0} → ${n1} at once and ${n2} a week later`);
  }
  // 8. starting money: the plan's cost, the kind, home prosperity, and a quarter of chance
  {
    const kinds = AZ.travellerKinds(w, jr), ret = kinds.find(k => k.id === "returning") || kinds[0], fug = kinds.find(k => /^fugitive/.test(k.id));
    const plan = AZ.planCost(w, jr), purses = [...Array(20)].map((_, i) => AZ.makeTraveller(w, jr, 100 + i, ret.id));
    const inRange = purses.every(t => { const k = plan * Math.sqrt(AZ.prosperity(w, P.burgs[t.home])); return t.purse >= 0.75 * k - 1 && t.purse <= 1.25 * k + 1; });
    ok(inRange, `${ret.id}: purses ${Math.min(...purses.map(t => t.purse))}–${Math.max(...purses.map(t => t.purse))} for a plan of 🟡 ${Math.round(plan)}`);
    if (fug) { const f = AZ.makeTraveller(w, jr, 7, fug.id); ok(f.purse < plan, `a fugitive starts with 🟡 ${f.purse}, short of the plan`); }
  }
  // 9a. F on foot asks for rest at nightfall
  {
    const [g, ui] = mkGame(), s = g.s, b = jr.origin.burg || burgs[0];
    s.c = b.t[0]; s.r = b.t[1]; s.awake = 14;
    const sun = AZ.Clock.sun(s.clock, g.lat()); s.clock = Math.floor(s.clock / 24) * 24 + sun.set + 1.5;
    s.waypoint = [b.t[0] + 3, b.t[1]]; s.auto = true; ui.script = [/Make camp until dawn/];
    g.tick(); await new Promise(r => setTimeout(r, 50));
    ok(ui.said.some(x => /Night falls/.test(x)) && s.awake < 6, `walking by F at nightfall, you are asked to camp, and you sleep (awake ${Math.round(s.awake)} h after)`);
  }
  // 9b. a delivery errand buys its goods when taken, and pays when they arrive
  {
    const [g, ui] = mkGame(), s = g.s;
    const from = burgs.find(b => g.questOffers(b).some(o => o.goods));
    if (from) {
      s.c = from.t[0]; s.r = from.t[1];
      const o = g.questOffers(from).find(x => x.goods), p0 = s.purse;
      ui.script = [new RegExp(o.title.replace(/[()]/g, ".")), /^Take it/, /Back/]; await g.noticeBoard(from);
      const th = s.threads.find(t => t.title === o.title), carried = s.goods[o.goods.g];
      ok(U.rn(p0 - s.purse, 2) === o.cost && carried === o.goods.units, `taking “${o.title}” costs 🟡 ${o.cost} at once and gives you ${carried} units to carry`);
      const p1 = s.purse; await g.completeStep(th, P.burgs[th.steps[0].goal.burg]);
      ok(U.rn(s.purse - p1, 2) === th.steps[0].reward.coin && !(s.goods[o.goods.g] > 0), `delivering them pays 🟡 ${th.steps[0].reward.coin}, and the goods are gone`);
    } else console.log("skip no delivery errand on this world");
  }
  // 9c. a meal at a famous inn is a rest
  {
    const [g, ui] = mkGame(), s = g.s, inn = P.markers.find(m => m.type === "inns");
    if (inn) {
      s.c = inn.t[0]; s.r = inn.t[1]; s.awake = 43; const t0 = s.clock;
      ui.script = [/Just a meal/]; await AZ.MARKERS.inns.run(g.events, inn, "<b>Inn</b>");
      ok(s.awake === 43 && Math.abs(s.clock - t0 - 1) < 0.01, "a meal at a famous inn takes an hour and never ends in sleep");
    } else console.log("skip no inn marker on this world");
  }
  console.log(process.exitCode ? "alpha4: FAILED" : "alpha4: all ok");
})().catch(e => { console.error(e); process.exit(1); });
