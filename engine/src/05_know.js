// =============================================================================================
// 05_know.js · the text layer (from Alpha 6's 04_story.js). Every sentence the world speaks about
// a tile is assembled here from the data and tagged: data (read from the map), mixed (a stated
// rule applied to the data), new (made up for the game). The townspeople are in 31_towns.
// =============================================================================================
AZ.Know = class {
  constructor(w, jr, tv) {
    this.w = w; this.jr = jr; this.tv = tv;
    this.C = AZ.CONTENT || {};
    this.facts = this.buildFacts();
  }
  get P() { return this.w.P; }
  year() { return this.w.W.calendar?.year || 0; }
  st(i) { return this.P.states[i]; }
  rel(a, b) { const s = this.st(a); return a === b ? "Self" : s?.diplomacy?.[b] || "Unknown"; }
  sightTiles(c, r, aboard) { if (aboard || !this.w.isLand(c, r)) return 4; return Math.min(10, 4 + Math.floor(Math.max(0, this.w.heightVal(this.w.h(c, r))) / 1500)); }
  dirDist(c, r, t) {
    const U = AZ.U, mi = Math.hypot(t[0] - c, t[1] - r) * this.w.miles;
    return { dir: U.compass(t[0] - c, t[1] - r), mi, txt: `${U.num(Math.round(mi / 5) * 5)} mi ${U.compass(t[0] - c, t[1] - r)}` };
  }
  person(seedKey, cultureId) {
    const rnd = AZ.U.rng(`${this.w.P.world.seed}:${seedKey}`);
    const cul = this.P.cultures[cultureId] || this.P.cultures[1];
    return this.w.names.get(cul.base, rnd);
  }
  heightBand(ft) {
    const bands = this.C.height || [[0, "low ground"], [300, "rolling country"], [1200, "hills"], [3000, "highlands"], [6000, "mountains"]];
    let b = bands[0][1];
    for (const [v, n] of bands) if (ft >= v) b = n;
    return b;
  }
  feel(tc) { return tc < -10 ? "bitter" : tc < 0 ? "freezing" : tc < 8 ? "cold" : tc < 15 ? "cool" : tc < 22 ? "mild" : tc < 28 ? "warm" : "hot"; }
  wet(mm) { return mm < 250 ? "arid" : mm < 600 ? "dry" : mm < 1200 ? "moist" : mm < 2500 ? "wet" : "drenched"; }
  good(id) { const g = this.P.goods.find(x => x.i === +id); return g ? g.name : `good ${id}`; }
  tradeList(t) { if (!t) return ""; return Object.entries(t).slice(0, 4).map(([g, [u]]) => `${this.good(g)} ${u}`).join(", "); }
  regionName(cell) { const s = this.w.C.state[cell], pv = this.w.C.province[cell]; return pv ? this.P.provinces[pv].name : s ? this.P.states[s].name : "the wild lands"; }

  // ------------------------------------------------------------------ looking around
  describe(c, r, aboard) {
    const w = this.w, U = AZ.U, T = AZ.T, cell = w.cell(c, r), out = [];
    const rnd = U.rng(U.hash32(c, r, 99));
    if (w.isLand(c, r)) {
      const biome = this.P.biomes[w.C.biome[cell]], bank = this.C.biomes?.[biome.name]?.phrases;
      if (bank) out.push(`${rnd.pick(bank)} ${T("new")}`);
      const ft = w.heightVal(w.h(c, r)), rel = w.reliefAt(c, r);
      out.push(`${biome.name}, ${this.heightBand(ft)} about ${U.num(ft < 1000 ? Math.round(ft / 10) * 10 : Math.round(ft / 50) * 50)} ${w.hunit} up${rel ? ` (${rel.rule.toLowerCase()})` : ""} ${T("mixed")}.`);
    } else {
      out.push(`${w.waterName(c, r)}, about ${w.heightStr(w.h(c, r), true)} deep ${T("data")}.`);
      const wd = w.wind(w.latlon(c, r)[0]);
      if (wd != null) out.push(`The prevailing wind of this latitude blows towards the ${U.compass(Math.sin(wd * Math.PI / 180), -Math.cos(wd * Math.PI / 180))} ${T("mixed")}.`);
    }
    const tc = w.tempC(c, r), g = AZ.game, lat = w.latlon(c, r)[0], tt = g && g.s ? g.s.clock : 6;
    out.push(`The year here runs ${this.feel(tc)} (mean ${w.temp(tc)})${w.isLand(c, r) ? ` and ${this.wet(w.precMM(c, r))} (${U.num(w.precMM(c, r))} mm a year)` : ""} ${T("data")}.`);
    const today = AZ.Clock.today(tc, lat, tt, !w.isLand(c, r)), dl = AZ.Clock.dayLength(lat, AZ.Clock.doyAt(tt));
    out.push(`It is ${AZ.Clock.season(lat, tt)}: about ${w.temp(today)} today, with ${Math.round(dl)} hours of daylight${today < 0 && w.isLand(c, r) ? "; snow lies on the ground" : ""} ${T("mixed")}.`);
    const rv = w.river(c, r);
    if (rv) out.push(`The ${rv.name} ${rv.type || "River"} runs through here ${T("data")}.`);
    const rt = w.route(c, r);
    if (rt) out.push(`${rt.group === "searoutes" ? "You are on a sea lane" : rt.group === "trails" ? "A trail passes" : "A road passes"}: the ${rt.name || "unnamed way"}, ${U.num(rt.length)} mi end to end ${T("data")}.`);
    if (w.isLand(c, r)) {
      const s = w.C.state[cell], pv = w.C.province[cell];
      out.push(`${pv ? this.P.provinces[pv].fullName + ", " : ""}${s ? this.st(s).fullName : "neutral lands"}; ${this.P.cultures[w.C.culture[cell]].name} country, keeping the ${this.P.religions[w.C.religion[cell]].name} ${T("data")}.`);
    }
    for (const z of w.zonesOfCell(cell)) out.push(`<b class="hook">${z.name}</b>: this ground lies in a ${z.type.toLowerCase()} zone ${T("data")}.`);
    const seen = w.near(c, r, this.sightTiles(c, r, aboard)).filter(n => n.d > 0.5).slice(0, 5);
    if (seen.length) out.push("In sight: " + seen.map(n => `${n.o.name || n.o.type} (${this.dirDist(c, r, n.o.t).txt})`).join("; ") + ` ${T("data")}.`);
    return out;
  }

  // ------------------------------------------------------------------ the survey: every layer for one tile
  inspect(c, r, g) {
    const w = this.w, U = AZ.U, T = AZ.T, P = this.P, cell = w.cell(c, r), land = w.isLand(c, r);
    const row = (k, v, t = "data") => `<tr><th>${k}</th><td>${v} ${T(t)}</td></tr>`;
    const sec = (title, rows) => (rows.length ? `<h4>${title}</h4><table class="survey">${rows.join("")}</table>` : "");
    const [lat, lon] = w.latlon(c, r), f = w.feature(cell), tt = g && g.s ? g.s.clock : 6;
    const here = [row("Tile", `${c}, ${r} · ${U.num(w.miles, 2)} mi square`, "mixed"), row("Cell", `${cell}${f ? ` · ${f.name || ""} ${f.subtype || f.type}` : ""}`), row("Position", `${U.dms(lat, "lat")} ${U.dms(lon, "lon")} · ${w.geozone(lat)}`)];
    const ground = [];
    if (land) {
      const b = P.biomes[w.C.biome[cell]];
      ground.push(row("Biome", `${b.name} · habitability ${b.habitability} · move cost ${b.cost}`));
      ground.push(row("Elevation", `${U.num(w.C.hft[cell])} ${w.hunit} (cell)`));
      ground.push(row("Here", `${w.heightStr(w.h(c, r))}${w.reliefAt(c, r) ? " · " + w.reliefAt(c, r).rule : ""}`, "mixed"));
      ground.push(row("Precipitation", `${U.num(w.precMM(c, r))} mm`));
    } else {
      ground.push(row("Water", w.waterName(c, r)), row("Depth", w.heightStr(w.h(c, r), true), "mixed"));
    }
    ground.push(row("Temperature", `${w.temp(w.tempC(c, r))} mean`));
    ground.push(row("Season", `${AZ.Clock.season(lat, tt)} · about ${w.temp(AZ.Clock.today(w.tempC(c, r), lat, tt, !land))} today · ${Math.round(AZ.Clock.dayLength(lat, AZ.Clock.doyAt(tt)))} h daylight`, "mixed"));
    const rv = w.river(c, r), rt = w.route(c, r);
    if (rv) ground.push(row("River", `${rv.name} ${rv.type} · ${U.num(rv.length)} km · discharge ${U.num(rv.discharge)} m³/s`));
    if (rt) ground.push(row("Route", `${rt.name || "unnamed"} (${rt.group}) · ${U.num(rt.length)} mi`));
    const realm = [];
    if (land || w.C.state[cell]) {
      const s = this.st(w.C.state[cell]);
      realm.push(row("State", w.C.state[cell] ? `${s.fullName} · ${s.form} · taxes ${Math.round(s.salesTax * 100)}% sales, ${Math.round(s.pollTax * 100)}% poll · treasury ${U.num(s.treasury)}` : "neutral lands"));
      if (w.C.province[cell]) realm.push(row("Province", P.provinces[w.C.province[cell]].fullName));
    }
    const cu = P.cultures[w.C.culture[cell]], re = P.religions[w.C.religion[cell]];
    if (w.C.culture[cell]) realm.push(row("Culture", `${cu.name} · ${cu.type}`));
    if (w.C.religion[cell]) realm.push(row("Religion", `${re.name} · ${re.type}${re.form ? ", " + re.form : ""}${re.deity ? " · " + re.deity : ""}`));
    const [ru, ur] = w.population(cell);
    if (land) realm.push(row("Population", `${U.si(ru + ur)} (${U.si(ru)} rural, ${U.si(ur)} urban)`));
    const burg = [], b = w.burgAt.get(w.idx(c, r));
    if (b) {
      const feats = ["capital", "port", "walls", "citadel", "plaza", "temple", "shanty"].filter(k => b[k]).join(", ");
      burg.push(row("Town", `${b.name} · ${b.group}, ${b.type} · ${U.si(b.population * (w.W.units.population?.scale || 1000))}`));
      if (feats) burg.push(row("Has", feats));
      burg.push(row("Treasury", `${U.num(b.treasury, 2)} · product ${U.num(b.product, 2)}`));
      const goods = Object.entries(b.production || {}).sort((a, bb) => bb[1] - a[1]).slice(0, 6).map(([gid, u]) => `${this.good(gid)} ${u}`).join(", ");
      if (goods) burg.push(row("Makes", goods));
      const sells = this.tradeList(P.trade.sell[b.i]), buys = this.tradeList(P.trade.buy[b.i]);
      if (sells) burg.push(row("Sells to market", sells));
      if (buys) burg.push(row("Buys from market", buys));
    }
    const eco = [];
    if (w.C.good[cell]) eco.push(row("Resource", this.good(w.C.good[cell])));
    const prod = w.C.prod[String(cell)];
    if (prod) eco.push(row("Rural output", Object.entries(prod).sort((a, bb) => bb[1] - a[1]).slice(0, 6).map(([gid, u]) => `${this.good(gid)} ${u}`).join(", "), "mixed"));
    const mk = P.markets.find(m => m.i === w.C.market[cell]);
    if (mk) eco.push(row("Market", `${P.burgs[mk.centerBurgId]?.name} market`));
    const near = [];
    for (const z of w.zonesOfCell(cell)) near.push(row("Zone", `<b class="hook">${z.name}</b> (${z.type})`));
    for (const n of w.near(c, r, 4)) {
      if (n.kind === "burg" && n.d < 0.5) continue;
      const where = n.d < 0.5 ? "Here" : this.dirDist(c, r, n.o.t).txt;
      if (n.kind === "marker") near.push(row(where, `<b class="side">${U.esc(n.o.name)}</b>: ${U.esc((n.o.note || "").slice(0, 160))}`));
      else if (n.kind === "unit") near.push(row(where, `${U.esc(n.o.name)} of ${this.st(n.o.state).name}, ${U.num(n.o.a)} ${n.o.naval ? "crew" : "troops"}`));
      else near.push(row(where, `${n.o.name} (${n.o.group})`));
    }
    const prov = [];
    if (g && g.fishYield) {
      const fy = g.fishYield(c, r), fo = g.forageYield(c, r);
      prov.push(row("Provisions", `fishing: ${fy.why || `about ${fy.n} rations in 6 h (${fy.where})`}; foraging: ${fo.why || `about ${fo.n} in 6 h (${fo.where})`}`, "mixed"));
      prov.push(row("Weather", `${g.weather().label} (from ${U.num(w.precMM(c, r))} mm a year, ${AZ.Clock.season(lat, tt)})`, "mixed"));
    }
    return sec("Here", here) + sec(land ? "Land" : "Water", ground) + sec("Realm", realm) + sec("Settlement", burg) + sec("Economy", eco) + sec("Nearby (4 tiles)", near) + sec("Living off it", prov);
  }

  // ------------------------------------------------------------------ rumours of distant things
  buildFacts() {
    const w = this.w, P = this.P, out = [], yr = this.year();
    for (const z of P.zones) {
      if (!z.cells?.length) continue;
      let x = 0, y = 0;
      for (const cc of z.cells) { x += w.C.cx[cc]; y += w.C.cy[cc]; }
      out.push({ t: w.tileAt(x / z.cells.length, y / z.cells.length), kind: "zone", name: z.name, type: z.type, region: this.regionName(z.cells[0]) });
    }
    for (const s of P.states) {
      if (!s || !s.campaigns) continue;
      for (const cp of s.campaigns) if (cp.end == null && cp.attacker === s.i && cp.start >= yr - 3) {
        const cap = P.burgs[s.capital];
        if (cap) out.push({ t: cap.t, kind: "war", name: cp.name, a: s.name, d: P.states[cp.defender]?.name, start: cp.start });
      }
    }
    for (const m of P.markers) if (/monster|volcano|dungeon|ruins|portal|rift|necrop|burial|pirate|brigand|circus|fair|joust|librar/.test(m.type)) out.push({ t: m.t, kind: "marker", name: m.name, type: m.type, region: this.regionName(m.cell) });
    return out;
  }
  rumour(c, r, rnd, g) {
    const U = AZ.U, T = AZ.T, w = this.w;
    if (!this.facts.length) return null;
    const scored = this.facts.map(f => ({ f, d: Math.hypot(f.t[0] - c, f.t[1] - r) * w.miles })).map(o => ({ ...o, wt: 1 / (1 + o.d / 400) }));
    let roll = rnd() * scored.reduce((a, o) => a + o.wt, 0), pick = scored[0];
    for (const o of scored) if ((roll -= o.wt) <= 0) { pick = o; break; }
    const { f, d } = pick, dir = U.compass(f.t[0] - c, f.t[1] - r), near = d < 300, mid = d < 1500;
    const where = near ? `${U.num(Math.round(d / 10) * 10)} miles ${dir}` : mid ? `somewhere ${dir}, ${U.num(Math.round(d / 250) * 250)} miles off or so` : `far to the ${dir}, past where anyone here has been`;
    let s;
    if (f.kind === "war") s = near || mid ? `${f.a} has been at war with ${f.d} since ${f.start}, ${where}.` : `There is a war ${where}; the names change with each sailor who tells it.`;
    else if (f.kind === "zone") {
      const what = { Disease: "a sickness", Invasion: "an invading army", Rebels: "rebels in arms", Proselytism: "missionaries working the villages", Crusade: "a crusade", Disaster: "a dearth, and hungry people", Eruption: "a mountain breathing fire", Avalanche: "an avalanche that buried a valley", Fault: "the ground splitting open", Flood: "a great flood", Tsunami: "a wave that came out of the sea" }[f.type] || `trouble (${f.type})`;
      s = near ? `${U.cap(what)} in ${f.region}: they call it the ${f.name}, ${where}.` : mid ? `${U.cap(what)}, ${where}, in ${f.region}.` : `${U.cap(what)}, ${where}.`;
    } else {
      const thing = f.type.replace(/s$/, "").replace(/-/g, " ");
      s = near ? `${f.name}: ${where}. Ask about it if you go that way.` : mid ? `People speak of ${U.article(thing)} ${where}, in ${f.region}.` : `There are stories of ${U.article(thing)} ${where}. Bigger with every telling.`;
    }
    if (g && this.rumourLead) this.rumourLead(g, f, d);
    return `${s} ${T("mixed")}`;
  }
};
