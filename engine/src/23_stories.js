// =============================================================================================
// 23_stories.js · Alpha 5: stories (5.1: arcs, leg roles, premise, objectives, moments).
//   Each journey type has a family, main layers, a story shape and a rule for who decides. Hook
//   finders read the map along the route; the control table says how much each kind of hook matters
//   to each type (high, medium, low). The story builder fits the shape's beats to the stops the
//   journey has (a two-stop pilgrimage and an eight-stop quest both get a whole story), places the
//   strongest fitting hook on each beat, and plays each beat as a scene through the systems already
//   in the game: money, time, food, standing, tiredness, vessels, trade and the company.
// =============================================================================================
(() => {
  const G = AZ.Game.prototype, U = AZ.U, T = AZ.T;

  // ------------------------------------------------------------------ hook kinds and the layers they come from
  AZ.HOOK_LAYER = {
    faithSeat: "religion", faithBorder: "religion", faithMinority: "religion", temple: "religion",
    cultureBorder: "culture", cultureMinority: "culture",
    hardCrossing: "biomes", biomeChange: "biomes", wetland: "biomes", desert: "biomes",
    cold: "temperature", heat: "temperature",
    monster: "markers", ruin: "markers", shrine: "markers", wonder: "markers", inn: "markers", mine: "markers",
    priceGap: "markets", destBuys: "goods",
    stateBorder: "states", war: "military", regiment: "military", capital: "states", walls: "burgs", port: "burgs",
    bigCity: "population", empty: "population",
    famine: "zones", disease: "zones", disaster: "zones", invasion: "zones", rebels: "zones", crusade: "zones",
  };
  const ALL_KINDS = Object.keys(AZ.HOOK_LAYER);

  // ------------------------------------------------------------------ the control table: every journey type
  // family, main layers, shape (and others), who decides, can you lead, hooks that matter most (high) and
  // somewhat (medium; all others low), what the climax does, what finishing early costs, who stays after
  const R = (family, layers, shape, alt, move, lead, high, mid, climax, early) => ({ family, layers, shape, alt, move, lead, high, mid, climax, early });
  AZ.STORY = {
    "Pilgrimage": R("faith", ["religion", "culture"], "hero", ["voyage"], "free", true, ["faithSeat", "faithBorder", "shrine", "temple", "crusade"], ["cultureBorder", "faithMinority", "cultureMinority", "hardCrossing", "inn"], "rite", "vow"),
    "Quest": R("land", ["biomes", "markers"], "hero", ["dragon", "chase"], "collective", true, ["monster", "ruin", "hardCrossing", "wonder"], ["biomeChange", "wetland", "desert", "cold", "shrine", "rebels"], "deed", "nothing"),
    "Caravan": R("trade", ["markets", "goods", "culture"], "voyage", ["three"], "leader", true, ["priceGap", "destBuys", "bigCity", "port"], ["cultureBorder", "stateBorder", "inn", "rebels", "famine", "desert"], "sale", "contract"),
    "Military campaign": R("power", ["states", "military"], "three", ["siege"], "orders", false, ["war", "regiment", "walls", "stateBorder"], ["capital", "invasion", "hardCrossing", "famine"], "battle", "orders"),
    "Embassy": R("power", ["states", "culture"], "mystery", ["three"], "leader", true, ["capital", "stateBorder", "war", "cultureBorder"], ["walls", "temple", "faithBorder", "bigCity"], "audience", "orders"),
    "Raid": R("faith", ["culture", "religion", "population"], "rooms", ["three"], "orders", true, ["walls", "port", "bigCity", "temple", "cultureBorder", "faithBorder"], ["regiment", "stateBorder", "war", "empty", "capital"], "plunder", "plunder"),
    "Smuggling run": R("trade", ["markets", "goods", "states"], "chase", ["mystery"], "free", true, ["stateBorder", "priceGap", "war", "port"], ["destBuys", "regiment", "bigCity", "walls"], "sale", "contract"),
    "Courier ride": R("people", ["burgs", "biomes", "temperature"], "three", ["chase"], "free", false, ["hardCrossing", "cold", "heat", "bigCity"], ["stateBorder", "rebels", "disaster", "war", "desert"], "message", "message"),
    "Expedition": R("land", ["biomes", "culture", "markers"], "marches", ["voyage"], "collective", true, ["hardCrossing", "ruin", "wonder", "biomeChange", "empty"], ["cultureBorder", "monster", "cold", "heat", "desert", "wetland"], "survey", "nothing"),
    "Refugee flight": R("people", ["zones", "states", "population"], "three", ["underdog"], "collective", true, ["invasion", "war", "famine", "disease", "stateBorder"], ["bigCity", "empty", "hardCrossing", "rebels"], "refuge", "refuge"),
    "Treasure hunt": R("land", ["markers", "goods", "biomes"], "nodes", ["rooms"], "collective", true, ["ruin", "wonder", "mine", "priceGap"], ["monster", "hardCrossing", "desert", "empty"], "dig", "nothing"),
    "Monster hunt": R("land", ["markers", "biomes"], "dragon", ["mystery"], "collective", true, ["monster", "ruin", "hardCrossing"], ["wetland", "cold", "empty", "wonder"], "hunt", "nothing"),
    "Exile's flight": R("power", ["states", "military", "culture"], "underdog", ["hero"], "free", false, ["stateBorder", "war", "regiment"], ["cultureBorder", "empty", "hardCrossing", "capital"], "refuge", "refuge"),
    "Royal progress": R("power", ["states", "burgs"], "voyage", ["mystery"], "orders", false, ["capital", "bigCity", "walls", "stateBorder"], ["temple", "port", "cultureBorder"], "audience", "orders"),
    "Airship voyage": R("trade", ["markets", "goods", "burgs"], "voyage", ["three"], "leader", true, ["bigCity", "port", "priceGap", "destBuys"], ["cold", "heat", "disaster", "wonder"], "sale", "contract"),
    "Arcane errand": R("faith", ["religion", "states"], "mystery", ["nodes"], "free", false, ["faithSeat", "faithBorder", "wonder", "ruin"], ["stateBorder", "temple", "crusade", "shrine"], "rite", "vow"),
    "Mercenary contract": R("power", ["states", "culture", "religion"], "three", ["siege"], "orders", true, ["war", "regiment", "walls", "stateBorder"], ["cultureBorder", "faithBorder", "invasion"], "battle", "orders"),
    "Wandering": R("land", ["biomes", "temperature"], "marches", ["voyage"], "free", false, ["biomeChange", "cold", "heat", "wonder"], ["hardCrossing", "inn", "empty"], "rest", "nothing"),
  };
  AZ.relevance = (type, kind) => { const S = AZ.STORY[type] || AZ.STORY.Quest; return S.high.includes(kind) ? 3 : S.mid.includes(kind) ? 2 : 1; };

  // ------------------------------------------------------------------ story shapes: beats as [function, window from, to, essential, place]
  AZ.SHAPES = {
    three: { name: "three acts", beats: [["open", 0, 0.1, 1, "cp"], ["trial", 0.1, 0.45, 0, "leg"], ["turn", 0.35, 0.7, 0, "any"], ["trial", 0.5, 0.85, 0, "leg"], ["ordeal", 0.6, 0.95, 1, "leg"], ["climax", 0.9, 1, 1, "cp"]] },
    hero: { name: "the hero's journey", beats: [["open", 0, 0.05, 1, "cp"], ["threshold", 0.05, 0.4, 0, "any"], ["trial", 0.2, 0.6, 0, "leg"], ["turn", 0.4, 0.75, 0, "any"], ["ordeal", 0.5, 0.92, 1, "leg"], ["reward", 0.6, 0.95, 0, "cp"], ["climax", 0.9, 1, 1, "cp"]] },
    rooms: { name: "five rooms", beats: [["open", 0, 0.1, 1, "cp"], ["threshold", 0.5, 0.92, 0, "any"], ["trial", 0.6, 0.95, 0, "any"], ["turn", 0.7, 0.97, 0, "any"], ["climax", 0.85, 1, 1, "cp"], ["reward", 0.9, 1, 0, "cp"]] },
    voyage: { name: "the long voyage", beats: [["open", 0, 0.05, 1, "cp"], ["episode", 0.05, 0.95, 0, "cp", 1], ["climax", 0.9, 1, 1, "cp"]] },
    marches: { name: "the marches", beats: [["open", 0, 0.05, 1, "cp"], ["episode", 0.05, 0.95, 0, "any", 1], ["climax", 0.9, 1, 1, "cp"]] },
    dragon: { name: "slay the dragon", beats: [["open", 0, 0.1, 1, "cp"], ["trial", 0.1, 0.5, 0, "any"], ["reward", 0.3, 0.8, 0, "cp"], ["trial", 0.4, 0.85, 0, "any"], ["ordeal", 0.7, 0.95, 1, "leg"], ["climax", 0.9, 1, 1, "cp"]] },
    chase: { name: "the chase", beats: [["open", 0, 0.1, 1, "cp"], ["turn", 0.1, 0.5, 0, "cp"], ["trial", 0.3, 0.8, 0, "leg"], ["turn", 0.5, 0.9, 0, "cp"], ["climax", 0.9, 1, 1, "cp"]] },
    mystery: { name: "mystery", beats: [["open", 0, 0.1, 1, "cp"], ["turn", 0.1, 0.45, 0, "cp"], ["turn", 0.3, 0.75, 0, "any"], ["trial", 0.5, 0.85, 0, "leg"], ["turn", 0.7, 0.95, 0, "cp"], ["climax", 0.9, 1, 1, "cp"]] },
    nodes: { name: "nodes", beats: [["open", 0, 0.05, 1, "cp"], ["episode", 0.05, 0.95, 0, "any", 1], ["climax", 0.9, 1, 1, "cp"]] },
    siege: { name: "siege", beats: [["open", 0, 0.1, 1, "cp"], ["trial", 0.1, 0.6, 0, "any"], ["turn", 0.4, 0.8, 0, "any"], ["ordeal", 0.7, 0.95, 1, "any"], ["climax", 0.9, 1, 1, "cp"]] },
    underdog: { name: "the underdog", beats: [["open", 0, 0.1, 1, "cp"], ["trial", 0.1, 0.5, 0, "any"], ["reward", 0.3, 0.7, 0, "cp"], ["turn", 0.5, 0.9, 0, "any"], ["climax", 0.9, 1, 1, "cp"]] },
  };
  AZ.BEAT_NAME = { open: "the call", threshold: "the threshold", trial: "a trial", turn: "a turn", ordeal: "the ordeal", reward: "a reward", climax: "the climax", episode: "an episode" };
  // which kinds of hook suit which function (a fitting hook scores half as much again)
  AZ.BEAT_FIT = {
    open: ["capital", "bigCity", "faithSeat", "temple", "war", "priceGap", "destBuys", "walls"],
    threshold: ["stateBorder", "cultureBorder", "faithBorder", "biomeChange", "port", "regiment"],
    trial: ["monster", "rebels", "disease", "disaster", "cold", "heat", "wetland", "desert", "regiment", "famine", "invasion", "crusade", "war"],
    turn: ["faithSeat", "ruin", "wonder", "shrine", "priceGap", "capital", "faithMinority", "cultureMinority", "temple", "mine"],
    ordeal: ["hardCrossing", "desert", "cold", "heat", "wetland", "monster", "war", "invasion", "empty"],
    reward: ["priceGap", "temple", "inn", "bigCity", "port", "shrine"],
    climax: ["walls", "capital", "monster", "ruin", "temple", "bigCity", "priceGap", "mine", "faithSeat", "port"],
    episode: ALL_KINDS,
  };

  // ------------------------------------------------------------------ hook finders
  const ready = jr => { if (!jr.cps) { jr.replan(); jr.fixCourses(); } };
  AZ.findHooks = function (w, jr) {
    ready(jr);
    const P = w.P, C = w.C, out = [], cps = jr.cps, U2 = U;
    const legs = cps.map(cp => cp.legIn).filter(Boolean), total = legs.reduce((a, l) => a + (l.miles || 0), 0) || 1;
    let acc = 0; const cpAt = cps.map((cp, i) => { if (i > 0) acc += cps[i].legIn?.miles || 0; return acc / total; });
    const name = (arr, i) => (arr[i] && arr[i].name) || "unclaimed land";
    const add = (kind, text, o) => out.push({ kind, layer: AZ.HOOK_LAYER[kind], text, strength: 0.7, ...o });
    // along each leg
    cps.forEach((cp, i) => {
      const leg = cp.legIn; if (!leg || !leg.chain || !leg.chain.length) return;
      const n = leg.chain.length, a0 = cpAt[i - 1], a1 = cpAt[i], at = k => a0 + ((a1 - a0) * k) / Math.max(1, n - 1);
      let prev = null, run = { b: null, k0: 0 }, emptyRun = 0;
      const seenM = new Set(), seenZ = new Set(), seenS = new Set(), done = {};
      for (let k = 0; k < n; k++) {
        const [c, r] = leg.chain[k], land = w.isLand(c, r), cell = w.cell(c, r);
        const cur = land ? { rel: C.religion[cell], cul: C.culture[cell], st: C.state[cell], bio: C.biome[cell] } : null;
        if (cur && prev) {
          if (cur.st !== prev.st && !done[`s${prev.st}:${cur.st}`]) { done[`s${prev.st}:${cur.st}`] = 1; add("stateBorder", `the border of ${name(P.states, prev.st)} and ${name(P.states, cur.st)}`, { tile: [c, r], leg: i, at: at(k), strength: 1 }); }
          if (cur.cul !== prev.cul && !done[`c${prev.cul}:${cur.cul}`]) { done[`c${prev.cul}:${cur.cul}`] = 1; add("cultureBorder", `where the ${name(P.cultures, prev.cul)} give way to the ${name(P.cultures, cur.cul)}`, { tile: [c, r], leg: i, at: at(k), strength: 0.7 }); }
          if (cur.rel !== prev.rel && !done[`r${prev.rel}:${cur.rel}`]) { done[`r${prev.rel}:${cur.rel}`] = 1; add("faithBorder", `where the ${name(P.religions, prev.rel)} gives way to the ${name(P.religions, cur.rel)}`, { tile: [c, r], leg: i, at: at(k), strength: 0.8 }); }
          if (cur.bio !== prev.bio && !done[`b${cur.bio}`]) { done[`b${cur.bio}`] = 1; add("biomeChange", `the edge of the ${name(P.biomes, cur.bio).toLowerCase()}`, { tile: [c, r], leg: i, at: at(k), strength: 0.4 }); }
        }
        if (cur) prev = cur;
        // hard ground: a run of the same hard biome
        const hard = cur && /desert|glacier|tundra|wetland|swamp|marsh|rainforest|taiga/i.test(name(P.biomes, cur.bio));
        if (hard && run.b === cur.bio) { if (k - run.k0 === 12 && !done[`h${cur.bio}`]) { done[`h${cur.bio}`] = 1; const bn = name(P.biomes, cur.bio).toLowerCase(); add("hardCrossing", `a long crossing of ${bn}`, { tile: [c, r], leg: i, at: at(k), strength: 0.9 }); if (/desert/.test(bn)) add("desert", `the ${bn}, where water decides everything`, { tile: [c, r], leg: i, at: at(k), strength: 0.7 }); if (/wetland|swamp|marsh/.test(bn)) add("wetland", `the ${bn}, and its fevers`, { tile: [c, r], leg: i, at: at(k), strength: 0.7 }); } }
        else run = { b: hard ? cur.bio : null, k0: k };
        if (land && k % 3 === 0) {
          const t = w.tempC(c, r);
          if (t < -5 && !done.cold) { done.cold = 1; add("cold", `bitter cold: about ${Math.round(t)}°C`, { tile: [c, r], leg: i, at: at(k), strength: 0.6 }); }
          if (t > 26 && !done.heat) { done.heat = 1; add("heat", `burning heat: about ${Math.round(t)}°C`, { tile: [c, r], leg: i, at: at(k), strength: 0.6 }); }
          const nb = w.near(c, r, 10).some(x => x.kind === "burg"); emptyRun = nb ? 0 : emptyRun + 3;
          if (emptyRun >= 40 && !done.empty) { done.empty = 1; add("empty", "long empty country, with no town within thirty miles", { tile: [c, r], leg: i, at: at(k), strength: 0.5 }); }
        }
        if (k % 2 === 0) for (const x of w.near(c, r, 3)) {
          if (x.kind !== "marker" || seenM.has(x.o.i)) continue; seenM.add(x.o.i);
          const ty = x.o.type || "", kind = /monster|dragon|brigand|pirate|beast|troll|giant|kraken/i.test(ty) ? "monster" : /ruin|dungeon|cave|burial|necropol|tomb|crypt|battlefield/i.test(ty) ? "ruin" : /sacred|shrine|temple|pilgrim|monaster/i.test(ty) ? "shrine" : /inn/i.test(ty) ? "inn" : /mine/i.test(ty) ? "mine" : "wonder";
          add(kind, `${x.o.name} (${ty})`, { tile: x.o.t, leg: i, at: at(k), marker: x.o.i, strength: kind === "monster" || kind === "ruin" ? 1 : 0.8 });
        }
        for (const z of w.zonesOfCell(cell)) {
          if (seenZ.has(z.i)) continue; seenZ.add(z.i);
          const kind = /dearth|famine/i.test(z.name) ? "famine" : /Disease/.test(z.type) ? "disease" : /Invasion/.test(z.type) ? "invasion" : /Rebel/.test(z.type) ? "rebels" : /Crusade|Proselyt/.test(z.type) ? "crusade" : "disaster";
          add(kind, `${z.name} (${z.type.toLowerCase()})`, { tile: [c, r], leg: i, at: at(k), zone: z.i, strength: 0.9 });
        }
        if (cur && !seenS.has(cur.st)) { // a state at war, the first time the route enters it
          seenS.add(cur.st);
          const war = (P.states[cur.st]?.campaigns || []).find(cp2 => cp2.end == null);
          if (war) add("war", `${name(P.states, cur.st)} is at war: the ${war.name}, since ${war.start}`, { tile: [c, r], leg: i, at: at(k), strength: 0.9 });
        }
      }
      for (const u of P.military || []) { if (u.naval || !u.t) continue; const near = leg.chain.findIndex(([c, r], k) => k % 4 === 0 && Math.abs(c - u.t[0]) + Math.abs(r - u.t[1]) <= 4); if (near >= 0) add("regiment", `the ${u.name} of ${name(P.states, u.state)}, camped by the way`, { tile: u.t, leg: i, at: at(near), strength: 0.8 }); }
    });
    // at the stops
    const religions = P.religions || [];
    cps.forEach((cp, i) => {
      const b = cp.place.burg; if (!b) return;
      const o = { cp: i, tile: b.t, at: cpAt[i] };
      const st = P.states[b.state], cap = st && P.burgs[st.capital];
      if (b.capital) add("capital", `${b.name}, capital of ${st?.fullName || st?.name}`, { ...o, strength: 0.9 });
      if (b.walls) add("walls", `the walls of ${b.name}`, { ...o, strength: 0.7 });
      if (b.port) add("port", `the harbour of ${b.name}`, { ...o, strength: 0.5 });
      if (b.temple) add("temple", `the temple of ${b.name}, of the ${name(religions, C.religion[b.cell])}`, { ...o, strength: 0.6 });
      if ((b.population || 0) >= 20) add("bigCity", `${b.name}, a city of ${U2.num(Math.round(b.population * 1000))}`, { ...o, strength: 0.7 });
      const seat = religions.find(r2 => r2 && r2.center === b.cell); if (seat) add("faithSeat", `${b.name}, the seat of the ${seat.name}`, { ...o, strength: 1 });
      if (cap && cap !== b && C.religion[cap.cell] !== C.religion[b.cell]) add("faithMinority", `${b.name} keeps the ${name(religions, C.religion[b.cell])}, unlike its rulers in ${cap.name}`, { ...o, strength: 0.6 });
      if (cap && cap !== b && C.culture[cap.cell] !== C.culture[b.cell]) add("cultureMinority", `${b.name}'s people are ${name(P.cultures, C.culture[b.cell])}, unlike their rulers`, { ...o, strength: 0.5 });
    });
    // trade: price gaps between the stops, and what the end buys from the start
    if (AZ.fieldOf) {
      const F = AZ.fieldOf(w), towns = cps.map((cp, i) => ({ b: cp.place.burg, i })).filter(x => x.b);
      for (let a = 0; a < towns.length; a++) {
        let best = null;
        for (const g of P.goods.map(x => x.i)) {
          if (!F.available(towns[a].b, g)) continue; const here = F.base(towns[a].b, g); if (!here) continue;
          for (let z = a + 1; z < towns.length; z++) { const there = F.base(towns[z].b, g); if (there && there / here > 1.3 && (!best || there / here > best.r)) best = { g, r: there / here, here, there, to: towns[z] }; }
        }
        if (best) add("priceGap", `${P.goods.find(x => x.i === best.g).name.toLowerCase()} at ${U2.rn(best.here, 2)} in ${towns[a].b.name}, ${U2.rn(best.there, 2)} in ${best.to.b.name}`, { cp: towns[a].i, tile: towns[a].b.t, at: cpAt[towns[a].i], good: best.g, strength: Math.min(1, (best.r - 1)), sellAt: best.to.i });
      }
      const o = jr.origin.burg, d = jr.dest.burg;
      if (o && d) { const g = Object.keys((P.trade && P.trade.sell[o.i]) || {}).find(x => ((P.trade.buy || {})[d.i] || {})[x]); if (g) add("destBuys", `${d.name} buys the ${P.goods.find(x => x.i === +g)?.name.toLowerCase()} that ${o.name} sells`, { cp: 0, tile: o.t, at: 0, good: +g, strength: 0.9 }); }
    }
    return out;
  };

  // =============================================================================================
  // Alpha 5.1: the story as hidden machinery. Five layers, each one job:
  //   premise (who you are, your tie, whether you lead), arc (what the journey wants, a measure in
  //   words, endings), structure (weighted at creation), leg roles (what each leg is for, with an
  //   objective), moments (what you meet on the way). The player sees people, places and objectives.
  // =============================================================================================
  const ARC = (label, measure, roles, purpose, approach, ties, endings) => ({ label, measure, roles, purpose, approach, ties, endings });
  AZ.ARCS = {
    "Pilgrimage": ARC("Devotion", ["untested", "earnest", "steadfast", "devout", "touched by grace"], { threshold: "the border of faiths", trial: "the road of trials", turn: "the holy place on the way", ordeal: "the hard road", reward: "the vigil", post: "the mission", ret: "the homecoming" }, "pilgrims", "the last miles", ["faith", "kin", "debt"], ["the vow broken", "turned away at the seat", "received at the seat", "raised in the faith", "sent out with a relic and a mission"]),
    "Quest": ARC("Renown", ["unknown", "noticed", "spoken of", "renowned", "a name in the songs"], { threshold: "gather allies", trial: "the test", turn: "the secret", ordeal: "the trial of the deed", reward: "a night's welcome", post: "the road home", ret: "the reckoning" }, "search", "the trial of the deed", ["kin", "debt", "duty", "curiosity"], ["the oath abandoned", "failed, with honour", "the deed done, quietly", "the deed done and told", "the deed done and sung"]),
    "Caravan": ARC("Profit", ["in the red", "thin", "even", "good", "rich"], { threshold: "the toll", trial: "the dispute", turn: "the market run", ordeal: "the hard road", reward: "the market run", post: "the road home", ret: "the share-out" }, "trade", "the last market road", ["contract", "kin", "debt"], ["robbed, the contracts broken", "a loss", "even", "a profit, and a good name", "rich, and asked to lead the next"]),
    "Military campaign": ARC("The campaign", ["in disarray", "holding", "advancing", "winning", "victorious"], { threshold: "the march", trial: "foraging", turn: "the skirmish", ordeal: "the siege lines", reward: "a billet", post: "the march back", ret: "the aftermath" }, "forage", "the approach", ["duty", "contract", "custom"], ["mutiny and rout", "a retreat", "a draw", "a victory", "a famous victory"]),
    "Embassy": ARC("Favour", ["cold", "polite", "warming", "favoured", "a friend of the court"], { threshold: "the road under the flag", trial: "the test of nerve", turn: "the intrigue", ordeal: "the long road", reward: "the court's welcome", post: "the treaty home", ret: "the report" }, "procession", "the long road", ["duty", "kin", "contract"], ["recalled in disgrace", "nothing agreed", "a treaty", "a treaty and an ally", "an ally for a generation"]),
    "Raid": ARC("The haul", ["nothing yet", "a thin haul", "a fair haul", "a good haul", "a great haul"], { threshold: "harry the coast", trial: "harry the coast", turn: "the fence", ordeal: "the long row", reward: "the fence", post: "flight", ret: "the share-out" }, "harry", "scout the target", ["kin", "contract", "custom", "debt"], ["outlawed, and empty-handed", "a thin haul, and grumbling", "a fair haul, shared", "a good haul, and your name in the songs", "a great haul, sung in every hall"]),
    "Smuggling run": ARC("The run", ["caught", "watched", "quiet", "clean", "untouchable"], { threshold: "the border", trial: "the inspection", turn: "the switch", ordeal: "the chase", reward: "a safe house", post: "lie low", ret: "the payday" }, "trade", "the chase", ["debt", "contract", "kin"], ["caught and fined", "the cargo dumped", "paid, just", "paid well", "paid well, and trusted with the next"]),
    "Courier ride": ARC("The message", ["lost", "late", "on the road", "on time", "early"], { threshold: "the fast road", trial: "the lame horse", turn: "the interception", ordeal: "the race", reward: "a fresh horse", post: "the reply", ret: "the reply" }, "relay", "the race", ["duty", "contract", "debt"], ["never arrived", "late, and unread", "delivered", "delivered on time, and rewarded", "delivered early, and remembered"]),
    "Expedition": ARC("Knowledge", ["nothing new", "a few notes", "a fair account", "a full account", "a famous account"], { threshold: "the known edge", trial: "the unknown country", turn: "the find", ordeal: "the unknown country", reward: "provision", post: "the return", ret: "the return with knowledge" }, "survey", "the far edge", ["curiosity", "contract", "duty"], ["turned back, hands lost", "a thin report", "a fair account", "a full account, and a name", "a famous account, and a map with your name on it"]),
    "Refugee flight": ARC("Hope", ["despair", "fear", "endurance", "hope", "a new home in sight"], { threshold: "the border", trial: "the long road", turn: "the camp", ordeal: "the separation", reward: "kindness", post: "taking root", ret: "the new home" }, "shelter", "the last road", ["kin", "flight", "duty"], ["turned back at the border", "scattered", "safe, but apart", "together, and safe", "together, with a new home"]),
    "Treasure hunt": ARC("Clues", ["a story", "a rumour", "a trail", "a map that makes sense", "the place itself"], { threshold: "trace the rumour", trial: "the rival", turn: "the false lead", ordeal: "the guardian", reward: "trace the rumour", post: "the getaway", ret: "the getaway" }, "search", "the guardian", ["curiosity", "debt", "kin"], ["a fool's errand", "nothing but stories", "found, and given back", "found, and sold", "found, and kept"]),
    "Monster hunt": ARC("Signs", ["no sign", "tracks", "a trail", "its lair", "the beast itself"], { threshold: "the signs", trial: "the signs", turn: "the lure", ordeal: "the lair", reward: "a night's welcome", post: "the trophy", ret: "the trophy" }, "track", "the lair", ["contract", "kin", "duty"], ["the hunter hunted", "it got away", "driven off", "the trophy", "the trophy, and a town in your debt"]),
    "Exile's flight": ARC("Distance", ["caught", "close behind", "a day ahead", "far ahead", "out of reach"], { threshold: "pursuit", trial: "hiding", turn: "the false friend", ordeal: "the crossing", reward: "an ally", post: "a new name", ret: "sanctuary" }, "shelter", "the crossing", ["flight", "kin", "duty"], ["taken", "hunted still", "safe for now", "sanctuary", "sanctuary, and a new name"]),
    "Royal progress": ARC("Loyalty", ["in revolt", "sullen", "dutiful", "loyal", "devoted"], { threshold: "the procession", trial: "the petition", turn: "the plot", ordeal: "the test of loyalty", reward: "the loyal town", post: "the return in state", ret: "the court" }, "procession", "the court's road", ["duty", "kin", "contract"], ["a town in revolt", "a sullen realm", "a dutiful realm", "a loyal realm", "a plot uncovered, and a devoted realm"]),
    "Airship voyage": ARC("Profit", ["in the red", "thin", "even", "good", "rich"], { threshold: "cast off", trial: "the trade stop", turn: "a passenger's secret", ordeal: "the storm aloft", reward: "the trade stop", post: "the payday", ret: "the payday" }, "trade", "the storm aloft", ["contract", "curiosity", "kin"], ["a wreck survived", "a loss", "even", "a profitable circuit", "rich, and the ship's name known"]),
    "Arcane errand": ARC("The working", ["nothing gathered", "a beginning", "half of it", "nearly all", "all that is needed"], { threshold: "the component", trial: "the component", turn: "the forbidden archive", ordeal: "the guardian of the rite", reward: "the component", post: "the price paid", ret: "the price paid" }, "pilgrims", "the guardian of the rite", ["duty", "curiosity", "debt"], ["forbidden, and fled", "the working failed", "the working done, at a price", "the working done", "the working done, and the master's place offered"]),
    "Mercenary contract": ARC("Pay", ["unpaid", "owed", "half paid", "paid", "paid and praised"], { threshold: "the march", trial: "the pay dispute", turn: "the skirmish", ordeal: "the siege line", reward: "a billet", post: "the march back", ret: "payday" }, "forage", "the siege line", ["contract", "kin", "debt"], ["broken by the fighting", "unpaid", "half paid", "paid in full", "paid in full, and offered the next contract"]),
    "Wandering": ARC("Memories", ["few", "some", "many", "rich", "a lifetime's"], { threshold: "the road", trial: "the road", turn: "a place that pulls", ordeal: "the weather", reward: "a place to stay", post: "the road", ret: "a place to stay" }, "survey", "the road", ["curiosity", "flight", "kin"], ["the road goes on", "the road goes on", "the road goes on", "the road goes on", "the road goes on"]),
  };
  // the structure each journey is given at creation, by weighted chance (to be tuned in play)
  AZ.SHAPE_WEIGHTS = {
    "Pilgrimage": { hero: 45, voyage: 35, three: 20 }, "Quest": { hero: 40, dragon: 25, chase: 20, three: 15 }, "Caravan": { voyage: 50, three: 30, mystery: 20 },
    "Military campaign": { three: 40, siege: 40, underdog: 20 }, "Embassy": { mystery: 50, three: 30, chase: 20 }, "Raid": { rooms: 40, three: 35, chase: 25 },
    "Smuggling run": { chase: 45, mystery: 35, three: 20 }, "Courier ride": { three: 50, chase: 50 }, "Expedition": { marches: 45, voyage: 35, hero: 20 },
    "Refugee flight": { three: 40, underdog: 40, hero: 20 }, "Treasure hunt": { nodes: 40, rooms: 30, chase: 30 }, "Monster hunt": { dragon: 60, mystery: 40 },
    "Exile's flight": { underdog: 50, hero: 30, chase: 20 }, "Royal progress": { voyage: 50, mystery: 50 }, "Airship voyage": { voyage: 60, three: 40 },
    "Arcane errand": { mystery: 50, nodes: 30, hero: 20 }, "Mercenary contract": { three: 40, siege: 40, underdog: 20 }, "Wandering": { marches: 70, voyage: 30 },
  };
  // the nine kinds every leg role is: the code runs the kind; the arc names the role
  const K = (kind, carrier, what) => ({ kind, carrier, what });
  AZ.ROLES = {
    "harry the coast": K("purpose"), "the fence": K("seek", "Merchant", "who will buy what the company has taken"), "scout the target": { kind: "endure", obj: to => `Come to ${to} unseen, and learn its walls and its watch on the way` },
    "the long row": K("endure"), "flight": K("escape"), "the share-out": K("settle"), "the border of faiths": K("cross"), "the road of trials": K("purpose"),
    "the holy place on the way": K("seek", "Priest", "the faith of this country"), "the hard road": K("endure"), "the vigil": K("seek", "Priest", "where a pilgrim keeps vigil"),
    "the mission": K("purpose"), "the homecoming": K("settle"), "the last miles": K("endure"), "gather allies": K("seek", "Innkeeper", "who would join the company"),
    "the test": K("endure"), "the secret": K("mislead", "Townsfolk", "what the company has not been told"), "the trial of the deed": K("endure"), "a night's welcome": K("seek", "Innkeeper", "a bed and the news"),
    "the road home": K("purpose"), "the reckoning": K("settle"), "the toll": K("cross"), "the dispute": K("seek", "Merchant", "the quarrel over the shares"), "the market run": K("purpose"),
    "the last market road": K("endure"), "the march": K("purpose"), "foraging": K("purpose"), "the skirmish": K("endure"), "the siege lines": K("endure"),
    "a billet": K("seek", "Innkeeper", "where the company can sleep"), "the march back": K("purpose"), "the aftermath": K("settle"), "the approach": K("endure"),
    "the road under the flag": K("cross"), "the test of nerve": K("seek", "Captain of the watch", "the court's temper"), "the intrigue": K("mislead", "Townsfolk", "who speaks against you"),
    "the long road": K("endure"), "the court's welcome": K("seek", "Townsfolk", "the order of the court"), "the treaty home": K("purpose"), "the report": K("settle"),
    "the border": K("cross"), "the inspection": K("cross"), "the switch": K("seek", "Merchant", "a safe place to change the cargo"), "the chase": K("escape"),
    "a safe house": K("seek", "Innkeeper", "a place to lie low"), "lie low": K("escape"), "the payday": K("settle"), "the buyer's door": K("seek", "Merchant", "the buyer"),
    "the fast road": K("purpose"), "the lame horse": K("endure"), "the interception": K("escape"), "the race": K("endure"), "a fresh horse": K("seek", "Innkeeper", "a fresh horse"),
    "the reply": K("settle"), "the known edge": K("cross"), "the unknown country": K("purpose"), "the find": K("seek", "Townsfolk", "what the country holds"),
    "provision": K("seek", "Innkeeper", "supplies for the unknown"), "the return": K("purpose"), "the return with knowledge": K("settle"), "the far edge": K("endure"),
    "the camp": K("seek", "Innkeeper", "where your people can rest"), "the separation": K("endure"), "kindness": K("seek", "Priest", "food for your people"), "taking root": K("settle"),
    "the new home": K("settle"), "the last road": K("endure"), "trace the rumour": K("seek", "Townsfolk", "where the map points"), "the rival": K("escape"),
    "the false lead": K("mislead", "Priest", "where the thing you seek is kept"), "the guardian": K("endure"), "the getaway": K("escape"), "the signs": K("purpose"),
    "the lure": K("seek", "Townsfolk", "what draws the beast"), "the lair": K("endure"), "the trophy": K("settle"), "pursuit": K("escape"), "hiding": K("seek", "Innkeeper", "a place to hide"),
    "the false friend": K("mislead", "Innkeeper", "a friend who can be trusted"), "the crossing": K("cross"), "an ally": K("seek", "Captain of the watch", "a friend in this country"),
    "a new name": K("settle"), "sanctuary": K("settle"), "the procession": K("purpose"), "the petition": K("seek", "Townsfolk", "the town's grievances"), "the plot": K("mislead", "Captain of the watch", "who plots against the crown"),
    "the test of loyalty": K("endure"), "the loyal town": K("seek", "Townsfolk", "the town's welcome"), "the return in state": K("purpose"), "the court": K("settle"), "the court's road": K("endure"),
    "cast off": K("purpose"), "the trade stop": K("purpose"), "a passenger's secret": K("seek", "Harbourmaster", "the passenger who came aboard here"), "the storm aloft": K("endure"),
    "the component": K("purpose"), "the forbidden archive": K("seek", "Priest", "the archive"), "the guardian of the rite": K("endure"), "the price paid": K("settle"),
    "the pay dispute": K("seek", "Captain of the watch", "the company's pay"), "the siege line": K("endure"), "payday": K("settle"), "the road": K("purpose"),
    "a place that pulls": K("seek", "Townsfolk", "what is worth seeing"), "the weather": K("endure"), "a place to stay": K("settle"),
  };
  const inPlace = to => (/^near\b/i.test(to) ? U.cap(to) : `In ${to}`), nearPlace = to => (/^near\b/i.test(to) ? U.cap(to) : `Near ${to}`);
  const CARRIER_WORD = { Merchant: "a merchant", Innkeeper: "the innkeeper", Priest: "the priests", Townsfolk: "the townsfolk", "Captain of the watch": "the watch", Harbourmaster: "the harbourmaster" };
  const PURPOSE = { harry: "the company strikes the villages it passes", pilgrims: "pray where pilgrims gather", trade: "trade where the company stops", forage: "live off the land as you go", survey: "record what you find", search: "search what the map shows you", shelter: "find food and shelter where you can", track: "follow the signs", relay: "keep the pace", procession: "show yourselves to the towns you pass" };
  const SETTLE = { "the share-out": "Share out the haul", "the homecoming": "Come home", "the reckoning": "Give your account", "the aftermath": "Report", "the report": "Report to the court", "the payday": "Collect your pay", "the reply": "Bring the reply", "the return with knowledge": "Bring your account", "the new home": "Settle", "taking root": "Settle your people", "the trophy": "Bring the trophy", "sanctuary": "Ask for sanctuary", "a new name": "Make a new life", "the court": "Present yourself at court", "the price paid": "Pay what the working asks", "a place to stay": "Find a place to stay", "payday": "Collect your pay" };
  const STRIKE = { plunder: t => `Strike ${t} with the company`, rite: t => `Keep the rites at ${t}`, sale: t => `Sell the company's goods in ${t}`, battle: t => `Join the battle at ${t}`, audience: t => `Present yourself at court in ${t}`, message: t => `Deliver the message in ${t}`, survey: t => `Survey the country around ${t}`, refuge: t => `Find refuge in ${t}`, dig: t => `Dig near ${t}`, hunt: t => `Hunt the beast near ${t}`, deed: t => `See the deed through at ${t}`, rest: t => `Rest at ${t}` };

  // ------------------------------------------------------------------ the premise: tie and leadership, part of the character
  const KIN = ["sister", "brother", "cousin", "father", "mother", "uncle", "aunt"];
  AZ.tieFor = function (w, jr, tv, seed) {
    const type = AZ.archOf(jr), arc = AZ.ARCS[type] || AZ.ARCS.Quest, S = AZ.STORY[type] || AZ.STORY.Quest, A = AZ.ARCH[type] || {};
    const P = w.P, o = jr.origin.burg, d = jr.dest.burg, cu = P.cultures[tv.culture] || {}, rnd = U.rng(`${seed}:tie`);
    const destFaith = d ? w.C.religion[d.cell] : null;
    const ok = id => id === "kin" ? (A.party || 0) > 0 : id === "custom" ? /Naval|Nomadic|Highland/.test(cu.type || "") || tv.faith === destFaith : id === "faith" ? tv.faith === destFaith || S.family === "faith" : id === "contract" ? !!(o && (o.port || (o.population || 0) > 5)) : true;
    const ids = arc.ties.filter(ok), id = ids.length ? ids[Math.floor(rnd() * ids.length)] : "curiosity";
    const name = AZ.makeName ? AZ.makeName(w, tv.culture, rnd) : null;
    const nm = name || (w.names ? U.cap((w.names.get(cu.base, rnd) || "Aran").split(/\s/)[0]) : "Aran");
    const noun = (A.noun || "journey"), home = P.burgs[tv.home]?.name || (o && o.name) || "home";
    const rel = KIN[Math.floor(rnd() * KIN.length)];
    const text = {
      kin: `Your ${rel} ${nm} goes with the ${noun}, and you go too.`,
      contract: `You signed on in ${o ? o.name : home} for a share, and ${nm} keeps the books.`,
      custom: `Among the ${cu.name || "people"}, everyone of age goes on the ${noun}; ${nm}, the eldest of the company, will see that you do.`,
      faith: `You made a vow at the temple of ${home}, before the priest ${nm}.`,
      debt: `You owe ${nm} of ${home} more than you can pay. The ${noun} pays it.`,
      duty: `${nm}, who speaks for the rulers of ${home}, sent you.`,
      flight: `You cannot go back to ${home}.`,
      curiosity: `You have read of ${d ? d.name : jr.dest.name} since you were a child.`,
    }[id];
    const who = id === "kin" ? { name: nm, role: rel, joins: true } : id === "contract" || id === "custom" ? { name: nm, role: id === "contract" ? "the books" : "eldest", joins: true } : id === "flight" || id === "curiosity" ? null : { name: nm, role: id, joins: false };
    const leader = AZ.journeyLeader(w, jr), canLead = S.lead && !leader;
    const leads = canLead ? rnd() < 0.5 : false;
    return { tie: { id, text, who }, leads, leader: leader || (!leads && who && who.joins ? who.name : null) };
  };
  const mt0 = AZ.makeTraveller;
  AZ.makeTraveller = function (w, jr, seed, ...rest) {
    const tv = mt0.call(this, w, jr, seed, ...rest);
    if (jr && tv) Object.assign(tv, AZ.tieFor(w, jr, tv, seed));
    return tv;
  };
  AZ.premiseCard = (w, jr, tv) => !jr || !tv || !tv.tie ? "" : `<div class="small" style="margin-top:6px">${U.esc(tv.tie.text)} ${tv.leads ? `<b>You lead the ${U.esc(AZ.noun(jr))}.</b>` : tv.leader ? `${U.esc(tv.leader)} leads; you follow.` : "You follow the company's lead."}</div>`;

  // ------------------------------------------------------------------ the plan: roles for every leg
  const pickShape = (type, seed) => { const W = AZ.SHAPE_WEIGHTS[type] || { three: 1 }, tot = Object.values(W).reduce((a, x) => a + x, 0); let r = U.rng(`${seed}:shape`)() * tot; for (const [k, x] of Object.entries(W)) { r -= x; if (r <= 0) return k; } return Object.keys(W)[0]; };
  AZ.arcPlan = function (w, jr, seed = 1) {
    ready(jr);
    const type = AZ.archOf(jr), S = AZ.STORY[type] || AZ.STORY.Quest, arc = AZ.ARCS[type] || AZ.ARCS.Quest, shape = pickShape(type, seed), cps = jr.cps, P = w.P;
    const hooks = AZ.findHooks(w, jr).map((h, id) => ({ ...h, id, rel: AZ.relevance(type, h.kind) }));
    // the target: named in the journey's name, or marked by the map, or the last stop
    const o = jr.origin.burg; let tcp = cps.length - 1;
    const named = cps.findIndex((cp, i) => i > 0 && cp.place.burg && new RegExp(`\\b${cp.place.burg.name.replace(/[.*+?^${}()|[\]\\]/g, "")}\\b`, "i").test(jr.J.name));
    if (named > 0 && /plunder|battle|hunt|dig/.test(S.climax)) tcp = named;
    else if (/plunder|battle|hunt|dig/.test(S.climax) && o) {
      let bs = -1;
      for (let i = 1; i < cps.length; i++) {
        const b = cps[i].place.burg, t = (b || cps[i]).tile || (b && b.t); if (!t) continue;
        const stance = b ? (P.states[o.state]?.diplomacy || [])[b.state] || "" : "";
        let sc = i === cps.length - 1 ? 0.3 : 0;
        if (/plunder|battle/.test(S.climax) && b) sc += (b.state !== o.state && !/Ally|Friendly/.test(stance) ? 2 : 0) + (b.walls ? 0.5 : 0) + Math.min(1, (b.treasury || 0) / 100) + (b.state === o.state ? -1 : 0);
        if (/hunt|dig/.test(S.climax)) sc += w.near(t[0], t[1], 8).some(n => n.kind === "marker" && (S.climax === "hunt" ? /monster|dragon|beast|troll/i : /ruin|dungeon|cave|burial|necropol|tomb/i).test(n.o.type)) ? 2 : 0;
        if (sc > bs) { bs = sc; tcp = i; }
      }
    }
    // the shape's middle functions, in order, before and after the climax
    const fns = AZ.SHAPES[shape].beats.map(b => b[0]);
    const ci = fns.indexOf("climax"), pre = fns.slice(1, ci).map(f => (f === "episode" ? "trial" : f)), post = fns.slice(ci + 1);
    const legs = [null];
    const legHooks = i => hooks.filter(h => h.leg === i || h.cp === i);
    const score = (fn, i) => Math.max(0, ...legHooks(i).map(h => h.strength * h.rel * (AZ.BEAT_FIT[fn] && AZ.BEAT_FIT[fn].includes(h.kind) ? 1.5 : 0.5)));
    // legs before the approach take the middle functions; extra legs repeat the arc's purpose; too few fold the weakest
    const before = Math.max(0, tcp - 1), fnsPre = pre.slice();
    while (fnsPre.length > before) { let wi = 0, ws = Infinity; fnsPre.forEach((f, k) => { const sc = Math.max(...Array.from({ length: before }, (_, j) => score(f, j + 1)), 0); if (sc < ws) { ws = sc; wi = k; } }); fnsPre.splice(wi, 1); }
    const onRoad = /harry|trade|forage|pilgrims|survey|shelter|procession/.test(arc.purpose);
    if (onRoad && before >= 1) while (fnsPre.length > before - 1) fnsPre.pop();
    const slots = Array.from({ length: before }, (_, j) => j + 1).filter(i => !(onRoad && i === 1));
    const preAssign = onRoad && before >= 1 ? { 1: "purpose" } : {}; let fi = 0;
    slots.forEach((i, j) => { const remainingSlots = slots.length - j, remainingFns = fnsPre.length - fi; if (remainingFns > 0 && (remainingFns >= remainingSlots || score(fnsPre[fi], i) >= 1)) preAssign[i] = fnsPre[fi++]; else preAssign[i] = "purpose"; });
    for (let i = 1; i < cps.length; i++) {
      const leg = cps[i].legIn, to = cps[i].place.name, sea = leg && leg.domain === "land" && leg.chain && leg.chain.length && leg.chain.filter(([c, r]) => !w.isLand(c, r)).length / leg.chain.length >= 0.3;
      let fn, role;
      if (i < tcp) { fn = preAssign[i]; role = fn === "purpose" ? null : arc.roles[fn]; }
      else if (i === tcp) { fn = "approach"; role = tcp > 1 || cps.length === 2 ? arc.approach : arc.approach; }
      else if (i === cps.length - 1) { fn = "ret"; role = arc.roles.ret; }
      else { fn = "post"; role = arc.roles.post; }
      if (!role) role = Object.keys(AZ.ROLES).find(r => AZ.ROLES[r].kind === "purpose" && Object.values(arc.roles).includes(r)) || "the road";
      const R = AZ.ROLES[role] || K("purpose");
      const best = legHooks(i).filter(h => h.leg === i).sort((a, b) => b.strength * b.rel - a.strength * a.rel)[0] || null;
      const border = legHooks(i).find(h => /Border/.test(h.kind) && h.leg === i);
      const hard = legHooks(i).find(h => /hardCrossing|cold|heat|desert|wetland|empty/.test(h.kind) && h.leg === i);
      let objective, kind = R.kind;
      const target = cps[tcp].place.name;
      if (/seek|mislead/.test(kind) && !cps[i].place.burg) kind = "search";
      if (R.obj) objective = R.obj(to, target);
      else if (kind === "search") objective = `${nearPlace(to)}, look for ${R.what || "what the company came for"}`;
      else if (R.kind === "purpose") objective = `On the way to ${to}: ${PURPOSE[arc.purpose] || "keep going"}`;
      else if (R.kind === "seek" || R.kind === "mislead") objective = `${inPlace(to)}, ask ${CARRIER_WORD[R.carrier] || "around"} about ${R.what || "the way ahead"}`;
      else if (R.kind === "cross") objective = border ? `Get past ${border.text.replace(/^where /, "the place where ")} on the way to ${to}` : `Cross into the country of ${to}`;
      else if (R.kind === "endure") objective = `Reach ${to} with the company whole${hard ? `: ${hard.text}` : ""}`;
      else if (R.kind === "escape") objective = `Get clear, and on to ${to}`;
      else if (R.kind === "settle") objective = `${SETTLE[role] || "Arrive"} in ${to}`;
      if (sea) objective = `${objective}; the way there crosses the sea, so look for a passage`;
      if (i === tcp) objective = `${objective}. Then: ${STRIKE[S.climax] ? STRIKE[S.climax](target) : `finish at ${target}`}`;
      // moments: what the company meets on this leg
      const moments = [];
      const chain = (leg && leg.chain) || [], seen = new Set(cps.map(cp => cp.place.burg && cp.place.burg.i));
      const want = arc.purpose, half = Math.floor(chain.length / 2);
      if (R.kind === "purpose" || i === tcp) for (let k = 0; k < chain.length && moments.length < 2; k += 3) {
        if (moments.length === 1 && k < half) continue;
        const [c, r] = chain[k];
        const site = w.near(c, r, 5).find(n => {
          if (n.kind === "burg") { const b = n.o; if (seen.has(b.i)) return false; return /harry|forage|shelter/.test(want) ? (b.population || 0) < 10 : want === "pilgrims" ? !!b.temple : /trade|procession|relay/.test(want) ? (b.population || 0) >= 1 : false; }
          return n.kind === "marker" && (/survey|search/.test(want) ? /ruin|dungeon|cave|wonder|portal|monument|statue|spring|waterfall|library/i.test(n.o.type) : want === "track" ? /monster|beast|dragon|troll|brigand/i.test(n.o.type) : false);
        });
        if (site) { seen.add(site.o.i); moments.push({ kind: "purpose", sub: want, tile: site.o.t, burg: site.kind === "burg" ? site.o.i : null, marker: site.kind === "marker" ? site.o.i : null, name: site.o.name }); }
      }
      for (const h of legHooks(i).filter(h => h.leg === i && /Border|disease|famine|disaster|invasion|rebels|war|regiment|monster|hardCrossing|cold|heat|wetland|desert/.test(h.kind)).sort((a, b) => b.strength * b.rel - a.strength * a.rel).slice(0, 2)) moments.push({ kind: "hook", sub: h.kind, tile: h.tile, text: h.text, zone: h.zone, marker: h.marker });
      legs.push({ i, fn, role, kind, carrier: R.carrier || null, what: R.what || null, objective, sea, moments, hook: best });
    }
    return { type, family: S.family, arc, shape, shapeName: AZ.SHAPES[shape].name, move: S.move, climax: S.climax, early: S.early, target: tcp, legs, hooks };
  };

  // ------------------------------------------------------------------ playing the arc
  G.arc = function () {
    const s = this.s;
    if (!this.jr || !s || s.mode === "sandbox") return null;
    if (!this._arc || this._arc.seed !== s.seed || this._arc.jr !== this.jr) this._arc = { seed: s.seed, jr: this.jr, plan: AZ.arcPlan(this.w, this.jr, s.seed) };
    s.story = s.story || { measure: 0, record: [], moments: {}, seek: null, opened: false, done: false };
    return this._arc.plan;
  };
  G.measureWords = function () { const A = this.arc(); if (!A) return ""; const m = U.clamp(Math.floor(this.s.story.measure), 0, 4); return `${A.arc.label}: ${A.arc.measure[m]}`; };
  G.storyNote = function (html, step = 0) { const st = this.s.story; st.measure = U.clamp(st.measure + step, 0, 4.99); st.record.push({ t: this.s.clock, html }); this.log(html, "hook"); this.dirty = true; };
  G.leaderName = function () { const tv = this.tv; if (tv.leads) return null; return tv.leader || (this.s.party || []).find(p => p.role === "leader")?.name || null; };
  G.objective = function () {
    const s = this.s, A = this.arc();
    if (!A || !s.story.opened) return "";
    if (s.done) return `${this.jr.J.name}: ${A.arc.endings[U.clamp(Math.floor(s.story.measure), 0, 4)]}`;
    if (s.story.seek && !s.story.seek.done) { const k = s.story.seek; return `Ask ${CARRIER_WORD[k.carrier] || "around"} ${/^near\b/i.test(k.place) ? k.place : `in ${k.place}`} about ${k.what}`; }
    if (s.cp <= 1) { const cp0 = this.jr.cps[0], pend = this.pendingActs ? this.pendingActs(cp0.place.burg && cp0.place.at ? cp0.place.burg : null) : []; if (pend.length) return `But first: ${pend[0].label.replace(/\s*\(.*\)$/, "")}`; }
    const leg = A.legs[s.cp];
    return leg ? leg.objective : "";
  };
  const started1 = G.started;
  G.started = function (...a) {
    const r = started1.apply(this, a), A = this.arc(), s = this.s;
    if (A && !s.story.opened && s.cp <= 1) { s.story.opened = true; this.formCompany(); this.storyQueue("open"); }
    return r;
  };
  // the company forms at the start for journeys that have one and no Gathering
  G.formCompany = function () {
    const s = this.s, jr = this.jr, A = AZ.ARCH[AZ.archOf(jr)] || {}, tv = this.tv;
    const gathers = jr.cps.some(cp => (cp.acts || []).some(a => a.id === "gather"));
    s.party = s.party || [];
    if (!s.party.length && (A.party || 0) > 0 && !gathers) {
      const b = jr.origin.burg || this.townNear(), rnd = U.rng(`${s.seed}:party`), leader = AZ.journeyLeader(this.w, jr);
      if (leader) s.party.push({ name: leader, role: "leader" });
      for (let i = 0; i < A.party; i++) s.party.push({ name: this.know.person(`party:${s.seed}:${i}`, rnd() < 0.7 && b ? b.culture : tv.culture), role: A.roles[i % A.roles.length] });
    }
    if (tv.tie && tv.tie.who && tv.tie.who.joins && s.party.length && !s.party.some(p => p.tie)) { const k = s.party.findIndex(p => p.role !== "leader"); if (k >= 0) s.party[k] = { ...s.party[k], name: tv.tie.who.name, tie: tv.tie.who.role }; }
    if (!tv.leads && !s.party.some(p => p.role === "leader") && tv.leader) { const k = s.party.findIndex(p => p.name === tv.leader); if (k >= 0) s.party[k] = { ...s.party[k], leads: true }; }
  };
  G.storyQueue = function (k) { const s = this.s; s.storyQ = s.storyQ || []; if (!s.storyQ.includes(k)) s.storyQ.push(k); };
  const tick6 = G.tick;
  G.tick = function (...a) {
    const r = tick6.apply(this, a), s = this.s;
    if (s && s.storyQ && s.storyQ.length && !this.ui.busy() && !this.anim) { const k = s.storyQ.shift(); this.playStory(k); }
    return r;
  };
  G.playStory = async function (k) {
    if (k === "open") return this.opening();
    if (typeof k === "string" && k.startsWith("m")) { const [, i, j] = k.split(":"); return this.moment(+i, +j); }
    if (typeof k === "string" && k.startsWith("arrive")) return this.arrival(+k.split(":")[1]);
    if (k === "climax") return this.climax();
  };
  G.opening = async function () {
    const s = this.s, w = this.w, tv = this.tv, jr = this.jr, A = this.arc(), P = w.P, o = jr.origin;
    const leg = A.legs[1], noun = AZ.noun(jr), lead = this.leaderName();
    const sun = AZ.Clock.light(s.clock, this.lat()), season = AZ.Clock.season(this.lat(), s.clock);
    const who = (s.party || []).filter(p => p.role !== "leader").map(p => `${U.esc(p.name)} (${U.esc(p.tie || p.role)})`).join(", ");
    const L = [`You are <b>${U.esc(tv.name)}</b>, ${U.esc(tv.trade)} of ${U.esc(P.burgs[tv.home]?.name || o.name)}, ${U.esc(P.cultures[tv.culture].name)} by birth and of the ${U.esc(P.religions[tv.faith]?.name || "old ways")} by faith. ${U.esc(tv.tie ? tv.tie.text : "")}`,
      `You stand in <b>${U.esc(o.name)}</b>, in ${season}, ${sun.phase === "night" ? "after dark" : "by day"}. ${lead ? `${U.esc(lead)} leads the ${U.esc(noun)}` : `The ${U.esc(noun)} is yours to lead`}${who ? `; with you go ${who}` : ""}.`,
      leg ? `${leg.objective}.` : "",
      `<b>${U.esc(this.objective())}.</b>`];
    await this.ui.say(L.filter(Boolean));
  };
  // moments: near their place on the current leg, once each
  const after8 = G.afterStep;
  G.afterStep = function (...a) {
    const r = after8.apply(this, a), s = this.s, A = this.arc();
    if (!A || s.done || !s.story.opened) return r;
    const leg = A.legs[s.cp];
    if (leg) leg.moments.forEach((m, j) => { const key = `m:${s.cp}:${j}`; if (!s.story.moments[key] && m.tile && Math.abs(m.tile[0] - s.c) + Math.abs(m.tile[1] - s.r) <= 3) { s.story.moments[key] = 1; this.storyQueue(key); } });
    if (s.story.seek && !s.story.seek.done && s.cp - 1 !== s.story.seek.cp && !this.atCp(this.jr.cps[s.story.seek.cp], 2)) s.story.seek = null; // you left without asking
    for (const k of Object.keys(s.cpVisit || {})) if (!this.atCp(this.jr.cps[k], 1)) delete s.cpVisit[k];
    return r;
  };
  G.moment = async function (i, j) {
    const s = this.s, w = this.w, A = this.arc(), m = A.legs[i] && A.legs[i].moments[j];
    if (!m) return;
    const town = m.burg != null ? w.P.burgs[m.burg] : this.townNear(), W = AZ.Prices.wage(w, town), lead = this.leaderName(), noun = AZ.noun(this.jr);
    if (m.kind === "purpose") {
      const P2 = {
        harry: [`<b>${U.esc(m.name)}</b> lies close, ${town ? `${U.esc(w.P.cultures[town.culture]?.name || "")} folk of the ${U.esc(w.P.religions[w.C.religion[town.cell]]?.name || "")}` : "a few huts"} ${T("data")}. ${lead ? `${U.esc(lead)} turns the company toward it.` : "The raiders look to you."}`,
          [{ label: lead ? "Go with them" : "Strike it", fx: () => ({ coin: U.rn(W * (3 + 2 * Math.min(5, (town && town.population) || 1)), 2), time: 6, morale: 5, stand: town ? [["s", town.state, -1]] : [], heat: town ? [town.state, 1] : null }), text: "You take what there is, and go before the country rises. (Raids in full come with Alpha 7.)", step: 0.5 },
           { label: lead ? "Stay with the boat" : "Let it be", fx: { morale: -5 }, text: lead ? "You keep the boat. The share for this one goes to those who went." : "The raiders grumble, and row on.", step: lead ? 0.25 : 0 }]],
        pilgrims: [`Pilgrims gather at the shrine of <b>${U.esc(m.name)}</b> ${T("data")}.`, [{ label: `Pray with them (🟡 ${AZ.Prices.alms(w, town)})`, fx: { coin: -AZ.Prices.alms(w, town), time: 3, stand: town ? [["f", w.C.religion[town.cell], 1]] : [] }, text: "You pray with strangers who are no longer strangers by evening.", step: 0.5 }, { label: "Walk on", fx: {}, text: "", step: 0 }]],
        trade: [`<b>${U.esc(m.name)}</b> has a market day ${T("new")}. ${lead ? `${U.esc(lead)} wants to stop and trade.` : "The company asks whether to stop."}`, [{ label: "Stop and trade", fx: () => { setTimeout(() => town && this.tradeGoods(town), 0); return { time: 4 }; }, text: "The stalls are open.", step: 0.5 }, { label: "Press on", fx: {}, text: "", step: 0 }]],
        forage: [`<b>${U.esc(m.name)}</b> has granaries ${T("new")}.`, [{ label: "Forage there", fx: { food: 3 * this.eaters(), time: 4, stand: town ? [["s", town.state, -1]] : [] }, text: "The village gives what it must.", step: 0.5 }, { label: `Pay for food (🟡 ${U.rn(3 * this.eaters() * AZ.Prices.ration(w, town), 2)})`, fx: { food: 3 * this.eaters(), coin: -U.rn(3 * this.eaters() * AZ.Prices.ration(w, town), 2), time: 2 }, text: "The village remembers who paid.", step: 0.25 }]],
        survey: [`<b>${U.esc(m.name)}</b> lies off the way ${T("data")}.`, [{ label: "Record it (4 h)", fx: { time: 4, reveal: 40 }, text: "Your notes grow.", step: 0.5 }, { label: "Go on", fx: {}, text: "", step: 0 }]],
        search: [`<b>${U.esc(m.name)}</b> is close ${T("data")}. It could be what the map means.`, [{ label: "Search it (6 h)", fx: { time: 6, reveal: 30 }, text: "A mark on a stone, matching the map.", step: 0.5 }, { label: "Go on", fx: {}, text: "", step: 0 }]],
        track: [`Near <b>${U.esc(m.name)}</b> the signs grow fresh ${T("data")}.`, [{ label: "Follow them (6 h)", roll: { p: 0.7, ok: "Tracks, and the smell of it.", okFx: { time: 6 }, bad: "It was waiting.", badFx: { time: 6, cond: "hurt" } }, step: 0.5 }, { label: "Keep to the road", fx: {}, text: "", step: 0 }]],
        shelter: [`<b>${U.esc(m.name)}</b> ${T("data")}: the company needs food and a roof.`, [{ label: "Ask for help", fx: () => { const R2 = this.regard ? this.regard(town, "Townsfolk") : { band: "neutral" }; return R2.band === "warm" || R2.band === "neutral" ? { food: 2 * this.eaters(), time: 2 } : { time: 2 }; }, text: () => { const R2 = this.regard ? this.regard(town, "Townsfolk") : { band: "neutral" }; return R2.band === "hostile" ? "They bar the doors." : R2.band === "cool" ? "Nothing to spare, they say." : "Bread, and a barn for the night."; }, step: 0.5 }, { label: "Go on", fx: {}, text: "", step: 0 }]],
        procession: [`<b>${U.esc(m.name)}</b> turns out to see you pass ${T("new")}.`, [{ label: "Stop and show yourselves", fx: { time: 3, stand: town ? [["s", town.state, 1]] : [] }, text: "Cheers, and a petition or two.", step: 0.5 }, { label: "Pass by", fx: {}, text: "", step: 0 }]],
        relay: [`<b>${U.esc(m.name)}</b> ${T("data")}.`, [{ label: "Go on", fx: {}, text: "", step: 0.25 }]],
      }[m.sub];
      if (!P2) return;
      const opts = P2[1].map(o => ({ ...o }));
      const k = await this.events.scene(`<b class="hook">${U.esc(AZ.noun(this.jr))}</b> · on the way`, P2[0], opts, `mom${i}:${j}`);
      const o = opts[k]; if (o) { const fx = typeof o.fx === "function" ? null : o.fx; if (o.heat || (fx && fx.heat)) this.addHeat && this.addHeat(...(o.heat || fx.heat)); this.storyNote(`${U.esc(m.name)}: ${U.esc(o.label.replace(/\s*\(.*\)$/, "").toLowerCase())}.`, o.step || 0); }
      return;
    }
    // a hook, as the world shows it
    const kind = m.sub, txt = m.text, here = this.townNear();
    let head = "", opts = [];
    if (kind === "faithBorder") { head = `The roadside shrines change: this is ${U.esc(txt.replace(/^where the .* gives way to the /, "the country of the "))} ${T("data")}. In the next town they will ask what you worship.`; opts = [{ label: `Leave something at a shrine (🟡 ${AZ.money("offering", here) / 4 | 0 || 0.1})`, fx: { coin: -Math.max(0.1, U.rn(AZ.money("offering", here) / 4, 2)), time: 1 }, text: "A small courtesy, noticed." }, { label: "Walk on", fx: {}, text: "" }]; }
    else if (kind === "cultureBorder") { head = `The talk on the road changes: ${U.esc(txt.replace(/^where the /, "the "))} ${T("data")}. Prices will be a stranger's where you have no words.`; opts = [{ label: "Go on", fx: {}, text: "" }]; }
    else if (kind === "stateBorder") { const fine = AZ.money("fine", here) / 4; head = `A toll post: ${U.esc(txt)} ${T("data")}.`; opts = [{ label: `Pay the toll (🟡 ${U.rn(fine, 2)})`, disabled: s.purse < fine, fx: { coin: -U.rn(fine, 2), time: 1 }, text: "The bar lifts." }, { label: "Go round by back ways (8 h)", fx: { time: 8 }, text: "Nobody stops you." }]; }
    else if (/disease/.test(kind)) { const heal = AZ.Prices.heal(w, here); head = `Quarantine flags on the road: ${U.esc(txt)} ${T("data")}.`; opts = [{ label: "Hurry through", roll: { p: 0.6, ok: "You pass, coughing only from the dust.", okFx: {}, bad: "The sickness finds you.", badFx: { cond: "fever" } } }, { label: `Buy remedies first (🟡 ${heal})`, disabled: s.purse < heal, fx: { coin: -heal, time: 2 }, text: "Bitter herbs, and the fever passes you by." }, { label: "Wait for it to pass (24 h)", fx: { time: 24 }, text: "A day lost, and nobody ill." }]; }
    else if (/famine|disaster/.test(kind)) { head = `Beggars at the roadside: ${U.esc(txt)} ${T("data")}.`; opts = [{ label: `Share your food (${2 * this.eaters()} rations)`, disabled: s.sup.food < 2 * this.eaters(), fx: { food: -2 * this.eaters(), stand: here ? [["s", here.state, 1]] : [] }, text: "They will remember it." }, { label: "Keep your food and go on", fx: {}, text: "They watch you go." }]; }
    else if (/war|regiment|invasion|rebels/.test(kind)) { head = `Soldiers on the road: ${U.esc(txt)} ${T("data")}.`; opts = [{ label: "Show your face and go on", roll: { p: 0.7, ok: "They wave you through.", okFx: { time: 1 }, bad: "Questions, and a fee for answers.", badFx: { time: 6, coin: -AZ.money("fine", here) } } }, { label: "Go round them (8 h)", fx: { time: 8 }, text: "A long way round, and a quiet one." }]; }
    else if (/monster/.test(kind)) { const toll = AZ.money("tollRebels", here); head = `Something on the road ahead: ${U.esc(txt)} ${T("data")}.`; opts = [{ label: "Stand and face it", roll: { p: A.family === "power" || /Raid|Monster|Mercenary/.test(A.type) ? 0.7 : 0.45, ok: "It breaks and runs.", okFx: { time: 2, morale: 5 }, bad: "You get through, bloodied.", badFx: { time: 4, cond: "hurt" } } }, { label: "Go round it (12 h)", fx: { time: 12 }, text: "A long detour, but a quiet one." }, { label: `Pay the locals to guide you round (🟡 ${U.rn(toll / 4, 2)})`, disabled: s.purse < toll / 4, fx: { coin: -U.rn(toll / 4, 2), time: 4 }, text: "They know the paths." }]; }
    else { head = `${U.cap(U.esc(txt))} ${T("data")}. The company looks to ${lead ? U.esc(lead) : "you"}.`; opts = [{ label: "Go slowly, and spare yourselves (24 h)", fx: { time: 24, food: -this.eaters() }, text: "A day lost, and a day's food, but nobody falls." }, { label: "Push on", fx: { cond: kind === "wetland" ? "fever" : "tired", morale: -5 }, text: "You make the distance, and pay for it in your bones." }]; }
    const k = await this.events.scene(`<b class="hook">On the way</b>`, head, opts, `momh${i}:${j}`);
    if (opts[k]) this.storyNote(`${U.esc(U.cap(txt))}: ${U.esc(opts[k].label.replace(/\s*\(.*\)$/, "").toLowerCase())}.`, kind === "hardCrossing" || kind === "monster" ? 0.25 : 0);
  };
  // arriving: the leg's role completes; a seek waits for the right person; the target holds the climax
  G.arrival = async function (i) {
    const s = this.s, A = this.arc(), leg = A.legs[i], cp = this.jr.cps[i];
    if (!leg) return;
    const step = { purpose: 0.25, endure: 0.25, cross: 0.25, escape: 0.25, settle: 0.25, search: 0.5, seek: 0, mislead: 0 }[leg.kind] || 0.25;
    this.storyNote(`Reached ${U.esc(cp.place.name)}.`, step);
    if ((leg.kind === "seek" || leg.kind === "mislead") && cp.place.burg) s.story.seek = { cp: i, place: cp.place.name, carrier: leg.carrier, what: leg.what, mislead: leg.kind === "mislead", done: false };
    if (i === A.target && i < this.jr.cps.length - 1) this.storyQueue("climax");
    const next = A.legs[i + 1];
    if (next && !s.story.seek) await this.ui.say([`${U.esc(cp.place.name)}. ${next.objective}.`]);
  };
  // the person the story needs: a seek completes when you ask them
  G.storyTalk = function (b, role) {
    const s = this.s, k = s.story && s.story.seek;
    if (!k || k.done || !this.jr.cps[k.cp]?.place.burg || this.jr.cps[k.cp].place.burg !== b) return null;
    const match = !k.carrier || k.carrier === role || (k.carrier === "Priest" && /Shrine|Priest/.test(role)) || (k.carrier === "Innkeeper" && /Host|Innkeeper/.test(role)) || (k.carrier === "Captain of the watch" && /Elder|Captain/.test(role));
    if (!match) return null;
    k.done = true;
    const A = this.arc(), next = A.legs[k.cp + 1], nextName = next ? this.jr.cps[k.cp + 1].place.name : null;
    this.storyNote(`In ${U.esc(k.place)} you learned of ${U.esc(k.what)}.`, k.mislead ? 0 : 0.5);
    if (k.mislead) return `<b class="hook">About ${U.esc(k.what)}:</b> what they tell you sounds right, and is wrong; you will find it out on the road${nextName ? ` to ${U.esc(nextName)}` : ""}. ${T("new")}`;
    return `<b class="hook">About ${U.esc(k.what)}:</b> they tell you what you came to learn${nextName ? `, and point you on to ${U.esc(nextName)}` : ""} ${T("new")}.`;
  };
  // a later stop reached early: count it now, or only visit (from Alpha 5)
  const check1 = G.checkCheckpoints;
  G.checkCheckpoints = function () {
    const s = this.s, jr = this.jr, w = this.w;
    if (!jr || s.done || s.mode === "sandbox") return check1.call(this);
    for (let k = s.cp + 1; k < jr.cps.length; k++) {
      const cp = jr.cps[k];
      if (!(cp.place.burg && cp.place.at && w.burgAt.get(w.idx(s.c, s.r)) === cp.place.burg) || !this.atCp(cp, 1)) continue;
      s.cpOk = s.cpOk || {}; s.cpVisit = s.cpVisit || {};
      if (s.cpOk[k]) break;
      if (s.cpVisit[k] || this.ui.busy()) return;
      s.cpVisit[k] = s.clock;
      this.outOfOrder(k);
      return;
    }
    const before = s.cp, r = check1.call(this);
    if (this.arc() && s.cp > before && !s.done) this.storyQueue(`arrive:${s.cp - 1}`);
    return r;
  };
  G.outOfOrder = async function (k) {
    const s = this.s, jr = this.jr, cp = jr.cps[k], A = this.arc(), last = k === jr.cps.length - 1;
    const skipped = jr.cps.slice(s.cp, k).map(c => c.place.name);
    const cost = { plunder: "You have no plunder and no proof, and you have not been gone long enough: your backers will not believe you.", vow: "The vow is left unkept, and the faithful will know it.", contract: "The contracts along the way are broken, and the merchants will remember.", orders: "Your orders are left undone, and that will be reported.", message: "The message arrives incomplete and early, and its reader will wonder why.", refuge: "You are safe here, if not where you meant to be.", nothing: "Whatever lay along the way stays unfound." }[A ? A.early : "nothing"];
    const k2 = await this.ui.choose(`<b class="hook">${U.esc(cp.place.name)}</b> is a later stop of the journey, reached before ${U.esc(skipped.join(", "))} ${T("mixed")}.${last ? ` Counting it now ends the ${U.esc(AZ.noun(jr))}. ${U.esc(cost)}` : " Counting it now skips the stops between."}`,
      [{ label: last ? `End the ${U.esc(AZ.noun(jr))} here, out of order` : "Count it now, and skip the stops between" }, { label: "Only visit: the journey goes on as planned" }], { cancel: 1 });
    if (k2 !== 0) { this.ui.toast(`A visit to ${U.esc(cp.place.name)}: the journey goes on.`); return; }
    s.cpOk[k] = true; s.outOfOrder = true;
    if (last && A) { s.storyEarly = A.early; const o = jr.origin.burg, rel = this.tv.faith; const fx = { plunder: { stand: o ? [["s", o.state, -2]] : [] }, vow: { stand: rel != null ? [["f", rel, -1]] : [] }, contract: { stand: o ? [["s", o.state, -1]] : [] }, orders: { stand: o ? [["s", o.state, -2]] : [] } }[A.early] || {}; this.events.fx(fx, "The journey ended out of order."); this.storyNote("The journey ended out of order.", -1); }
    this.checkCheckpoints();
  };
  // the climax: at the target, with the company
  G.climax = async function () {
    const s = this.s, w = this.w, A = this.arc(), cp = this.jr.cps[A.target], town = cp.place.burg, W = AZ.Prices.wage(w, town);
    if (s.story.climaxed) return; s.story.climaxed = true;
    const needCo = (AZ.ARCH[A.type]?.party || 0) > 0, present = !needCo || ((s.party || []).length > 0 && !s.partyAway);
    const v = s.vessel, farBoat = A.climax === "plunder" && v && v.mode === "company" && Math.hypot(v.c - s.c, v.r - s.r) > 12;
    const opts = this.climaxOptions(A, town, W, present, farBoat);
    const k = await this.events.scene(`<b class="hook">${U.esc(cp.place.name)}</b>`, `${U.esc(STRIKE[A.climax] ? STRIKE[A.climax](cp.place.name) : cp.place.name)}.${!present ? " The company is not with you." : farBoat ? ` The company's ${U.esc(v.kind.toLowerCase())} lies far off: there will be no quick way out.` : ""}`, opts, "climax");
    const o = opts[k]; if (o) this.storyNote(`${U.esc(cp.place.name)}: ${U.esc(o.label.replace(/\s*\(.*\)$/, "").toLowerCase())}.`, o.step ?? 1.5);
  };
  G.climaxOptions = function (A, town, W, present, farBoat) {
    const s = this.s, w = this.w, o = this.jr.origin.burg, rel = town ? w.C.religion[town.cell] : this.tv.faith;
    switch (A.climax) {
      case "plunder": {
        if (!present) return [{ label: "Wait for the company", fx: { time: 6 }, text: "Without them there is no raid.", step: 0 }];
        const take = U.rn(Math.min(Math.max(0, (town && town.treasury) || 0) * 0.2 + 20 * W, 60 * W), 2), p = (town && town.walls ? 0.5 : 0.75) - (farBoat ? 0.2 : 0);
        return [{ label: "Strike", roll: { p, ok: `You take what you came for: 🟡 ${take}.`, okFx: { coin: take, time: 6, stand: town ? [["s", town.state, -3]] : [] }, bad: "The town is ready for you. You get away with little.", badFx: { coin: U.rn(take * 0.2, 2), time: 6, cond: "hurt", stand: town ? [["s", town.state, -2]] : [] } }, step: 1.5, heat: town ? [town.state, 3] : null }, { label: "Hold back: the risk is too great", fx: {}, text: "You turn away with nothing.", step: 0 }];
      }
      case "rite": { const alms = AZ.Prices.alms(w, town); return [{ label: `Keep the rites (🟡 ${alms})`, disabled: s.purse < alms, fx: { coin: -alms, time: 4, stand: rel != null ? [["f", rel, 2]] : [], cure: ["tired"] }, text: "It is done, as the faithful have done it for generations.", step: 1.5 }, { label: "Stand at the edge and watch", fx: { time: 2 }, text: "You came, and you saw.", step: 0.5 }]; }
      case "sale": return [{ label: "Open the market", fx: () => { setTimeout(() => town && this.tradeGoods(town), 0); return {}; }, text: "The goods are laid out.", step: 1.5 }];
      case "message": { const late = Math.max(0, s.clock - (this.jr.cps[A.target].parArrive || s.clock)), pay = U.rn(W * (late < 24 ? 30 : 15), 2); return [{ label: "Deliver the message", fx: { coin: pay }, text: late < 24 ? "On time. The reader pays well." : "Late. The reader pays, and is not pleased.", step: late < 24 ? 1.5 : 0.5 }]; }
      case "survey": return [{ label: "Survey the country", fx: { time: 12, reveal: 200, coin: U.rn(20 * W, 2) }, text: "Your notes fill the last pages of the journal.", step: 1.5 }];
      case "dig": return [{ label: "Dig (12 h)", roll: { p: 0.35 + 0.1 * Math.floor(s.story.measure), ok: "Iron on iron: a box, and in it what you came for.", okFx: { time: 12, coin: U.rn(50 * W, 2) }, bad: "Rock, and more rock.", badFx: { time: 12 } }, step: 1.5 }, { label: "Leave it buried", fx: {}, text: "Some things should stay where they are.", step: 0 }];
      case "hunt": return [{ label: "Hunt it down", roll: { p: 0.35 + 0.1 * Math.floor(s.story.measure), ok: "It is done. The town will pay.", okFx: { time: 12, coin: U.rn(30 * W, 2) }, bad: "It gets away, and you carry the marks of it.", badFx: { time: 12, cond: "hurt" } }, step: 1.5 }, { label: "Let it be", fx: {}, text: "", step: 0 }];
      case "refuge": { const inn = AZ.Prices.inn(w, town); return [{ label: `Find shelter (🟡 ${inn})`, disabled: s.purse < inn, fx: { coin: -inn, sleep: true, time: 8, stand: town ? [["s", town.state, 1]] : [] }, text: "A roof, and people who let you stay.", step: 1.5 }, { label: "Sleep rough and look for work", fx: { time: 12 }, text: "It will do, for now.", step: 0.5 }]; }
      case "audience": return [{ label: "Present yourself at court", fx: { time: 6, stand: town ? [["s", town.state, 2]] : [] }, text: "You are heard.", step: 1.5 }];
      case "battle": return [{ label: "Join the fight", roll: { p: 0.6, ok: "The day is yours.", okFx: { time: 12, coin: U.rn(30 * W, 2), stand: o ? [["s", o.state, 2]] : [] }, bad: "You live to be paid.", badFx: { time: 12, coin: U.rn(10 * W, 2), cond: "hurt" } }, step: 1.5 }];
      case "deed": return [{ label: "See it through", fx: { time: 6, coin: AZ.coin(10, town) }, text: "It is done, and the company knows it.", step: 1.5 }];
      default: return [{ label: "Rest here a while", fx: { time: 8, rest: true }, text: "", step: 1 }];
    }
  };
  const finish1 = G.finish;
  G.finish = async function (msg) {
    const s = this.s, A = this.arc();
    if (A && !s.storyEarly && !s.story.climaxed && A.target === this.jr.cps.length - 1) await this.climax();
    if (A) { const m = U.clamp(Math.floor(s.story.measure), 0, 4); this.storyNote(`The end of it: ${U.esc(A.arc.endings[m])}.`, 0); }
    await finish1.call(this, A ? `${msg || ""} ${U.esc(U.cap(A.arc.endings[U.clamp(Math.floor(s.story.measure), 0, 4)]))}.` : msg);
    if (s.party && s.party.length) await this.disband();
  };
  // morale, food and suspicion as effects
  const fx1 = AZ.Events.prototype.fx;
  AZ.Events.prototype.fx = function (e, label) {
    if (e && (e.morale || e.food || e.heat)) {
      const s = this.g.s, bits = [];
      if (e.morale) { s.partyMorale = U.clamp((s.partyMorale ?? 70) + e.morale, 0, 100); if (s.vessel && s.vessel.mode === "company") s.vessel.morale = U.clamp((s.vessel.morale ?? 70) + e.morale, 0, 100); }
      if (e.food) { s.sup.food = Math.max(0, s.sup.food + e.food); bits.push(`${e.food > 0 ? "+" : ""}${e.food} rations`); }
      if (e.heat && this.g.addHeat) this.g.addHeat(...e.heat);
      const rest = { ...e }; delete rest.morale; delete rest.food; delete rest.heat;
      const out = fx1.call(this, rest, label);
      return bits.length ? `${out} <span class="dim">(${bits.join(", ")})</span>` : out;
    }
    return fx1.call(this, e, label);
  };
  // scenes pass a roll's or an option's suspicion on
  const scene0 = AZ.Events.prototype.scene;
  AZ.Events.prototype.scene = async function (head, note, options, key) {
    const k = await scene0.call(this, head, note, options, key), o = options.filter(x => x.if === undefined || x.if)[k];
    if (o && o.heat && this.g.addHeat) this.g.addHeat(...o.heat);
    return options.indexOf(o) >= 0 ? options.indexOf(o) : k;
  };

  // ------------------------------------------------------------------ the end of the journey: each companion chooses
  G.disband = async function () {
    const s = this.s, b = this.townNear(), W = AZ.Prices.wage(this.w, b), keep = [];
    const hired = /sword|guard|drover|cook|raider|steersman|scout|archer|sergeant|porter|digger|map-reader|tracker|hunter|trapper|lookout|fence|rigger|navigator|aeronaut|secretary|chamberlain|herald|courtier|surgeon|quartermaster|captain|caravan master/i;
    const kin = /pilgrim|apprentice|servant|elder|neighbour|child/i;
    for (const p of s.party.slice()) {
      const m = s.partyMorale ?? 70, wage = U.rn(1.5 * W, 2);
      const lean = p.tie && KIN.includes(p.tie) ? (m >= 30 ? "would stay with you: you are family" : "goes home, and will tell the family how it went") : p.role === "leader" ? "goes their own way: the journey was theirs" : hired.test(p.role) ? (m >= 50 ? `would stay for 🟡 ${wage} a day` : "takes their pay and goes") : kin.test(p.role) ? (m >= 40 ? "would stay with you" : "goes their own way") : m >= 70 ? "might stay, if you ask" : "goes home";
      const can = !/goes|takes/.test(lean);
      const k = await this.ui.choose(`<b>${U.esc(p.name)}</b> (${U.esc(p.tie || p.role)}) ${lean} ${T("mixed")}.`, [{ label: can ? "Ask them to stay" : "Thank them" }, { label: "Part ways" }], { cancel: 1 });
      if (k === 0 && can) keep.push({ ...p, wage: hired.test(p.role) ? wage : 0 });
      else this.log(`${U.esc(p.name)} went their own way.`);
    }
    s.party = keep;
    const v = s.vessel;
    if (v && v.mode === "company") { v.mode = "owned"; v.crew = 0; this.ui.toast(`The company's ${U.esc(v.kind.toLowerCase())} is yours now: an owner's vessel, with no hands until you hire them.`); }
    this.dirty = true;
  };
  const nd8 = G.newDay;
  G.newDay = function (...a) {
    const r = nd8.apply(this, a), s = this.s;
    if (s.done && s.party && s.party.length && !s.carefree) for (const p of s.party.slice()) if (p.wage) { if (s.purse >= p.wage) s.purse = U.rn(s.purse - p.wage, 2); else { s.party = s.party.filter(x => x !== p); this.ui.toast(`${U.esc(p.name)} goes: you could not pay them.`); } }
    return r;
  };
  // the old beat engine is retired: its report helper builds the new plan
  AZ.storyPlan = AZ.arcPlan;
})();
