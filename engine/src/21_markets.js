// =============================================================================================
// 21_markets.js · Alpha 4: markets.
//   Built on the economy the map already has: markets (watersheds with a centre of gravity and a
//   price for each good) and goods (spread over the land; each cell may hold a bonus good).
//   The field: a town's price for a good blends the markets around it, each pulling with a weight
//   that falls with distance from its centre, and the town's own voice. Season, events and your
//   own trading act on top. Two local measures come out of the field: R, a day's food, and W, a
//   day's work, calibrated so the world's median town keeps Alpha 3's prices. The money table
//   writes every cost and payment in the game in R and W, and AZ.Prices reads it.
// =============================================================================================
(() => {
  const G = AZ.Game.prototype, U = AZ.U, T = AZ.T;
  const P3 = { ...AZ.Prices }; // Alpha 3's rules: kept for calibration and comparison
  const med = a => { const s = a.filter(x => x != null && isFinite(x)).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };

  // ------------------------------------------------------------------ the field
  AZ.Field = class {
    constructor(w) {
      const P = w.P;
      this.w = w;
      this.mk = P.markets.filter(m => m && m.centerBurgId != null && P.burgs[m.centerBurgId] && m.goods);
      this.byId = new Map(this.mk.map(m => [m.i, m]));
      const n = new Map(), pop = new Map();
      for (const b of P.burgs) if (b && this.byId.has(b.market)) { n.set(b.market, (n.get(b.market) || 0) + 1); pop.set(b.market, (pop.get(b.market) || 0) + (b.population || 0)); }
      const mean = [...n.values()].reduce((a, x) => a + x, 0) / Math.max(1, n.size);
      this.size = new Map(this.mk.map(m => [m.i, Math.sqrt((n.get(m.i) || 1) / mean)]));
      this.mpop = pop;
      this.food = new Set(P.goods.filter(g => (g.tags || []).includes("food")).map(g => g.i));
      this.goods = new Map(P.goods.map(g => [g.i, g]));
      this.cache = new Map();
      // the reach of a market follows how far apart the world's markets lie: about two-thirds of the
      // median distance from a centre to its nearest neighbour (400 effective miles on Pyeongak)
      const cs = this.mk.map(m => P.burgs[m.centerBurgId]);
      this.T = Math.max(60, 0.64 * (med(cs.map(c => Math.min(...cs.filter(x => x !== c).map(x => this.eff(c, x))))) || 530));
      this.calibrate();
    }
    access(b) { const B = this.w.bits(b.t[0], b.t[1]); return B.road ? 0.8 : B.trail ? 1 : 1.3; }
    // effective miles: two ports are close by sea; a road shortens the way; open country lengthens it
    eff(b, c) { if (b === c) return 0; const mi = Math.hypot(b.t[0] - c.t[0], b.t[1] - c.t[1]) * this.w.miles; return mi * (b.port && c.port ? 0.6 : Math.max(this.access(b), this.access(c))); }
    pulls(b) {
      let F = this.cache.get(b.i);
      if (F) return F;
      const P = this.w.P, home = this.byId.get(b.market) || null;
      const list = this.mk.map(m => { const c = P.burgs[m.centerBurgId], d = this.eff(b, c); return { m, c, d, p: this.size.get(m.i) * Math.exp(-((d / this.T) ** 2)) }; }).filter(x => x.p > 0.002).sort((a, c) => c.p - a.p);
      const dHome = home ? this.eff(b, P.burgs[home.centerBurgId]) : 800;
      F = { home, list, dHome, sum: list.reduce((a, x) => a + x.p, 0) };
      this.cache.set(b.i, F);
      return F;
    }
    made(b, gid) { return ((b.production || {})[gid] || 0) > 0 || this.w.C.good[b.cell] === +gid; }
    // the field price before season, events, tax and trading
    base(b, gid) {
      gid = +gid;
      const F = this.pulls(b), made = this.made(b, gid);
      let v = 0, k = 0;
      for (const x of F.list) { const q = x.m.goods[gid]; if (q && q[1] > 0) { v += x.p * q[1]; k += x.p; } }
      if (!k && !made) return null;
      const ph = (F.home && F.home.goods[gid]?.[1]) || (k ? v / k : this.goods.get(gid)?.value || 1);
      const local = ph * (made ? 0.7 : Math.min(2, 1 + (0.1 * F.dHome) / 100)), L = 0.15 * (made ? 3 : 1);
      return (v + L * local) / (k + L);
    }
    // where a price comes from: each market's share and the town's own
    shares(b, gid) {
      const F = this.pulls(b), made = this.made(b, gid), L = 0.15 * (made ? 3 : 1);
      const has = F.list.filter(x => x.m.goods[gid]?.[1] > 0), tot = has.reduce((a, x) => a + x.p, 0) + L;
      return { markets: has.map(x => ({ name: x.c.name, m: x.m.i, share: x.p / tot, stock: x.m.goods[gid][0] || 0 })), own: L / tot, made };
    }
    available(b, gid) { const S = this.shares(b, gid); return S.made || S.markets.filter(x => x.stock > 0).reduce((a, x) => a + x.share, 0) >= 0.25; }
    basket(b) { const ps = [...this.food].map(g => this.base(b, g)).filter(p => p > 0).sort((a, c) => a - c).slice(0, 3); return ps.length ? ps.reduce((a, p) => a + p, 0) / ps.length : 1; }
    tax(b) { return P3.tax(this.w, b); }
    // R and W are set once per world so that the median town keeps Alpha 3's ration and wage
    calibrate() {
      const w = this.w, burgs = w.P.burgs.filter(b => b && this.byId.has(b.market));
      const r3 = burgs.map(b => Math.max(0.05, P3.food(w, b) * 0.1)), w3 = burgs.map(b => P3.wage(w, b));
      this.kR = med(r3) / Math.max(1e-6, med(burgs.map(b => this.basket(b) * (1 + this.tax(b)))));
      this.cW = med(w3) / Math.max(1e-6, med(r3));
      this.r0 = new Map(burgs.map(b => [b.i, this.kR * this.basket(b) * (1 + this.tax(b))]));
      this.medR = med([...this.r0.values()]) || 0.07; this.medW = this.cW * this.medR || 0.17;
      const ppk = b => (b.product || 0) / Math.max(0.1, b.population || 0.1);
      this.medP = med(burgs.map(ppk)) || 1; this.ppk = ppk;
    }
    R0(b) { if (!b) return this.medR; let r = this.r0.get(b.i); if (r == null) { r = this.kR * this.basket(b) * (1 + this.tax(b)); this.r0.set(b.i, r); } return r; }
    W(b) { return b ? this.cW * this.R0(b) : this.medW; }
    prosperity(b) { return b ? U.clamp(this.ppk(b) / this.medP, 0.5, 2) : 1; }
  };
  AZ.fieldOf = w => w._field || (w._field = new AZ.Field(w));
  AZ.prosperity = (w, b) => AZ.fieldOf(w).prosperity(b);

  // ------------------------------------------------------------------ season, events and your own trading
  const SEASON_FOOD = { autumn: 0.9, winter: 1.05, spring: 1.15, summer: 1 };
  G.eventsAt = function (b) {
    const day = Math.floor(this.s.clock / 24), key = `${b.i}:${day}`;
    this._ev = this._ev && this._ev.day === day ? this._ev : { day, m: new Map() };
    if (this._ev.m.has(key)) return this._ev.m.get(key);
    const sim = this.sim, w = this.w, E = { famine: false, disease: false, disaster: false, war: false, siege: false, occupied: false, closed: false };
    for (const z of sim ? sim.zonesOfCell(b.cell) : w.zonesOfCell(b.cell)) {
      if (/dearth|famine/i.test(`${z.name} ${z.key || ""}`)) E.famine = true;
      else if (/Disease/.test(z.type)) E.disease = true;
      else if (/Disaster|Eruption|Flood|Avalanche|Tsunami|Fault/.test(z.type)) E.disaster = true;
    }
    if (sim) {
      const st = sim.stateOf(b);
      E.war = sim.wars.some(x => !x.over && (x.a === st || x.d === st));
      E.siege = sim.regs.some(r => r.target === b.i && r.wait > 0);
      E.occupied = sim.occupied[b.i] != null;
      E.closed = sim.lines.some(L => (L.from === b.i || L.to === b.i) && !sim.lineStatus(L).ok);
    }
    this._ev.m.set(key, E);
    return E;
  };
  G.priceF = function (b, gid) {
    const s = this.s, w = this.w, g = w.P.goods.find(x => x.i === +gid) || {}, tags = g.tags || [], food = tags.includes("food");
    let f = 1;
    if (food) f *= SEASON_FOOD[AZ.Clock.season(w.latlon(b.t[0], b.t[1])[0], s.clock)] || 1;
    const E = this.eventsAt(b);
    if (E.famine && food) f *= 1.6;
    if (E.disease && /salt|soap|herb|medic/i.test(g.name || "")) f *= 1.5;
    if (E.disaster) f *= 1.4;
    if (E.war) f *= tags.includes("military") ? 1.3 : food ? 1.15 : 1;
    if (E.siege && food) f *= 3;
    if (E.occupied) f *= 1.1;
    if (E.closed && !AZ.fieldOf(w).made(b, gid)) f *= 1.2;
    return f * this.glutF(b, gid);
  };
  // each unit you trade moves the town's own price at once (0.2 ÷ its population in thousands),
  // fading over a week; over that week it passes into the markets that pull on the town
  G.glutF = function (b, gid) {
    const s = this.s, F = AZ.fieldOf(this.w);
    if (!s.trades || !s.trades.length) return 1;
    let f = 1;
    for (const t of s.trades) {
      if (t.g !== +gid) continue;
      const age = s.clock - t.t;
      if (t.b === b.i) f += t.n * Math.min(0.25, 0.2 / Math.max(0.3, b.population || 1)) * Math.max(0, 1 - age / 168);
      const x = F.pulls(b).list.find(y => y.m.i === t.m);
      if (x) { const ramp = age < 168 ? age / 168 : Math.max(0, 1 - (age - 168) / 672); f += t.n * (x.p / (F.pulls(b).sum + 0.15)) * (0.2 / Math.max(1, F.mpop.get(t.m) || 1)) * 5 * ramp; }
    }
    return U.clamp(f, 0.3, 3);
  };
  // the field price here, now: R and W follow from it
  G.fieldPrice = function (b, gid) { const base = AZ.fieldOf(this.w).base(b, gid); return base == null ? null : base * (this.s ? this.priceF(b, gid) : 1); };
  G.townNear = function () {
    const s = this.s, w = this.w;
    if (!s) return null;
    const i = w.idx(s.c, s.r);
    return w.burgAt.get(i) || this.harbourAt.get(i) || w.near(s.c, s.r, 120).find(n => n.kind === "burg")?.o || this.jr?.origin?.burg || null;
  };
  const game = () => (AZ.game && AZ.game.s ? AZ.game : null);
  const priceAt = (w, b, gid) => { const g = game(); return g && b ? g.fieldPrice(b, gid) : AZ.fieldOf(w).base(b, gid); };
  const goodId = (w, name) => w.P.goods.find(x => x.name.toLowerCase() === name.toLowerCase())?.i;
  const priceOf = (w, b, name, dflt) => { const id = goodId(w, name); const p = id != null && b ? priceAt(w, b, id) : null; return p || dflt; };
  const R = (w, b) => { const F = AZ.fieldOf(w), g = game(); if (!b) return F.medR; let r = F.R0(b); if (g) { const f = SEASON_FOOD[AZ.Clock.season(w.latlon(b.t[0], b.t[1])[0], g.s.clock)] || 1, E = g.eventsAt(b); r *= f * (E.famine ? 1.6 : 1) * (E.siege ? 3 : 1) * (E.war ? 1.15 : 1); } return r; };
  const W = (w, b) => AZ.fieldOf(w).W(b);
  const popk = b => (b && b.population) || 1;
  AZ.R = R; AZ.W = W;

  // ------------------------------------------------------------------ the money table
  // every cost and payment, in R (a day's food) and W (a day's work) at the town where it happens
  AZ.MONEY = {
    ration: { label: "A day's food", kind: "costs", rule: "R", fn: (w, b) => R(w, b) },
    inn: { label: "A room until morning", kind: "costs", rule: "1.8W + 2R", fn: (w, b) => 1.8 * W(w, b) + 2 * R(w, b) },
    meal: { label: "A meal at a roadside inn", kind: "costs", rule: "4R", fn: (w, b) => 4 * R(w, b) },
    alms: { label: "Alms", kind: "costs", rule: "3W + 0.06W per thousand people", fn: (w, b) => W(w, b) * (3 + 0.06 * popk(b)) },
    heal: { label: "Treating a fever", kind: "costs", rule: "6W + 5R", fn: (w, b) => 6 * W(w, b) + 5 * R(w, b) },
    fare: { label: "A sea passage", kind: "costs", rule: "W × 0.024 a mile, 6W at least", fn: (w, b, mi) => W(w, b) * Math.max(6, 0.024 * (mi || 0)) },
    coach: { label: "A coach", kind: "costs", rule: "W × 0.035 a mile, 3W at least", fn: (w, b, mi) => W(w, b) * Math.max(3, 0.035 * (mi || 0)) },
    wage: { label: "A hand's wage, a day", kind: "costs", rule: "W", fn: (w, b) => W(w, b) },
    water: { label: "A cask of water, a day", kind: "costs", rule: "0.12W", fn: (w, b) => 0.12 * W(w, b) },
    vessel: { label: "Buying a boat", kind: "costs", rule: "10 wood, 2 ropes, 2 sails and 30W", fn: (w, b) => 10 * priceOf(w, b, "Wood", 1.5) + 2 * priceOf(w, b, "Ropes", 3) + 2 * priceOf(w, b, "Sails", 8) + 30 * W(w, b) },
    hire: { label: "Hiring a boat, a day", kind: "costs", rule: "her price ÷ 365", fn: (w, b) => AZ.MONEY.vessel.fn(w, b) / 365 },
    repair: { label: "Repairs (materials)", kind: "costs", rule: "0.3 sail + 0.3 rope, and W for every 12 hours in the yard", fn: (w, b) => 0.3 * priceOf(w, b, "Sails", 8) + 0.3 * priceOf(w, b, "Ropes", 3) },
    pack: { label: "A pack animal", kind: "costs", rule: "the field price of Horses (Camels in deserts)", fn: (w, b) => (b && /desert/i.test(w.P.biomes[w.C.biome[b.cell]]?.name || "") ? priceOf(w, b, "Camels", 0) : 0) || priceOf(w, b, "Horses", 30 * W(w, b)) },
    cart: { label: "A cart", kind: "costs", rule: "Cattle + 8 wood + 10W", fn: (w, b) => priceOf(w, b, "Cattle", 8) + 8 * priceOf(w, b, "Wood", 1.5) + 10 * W(w, b) },
    wagon: { label: "A wagon", kind: "costs", rule: "2 Horses + 16 wood + 20W", fn: (w, b) => 2 * priceOf(w, b, "Horses", 8) + 16 * priceOf(w, b, "Wood", 1.5) + 20 * W(w, b) },
    portal: { label: "The portal keepers", kind: "costs", rule: "W × (6 + 0.9 per thousand people)", fn: (w, b) => W(w, b) * (6 + 0.9 * (b ? popk(b) : 0)) },
    tollRebels: { label: "A rebels' toll", kind: "costs", rule: "24W", fn: (w, b) => 24 * W(w, b) },
    tollPirates: { label: "Paying pirates off", kind: "costs", rule: "47W", fn: (w, b) => 47 * W(w, b) },
    fine: { label: "A fine from an enemy watch", kind: "costs", rule: "up to 24W", fn: (w, b) => 24 * W(w, b) },
    circus: { label: "An afternoon at the circus", kind: "costs", rule: "6W", fn: (w, b) => 6 * W(w, b) },
    library: { label: "The library's copyists", kind: "costs", rule: "12W", fn: (w, b) => 12 * W(w, b) },
    offering: { label: "An offering", kind: "costs", rule: "12W", fn: (w, b) => 12 * W(w, b) },
    dice: { label: "A stake at dice", kind: "costs", rule: "6W", fn: (w, b) => 6 * W(w, b) },
    mine: { label: "A shift at a mine (12 hours)", kind: "pays", rule: "1.5W + a quarter of a unit of the mine's own good", fn: (w, b, m) => {
      const name = m && m.note ? (w.P.goods.find(g => new RegExp(`\\b${g.name}\\b`, "i").test(m.note)) || {}).name : null;
      const gid = name ? goodId(w, name) : b ? w.C.good[b.cell] : null, p = gid && b ? priceAt(w, b, gid) : null;
      return 1.5 * W(w, b) + 0.25 * (p || 1);
    } },
    crewday: { label: "Working a passage, a day", kind: "pays", rule: "W, paid at the last port", fn: (w, b) => W(w, b) },
    delivery: { label: "Delivering goods", kind: "pays", rule: "the destination's field price × units × 1.1, and W a day of travel", fn: (w, b, x) => (x.there || 1) * x.units * 1.1 + W(w, b) * (x.days || 1) },
    relief: { label: "Relief for a stricken town", kind: "pays", rule: "0.6 × cost + 6W", fn: (w, b, cost) => 0.6 * (cost || 0) + 6 * W(w, b) },
    dispatch: { label: "Dispatches to a regiment", kind: "pays", rule: "W × (6 + 0.03 a mile)", fn: (w, b, mi) => W(w, b) * (6 + 0.03 * (mi || 0)) },
    truth: { label: "The truth about a marked place", kind: "pays", rule: "W × (9 + 0.024 a mile)", fn: (w, b, mi) => W(w, b) * (9 + 0.024 * (mi || 0)) },
    reward: { label: "Story rewards", kind: "pays", rule: "Alpha 3's coins ÷ the median wage, in W", fn: (w, b, x) => ((x || 0) / 0.17) * W(w, b) },
    bounty: { label: "A bounty, in advance", kind: "pays", rule: "W × (30 + 3.5 per thousand people), at most 350W; three times that on proof", fn: (w, b) => Math.min(350 * W(w, b), W(w, b) * (30 + 3.5 * popk(b))) },
  };
  AZ.money = (id, b, x) => {
    const g = game(), w = g ? g.w : AZ.game && AZ.game.w;
    if (!w) return 0;
    const town = b === undefined ? (g ? g.townNear() : null) : b;
    return U.rn(Math.max(0, AZ.MONEY[id].fn(w, town, x)), 2);
  };
  AZ.coin = (x, b) => (game() ? AZ.money("reward", b, x) : x); // a story's fixed reward, in the local wage

  // AZ.Prices reads the table
  Object.assign(AZ.Prices, {
    ration: (w, b) => U.rn(Math.max(0.02, R(w, b)), 2),
    food: (w, b) => U.rn(R(w, b) * 10, 2),
    inn: (w, b) => U.rn(AZ.MONEY.inn.fn(w, b), 2),
    alms: (w, b) => U.rn(AZ.MONEY.alms.fn(w, b), 2),
    fare: (w, b, mi) => U.rn(AZ.MONEY.fare.fn(w, b, mi), 2),
    wage: (w, b) => U.rn(W(w, b), 2),
    hire: (w, b) => U.rn(AZ.MONEY.hire.fn(w, b), 2),
    heal: (w, b) => U.rn(AZ.MONEY.heal.fn(w, b), 2),
    water: (w, b) => U.rn(AZ.MONEY.water.fn(w, b), 2),
    repair: (w, b) => U.rn(AZ.MONEY.repair.fn(w, b), 2),
    goodPrice: (w, b, gid) => { if (!b) return null; const p = priceAt(w, b, gid); return p == null ? null : p * (1 + P3.tax(w, b)); },
  });

  // ------------------------------------------------------------------ vessels and animals from their materials
  G.vesselPrice = function (vc, b) { const C = AZ.VCLASS[vc] || AZ.VCLASS.boat; return U.rn(AZ.money("vessel", b) * (C.buy / 150), 2); };
  G.sellPrice = function (v, b) { return U.rn(this.vesselPrice(v.vc || "boat", b) * 0.6 * (v.damaged ? 0.5 : 1), 2); };
  G.repairCost = function (b) { const v = this.s.vessel, C = (v && AZ.VCLASS[v.vc]) || AZ.VCLASS.boat; return U.rn(AZ.Prices.repair(this.w, b) * C.repair[0] + AZ.Prices.wage(this.w, b) * (C.repair[1] / 12), 2); };
  G.beastPrice = function (vc, b) { return AZ.money(vc, b); };

  // ------------------------------------------------------------------ quotes and the market screen
  G.goodQuote = function (b, gid) {
    const p = this.fieldPrice(b, gid);
    if (p == null) return null;
    const F = AZ.fieldOf(this.w);
    return { price: p, buy: U.rn(p * (1 + AZ.Prices.tax(this.w, b)), 2), sell: U.rn(p * 0.85, 2), made: F.made(b, gid), canBuy: F.available(b, gid) };
  };
  G.priceWhy = function (b, gid) {
    const S = AZ.fieldOf(this.w).shares(b, gid), parts = S.markets.filter(x => x.share >= 0.02).slice(0, 3).map(x => `${U.esc(x.name)} ${Math.round(x.share * 100)}%`);
    return `${[...parts, `${U.esc(b.name)} itself ${Math.round(S.own * 100)}%`].join(", ")}${S.made ? "; made here" : "; brought in"}`;
  };
  G.trade = function (b, gid, n) { // n > 0 bought, n < 0 sold; one unit at a time, each moving the price
    const s = this.s;
    s.trades = s.trades || []; s.goods = s.goods || {}; s.basis = s.basis || {};
    let total = 0;
    for (let i = 0; i < Math.abs(n); i++) {
      const q = this.goodQuote(b, gid);
      if (n > 0) { if (s.purse < q.buy) break; const n0 = s.goods[gid] || 0; s.basis[gid] = U.rn(((s.basis[gid] || 0) * n0 + q.buy) / (n0 + 1), 2); s.goods[gid] = n0 + 1; s.purse = U.rn(s.purse - q.buy, 2); total -= q.buy; }
      else { if (!(s.goods[gid] > 0)) break; s.goods[gid]--; s.purse = U.rn(s.purse + q.sell, 2); total += q.sell; }
      s.trades.push({ b: b.i, m: b.market, g: +gid, n: n > 0 ? 1 : -1, t: s.clock });
    }
    this.dirty = true;
    return U.rn(total, 2);
  };
  G.tradeGoods = async function (b) {
    const s = this.s, w = this.w, F = AZ.fieldOf(w);
    s.goods = s.goods || {}; s.basis = s.basis || {};
    for (;;) {
      const cap = this.capacity().goods, held = new Set(Object.entries(s.goods).filter(([, n]) => n > 0).map(([g]) => +g));
      const ids = w.P.goods.map(g => g.i).filter(g => held.has(g) || F.available(b, g)).filter(g => this.goodQuote(b, g));
      ids.sort((a, c) => (held.has(c) - held.has(a)) || (F.made(b, c) - F.made(b, a)) || this.know.good(a).localeCompare(this.know.good(c)));
      const opts = ids.map(g => { const q = this.goodQuote(b, g), n = s.goods[g] || 0;
        return { label: `${U.esc(this.know.good(g))} · buy 🟡 ${q.buy} · sell 🟡 ${q.sell}${q.made ? " · made here" : ""}${n ? ` · you have ${n}` : ""}`, g }; });
      if (!opts.length) opts.push({ label: `${U.esc(b.name)} has no goods for sale`, disabled: true });
      opts.push({ label: "Back", back: true });
      const k = await this.ui.choose(`<b>${U.esc(b.name)}: goods</b> · 🟡 ${U.rn(s.purse, 2)} · carrying ${this.goodsCount()}/${cap} units<br><span class="dim">A day's food here costs 🟡 ${AZ.Prices.ration(w, b)}; a day's work is worth 🟡 ${AZ.Prices.wage(w, b)}. Prices blend the markets around ${U.esc(b.name)} with its own; buyers pay ${Math.round(AZ.Prices.tax(w, b) * 100)}% tax ${T("mixed")}.</span>`, opts, { cancel: opts.length - 1 });
      const o = opts[k];
      if (!o || o.back || o.g == null) return;
      for (;;) {
        const q = this.goodQuote(b, o.g), n = s.goods[o.g] || 0, room = cap - this.goodsCount();
        const sub = [{ label: `Buy 1 for 🟡 ${q.buy}`, act: 1, disabled: !q.canBuy || room < 1 || s.purse < q.buy }, { label: "Buy 5", act: 5, disabled: !q.canBuy || room < 5 || s.purse < q.buy * 5 },
          { label: `Sell 1 for 🟡 ${q.sell}`, act: -1, disabled: n < 1 }, { label: `Sell all ${n}`, act: -n, disabled: n < 2 }, { label: "Back", act: 0 }];
        const k2 = await this.ui.choose(`<b>${U.esc(this.know.good(o.g))}</b> in ${U.esc(b.name)}: buy 🟡 ${q.buy}, sell 🟡 ${q.sell}${n ? ` · you have ${n}, paid 🟡 ${U.rn(s.basis[o.g] || 0, 2)} each` : ""}<br><span class="dim">Where the price comes from: ${this.priceWhy(b, o.g)} ${T("mixed")}.${q.canBuy ? "" : " Nobody here sells it, though they buy it."}</span>`, sub, { cancel: sub.length - 1 });
        const a = sub[k2].act;
        if (!a) break;
        const got = this.trade(b, o.g, a);
        if (a < 0) this.log(`Sold ${-a} ${U.esc(this.know.good(o.g).toLowerCase())} in ${U.esc(b.name)} for 🟡 ${got}.`);
      }
    }
  };

  // ------------------------------------------------------------------ F on foot or single-handed: a rest call at night and when tired
  const tick4 = G.tick;
  G.tick = function (...a) {
    const r = tick4.apply(this, a), s = this.s;
    if (!s || !s.auto || this.riding() || this.ui.busy() || s.carefree) return r;
    const v = s.vessel;
    if (v && s.aboard && v.crew > 0) return r; // crews call stops or keep watches
    const sun = AZ.Clock.sun(s.clock, this.lat()), night = sun.dl < 24 && (sun.hour >= sun.set + 0.75 || sun.hour < sun.rise);
    const day = Math.floor((s.clock + 12) / 24), awake = s.awake || 0;
    const key = night && awake >= 12 ? `n${day}` : awake >= 18 ? `t${day}:${awake >= 30 ? 2 : 1}` : null;
    if (key && s.restAsk !== key) { s.restAsk = key; this.setAuto(false); this.restCall(night); }
    return r;
  };
  G.restCall = async function (night) {
    const s = this.s, aboard = !!(s.aboard && s.vessel);
    const k = await this.ui.choose(`<b>${night ? "Night falls." : "You are tired."}</b> You have been awake ${Math.round(s.awake || 0)} hours ${T("mixed")}. ${aboard ? "Anchor and sleep until dawn?" : "Make camp and sleep until dawn?"}`,
      [{ label: aboard ? "Anchor until dawn" : "Make camp until dawn" }, { label: night ? "Go on through the night" : "Go on" }], { cancel: 1 });
    if (k === 0) {
      if (aboard) { s.clock = AZ.Clock.nextDawn(s.clock, this.lat()); this.slept(); this.ui.toast("You anchor and sleep until dawn."); this.dirty = true; }
      else await this.campNight();
    }
    if (this.s && !this.ui.busy()) this.setAuto(true);
  };

  // ------------------------------------------------------------------ the days: old trades fall away
  const nd5 = G.newDay;
  G.newDay = function (...a) { const r = nd5.apply(this, a), s = this.s; if (s.trades && s.trades.length) s.trades = s.trades.filter(t => s.clock - t.t < 35 * 24); return r; };

  // ------------------------------------------------------------------ the journal: money here
  const carry1 = G.carryHtml;
  G.carryHtml = function () {
    const w = this.w, b = this.townNear();
    let h = carry1.call(this);
    if (b) {
      const row = (id, x, label) => `<tr><td class="dim">${label || AZ.MONEY[id].label}</td><td>🟡 ${AZ.money(id, b, x)}</td></tr>`;
      h += `<h3>Money at ${U.esc(b.name)} ${T("mixed")}</h3><table>${row("ration")}${row("wage", null, "A day's work")}${row("inn")}${row("fare", 100, "A sea passage, 100 miles")}${row("alms")}</table>`;
    }
    return h;
  };
})();
