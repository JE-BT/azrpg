// =============================================================================================
// 22_hosts.js · Alpha 4.1: the people who explain the systems, and two fixes.
//   Goods are sold where the map has them: where a town makes them, where its land holds them,
//   where the map's deals bring them, and at a market's centre. Skiffs stay in the water unless
//   you choose to carry them. The merchant reads the field for you; the harbourmaster gives
//   directions and sailing advice and watches vessels left in harbour; the wainwright reads the
//   road and sells riding horses. Animals go aboard small ships and larger.
// =============================================================================================
(() => {
  const G = AZ.Game.prototype, U = AZ.U, T = AZ.T;
  const ANIMALS_ABOARD = new Set(["galley", "smallship", "ship", "greatship"]);

  // ------------------------------------------------------------------ goods where the map has them
  AZ.Field.prototype.available = function (b, gid) {
    gid = +gid;
    const w = this.w, P = w.P;
    if (this.made(b, gid)) return true;                                   // the town makes it, or its cell holds it
    if ((P.trade && P.trade.buy && P.trade.buy[b.i] || {})[gid]) return true; // the map's deals bring it here
    const home = this.byId.get(b.market);
    if (home && home.centerBurgId === b.i && home.goods[gid]?.[0] > 0) return true; // the market centre holds the region's stock
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) { const c = b.t[0] + dc, r = b.t[1] + dr; if (w.inb(c, r) && w.C.good[w.cell(c, r)] === gid) return true; } // the land around it
    return false;
  };

  // ------------------------------------------------------------------ skiffs stay in the water unless carried
  const pass2 = G.passable;
  G.passable = function (c, r) {
    const s = this.s, w = this.w, v = s.vessel;
    if (s.aboard && v && v.vc === "skiff" && !this.riding() && !s.portage && w.inb(c, r) && w.isLand(c, r) && !w.navigable(c, r, v.cls))
      return { ok: false, why: `Land ahead. Press Space to go ashore, or to carry the ${U.esc(v.kind.toLowerCase())} overland.` };
    const p = pass2.call(this, c, r);
    if (p.ok && s.portage && s.aboard && v && w.navigable(c, r, v.cls)) { s.portage = false; this.ui.toast(`You put the ${U.esc(v.kind.toLowerCase())} back in the water.`); }
    if (p.ok && p.board && s.mount && !w.burgAt.has(w.idx(s.c, s.r)) && !this.harbourAt.has(w.idx(s.c, s.r)) && !ANIMALS_ABOARD.has(v && v.vc)) return { ok: false, why: `Your ${U.esc(s.mount.kind.toLowerCase())} cannot come aboard here. Stable it in a town, or sell it.` };
    return p;
  };
  const ashore1 = G.goAshore;
  G.goAshore = async function (t, confirmed) {
    const s = this.s, v = s.vessel;
    if (v && v.vc === "skiff" && t) {
      const k = await this.ui.choose(`<b>Land ahead.</b> A skiff can be carried overland: twice the walking time, and the rowers tire half as much again ${T("mixed")}.`,
        [{ label: "Go ashore and leave the skiff here" }, { label: `Carry the ${U.esc(v.kind.toLowerCase())} overland` }, { label: "Stay aboard" }], { cancel: 2 });
      if (k === 2) return;
      if (k === 1) { s.portage = true; s.auto = false; this.ui.toast(`You lift the ${U.esc(v.kind.toLowerCase())} out of the water. Walk her to the next water.`); return; }
    }
    return ashore1.call(this, t, confirmed);
  };

  // ------------------------------------------------------------------ the merchant reads the field
  G.merchantAdvice = async function (b) {
    const s = this.s, w = this.w, F = AZ.fieldOf(w), mi = x => Math.round(Math.hypot(x.t[0] - b.t[0], x.t[1] - b.t[1]) * w.miles);
    const near = w.P.burgs.filter(x => x && x !== b && F.byId.has(x.market)).map(x => ({ x, d: F.eff(b, x) })).filter(o => o.d <= 1.5 * F.T).sort((a, c) => a.d - c.d).slice(0, 30).map(o => o.x);
    const R0 = this.regard ? this.regard(b, "Merchant") : { band: "neutral" }, trust = /cool|hostile/.test(R0.band) ? -1 : 0, shade = trust < 0 ? 1.1 : 1; // a stranger he distrusts hears better prices elsewhere than there are
    const avail = w.P.goods.map(g => g.i).filter(g => F.available(b, g) && this.goodQuote(b, g));
    const buys = [];
    for (const g of avail) {
      const q = this.goodQuote(b, g); let best = null;
      for (const x of near) { const q2 = this.goodQuote(x, g); if (q2 && (!best || q2.sell > best.sell)) best = { sell: q2.sell, x }; }
      if (best && best.sell * shade > q.buy) buys.push({ g, here: q.buy, there: U.rn(best.sell * shade, 2), x: best.x, gain: U.rn(best.sell * shade - q.buy, 2) });
    }
    buys.sort((a, c) => c.gain / c.here - a.gain / a.here);
    const brings = [];
    for (const g of w.P.goods.map(x => x.i)) {
      const q = this.goodQuote(b, g); if (!q) continue; let low = null;
      for (const x of near) if (F.available(x, g)) { const q2 = this.goodQuote(x, g); if (q2 && (!low || q2.buy < low.buy)) low = { buy: q2.buy, x }; }
      if (low && q.sell > low.buy * 1.05) brings.push({ g, here: q.sell, there: low.buy, x: low.x, gain: U.rn(q.sell - low.buy, 2) });
    }
    brings.sort((a, c) => c.gain / c.there - a.gain / a.there);
    const packs = Object.entries(s.goods || {}).filter(([, n]) => n > 0).map(([g]) => {
      const q = this.goodQuote(b, g); if (!q) return `${U.esc(this.know.good(g))}: nobody here buys it.`;
      let best = null; for (const x of near) { const q2 = this.goodQuote(x, g); if (q2 && (!best || q2.sell > best.sell)) best = { sell: q2.sell, x }; }
      return best && best.sell > q.sell * 1.05 ? `${U.esc(this.know.good(g))}: 🟡 ${q.sell} here; ${U.esc(best.x.name)} pays 🟡 ${U.rn(best.sell * shade, 2)} (${U.num(mi(best.x))} mi).` : `${U.esc(this.know.good(g))}: 🟡 ${q.sell} here, as good as you will find nearby.`;
    });
    const made = Object.entries(b.production || {}).sort((a, c) => c[1] - a[1]).map(([g]) => +g).find(g => F.available(b, g) && this.goodQuote(b, g));
    const L = [`<b>${U.esc(b.name)}: the merchant</b> reads the markets around him for you ${T("mixed")}.${trust < 0 ? " He does not know you, and does not much like your kind: weigh his word." : ""}`];
    L.push(buys.length ? `Cheap here, dearer elsewhere: ${buys.slice(0, 3).map(o => `${U.esc(this.know.good(o.g).toLowerCase())} (🟡 ${o.here} here; ${U.esc(o.x.name)}, ${U.num(mi(o.x))} mi, pays 🟡 ${o.there}: 🟡 ${o.gain} a unit after tax and his trade's cut)`).join("; ")}.` : "Nothing here sells dearer anywhere he knows, once tax and the merchants' cut are paid.");
    if (brings.length) L.push(`Worth bringing here: ${brings.slice(0, 3).map(o => `${U.esc(this.know.good(o.g).toLowerCase())} (🟡 ${o.there} at ${U.esc(o.x.name)}; he pays 🟡 ${o.here})`).join("; ")}.`);
    if (packs.length) L.push(`Your packs: ${packs.join(" ")}`);
    const opts = [];
    if (made != null) {
      const q = this.goodQuote(b, made), price = U.rn(q.buy * 5 * 0.9, 2), room = this.capacity().goods - this.goodsCount();
      L.push(`He has more ${U.esc(this.know.good(made).toLowerCase())} than he can move, and will take a tenth off for five.`);
      opts.push({ label: `Buy 5 ${U.esc(this.know.good(made).toLowerCase())} for 🟡 ${price}`, g: made, price, disabled: s.purse < price || room < 5 });
    }
    opts.push({ label: "Thank him" });
    const k = await this.ui.choose(L.join("<br>"), opts, { cancel: opts.length - 1 });
    const o = opts[k];
    if (o.g != null) {
      const n0 = s.goods[o.g] || 0;
      s.basis[o.g] = U.rn(((s.basis[o.g] || 0) * n0 + o.price) / (n0 + 5), 2); s.goods[o.g] = n0 + 5; s.purse = U.rn(s.purse - o.price, 2);
      s.trades = s.trades || []; for (let i = 0; i < 5; i++) s.trades.push({ b: b.i, m: b.market, g: o.g, n: 1, t: s.clock });
      this.log(`Bought 5 ${U.esc(this.know.good(o.g).toLowerCase())} in ${U.esc(b.name)} at a haggled price.`); this.dirty = true;
    }
  };

  // ------------------------------------------------------------------ the harbourmaster: directions, advice, a watch on your vessel
  G.watchFee = function (b) { return U.rn(3 * AZ.Prices.wage(this.w, b), 2); };
  G.harbourmaster = async function (b) {
    const s = this.s, w = this.w, v = s.vessel, cp = this.cpNext(), L = [`<b>${U.esc(b.name)}: the harbourmaster</b> ${T("new")}.`];
    if (cp) {
      const leg = cp.legIn, dd = this.know.dirDist(b.t[0], b.t[1], cp.tile).txt;
      L.push(`Your next stop, ${U.esc(cp.place.name)}, is ${dd} ${T("mixed")}${leg ? `; the plan goes by ${U.esc(leg.transport.toLowerCase())}, ${U.num(Math.round(leg.miles))} mi` : ""}.`);
      if (v && leg && leg.domain !== "land") {
        const C = AZ.VCLASS[v.vc] || AZ.VCLASS.boat, sun = AZ.Clock.sun(s.clock, this.lat()), hrs = this.keepsWatches(v) ? 24 : Math.max(4, Math.min(v.hpd || 12, sun.dl + 0.75)), days = Math.ceil(leg.miles * 1.15 / ((v.speed || C.speed) * hrs));
        L.push(`In your ${U.esc(v.kind.toLowerCase())}, ${this.keepsWatches(v) ? "sailing round the clock" : `sailing ${Math.round(hrs)} hours a day at this season`}, call it ${days} days: ${days * this.eaters()} rations for ${this.eaters()} mouths, and more if the weather turns ${T("mixed")}.`);
      } else if (leg && leg.domain !== "land") L.push("You have no vessel of your own: book a passage at the office, or hire one from the yard.");
    }
    L.push("F follows the plan's gold line; with a waypoint it takes the shortest water. Boats keep near the coast, ships keep off it. A boat's hands stop at dusk; a ship with hands for two watches sails on. In a storm, small hulls want a beach and ships want open water.");
    if (s.beast || s.mount) L.push(`Animals go aboard small ships and larger; ${v && !ANIMALS_ABOARD.has(v.vc) ? `your ${U.esc(v.kind.toLowerCase())} cannot take them` : "a skiff or a boat cannot take them"}, and the stables here will keep them.`);
    const opts = [];
    if (v && this.vesselHere(b) && !this.crewFed(v)) {
      if (v.watch) L.push(`Your ${U.esc(v.kind.toLowerCase())} is in the harbour's care: 🟡 ${v.watch.weekly} a week, due when you take her out.`);
      else opts.push({ label: `Have the harbour watch your ${U.esc(v.kind.toLowerCase())} while you are away: 🟡 ${this.watchFee(b)} a week, due when you return`, act: "watch" });
    }
    opts.push({ label: "Thank him" });
    const k = await this.ui.choose(L.join("<br>"), opts, { cancel: opts.length - 1 });
    if (opts[k].act === "watch") { v.watch = { b: b.i, since: s.clock, weekly: this.watchFee(b) }; this.ui.toast(`The harbour will watch your ${U.esc(v.kind.toLowerCase())}.`); }
  };
  // leaving a vessel with no one aboard: the harbourmaster asks; on a beach, she is on her own
  const enf1 = G.enforceCapacity;
  G.enforceCapacity = function () {
    const s = this.s, v = s && s.vessel;
    const was = s && s.wasWithVessel;
    const r = enf1.call(this);
    if (v && s.vessel === v && was && !this.withVessel() && !this.crewFed(v) && !v.watch && !this.ui.busy() && !s.carefree) {
      const port = this.vesselInPort(v);
      if (port) {
        const fee = this.watchFee(port);
        (async () => {
          const k = await this.ui.choose(`<b>The harbourmaster of ${U.esc(port.name)}</b> stops you on the quay: “Leaving her with no one aboard? For 🟡 ${fee} a week, paid when you come back, the harbour watches her.” ${T("new")}`,
            [{ label: `Leave her in the harbour's care (🟡 ${fee} a week)` }, { label: "Leave her unwatched" }], { cancel: 1 });
          if (k === 0) v.watch = { b: port.i, since: s.clock, weekly: fee };
        })();
      }
    }
    return r;
  };
  const take1 = G.takeHold;
  G.takeHold = function () {
    const s = this.s, v = s.vessel;
    if (v && v.watch) {
      const weeks = Math.max(1, Math.ceil((s.clock - v.watch.since) / 168)), due = U.rn(weeks * v.watch.weekly, 2);
      s.purse = U.rn(Math.max(0, s.purse - due), 2);
      this.ui.toast(`🟡 −${due}: the harbour watched your ${U.esc(v.kind.toLowerCase())} for ${weeks} week${weeks > 1 ? "s" : ""}.`);
      this.log(`Paid the harbour 🟡 ${due} for watching the ${U.esc(v.kind.toLowerCase())}.`);
      delete v.watch;
    }
    return take1.call(this);
  };

  // ------------------------------------------------------------------ the wainwright: the road ahead, and riding horses
  G.mountSpeed = function () { const t = (this.w.W.transports || []).find(x => /^horseback/i.test(x.name)); return (t && t.speed) || 7; };
  G.wainwright = async function (b) {
    const s = this.s, w = this.w, cp = this.cpNext(), leg = cp && cp.legIn, L = [`<b>${U.esc(b.name)}: the wainwright and horse-dealer</b> ${T("new")}.`];
    if (leg && leg.domain === "land" && leg.chain && leg.chain.length) {
      let road = 0, trail = 0;
      for (const [c, r] of leg.chain) { const B = w.bits(c, r); if (B.road) road++; else if (B.trail) trail++; }
      const n = leg.chain.length, pr = Math.round((road / n) * 100), pt = Math.round((trail / n) * 100);
      L.push(`To ${U.esc(cp.place.name)}, ${U.num(Math.round(leg.miles))} mi: ${pr}% of the way is road, ${pt}% trail, the rest open country ${T("mixed")}. ${pr >= 60 ? "A cart or a wagon will do." : pr + pt >= 60 ? "A cart will manage; a wagon will crawl." : "Take a pack animal: a cart would spend its days stuck."}`);
      if (/horse/i.test(leg.transport)) { const ride = Math.ceil(leg.miles / (this.mountSpeed() * 8)), walk = Math.ceil(leg.miles / (this.walkSpeed * 8)); L.push(`The plan rides this leg: on horseback about ${ride} days, on foot about ${walk} ${T("mixed")}.`); }
    }
    const price = U.rn(AZ.money("pack", b) * 1.25, 2), opts = [];
    if (!s.mount) opts.push({ label: `Buy a riding horse: 🟡 ${price}; you ride at ${this.mountSpeed()} mph where you would walk at ${this.walkSpeed}`, act: "buy", disabled: s.purse < price });
    else opts.push({ label: `Sell your ${U.esc(s.mount.kind.toLowerCase())}: 🟡 ${U.rn(price * 0.6, 2)}`, act: "sell" });
    opts.push({ label: "Thank him", act: "back" });
    const k = await this.ui.choose(L.join("<br>"), opts, { cancel: opts.length - 1 });
    const o = opts[k];
    if (o.act === "buy") { s.purse = U.rn(s.purse - price, 2); s.mount = { kind: "Riding horse", speed: this.mountSpeed(), hungry: 0, home: b.i }; this.log(`Bought a riding horse in ${U.esc(b.name)}.`); this.dirty = true; }
    if (o.act === "sell") { s.purse = U.rn(s.purse + U.rn(price * 0.6, 2), 2); this.log(`Sold your horse in ${U.esc(b.name)}.`); s.mount = null; this.dirty = true; }
  };
  const step2 = G.stepHours;
  G.stepHours = function (c, r, dc, dr) {
    const s = this.s, h = step2.call(this, c, r, dc, dr);
    return s.mount && !s.aboard && !this.riding() ? h * (this.walkSpeed / (s.mount.speed || 7)) * (s.mount.hungry ? 1.3 : 1) : h;
  };
  const nd6 = G.newDay;
  G.newDay = function (...a) {
    const r = nd6.apply(this, a), s = this.s, w = this.w, v = s.vessel;
    if (s.mount && !s.carefree) { // a horse grazes on open ground and eats from your food elsewhere
      const biome = w.P.biomes[w.C.biome[w.cell(s.c, s.r)]]?.name || "";
      if (/grass|savanna|steppe|shrub|tundra|meadow/i.test(biome)) s.mount.hungry = 0;
      else if (s.sup.food >= 1) { s.sup.food -= 1; s.mount.hungry = 0; }
      else if (++s.mount.hungry >= 4) { this.ui.toast("Unfed for four days, your horse is gone in the night."); s.mount = null; }
    }
    // a vessel with no one aboard and no watch may not be there when you come back
    if (v && !this.withVessel() && !this.crewFed(v) && !v.watch && !s.carefree && v.mode !== "hired") {
      const port = this.vesselInPort(v), p = port ? 0.01 : 0.03;
      if (U.rnd2(v.c, v.r, Math.floor(s.clock / 24) + 77) < p) {
        const where = port ? `${U.esc(port.name)} harbour` : "the shore where you left her";
        this.log(`Your ${U.esc(v.kind.toLowerCase())} was taken from ${where}.`, "hook");
        this.ui.toast(`Word reaches you: your ${U.esc(v.kind.toLowerCase())} has been taken from ${where} ${T("mixed")}.`);
        s.vessel = null;
      }
    }
    return r;
  };
  // animals: aboard small ships and larger; otherwise the stables
  const stab0 = G.stableBeast;
  G.stableBeast = function () {
    const s = this.s, v = s.vessel;
    if (!this.riding() && s.aboard && v && ANIMALS_ABOARD.has(v.vc)) return;
    return stab0.call(this);
  };
  const enf2 = G.enforceCapacity;
  G.enforceCapacity = function () {
    const s = this.s, w = this.w;
    if (s && s.mount && (s.aboard || this.riding()) && !this.ui.busy() && !(!this.riding() && s.vessel && ANIMALS_ABOARD.has(s.vessel.vc))) {
      const i = w.idx(s.c, s.r), b = w.burgAt.get(i) || this.harbourAt.get(i) || (s.voyage && w.P.burgs[s.voyage.portBurg]);
      if (b) { const t = this.storeTerms(AZ.money("pack", b)); this.storeLot(b, { food: 0, goods: {}, mount: { ...s.mount }, since: s.clock, weekly: t.weekly, owed: t.deposit }); this.ui.toast(`Your horse waits in the ${U.esc(b.name)} stables: 🟡 ${t.weekly} a week, due when you collect.`); }
      else this.ui.toast("Your horse cannot come aboard, and is left behind.");
      s.mount = null;
    }
    return enf2.call(this);
  };
  const coll0 = G.collectStore;
  G.collectStore = function (b) {
    const S = this.s.stores && this.s.stores[b.i], m = S && S.lots.find(l => l.mount);
    coll0.call(this, b);
    if (m) this.s.mount = { ...m.mount, hungry: 0 };
  };
  const desc0 = G.storeDesc;
  G.storeDesc = function (lots) { const d = desc0.call(this, lots), m = lots.filter(l => l.mount).length; return [d, m ? "your riding horse" : ""].filter(Boolean).join(", "); };

  // ------------------------------------------------------------------ the town menu
  const extras0 = G.townExtras;
  G.townExtras = function (b) {
    const out = extras0.call(this, b), w = this.w;
    if (b.port || [...AZ.WATER_NAV].some(k => w.harbour(b, k))) out.push({ label: "Harbourmaster: directions, sailing advice, a watch on your vessel", act: { extra: () => this.harbourmaster(b) } });
    out.push({ label: `Wainwright and horse-dealer: the road ahead, riding horses${this.s.mount ? " (your horse)" : ""}`, act: { extra: () => this.wainwright(b) } });
    return out;
  };
  const carry2 = G.carryHtml;
  G.carryHtml = function () { const s = this.s; let h = carry2.call(this); if (s.mount) h += `<p>Your riding horse: you ride at ${s.mount.speed} mph${s.mount.hungry ? `; hungry ${s.mount.hungry} day${s.mount.hungry > 1 ? "s" : ""}` : ""}.</p>`; if (s.vessel && s.vessel.watch) h += `<p class="dim">The harbour watches your ${U.esc(s.vessel.kind.toLowerCase())}: 🟡 ${s.vessel.watch.weekly} a week.</p>`; return h; };
  const bf1 = G.backfill;
  G.backfill = function () { bf1.call(this); if (this.s.mount === undefined) this.s.mount = null; };
})();
