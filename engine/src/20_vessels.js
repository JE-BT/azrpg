// =============================================================================================
// 20_vessels.js · Alpha 3: vessels and control.
//   Every vessel has a class (what she is), a realisation (what the culture of her port calls her
//   and how she looks) and a control (who decides aboard). Each is a table, and the rules read
//   the tables: what she holds and where she can go; her course and how she meets a storm; who
//   feeds whom, when you sleep, and what the hands do while you are away.
//   Harbours have a shipwright; towns have a warehouse and stables; owners and companies can bring
//   hands ashore as porters; pack animals, carts and wagons carry more on land.
// =============================================================================================
(() => {
  const G = AZ.Game.prototype, U = AZ.U, T = AZ.T;

  // ------------------------------------------------------------------ classes
  Object.assign(AZ.NAV, { skiff: 10, galley: 200, smallship: 200, greatship: 1e9 });
  AZ.WATER_NAV = ["skiff", "boat", "galley", "smallship", "ship", "greatship"];
  // storm: [damage, sinking] near land (two tiles or less) and offshore; buy and hire are multiples of
  // the town's daily boat hire; repair: [multiple of the town's repair price, hours]; port: 0 any
  // landing, 1 a port, 2 a port of 5,000 people or more, 3 of 20,000 or more
  AZ.VCLASS = {
    skiff: { name: "skiff", nav: "skiff", hands: [0, 2], crew: 0, hold: { food: 20, goods: 4 }, speed: 4, hpd: 8, watch: 99, beach: true, prefers: "coast", storm: { near: [0.08, 0.01], off: [0.6, 0.3] }, buy: 15, hire: 0.3, repair: [0.2, 4], port: 0, oars: true, sheet: "rivers from 10 m³/s; beaches anywhere; carried past rapids and over land" },
    boat: { name: "boat", nav: "boat", hands: [2, 4], crew: 3, hold: { food: 220, goods: 30 }, speed: 6, hpd: 12, watch: 6, beach: true, prefers: "coast", storm: { near: [0.06, 0.01], off: [0.4, 0.2] }, buy: 150, hire: 1, repair: [1, 12], port: 0, sheet: "rivers from 40 m³/s; beaches; keeps within sight of land" },
    galley: { name: "galley", nav: "galley", hands: [20, 60], crew: 20, hold: { food: 300, goods: 40 }, speed: 6, hpd: 12, watch: 99, beach: true, prefers: "coast", storm: { near: [0.08, 0.02], off: [0.5, 0.3] }, buy: 500, hire: 3, repair: [2, 24], port: 1, oars: true, sheet: "rivers from 200 m³/s; beaches; rowed in any wind; swamped offshore" },
    smallship: { name: "small ship", nav: "smallship", hands: [6, 12], crew: 6, hold: { food: 600, goods: 80 }, speed: 7, hpd: 12, watch: 10, beach: false, prefers: "mixed", storm: { near: [0.1, 0.02], off: [0.2, 0.06] }, buy: 600, hire: 3, repair: [2.5, 24], port: 1, sheet: "rivers from 200 m³/s; anchorages and harbours; coasts and short crossings" },
    ship: { name: "ship", nav: "ship", hands: [15, 40], crew: 15, hold: { food: 1500, goods: 200 }, speed: 10, hpd: 24, watch: 15, beach: false, prefers: "open", storm: { near: [0.15, 0.04], off: [0.08, 0.02] }, buy: 2000, hire: 8, repair: [5, 48], port: 2, sheet: "rivers from 400 m³/s; harbours; open sea, where a lee shore is the danger" },
    greatship: { name: "great ship", nav: "greatship", hands: [40, 120], crew: 40, hold: { food: 4000, goods: 500 }, speed: 9, hpd: 24, watch: 40, beach: false, prefers: "open", storm: { near: [0.12, 0.03], off: [0.05, 0.01] }, buy: 6000, hire: 20, repair: [10, 96], port: 3, sheet: "the sea only; the harbours of large ports; ocean lanes" },
    light: { name: "light craft", nav: "air", hands: [1, 2], crew: 1, hold: { food: 10, goods: 2 }, speed: 60, hpd: 6, watch: 99, beach: true, prefers: "none", storm: { near: [0.1, 0.02], off: [0.1, 0.02] }, buy: 0, hire: 0, repair: [3, 12], port: 0, sheet: "flies over land and sea in fair weather; sets down at night" },
    airship: { name: "airship", nav: "air", hands: [4, 20], crew: 4, hold: { food: 400, goods: 40 }, speed: 30, hpd: 24, watch: 4, beach: false, prefers: "none", storm: { near: [0.05, 0.01], off: [0.05, 0.01] }, buy: 0, hire: 0, repair: [6, 24], port: 0, sheet: "flies steady lines between towns and moors at their masts" },
  };
  // the map's transports, and any vessel named in a save, take a class
  AZ.classOf = (kind, cls) => {
    const k = kind || "";
    if (cls === "air" || AZ.vesselClass(k) === "air") return /dirigible|airship|zeppelin|balloon/i.test(k) ? "airship" : "light";
    if (/row|skiff|canoe|kayak|punt|raft|dinghy|faering|sampan|outrigger|hawari/i.test(k)) return "skiff";
    if (/galley|longship|trireme|bireme|dromon|war canoe|ghurab/i.test(k)) return "galley";
    if (/modern ship|liner|galleon|great|carrack|treasure ship|barque|hulk|ganja/i.test(k)) return "greatship";
    if (/sloop|cutter|cog|dhow|sambuk|byrding|proa|small ship|caravel|\bjunk$/i.test(k)) return "smallship";
    if (cls === "ship" || /ship|steam|brig|frigate|baghlah/i.test(k)) return "ship";
    return "boat";
  };

  // ------------------------------------------------------------------ realisation: names and looks by culture
  AZ.HULLS = {
    norse: { skiff: "faering", boat: "knarr", smallship: "byrding", ship: "cog", greatship: "hulk", galley: "longship" },
    west: { skiff: "rowboat", boat: "sailing boat", smallship: "sloop", ship: "brig", greatship: "barque", galley: "galley" },
    arab: { skiff: "hawari", boat: "felucca", smallship: "sambuk", ship: "baghlah", greatship: "ganja", galley: "ghurab" },
    east: { skiff: "sampan", boat: "fishing junk", smallship: "junk", ship: "great junk", greatship: "treasure ship", galley: "oared junk" },
    isles: { skiff: "outrigger", boat: "double canoe", smallship: "proa", ship: "voyaging canoe", greatship: "great voyaging canoe", galley: "war canoe" },
  };
  AZ.hullFamily = nb => {
    const n = nb || "";
    if (/elv|elf|dwar|goblin|orc|draconic|dragon|arachn|serpent|giant|dark|demon|fae/i.test(n)) return "invented";
    if (/german|nordic|norse|finn|ruthen|hungar|swed|dan|icelan/i.test(n)) return "norse";
    if (/arab|turk|berber|iran|persia|mesopot|levant|swahili|egypt/i.test(n)) return "arab";
    if (/chin|korea|japan|canton|vietnam|mongol|thai/i.test(n)) return "east";
    if (/hawai|polynes|maori|samoa|tonga|fiji|malay/i.test(n)) return "isles";
    return "west";
  };
  // what a port's culture builds: Naval ports everything; Generic ports all but galleys; River and Lake
  // ports skiffs, boats and galleys; Highland, Hunting and Nomadic towns only skiffs
  AZ.YARDS = { Naval: ["skiff", "boat", "galley", "smallship", "ship", "greatship"], Generic: ["skiff", "boat", "smallship", "ship", "greatship"], River: ["skiff", "boat", "galley"], Lake: ["skiff", "boat", "galley"], Highland: ["skiff"], Hunting: ["skiff"], Nomadic: ["skiff"] };
  G.realise = function (vc, b) {
    const w = this.w, C = AZ.VCLASS[vc], cul = w.P.cultures[b ? b.culture : 0] || {}, nb = w.P.namebases?.[cul.base]?.name || "";
    if (C.nav === "air") return { kind: U.cap(C.name), family: "air" };
    const fam = AZ.hullFamily(nb);
    if (fam !== "invented") return { kind: U.cap(AZ.HULLS[fam][vc]), family: fam };
    let k = 0;
    const word = (w.names.get(cul.base, () => U.rnd2(cul.base || 0, AZ.WATER_NAV.indexOf(vc) + 7, ++k)) || "").split(/[\s'-]/)[0].toLowerCase().slice(0, 9);
    return { kind: `${U.cap(word || "hull")} ${C.name}`, family: "invented" };
  };
  G.yardClasses = function (b) {
    const w = this.w, type = w.P.cultures[b.culture]?.type || "Generic", pop = b.population || 0;
    return (AZ.YARDS[type] || AZ.YARDS.Generic).filter(vc => {
      const C = AZ.VCLASS[vc];
      if (C.port >= 1 && !b.port) return false;
      if ((C.port >= 2 && pop < 5) || (C.port >= 3 && pop < 20)) return false;
      return !!w.harbour(b, C.nav);
    });
  };
  // the map decides speed and hours per day where it has a transport of that class
  G.transportFor = function (vc) {
    const C = AZ.VCLASS[vc], t = (this.w.W.transports || []).find(x => x.domain !== "land" && AZ.classOf(x.name) === vc);
    return { speed: (t && t.speed) || C.speed, hpd: (t && (t.hoursPerDay || t.hpd)) || C.hpd };
  };
  G.newVessel = function (vc, mode, b, crew) {
    const w = this.w, C = AZ.VCLASS[vc], P = AZ.Prices, h = w.harbour(b, C.nav).t, tr = this.transportFor(vc), loc = this.realise(vc, b);
    return { mode, vc, cls: C.nav, kind: loc.kind, speed: tr.speed, hpd: tr.hpd, crew, morale: 70, c: h[0], r: h[1], wage: P.wage(w, b), hire: mode === "hired" ? U.rn(this.vesselPrice(vc, b) / 365, 2) : 0, home: b.i, colour: w.P.cultures[b.culture]?.color || null, hold: { food: 0, goods: {} } };
  };
  // vessels from saves and from the plan's own legs take a class where they lie
  G.classify = function (v) {
    const w = this.w;
    v.vc = AZ.classOf(v.kind, v.cls);
    const C = AZ.VCLASS[v.vc];
    if (C.nav !== "air" && v.cls !== C.nav) { if (w.navigable(v.c, v.r, C.nav)) v.cls = C.nav; else v.vc = v.cls === "ship" ? "ship" : "boat"; }
    const home = w.P.burgs[v.home] || w.near(v.c, v.r, 6).find(n => n.kind === "burg")?.o;
    if (v.colour === undefined) v.colour = (home && w.P.cultures[home.culture]?.color) || null;
  };

  // ------------------------------------------------------------------ control: who decides aboard
  // rules are read by the code; text is what the journal shows, column by column
  AZ.CONTROL_COLS = [["steers", "Steers"], ["f", "F"], ["stops", "Stops called by"], ["sleep", "Sleep"], ["morale", "Morale window"], ["food", "Food"], ["money", "Money"], ["storms", "Storms decided by"], ["stepOff", "Stepping off"], ["away", "While you are away"], ["ends", "How it ends"]];
  AZ.CONTROL = {
    passenger: { label: "Passenger", rules: { f: "time", sleep: "nightly", food: "own", money: "fare", away: "sails", patience: 0, porters: false, dismiss: false },
      text: { steers: "the captain", f: "days pass faster; P holds the ship", stops: "the captain's itinerary: ports of call with fixed stays", sleep: "each night aboard, without asking", morale: "never: the crew is the captain's", food: "your own stores", money: "the fare, at booking", storms: "the captain: he heaves to, and the hours are lost", stepOff: "in port only, with a passenger's baggage (60 rations, 10 units)", away: "she sails on time, with or without you", ends: "at her last port of call, or by missing a sailing" } },
    crew: { label: "Signed crew", rules: { f: "time", sleep: "offwatch", food: "ship", money: "wages-end", away: "desert", patience: 0, porters: false, dismiss: false },
      text: { steers: "the captain", f: "days pass faster", stops: "the captain", sleep: "in your off-watch, eight hours in each day", morale: "your standing with the mate", food: "the ship's stores", money: "wages, paid off at the last port", storms: "the captain; your watch works through it", stepOff: "in port, on leave, with your sea chest (60 and 10)", away: "she sails on time; missing her before the last port is desertion", ends: "paid off at the last port" } },
    hirer: { label: "Hirer", rules: { f: "course", sleep: "stops", food: "hands", money: "hire", away: "return", patience: 1, porters: false, dismiss: false },
      text: { steers: "you", f: "the plan's course, or your waypoint", stops: "the hands, by custom: at dusk, or never if they sail round the clock", sleep: "at the hands' stops, or below in your off-watch", morale: "yes: calls, ultimatums, three strikes", food: "you feed every hand", money: "hire and wages each dawn, three days in advance", storms: "you; the hands' morale answers", stepOff: "anywhere she can reach; what you cannot carry stays in the hold, and you choose the hands' food", away: "the hands eat from the hold and wait while food and patience last, keeping the run to port; then they take her back to her owner", ends: "pay off and hand her back in any harbour" } },
    owner: { label: "Owner", rules: { f: "course", sleep: "stops", food: "hands", money: "wages", away: "quit", patience: 1, porters: true, dismiss: true },
      text: { steers: "you", f: "the plan's course, or your waypoint", stops: "the hands, by custom; with no hands, your own tiredness", sleep: "as the hirer; single-handed, only at anchor", morale: "yes, and you may dismiss hands", food: "you feed every hand", money: "wages each dawn; repairs; she can be sold", storms: "you; the hands' morale answers", stepOff: "as the hirer; hands may come ashore as porters", away: "as the hirer; when they go, they bring her into port, take their wages and quit; she stays yours", ends: "sell her, or lose her to wreck or seizure" } },
    company: { label: "Company", rules: { f: "course", sleep: "watches", food: "outside-party", money: "none", away: "wait", patience: 1.5, porters: true, dismiss: false },
      text: { steers: "the leader (you, if you lead)", f: "the plan's course", stops: "the journey's decision rule; until Alpha 5, the plan's stops and the hands' custom", sleep: "below, in watches", morale: "the company's morale", food: "you feed the hands outside the party; the party carries its own", money: "no fare and no wages", storms: "the leader, after the company's say", stepOff: "as the hirer; hands may come ashore as porters", away: "the hands wait in the nearest port, however long, once the run is fed", ends: "at the journey's end, or when the company breaks up" } },
    command: { label: "Under command", rules: { f: "follow", sleep: "watches", food: "issued", money: "pay", away: "absent", patience: 0, porters: false, dismiss: false },
      text: { steers: "the commander", f: "follow the flagship or the unit's march", stops: "the commander's orders", sleep: "by the watch bill", morale: "the unit's morale, shown with the orders", food: "issued from the unit's stores", money: "pay each month, while the treasury holds", storms: "the commander", stepOff: "only with leave; otherwise you are absent", away: "absent for a day, then a deserter", ends: "discharge at peace or at the campaign's end; capture; desertion" } },
  };
  AZ.MODE_ROW = { hired: "hirer", owned: "owner", company: "company", command: "command" };
  G.ctlKey = function () { const s = this.s; if (this.riding()) return s.voyage.role === "crew" ? "crew" : "passenger"; return s.vessel ? AZ.MODE_ROW[s.vessel.mode] || "owner" : null; };
  G.ctlRow = function (v) { return AZ.CONTROL[v ? AZ.MODE_ROW[v.mode] || "owner" : this.ctlKey() || "owner"]; };

  // the readers: food, patience, watches, stops, what the hands do while you are away
  G.crewFed = function (v = this.s.vessel) {
    if (!v || !v.crew) return 0;
    const R = this.ctlRow(v).rules, n = R.food === "outside-party" ? Math.max(0, v.crew - (this.s.party || []).length) : R.food === "hands" ? v.crew : 0;
    return Math.max(0, n - (v.porters || 0));
  };
  G.eaters = function () { const v = this.s.vessel; return 1 + (this.withVessel() ? this.crewFed() : (v && v.porters) || 0); };
  G.patienceOf = function (v) { const m = v.morale ?? 70, d = m >= 70 ? 21 : m >= 40 ? 10 : 4; return Math.round(d * (this.ctlRow(v).rules.patience || 1)); };
  G.keepsWatches = function (v) { if ((v.hpd || 0) < 24) return false; return this.ctlRow(v).rules.sleep === "watches" || v.crew >= (AZ.VCLASS[v.vc] || AZ.VCLASS.boat).watch; };
  G.callsStops = function (v) { return !this.keepsWatches(v); };
  G.crewSailsOff = async function (v, run, why) {
    const s = this.s, kind = U.esc(v.kind.toLowerCase()), hold = this.holdOf(v), away = this.ctlRow(v).rules.away;
    const port = run ? run.port : this.vesselInPort(v);
    const when = why === "food" ? "while they still had food enough for the run" : why === "unpaid" ? "unpaid and out of patience" : why === "refused" ? "as soon as you were ashore" : `after ${v.waited} days of waiting`;
    if (run) { hold.food = Math.max(0, hold.food - run.food); v.c = run.h[0]; v.r = run.h[1]; }
    v.anchored = true; v.waited = 0; v.patience = null;
    let text;
    if (away === "return") { s.vessel = null; text = `the hands of your hired ${kind} sailed her back to her owner ${when}. She is gone, with whatever was aboard`; }
    else if (away === "quit") { const p = v.porters || 0; v.crew = 0; v.porters = 0; v.owed = 0; v.strikes = 0; v.morale = 70; text = `${port ? `the hands of your ${kind} brought her into ${U.esc(port.name)} ${when}, took their wages and left` : `the hands of your ${kind} walked off ${when}`}${p ? `; your porters went with them` : ""}. She waits ${port ? "there" : "where you left her"} without a crew`; }
    else text = port ? `the company's hands took the ${kind} into ${U.esc(port.name)} ${when}. They wait for you there` : `the company's hands are still aboard the ${kind}, hungry and angry`;
    this.log(`${U.cap(text)}.`, "hook");
    this.ui.toast(`Word reaches you: ${text} ${T("mixed")}.`);
    this.dirty = true;
  };
  G.vesselHere = function (b) {
    const v = this.s.vessel, w = this.w;
    if (!v) return false;
    if (v.cls === "air") return v.c === b.t[0] && v.r === b.t[1];
    return [v.cls, ...AZ.WATER_NAV].some(k => { const h = w.harbour(b, k); return h && h.t[0] === v.c && h.t[1] === v.r; });
  };

  // ------------------------------------------------------------------ what you carry
  AZ.LANDV = {
    pack: { name: "pack animal", hold: { food: 40, goods: 8 }, eats: 1, road: 1, trail: 1, off: 1.1, buy: 30, pop: 0 },
    cart: { name: "cart", hold: { food: 120, goods: 20 }, eats: 2, road: 1, trail: 1.3, off: 2.5, buy: 80, pop: 2 },
    wagon: { name: "wagon", hold: { food: 300, goods: 50 }, eats: 4, road: 1, trail: 1.6, off: 4, buy: 200, pop: 10 },
  };
  G.capacity = function () {
    const s = this.s, ride = this.riding(), v = s.vessel;
    if (!ride && this.withVessel()) return { ...(AZ.VCLASS[v.vc] || AZ.VCLASS.boat).hold };
    if (ride || s.voyage) return { ...AZ.CARRY.passage };
    return this.footCapacity();
  };
  G.footCapacity = function () {
    const s = this.s, p = (s.vessel && s.vessel.porters) || 0, B = s.beast ? AZ.LANDV[s.beast.vc].hold : { food: 0, goods: 0 };
    return { food: AZ.CARRY.foot.food + 10 * p + B.food, goods: AZ.CARRY.foot.goods + 2 * p + B.goods };
  };

  // ------------------------------------------------------------------ the warehouse: storage in towns
  // a deposit of a twentieth of the value now, a hundredth a week due on collection; anything left a
  // year is sold to cover the fees
  G.valueOf = function (b, food, goods) {
    const w = this.w;
    let v = (food || 0) * AZ.Prices.ration(w, b);
    for (const [g, n] of Object.entries(goods || {})) { const q = this.goodQuote ? this.goodQuote(b, g) : null; v += n * (q ? q.sell : (this.s.basis || {})[g] || AZ.Prices.goodPrice(w, b, g) || 1); }
    return v;
  };
  G.storeTerms = function (value) { return { deposit: U.rn(Math.max(0.1, value * 0.05), 2), weekly: U.rn(Math.max(0.02, value * 0.01), 2) }; };
  G.storeLot = function (b, lot) { const S = (this.s.stores = this.s.stores || {}); (S[b.i] = S[b.i] || { lots: [] }).lots.push(lot); };
  G.storeDue = function (b) {
    const S = this.s.stores && this.s.stores[b.i];
    if (!S) return 0;
    return U.rn(S.lots.reduce((a, l) => a + (l.owed || 0) + l.weekly * Math.max(1, Math.ceil((this.s.clock - l.since) / 168)), 0), 2);
  };
  G.storeDesc = function (lots) {
    let food = 0; const goods = {}, beasts = [];
    for (const l of lots) { food += l.food || 0; for (const [g, n] of Object.entries(l.goods || {})) goods[g] = (goods[g] || 0) + n; if (l.beast) beasts.push(l.beast.kind); }
    return [food ? `${food} rations` : "", ...Object.entries(goods).filter(([, n]) => n > 0).map(([g, n]) => `${n} ${this.know.good(g).toLowerCase()}`), ...beasts.map(k => `your ${k.toLowerCase()}`)].filter(Boolean).join(", ");
  };
  G.collectStore = function (b) {
    const s = this.s, S = s.stores && s.stores[b.i];
    if (!S) return;
    const due = this.storeDue(b);
    s.purse = U.rn(s.purse - due, 2);
    s.goods = s.goods || {};
    for (const l of S.lots) {
      s.sup.food += l.food || 0;
      for (const [g, n] of Object.entries(l.goods || {})) s.goods[g] = (s.goods[g] || 0) + n;
      if (l.beast) s.beast = { ...l.beast, hungry: 0 };
    }
    this.log(`Collected from the ${U.esc(b.name)} warehouse: ${U.esc(this.storeDesc(S.lots))} (🟡 ${due}).`);
    delete s.stores[b.i];
  };
  G.expireStores = function () {
    const s = this.s, w = this.w;
    for (const [bi, S] of Object.entries(s.stores || {})) {
      const old = S.lots.filter(l => s.clock - l.since > 52 * 168);
      if (!old.length) continue;
      S.lots = S.lots.filter(l => !old.includes(l));
      this.log(`The ${U.esc(w.P.burgs[bi]?.name || "")} warehouse sold what you left there a year ago to cover its fees: ${U.esc(this.storeDesc(old))}.`, "hook");
      if (!S.lots.length) delete s.stores[bi];
    }
  };
  // more than you can carry, in a town: the surplus is set aside at once; then you store it or sell it
  G.surplusChoice = function (b, cap) {
    const s = this.s, w = this.w, food = Math.max(0, s.sup.food - cap.food), goods = {};
    s.sup.food -= food;
    let extra = this.goodsCount() - cap.goods;
    for (const [g, n] of Object.entries(s.goods || {}).filter(([, k]) => k > 0).sort((a, c) => ((s.basis || {})[a[0]] || 0) - ((s.basis || {})[c[0]] || 0))) {
      if (extra <= 0) break;
      const k = Math.min(n, extra); s.goods[g] -= k; goods[g] = k; extra -= k;
    }
    let sale = food * AZ.Prices.ration(w, b) * 0.5;
    for (const [g, n] of Object.entries(goods)) { const q = this.goodQuote ? this.goodQuote(b, g) : null; sale += q ? q.sell * n : 0; }
    sale = U.rn(sale, 2);
    const desc = this.storeDesc([{ food, goods }]), terms = this.storeTerms(this.valueOf(b, food, goods));
    const run = async () => {
      const k = await this.ui.choose(`<b>More than you can carry.</b> You can take ${cap.food} rations and ${cap.goods} units of goods. Set aside: ${U.esc(desc)} ${T("mixed")}.`,
        [{ label: `Sell it at the market for 🟡 ${sale}` }, { label: `Leave it in the ${U.esc(b.name)} warehouse: 🟡 ${terms.deposit} now, then 🟡 ${terms.weekly} a week, due when you collect`, disabled: s.purse < terms.deposit }], { cancel: 0 });
      if (k === 1) { s.purse = U.rn(s.purse - terms.deposit, 2); this.storeLot(b, { food, goods, since: s.clock, weekly: terms.weekly }); this.log(`Left in the ${U.esc(b.name)} warehouse: ${U.esc(desc)}.`); this.ui.toast(`Stored in ${U.esc(b.name)}: ${U.esc(desc)}.`); }
      else { s.purse = U.rn(s.purse + sale, 2); this.log(`Sold what you could not carry in ${U.esc(b.name)}: ${U.esc(desc)} for 🟡 ${sale}.`); }
      this.dirty = true;
    };
    run();
  };
  G.warehouse = async function (b) {
    const s = this.s, w = this.w;
    for (;;) {
      this.expireStores();
      const S = s.stores && s.stores[b.i], due = this.storeDue(b), opts = [];
      const allGoods = Object.fromEntries(Object.entries(s.goods || {}).filter(([, n]) => n > 0)), nGoods = this.goodsCount();
      const spare = Math.max(0, s.sup.food - 7 * this.eaters());
      if (nGoods) { const t = this.storeTerms(this.valueOf(b, 0, allGoods)); opts.push({ label: `Store all your goods (${nGoods} units): 🟡 ${t.deposit} now, 🟡 ${t.weekly} a week`, act: "goods", t, disabled: s.purse < t.deposit }); }
      if (spare) { const t = this.storeTerms(this.valueOf(b, spare, {})); opts.push({ label: `Store your food beyond a week's (${spare} rations): 🟡 ${t.deposit} now, 🟡 ${t.weekly} a week`, act: "food", t, spare, disabled: s.purse < t.deposit }); }
      if (S) opts.push({ label: `Collect everything stored here (${U.esc(this.storeDesc(S.lots))}): 🟡 ${due} due`, act: "collect", disabled: s.purse < due });
      if (!opts.length) opts.push({ label: "You have nothing to store, and nothing stored here", disabled: true, act: "none" });
      opts.push({ label: "Back", act: "back" });
      const k = await this.ui.choose(`<b>${U.esc(b.name)}: the warehouse</b> · 🟡 ${U.rn(s.purse, 2)}<br><span class="dim">A twentieth of the value as a deposit, a hundredth a week after that, due when you collect. Anything left a year is sold to cover the fees ${T("mixed")}.</span>`, opts, { cancel: opts.length - 1 });
      const o = opts[k];
      if (o.act === "back" || o.act === "none") return;
      if (o.act === "goods") { s.purse = U.rn(s.purse - o.t.deposit, 2); this.storeLot(b, { food: 0, goods: allGoods, since: s.clock, weekly: o.t.weekly }); for (const g of Object.keys(allGoods)) s.goods[g] = 0; this.log(`Stored your goods in ${U.esc(b.name)}.`); continue; }
      if (o.act === "food") { s.purse = U.rn(s.purse - o.t.deposit, 2); this.storeLot(b, { food: o.spare, goods: {}, since: s.clock, weekly: o.t.weekly }); s.sup.food -= o.spare; this.log(`Stored ${o.spare} rations in ${U.esc(b.name)}.`); continue; }
      if (o.act === "collect") { this.collectStore(b); this.afterStep(); return; }
    }
  };

  // ------------------------------------------------------------------ the stables: pack animals, carts and wagons
  G.realiseBeast = function (vc, b) {
    const w = this.w, biome = w.P.biomes[w.C.biome[b.cell]]?.name || "", type = w.P.cultures[b.culture]?.type || "";
    if (vc === "pack") return /desert/i.test(biome) ? "Camel" : /tundra|taiga|glacier/i.test(biome) ? "Reindeer" : /Nomadic/.test(type) ? "Packhorse" : "Mule";
    if (vc === "cart") return /tundra|glacier/i.test(biome) ? "Sledge" : "Ox cart";
    return /Nomadic/.test(type) ? "Tilt wagon" : "Wagon";
  };
  G.beastPrice = function (vc, b) { return U.rn(AZ.Prices.wage(this.w, b) * AZ.LANDV[vc].buy, 2); };
  G.stables = async function (b) {
    const s = this.s;
    for (;;) {
      const opts = [];
      if (!s.beast) for (const vc of Object.keys(AZ.LANDV)) {
        const L = AZ.LANDV[vc];
        if ((b.population || 0) < L.pop) continue;
        const kind = this.realiseBeast(vc, b), price = this.beastPrice(vc, b);
        opts.push({ label: `Buy a ${kind.toLowerCase()} (${L.name}): 🟡 ${price}; carries ${L.hold.food} rations and ${L.hold.goods} units more; eats ${L.eats} a day where it cannot graze`, act: "buy", vc, kind, price, disabled: s.purse < price });
      }
      if (s.beast) { const sell = U.rn(this.beastPrice(s.beast.vc, b) * 0.6, 2); opts.push({ label: `Sell your ${U.esc(s.beast.kind.toLowerCase())}: 🟡 ${sell}`, act: "sell", sell }); }
      opts.push({ label: "Back", act: "back" });
      const k = await this.ui.choose(`<b>${U.esc(b.name)}: stables and wainwright</b> · 🟡 ${U.rn(s.purse, 2)}<br><span class="dim">Animals graze on open ground and eat from your food elsewhere. Carts keep to roads and trails; wagons keep to roads. None of them can go aboard: they wait in a town's stables, at the warehouse's rates ${T("mixed")}.</span>`, opts, { cancel: opts.length - 1 });
      const o = opts[k];
      if (o.act === "back") return;
      if (o.act === "buy") { s.purse = U.rn(s.purse - o.price, 2); s.beast = { vc: o.vc, kind: o.kind, hungry: 0, home: b.i }; this.log(`Bought a ${U.esc(o.kind.toLowerCase())} in ${U.esc(b.name)}.`); this.dirty = true; continue; }
      if (o.act === "sell") { s.purse = U.rn(s.purse + o.sell, 2); this.log(`Sold your ${U.esc(s.beast.kind.toLowerCase())} in ${U.esc(b.name)}.`); s.beast = null; this.enforceCapacity(); return; }
    }
  };
  // animals cannot go aboard: in a town they are stabled; on a beach they are left behind
  G.stableBeast = function () {
    const s = this.s, w = this.w, i = w.idx(s.c, s.r);
    if (!s.beast || !(s.aboard || this.riding())) return;
    const b = w.burgAt.get(i) || this.harbourAt.get(i) || (s.voyage && w.P.burgs[s.voyage.portBurg]);
    const kind = s.beast.kind.toLowerCase();
    if (b) {
      const t = this.storeTerms(this.beastPrice(s.beast.vc, b) * 0.6);
      this.storeLot(b, { food: 0, goods: {}, beast: { ...s.beast }, since: s.clock, weekly: t.weekly, owed: t.deposit });
      this.ui.toast(`Your ${U.esc(kind)} waits in the ${U.esc(b.name)} stables: 🟡 ${t.deposit} and 🟡 ${t.weekly} a week, due when you collect ${T("mixed")}.`);
      this.log(`Stabled your ${U.esc(kind)} in ${U.esc(b.name)}.`);
    } else { this.ui.toast(`Your ${U.esc(kind)} cannot come aboard, and is left behind.`); this.log(`Left your ${U.esc(kind)} behind on the shore.`, "hook"); }
    s.beast = null;
  };
  G.feedBeast = function () {
    const s = this.s, w = this.w, B = s.beast;
    if (!B || s.carefree) return;
    const biome = w.P.biomes[w.C.biome[w.cell(s.c, s.r)]]?.name || "";
    if (/grass|savanna|steppe|shrub|tundra|meadow/i.test(biome)) { B.hungry = 0; return; }
    const need = AZ.LANDV[B.vc].eats;
    if (s.sup.food >= need) { s.sup.food -= need; B.hungry = 0; return; }
    B.hungry = (B.hungry || 0) + 1;
    if (B.hungry >= 4) { this.ui.toast(`Unfed for four days, your ${U.esc(B.kind.toLowerCase())} is gone in the night.`); this.log(`Lost your ${U.esc(B.kind.toLowerCase())}: four days without fodder.`, "hook"); s.beast = null; }
    else this.ui.toast(`Your ${U.esc(B.kind.toLowerCase())} goes hungry: there is no grazing here and no food to spare.`);
  };

  // ------------------------------------------------------------------ the shipwright
  G.vesselPrice = function (vc, b) { return U.rn(AZ.Prices.hire(this.w, b) * (AZ.VCLASS[vc] || AZ.VCLASS.boat).buy, 2); }; // Alpha 4 prices her from her materials
  G.sellPrice = function (v, b) { const C = AZ.VCLASS[v.vc] || AZ.VCLASS.boat; return U.rn(AZ.Prices.hire(this.w, b) * C.buy * 0.6 * (v.damaged ? 0.5 : 1), 2); };
  G.repairCost = function (b) { const v = this.s.vessel, C = (v && AZ.VCLASS[v.vc]) || AZ.VCLASS.boat; return U.rn(AZ.Prices.repair(this.w, b) * C.repair[0], 2); };
  G.repairHours = function () { const v = this.s.vessel, C = (v && AZ.VCLASS[v.vc]) || AZ.VCLASS.boat; return C.repair[1]; };
  G.shipwright = async function (b) {
    const s = this.s, w = this.w, P = AZ.Prices;
    for (;;) {
      const opts = [], v = s.vessel, here = v && this.vesselHere(b), wage = P.wage(w, b), hire = P.hire(w, b), list = this.yardClasses(b);
      if (!v) for (const vc of list) {
        const C = AZ.VCLASS[vc], loc = this.realise(vc, b), tag = `${U.esc(loc.kind.toLowerCase())}${loc.kind.toLowerCase() === C.name ? "" : ` (${C.name})`}`;
        const price = this.vesselPrice(vc, b), day = U.rn(price / 365 + C.crew * wage, 2);
        if (C.crew) opts.push({ label: `Hire a ${tag} with ${C.crew} hands: 🟡 ${day} a day, three days now; she holds ${C.hold.food} rations`, act: "hire", vc, first: U.rn(3 * day, 2), disabled: s.purse < 3 * day });
        opts.push({ label: `Buy a ${tag}: 🟡 ${price}; ${C.hands[0] ? `she needs ${C.hands[0]} hands or more` : "you row her yourself"}`, act: "buy", vc, price, disabled: s.purse < price });
      }
      if (v && here) {
        const C = AZ.VCLASS[v.vc] || AZ.VCLASS.boat, R = this.ctlRow(v).rules, kind = U.esc(v.kind.toLowerCase());
        if (R.dismiss) {
          const n = Math.max(1, C.hands[0] - v.crew);
          if (v.crew < C.hands[1]) opts.push({ label: `Hire ${n} hand${n > 1 ? "s" : ""} (${v.crew} aboard, ${C.hands[0]}–${C.hands[1]} for her class): 🟡 ${U.rn(3 * n * wage, 2)} for three days`, act: "hands", n, cost: U.rn(3 * n * wage, 2), disabled: s.purse < 3 * n * wage });
          if (v.crew > 0) opts.push({ label: `Dismiss a hand (${v.crew} aboard)`, act: "dismiss" });
          opts.push({ label: `Sell your ${kind}: 🟡 ${this.sellPrice(v, b)}${v.damaged ? " (damaged)" : ""}`, act: "sell" });
        }
        if (v.damaged) opts.push({ label: `Repair your ${kind}: 🟡 ${this.repairCost(b)}, ${this.repairHours()} h`, act: "repair", disabled: s.purse < this.repairCost(b) });
        if (v.mode === "hired") opts.push({ label: `Pay off the hands and hand her back${v.owed ? ` (owed 🟡 ${v.owed})` : ""}`, act: "payoff" });
      }
      if (v && !here) opts.push({ label: `Your ${U.esc(v.kind.toLowerCase())} lies elsewhere; the yard can work on her only here`, disabled: true, act: "none" });
      if (!opts.length) opts.push({ label: "The yard has nothing for hire or sale this week", disabled: true, act: "none" });
      opts.push({ label: "Back", act: "back" });
      const type = w.P.cultures[b.culture]?.type || "Generic";
      const k = await this.ui.choose(`<b>${U.esc(b.name)}: the shipwright</b> · 🟡 ${U.rn(s.purse, 2)}<br><span class="dim">A ${U.esc(type)} people's yard: ${list.map(vc => AZ.VCLASS[vc].name).join(", ") || "nothing afloat"} ${T("mixed")}. Prices follow the town's market and tax ${T("mixed")}.</span>`, opts, { cancel: opts.length - 1 });
      const o = opts[k];
      if (o.act === "back" || o.act === "none") return;
      if (o.act === "hire" || o.act === "buy") {
        const C = AZ.VCLASS[o.vc], nv = this.newVessel(o.vc, o.act === "hire" ? "hired" : "owned", b, o.act === "hire" ? C.crew : 0);
        if (o.act === "hire") { s.purse = U.rn(s.purse - o.first, 2); nv.prepaid = 2; } else s.purse = U.rn(s.purse - o.price, 2);
        s.vessel = nv; this.doAct("book");
        this.log(`${o.act === "hire" ? "Hired" : "Bought"} a ${U.esc(nv.kind.toLowerCase())} (${C.name}) in ${U.esc(b.name)}.`, "hook");
        await this.ui.say([`The ${U.esc(nv.kind.toLowerCase())} is yours to command${nv.crew ? `, with ${nv.crew} hands` : ""} ${T("new")}. ${o.act === "hire" ? `You pay 🟡 ${o.first} now; hire and wages come due each dawn.` : nv.crew ? "" : C.oars ? "You row her yourself: rowing tires you faster than walking." : `She needs ${C.hands[0]} hands or more before she can sail far: hire them here.`}`,
          `A ${C.name}: ${C.sheet} ${T("mixed")}. She holds ${C.hold.food} rations and ${C.hold.goods} units of goods. Board from town (Space), then steer or press F.`]);
        continue;
      }
      if (o.act === "hands") { s.purse = U.rn(s.purse - o.cost, 2); v.crew += o.n; v.morale = v.morale ?? 70; v.wage = wage; this.ui.toast(`${o.n} hand${o.n > 1 ? "s" : ""} sign${o.n > 1 ? "" : "s"} on.`); continue; }
      if (o.act === "dismiss") { v.crew -= 1; this.ui.toast("A hand is paid off and goes ashore."); continue; }
      if (o.act === "repair") { const out = this.events.fx({ coin: -this.repairCost(b), time: this.repairHours(), cure: ["damaged"] }, `Repairs in ${U.esc(b.name)}.`); await this.ui.say(`The yard works on the hull.${out}`); continue; }
      if (o.act === "sell" || o.act === "payoff") {
        this.takeHold();
        if (o.act === "sell") { const p = this.sellPrice(v, b); s.purse = U.rn(s.purse + p, 2); this.log(`Sold your ${U.esc(v.kind.toLowerCase())} in ${U.esc(b.name)} for 🟡 ${p}.`); }
        else { s.purse = U.rn(Math.max(0, s.purse - (v.owed || 0)), 2); this.log(`Handed back the hired ${U.esc(v.kind.toLowerCase())} in ${U.esc(b.name)}.`); }
        s.vessel = null; s.aboard = false; s.c = b.t[0]; s.r = b.t[1]; this.anim = null; this.afterStep(); this.dirty = true;
        return;
      }
    }
  };
  G.townExtras = function (b) {
    const s = this.s, w = this.w, out = [], S = s.stores && s.stores[b.i];
    out.push({ label: `Warehouse: store goods and food${S ? ` (yours here: ${U.esc(this.storeDesc(S.lots))})` : ""}`, act: { extra: () => this.warehouse(b) } });
    out.push({ label: `Stables and wainwright: pack animals, carts and wagons${s.beast ? ` (your ${U.esc(s.beast.kind.toLowerCase())})` : ""}`, act: { extra: () => this.stables(b) } });
    if (!b.port && this.yardClasses(b).length) out.push({ label: "Boat landing: a shipwright for river craft", act: { extra: () => this.shipwright(b) } });
    return out;
  };

  // ------------------------------------------------------------------ porters: hands brought ashore
  const ashore0 = G.goAshore;
  G.goAshore = async function (t, confirmed) {
    const s = this.s, v = s.vessel;
    if (v && v.cls !== "air" && this.ctlRow(v).rules.porters && this.crewFed(v) > 0) {
      const n = this.crewFed(v), counts = [...new Set([0, 1, Math.min(2, n), n])];
      const k = await this.ui.choose(`<b>Bring hands ashore as porters?</b> Each carries 10 rations and 2 units more. Porters eat from your pack, and every day on land costs the crew 3 morale ${T("mixed")}. The rest stay aboard.`,
        [...counts.map(c => ({ label: c ? `Bring ${c} hand${c > 1 ? "s" : ""} as porter${c > 1 ? "s" : ""}` : "Go alone; all hands stay aboard" })), { label: "Stay aboard" }], { cancel: counts.length });
      if (k >= counts.length) return;
      v.porters = counts[k];
      if (this.crewFed(v) === 0 && !confirmed) { const r = await ashore0.call(this, t, true); return r; }
    }
    return ashore0.call(this, t, confirmed);
  };
  const take0 = G.takeHold;
  G.takeHold = function () {
    const v = this.s.vessel;
    if (v && v.porters) { this.ui.toast(`Your ${v.porters} porter${v.porters > 1 ? "s go" : " goes"} back aboard.`); v.porters = 0; }
    return take0.call(this);
  };

  // ------------------------------------------------------------------ courses by class
  AZ.World.prototype.landDist = function (c, r) {
    if (!this._dLand) {
      const cols = this.cols, N = cols * this.rows, d = new Uint8Array(N).fill(255), q = new Int32Array(N);
      let h = 0, t = 0;
      for (let i = 0; i < N; i++) if (this.isLand(i % cols, (i / cols) | 0)) { d[i] = 0; q[t++] = i; }
      while (h < t) {
        const i = q[h++], c0 = i % cols, r0 = (i / cols) | 0;
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = c0 + dc, e = r0 + dr; if (a < 0 || e < 0 || a >= cols || e >= this.rows) continue; const k = e * cols + a; if (d[k] === 255 && d[i] < 254) { d[k] = d[i] + 1; q[t++] = k; } }
      }
      this._dLand = d;
    }
    return this.inb(c, r) ? this._dLand[r * this.cols + c] : 255;
  };
  const wp0 = AZ.World.prototype.waterPath;
  AZ.World.prototype.waterPath = function (from, to, cls) {
    const C = AZ.VCLASS[cls], pref = C && C.prefers;
    if (!pref || pref === "none") return wp0.call(this, from, to, cls);
    const cost = pref === "coast" ? (c, r) => 1 + 0.25 * Math.min(8, this.landDist(c, r)) : pref === "open" ? (c, r) => (this.landDist(c, r) <= 1 ? 2.5 : 1) : (c, r) => 1 + 0.08 * Math.min(12, this.landDist(c, r));
    // a preferring course explores more of the sea; a long one that runs out of search falls back to the plain course
    const p = this.path(from, to, (c, r) => this.navigable(c, r, cls), { limit: 900000, greed: 1.8, cost });
    return p ? this.withMiles(p) : wp0.call(this, from, to, cls);
  };

  // ------------------------------------------------------------------ storms by class
  const storm1 = G.stormCall;
  G.stormCall = async function () {
    const s = this.s, w = this.w, v = s.vessel;
    if (this.riding() || !v || v.cls === "air") return storm1.call(this);
    const C = AZ.VCLASS[v.vc] || AZ.VCLASS.boat, R = this.ctlRow(v), kind = U.esc(v.kind.toLowerCase());
    const until = (Math.floor(s.clock / 12) + 1) * 12;
    if (w.isLand(s.c, s.r)) { s.clock = until; this.ui.toast(`A storm: you tie the ${kind} up under the bank until it passes.`); this.dirty = true; return; }
    const d = this.landDistance(s.c, s.r), mi = Math.round(d * w.miles), near = d <= 2;
    const [pDamage, pSink] = near ? C.storm.near : C.storm.off, off = C.storm.off;
    const opts = [];
    if (C.beach) opts.push({ label: near ? `Run for the shore and beach the ${kind} until it passes (safe)` : `Too far to beach the ${kind}`, disabled: !near, act: "beach" });
    else if (near) opts.push({ label: `Claw off the lee shore into open water (6 h more; then damage ${Math.round(off[0] * 100)}%)`, act: "claw" });
    opts.push({ label: `Heave to and ride it out (${AZ.Clock.span(until - s.clock)}; damage ${Math.round(pDamage * 100)}%, worse if already damaged)`, act: "heave" });
    opts.push({ label: `Run before it under sail (morale −10; damage ${Math.round(Math.min(0.9, pDamage + 0.25) * 100)}%)`, act: "run" });
    const k = await this.ui.choose(`<b>A storm is coming up.</b> ${d > 14 ? "Open water, no land in sight" : `Land about ${U.num(mi)} mi off`} ${T("mixed")}. A ${C.name} in a storm: ${near ? (C.beach ? "safe if beached" : "a lee shore is the danger") : C.beach ? "risky this far out" : "safest in open water"} ${T("mixed")}. Decided by ${U.esc(R.text.storms)}.${v.crew ? ` Morale ${Math.round(v.morale)}.` : ""}`, opts, { cancel: opts.findIndex(o => o.act === "heave") });
    const o = opts[k], roll = U.rnd2(s.c, s.r, Math.floor(s.clock) + 11), roll2 = U.rnd2(s.r, s.c, Math.floor(s.clock) + 13);
    if (o.act === "beach") { s.clock = until + 2; v.morale = Math.min(100, (v.morale ?? 70) + 2); this.ui.toast(`You beach the ${kind} and wait out the storm in the lee of the land.`); this.dirty = true; return; }
    let pd = pDamage, ps = pSink;
    if (o.act === "claw") { s.clock = until + 6; pd = off[0]; ps = off[1]; }
    else if (o.act === "run") { v.morale = (v.morale ?? 70) - 10; pd = Math.min(0.9, pDamage + 0.25); }
    else s.clock = until;
    if (roll < pd) {
      if ((v.damaged && roll2 < ps * 2) || roll2 < ps * 0.5) return this.shipwreck();
      this.events.fx({ cond: "damaged" }, "Storm damage."); this.ui.toast(`A spar carries away and the seams open. The ${kind} is damaged.`);
    } else this.ui.toast("The storm blows itself out.");
    this.dirty = true;
  };

  // ------------------------------------------------------------------ rowing, portage and the road
  const step0 = G.stepHours;
  G.stepHours = function (c, r, dc, dr) {
    const s = this.s, v = s.vessel, w = this.w;
    this._rowH = 0;
    if (s.aboard && v && v.vc === "skiff" && !this.riding()) {
      if (w.isLand(c, r) && !w.navigable(c, r, v.cls)) { s.aboard = false; const h = step0.call(this, c, r, dc, dr) * 2; s.aboard = true; this._rowH = h; return h; } // carrying her overland
      const h = step0.call(this, c, r, dc, dr); this._rowH = h; return h;
    }
    const h = step0.call(this, c, r, dc, dr);
    if (s.beast && !s.aboard && !this.riding()) {
      const L = AZ.LANDV[s.beast.vc], B = w.bits(c, r), town = w.burgAt.has(w.idx(c, r));
      return h * (town || B.road ? L.road : B.trail ? L.trail : L.off) * (s.beast.hungry ? 1.3 : 1);
    }
    return h;
  };
  const awake3 = G.awakeTick;
  G.awakeTick = function (h) { const extra = this._rowH ? Math.min(h, this._rowH) * 0.5 : 0; this._rowH = 0; return awake3.call(this, h + extra); }; // rowing and carrying tire you half as much again
  const pass0 = G.passable;
  G.passable = function (c, r) {
    const s = this.s, w = this.w, v = s.vessel;
    if (s.aboard && v && v.vc === "skiff" && !this.riding() && w.inb(c, r) && w.isLand(c, r) && !w.navigable(c, r, v.cls)) {
      s.aboard = false; const p = pass0.call(this, c, r); s.aboard = true;
      if (p.ok && !p.board) { if (!this._portage) this.ui.toast(`You carry the ${U.esc(v.kind.toLowerCase())} overland ${T("mixed")}.`); this._portage = true; return { ok: true }; }
      return p;
    }
    this._portage = false;
    const p = pass0.call(this, c, r);
    if (p.ok && p.board && s.beast && !w.burgAt.has(w.idx(s.c, s.r)) && !this.harbourAt.has(w.idx(s.c, s.r))) return { ok: false, why: `Your ${s.beast.kind.toLowerCase()} cannot come aboard here. Stable it in a town, or sell it.` };
    return p;
  };

  // ------------------------------------------------------------------ the days: animals, porters, storage; craft that land at night
  const nd0 = G.newDay;
  G.newDay = function (...a) {
    const r = nd0.apply(this, a), s = this.s, v = s.vessel;
    this.feedBeast();
    if (v && v.porters && !this.withVessel() && !s.carefree) v.morale = (v.morale ?? 70) - 3;
    return r;
  };
  const tick3 = G.tick;
  G.tick = function (...a) {
    const r = tick3.apply(this, a), s = this.s, v = s && s.vessel;
    if (v && v.cls === "air" && s.aboard && !this.riding() && (v.hpd || 24) < 24 && !this.ui.busy()) {
      const sun = AZ.Clock.sun(s.clock, this.lat()), key = Math.floor((s.clock + 12) / 24);
      if (sun.dl < 24 && (sun.hour >= sun.set + 0.75 || sun.hour < sun.rise) && v.nightKey !== key) {
        if (this.w.isLand(s.c, s.r)) {
          v.nightKey = key; s.clock = AZ.Clock.nextDawn(s.clock, this.lat()); this.slept();
          this.ui.toast(`The ${U.esc(v.kind.toLowerCase())} sets down for the night: it flies ${v.hpd} hours a day ${T("data")}. You sleep beside it.`);
          this.dirty = true;
        } else if (this._overWater !== key) { this._overWater = key; this.ui.toast(`Night falls over water: the ${U.esc(v.kind.toLowerCase())} flies on to land before it can set down.`); }
      }
    }
    return r;
  };

  // ------------------------------------------------------------------ saves, and keeping the records straight
  const bf0 = G.backfill;
  G.backfill = function () {
    bf0.call(this);
    const s = this.s;
    s.stores = s.stores || {};
    if (s.beast === undefined) s.beast = null;
    if (s.vessel && !s.vessel.vc) this.classify(s.vessel);
  };
  const enf0 = G.enforceCapacity;
  G.enforceCapacity = function () {
    const s = this.s;
    if (!s || this.ui.busy()) return;
    if (s.vessel && !s.vessel.vc) this.classify(s.vessel);
    if (s.beast && (s.aboard || this.riding())) this.stableBeast();
    return enf0.call(this);
  };

  // ------------------------------------------------------------------ how vessels are drawn
  G.vesselArt = function (v, dir) {
    const kind = { skiff: "skiff", galley: "galley", greatship: "great", boat: "boat" }[v && v.vc] || "ship";
    return this.ren.art.vessel(kind, dir, v && v.cls !== "air" ? v.colour || undefined : undefined);
  };
  const art0 = AZ.Art.prototype.vessel;
  AZ.Art.prototype.vessel = function (kind, dir, col) {
    if (kind !== "skiff" && kind !== "galley" && kind !== "great") return art0.call(this, kind, dir, col);
    const facing = dir === "left" ? "left" : "right";
    return this.get(`vessel:${kind}:${facing}:${col || ""}`, 16, 16, x => {
      const Px = AZ.Art.px, flip = facing === "left", R = (X, Y, W, H, c) => Px(x, flip ? 16 - X - W : X, Y, W, H, c);
      const hull = "rgb(110,72,42)", hullD = "rgb(70,46,28)", sail = col || "rgb(244,238,222)", oar = "rgb(150,110,70)", mast = "rgb(70,50,34)";
      if (kind === "skiff") { R(4, 11, 8, 1, hullD); R(5, 12, 6, 1, hull); R(2, 10, 3, 1, oar); R(11, 10, 3, 1, oar); R(7, 9, 2, 2, "rgb(90,70,60)"); }
      else if (kind === "galley") { R(0, 11, 16, 1, hullD); R(1, 12, 14, 2, hull); for (let i = 2; i < 14; i += 3) R(i, 14, 1, 2, oar); R(7, 3, 1, 8, mast); R(4, 4, 7, 5, sail); }
      else { R(0, 11, 16, 1, hullD); R(1, 12, 14, 2, hull); R(2, 14, 12, 1, hullD); for (const [m, t] of [[3, 3], [8, 1], [13, 4]]) { R(m, t, 1, 11 - t, mast); R(m - 2, t + 1, 5, 4, sail); R(m - 2, t + 5, 5, 1, "rgba(0,0,0,0.18)"); } R(8, 0, 2, 1, "rgb(200,60,50)"); }
    });
  };

  // ------------------------------------------------------------------ the journal: who decides, what she is, what is stored
  const carry0 = G.carryHtml;
  G.carryHtml = function () {
    const s = this.s, w = this.w, v = s.vessel, key = this.ctlKey(), R = key && AZ.CONTROL[key];
    let h = carry0.call(this);
    if (s.beast) { const L = AZ.LANDV[s.beast.vc]; h += `<p>Your ${U.esc(s.beast.kind.toLowerCase())} (${L.name}): ${L.hold.food} rations and ${L.hold.goods} units more on land${s.beast.hungry ? `; hungry ${s.beast.hungry} day${s.beast.hungry > 1 ? "s" : ""}` : ""}.</p>`; }
    if (v && AZ.VCLASS[v.vc]) { const C = AZ.VCLASS[v.vc]; h += `<p class="dim">Your ${U.esc(v.kind.toLowerCase())} is a ${C.name}: ${C.sheet}. Hands ${C.hands[0]}–${C.hands[1]}; she holds ${C.hold.food} rations and ${C.hold.goods} units ${T("mixed")}.</p>`; }
    const lots = Object.entries(s.stores || {});
    if (lots.length) h += `<h3>Stored</h3><ul>${lots.map(([bi, S]) => { const b = w.P.burgs[bi]; return `<li>${U.esc(b.name)}: ${U.esc(this.storeDesc(S.lots))} · 🟡 ${this.storeDue(b)} due</li>`; }).join("")}</ul>`;
    if (R) h += `<h3>Who decides aboard: ${R.label}</h3><table>${AZ.CONTROL_COLS.map(([k, l]) => `<tr><td class="dim">${l}</td><td>${U.esc(R.text[k])}</td></tr>`).join("")}</table>`;
    return h;
  };
})();
