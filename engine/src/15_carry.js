// =============================================================================================
// 15_carry.js · travellers, the company, carrying and camp (from Alpha 6's 15_journeys.js,
// 16_stops.js and 18_carry.js, which the libraries depend on).
//   Journey types (the map's archetypes) set the traveller's role and the company. The company
//   speaks for the traveller's state: tiredness, hunger, the dark (with no company, the traveller
//   thinks it aloud). What you cannot carry stays in your vessel's hold; camp depends on the place.
// =============================================================================================
AZ.ARCH = {
  Pilgrimage: { noun: "pilgrimage", party: 2, roles: ["fellow pilgrim", "guide"], role: "Pilgrim" },
  Quest: { noun: "quest", party: 3, roles: ["sword-for-hire", "guide", "healer"], role: "Questing adventurer" },
  Caravan: { noun: "caravan", party: 4, roles: ["caravan master", "guard", "drover", "cook"], role: "Caravan hand" },
  "Military campaign": { noun: "campaign", party: 4, roles: ["sergeant", "scout", "surgeon", "quartermaster"], role: "Soldier on campaign" },
  Embassy: { noun: "embassy", party: 3, roles: ["ambassador", "secretary", "guard"], role: "Member of the embassy" },
  Raid: { noun: "raid", party: 4, roles: ["raider", "scout", "steersman"], role: "Raider" },
  "Smuggling run": { noun: "smuggling run", party: 2, roles: ["fence", "lookout"], role: "Smuggler" },
  "Courier ride": { noun: "ride", party: 0, roles: [], role: "Courier" },
  Expedition: { noun: "expedition", party: 3, roles: ["surveyor", "naturalist", "porter"], role: "Expedition member" },
  "Refugee flight": { noun: "flight", party: 3, roles: ["elder", "neighbour", "child"], role: "Refugee" },
  "Treasure hunt": { noun: "treasure hunt", party: 2, roles: ["map-reader", "digger"], role: "Treasure hunter" },
  "Monster hunt": { noun: "hunt", party: 3, roles: ["tracker", "hunter", "trapper"], role: "Monster hunter" },
  "Exile's flight": { noun: "exile", party: 1, roles: ["loyal servant"], role: "Exile" },
  "Royal progress": { noun: "progress", party: 4, roles: ["courtier", "herald", "guard", "chamberlain"], role: "Courtier" },
  "Airship voyage": { noun: "voyage", party: 3, roles: ["aeronaut", "rigger", "navigator"], role: "Aeronaut" },
  "Arcane errand": { noun: "errand", party: 1, roles: ["apprentice"], role: "Apprentice of the arcane" },
  "Mercenary contract": { noun: "contract", party: 4, roles: ["captain of the company", "sergeant", "archer"], role: "Mercenary" },
  Wandering: { noun: "wandering", party: 0, roles: [], role: "Wanderer" },
};
AZ.archOf = jr => {
  if (!jr) return "Wandering";
  const t = jr.J.type;
  if (t && AZ.ARCH[t]) return t;
  return Object.keys(AZ.ARCH).find(k => new RegExp(`\\b${k.split(" ")[0]}`, "i").test(jr.J.name)) || "Quest";
};
AZ.noun = jr => AZ.ARCH[AZ.archOf(jr)].noun;
AZ.OWN_TRANSPORT = new Set(["Raid", "Military campaign", "Expedition", "Mercenary contract", "Royal progress", "Smuggling run"]);
AZ.TRAITS = {
  "long-legged": { label: "long-legged", text: "you walk faster than most (+15%)" },
  haggler: { label: "a haggler", text: "you buy 10% cheaper and sell 10% dearer" },
  "sea legs": { label: "sea legs", text: "you can work a passage, and you fish better" },
  hardy: { label: "hardy", text: "hunger and fever bite less" },
  "well-connected": { label: "well-connected", text: "news reaches you faster, and errands pay a fifth more" },
};
// why the journey goes where it goes, by type, from the data
AZ.whyDest = function (w, jr) {
  const U = AZ.U, T = AZ.T, P = w.P, arch = AZ.archOf(jr), noun = AZ.noun(jr), o = jr.origin.burg, d = jr.dest.burg;
  if (!d) return `The ${noun} ends at ${U.esc(jr.dest.name)} ${T("data")}.`;
  const ds = P.states[d.state], os = o && P.states[o.state], stance = os && ds && o.state !== d.state ? os.diplomacy?.[d.state] || "Unknown" : null;
  const end = `${U.esc(d.name)}, ${U.esc(d.group)} of ${U.esc(ds?.fullName || "unclaimed land")}`, rel = P.religions[w.C.religion[d.cell]];
  if (arch === "Pilgrimage") return `Its end is ${end}, which keeps the ${U.esc(rel?.name || "old ways")} ${T("data")}: that is why a pilgrim goes there.`;
  if (arch === "Raid") return `Its end is ${end}: a treasury of 🟡 ${U.num(d.treasury || 0, 1)}${d.walls ? ", behind walls" : ", unwalled"} ${T("data")}.`;
  if (arch === "Caravan") { const g = Object.keys(P.trade.sell[o?.i] || {}).find(x => (P.trade.buy[d.i] || {})[x]); return `Its end is ${end}${g ? `, which buys the ${U.esc(P.goods.find(x => x.i === +g)?.name.toLowerCase())} that ${U.esc(o.name)} sells` : ""} ${T("data")}.`; }
  if (arch === "Embassy") return `Its end is ${end}${stance ? `; the two courts stand as “${stance}”` : ""} ${T("data")}.`;
  return `Its end is ${end} ${T("data")}.`;
};

(() => {
  const G = AZ.Game.prototype, U = AZ.U, T = AZ.T;
  G.riding = function () { const s = this.s, v = s && s.voyage; return !!(v && s.aboard && (v.state === "sea" || v.boarded)); };

  // ------------------------------------------------------------------ travellers: the journey's type, free roaming, traits
  const kinds0 = AZ.travellerKinds;
  AZ.travellerKinds = function (w, jr) {
    const kinds = kinds0(w, jr), arch = AZ.archOf(jr);
    if (!jr || arch === "Pilgrimage") return kinds;
    const A = AZ.ARCH[arch], noun = A.noun, oB = jr.origin.burg, dB = jr.dest.burg, C = w.C;
    const out = kinds.filter(k => k.id !== "convert").map(k => {
      const why0 = k.why, k2 = { ...k, why: h => (why0 ? why0(h) : k.blurb).replace(/pilgrimage/g, noun).replace(/you are going home to make the \w+ you were promised as a child/, `the ${noun} takes you home`) };
      if (k.id === "returning") { k2.label = `Native of ${w.P.states[dB.state]?.name || dB.name}`; k2.blurb = `Born in ${w.P.states[dB.state]?.name || dB.name}; the ${noun} takes you home.`; k2.why = h => `you were born in ${h.name}, and the ${noun} takes you home`; k2.thread = null; }
      return k2;
    });
    out.unshift({ id: "arch", label: A.role, wt: 5, culture: C.culture[oB.cell], faith: C.religion[oB.cell], homes: [oB], blurb: `The ${noun}: ${jr.J.name}.`,
      trades: A.roles.length ? A.roles : ["traveller"], why: () => `you have joined the ${noun}, “${jr.J.name}”, from ${oB.name} to ${dB.name}`, thread: null });
    return out;
  };
  AZ.sandboxKinds = function (w, b) {
    const P = w.P, cul = b.culture, rel = w.C.religion[b.cell], out = [];
    out.push({ id: "native", label: `Native of ${b.name}`, wt: 3, culture: cul, faith: rel, homes: [b], blurb: `${P.cultures[cul].name}, of the ${P.religions[rel]?.name}.`, trades: ["farmhand", "clerk", "carter", "weaver"], why: () => `you grew up in ${b.name}, and everything beyond it is rumour`, purse: 40 });
    const sells = Object.keys(P.trade.sell[b.i] || {});
    if (sells.length) out.push({ id: "merchant", label: `Merchant of ${b.name}`, wt: 2, culture: cul, faith: rel, homes: [b], cargo: +sells[0], blurb: `You deal in what ${b.name} makes.`, trades: ["merchant", "pedlar", "factor"], why: () => `you deal in what ${b.name} makes, and the world is your market`, purse: 80 });
    const R = P.religions[rel], seat = R && P.burgs.find(x => x && x.cell === R.center);
    if (seat && seat !== b) out.push({ id: "pilgrim", label: `Pilgrim bound for ${seat.name}`, wt: 1.5, culture: cul, faith: rel, homes: [b], blurb: `${seat.name} is the seat of your faith.`, trades: ["pilgrim", "lay brother", "widow"], why: () => `you keep the ${R.name}, and you have always meant to see ${seat.name}`, purse: 30,
      thread: { title: `To ${seat.name}`, steps: [{ text: `Pray at the temple of ${seat.name}`, goal: { burg: seat.i, role: "Priest" }, reward: { stand: [["f", rel, 2]] } }] } });
    if (b.port) out.push({ id: "shipmaster", label: `Shipmaster of ${b.name}`, wt: 1, culture: cul, faith: rel, homes: [b], boat: true, blurb: "You own a sailing boat.", trades: ["shipmaster", "coasting skipper"], why: () => `you own a sailing boat in ${b.name}`, purse: 25 });
    out.push({ id: "wanderer", label: "Wanderer", wt: 1, culture: cul, faith: rel, homes: [b], blurb: "No ties, no plan.", trades: ["tinker", "minstrel", "tracker"], why: () => "you left home long ago and have not stopped since", purse: 20 });
    return out;
  };
  const make0 = AZ.makeTraveller;
  AZ.makeTraveller = function (w, jr, seed, kindId, start) {
    let tv;
    if (!jr) {
      const b = w.P.burgs[start] || w.P.burgs.find(x => x && x.capital), kinds = AZ.sandboxKinds(w, b), rnd = U.rng(seed);
      let K = kinds.find(k => k.id === kindId);
      if (!K) { let roll = rnd() * kinds.reduce((a, k) => a + k.wt, 0); K = kinds[0]; for (const k of kinds) if ((roll -= k.wt) <= 0) { K = k; break; } } else rnd();
      const cul = w.P.cultures[K.culture], rel = w.P.religions[K.faith], cloak = U.shade(U.hex2rgb(cul.color || "#806040"), -0.35), deity = (rel?.deity || "").split(",")[0];
      tv = { seed, kind: K.id, kindLabel: K.label, name: w.names.get(cul.base, rnd), age: 18 + Math.floor(rnd() * 44), culture: K.culture, faith: K.faith, home: b.i, homeState: b.state,
        trade: rnd.pick(K.trades), why: K.why(b), token: deity ? `a small icon of ${deity}` : "a keepsake from home", purse: K.purse, thread: K.thread || null, cargo: K.cargo ?? null, boat: !!K.boat, food: 3, kindId: K.id,
        pal: { cloak: U.css(cloak), cloakDark: U.css(U.shade(cloak, -0.35)), skin: rnd.pick(["rgb(240,204,170)", "rgb(214,170,130)", "rgb(176,124,88)", "rgb(124,84,58)"]), belt: "rgb(150,110,60)" } };
    } else tv = make0(w, jr, seed, kindId);
    const r2 = U.rng(`${seed}:trait`), pool = Object.keys(AZ.TRAITS);
    tv.purse = Math.max(5, Math.round(tv.purse * (0.75 + 0.5 * r2())));
    tv.trait = /deck|net|fish|cook|shipmaster|skipper|steersman/i.test(tv.trade) ? "sea legs" : /soldier|archer|sergeant|scout|raider|mercenary/i.test(tv.kindLabel + tv.trade) && r2() < 0.5 ? "hardy" : pool[Math.floor(r2() * pool.length)];
    return tv;
  };
  const canCrew0 = G.canCrew;
  G.canCrew = function () { return this.tv.trait === "sea legs" || canCrew0.call(this); };

  // ------------------------------------------------------------------ the company, and the voice that speaks for your state
  G.formParty = function (b, quiet) {
    const s = this.s, A = AZ.ARCH[AZ.archOf(this.jr)];
    if (!A || !A.party || (s.party && s.party.length)) return [];
    const cul = b ? b.culture : this.tv.culture;
    s.party = A.roles.slice(0, A.party).map((role, i) => ({ name: this.know.person(`party:${s.seed}:${i}`, cul), role }));
    this.log(`The company: ${s.party.map(p => `${U.esc(p.name)} (${p.role})`).join(", ")}.`, "hook");
    if (!quiet) this.ui.toast(`The company is with you: ${s.party.map(p => U.esc(p.name)).join(", ")}.`, "gold");
    return s.party;
  };
  G.voice = function () { const p = (this.s && this.s.party || [])[0]; return p ? { name: p.name, role: p.role } : { name: this.tv ? this.tv.name : "", role: "you", self: true }; };
  G.voiceName = function () { const v = this.voice(); return `${U.esc(v.name)}${v.self ? "" : ` · ${U.esc(v.role)}`}`; };
  // a line said once in a while: by your first companion, or thought aloud when you travel alone
  G.speak = function (self, key, other) {
    const s = this.s;
    if (!s || s.carefree) return;
    const k = key || self;
    if (s.said[k] != null && s.clock - s.said[k] < 20) return;
    s.said[k] = s.clock;
    const v = this.voice(), line = v.self ? `<i>${self}</i>` : `“${other || self}”`;
    this.log(`${U.esc(v.name)}: ${(v.self ? self : other || self).replace(/<[^>]+>/g, "")}`);
    this._speech.push(line);
  };
  const awake0 = G.awakeTick;
  G.awakeTick = function (h) {
    const s = this.s, t0 = !!s.cond.tired, e0 = !!s.cond.exhausted;
    awake0.call(this, h);
    if (!e0 && s.cond.exhausted) this.speak(`I have been awake ${Math.round(s.awake)} hours. Everything takes longer now; I must sleep, or I will drop where I stand.`, "exhausted", `You have been on your feet ${Math.round(s.awake)} hours. Sleep, or you will drop where you stand.`);
    else if (!t0 && s.cond.tired) this.speak("I feel tired. I should make camp soon.", "tired", "You look tired. We should make camp soon.");
  };

  // ------------------------------------------------------------------ food: a town spares only so much each week
  G.foodLeft = function (b, f) {
    const rec = (this.s.foodTaken || {})[b.i], recent = rec ? rec.n * Math.max(0, 1 - (this.s.clock - rec.t) / 168) : 0;
    return Math.max(0, Math.floor(f.rations - recent));
  };
  G.foodTook = function (b, n) {
    const s = this.s; s.foodTaken = s.foodTaken || {};
    const rec = s.foodTaken[b.i], recent = rec ? rec.n * Math.max(0, 1 - (s.clock - rec.t) / 168) : 0;
    s.foodTaken[b.i] = { t: s.clock, n: recent + n };
    this.doAct("resupply");
  };

  // ------------------------------------------------------------------ camping depends on the place
  G.campNight = async function () {
    const s = this.s, w = this.w, c = s.c, r = s.r, cell = w.cell(c, r), lat = this.lat();
    const b = w.P.biomes[w.C.biome[cell]], look = w.biomeLook[w.C.biome[cell]];
    const today = AZ.Clock.today(w.tempC(c, r), lat, s.clock, false), wx = this.weather(), t0 = s.clock, L = [];
    s.clock = AZ.Clock.nextDawn(s.clock, lat);
    let rest = 0;
    const water = w.bits(c, r).river || [[0, 1], [1, 0], [0, -1], [-1, 0]].some(([a, b2]) => w.inb(c + a, r + b2) && !w.isLand(c + a, r + b2));
    const fuel = /grass|lush|needle|meadow|dry/.test(look.kind) || /forest|taiga|savann/i.test(b.name);
    const danger = w.near(c, r, 3).find(n => n.kind === "marker" && /brigand|monster|burial|pirate/.test(n.o.type)) || w.zonesOfCell(cell).find(z => /Rebels|Invasion/.test(z.type));
    const rnd = U.rng(`${s.seed}:camp:${c}:${r}:${Math.floor(t0 / 24)}`);
    L.push(`${s.party.length ? `You and the company (${s.party.map(p => U.esc(p.name)).join(", ")}) camp` : "You camp"} in the ${b.name.toLowerCase()} ${T("data")}.`);
    if (/forest|rainforest|taiga/i.test(b.name)) { s.sup.food += 1; L.push("The trees give shelter, and you find nuts and roots for breakfast (+1 ration)."); }
    if (water && rnd() < 0.5) { s.sup.food += 1; L.push("Water close by: a line in it overnight brings breakfast (+1 ration)."); }
    if (today < 0) { if (fuel) L.push(`A cold night (about ${w.temp(today)}), but there is wood for a fire.`); else { rest += 6; s.sup.food = Math.max(0, s.sup.food - 1); L.push(`A cold night (about ${w.temp(today)}) with nothing to burn: you eat more and sleep little.`); } }
    if (/wetland|swamp|marsh/i.test(b.name)) { rest += 3; if (rnd() < 0.2 && this.tv.trait !== "hardy") { s.cond.fever = true; L.push("Insects all night; by morning you are feverish."); } else L.push("Insects all night."); }
    if (/desert/i.test(b.name)) L.push("The desert gives back its heat fast; the night is cold and clear.");
    if (["rain", "snow", "storm"].includes(wx.kind)) { rest += wx.kind === "storm" ? 5 : 2; L.push(`The ${wx.label} keeps you awake.`); }
    if (danger) {
      const name = danger.o ? danger.o.name : danger.name;
      if (rnd() < 0.35) { const lost = U.rn(s.purse * 0.2, 2); s.purse = U.rn(s.purse - lost, 2); s.sup.food = Math.max(0, s.sup.food - 2); rest += 4; L.push(`<b class="late">In the night they come: ${U.esc(name)}.</b> You lose 🟡 ${lost} and some food.`); this.log(`Robbed in camp near ${U.esc(name)}.`); }
      else L.push(`You sleep with a hand on your knife: ${U.esc(name)} is near.`);
    }
    this.slept(); if (rest) this.awakeTick(rest);
    const act = this.doAct("camp") || this.doAct("anchor");
    if (act) L.push(`<span class="hook">★ ${U.esc(act.label)}</span>`);
    this.dirty = true;
    const text = `${L.join(" ")} <span class="dim">(${AZ.Clock.span(s.clock - t0)})</span> ${T("mixed")}`;
    return this.scene ? this.scene("Camp", () => this.ui.say(text), "camp") : this.ui.say(text);
  };

  // ------------------------------------------------------------------ crews on rivers; storms that sink
  G.landDistance = function (c, r, max = 14) {
    const w = this.w;
    for (let d = 0; d <= max; d++) for (let a = -d; a <= d; a++) for (const b2 of [-d, d]) {
      if (w.isLand(c + a, r + b2) && !w.navigable(c + a, r + b2, "boat")) return d;
      if (w.isLand(c + b2, r + a) && !w.navigable(c + b2, r + a, "boat")) return d;
    }
    return max + 1;
  };
  G.crewCall = async function () {
    const s = this.s, v = s.vessel, w = this.w;
    if (v.morale < 20) return this.ultimatum();
    const river = w.isLand(s.c, s.r), port = this.nearestPort(v.cls), h = port && w.harbour(port, v.cls);
    const mi = h ? Math.round(Math.hypot(h.t[0] - s.c, h.t[1] - s.r) * w.miles) : null, reachable = h && w.sameWater([s.c, s.r], h.t, v.cls);
    const k = await this.ui.choose(`Sunset, ${AZ.Clock.fmt(s.clock)}. “We have sailed our hours,” says the mate: ${v.hpd} a day, by custom ${T("data")}. Morale ${Math.round(v.morale)}${v.strikes ? `, strikes ${v.strikes} of 3` : ""}.`,
      [{ label: river ? "Tie up at the bank until dawn" : "Anchor here until dawn" }, { label: river ? "Push on in the dark (morale −12; snags and sandbars)" : "Sail on through the night (morale −12)" },
       { label: reachable ? `Make for ${U.esc(port.name)} (${U.num(mi)} mi)` : "No town you can reach by water", disabled: !reachable }], { cancel: 0, title: "The crew calls for a stop", who: "The mate" });
    if (k === 0) {
      const t0 = s.clock; s.clock = AZ.Clock.nextDawn(s.clock, this.lat()); v.anchored = true; v.morale = Math.min(100, v.morale + 4); this.slept();
      const act = this.doAct("anchor") || this.doAct("camp");
      this.ui.toast(`${river ? "Tied up" : "At anchor"} ${AZ.Clock.span(s.clock - t0)}.${act ? ` <span class="hook">★ ${U.esc(act.label)}</span>` : ""}`, act ? "gold" : "");
    } else if (k === 1) {
      v.morale -= 12;
      const nearLand = river || this.landDistance(s.c, s.r, 3) <= 2;
      if (nearLand && U.rnd2(s.c, s.r, Math.floor(s.clock)) < (river ? 0.2 : 0.15)) { this.events.fx({ cond: "damaged", time: 3 }, river ? "Ran onto a snag in the dark." : "Struck a reef at night."); this.ui.toast(river ? "In the dark you run onto a snag. The hull is damaged." : "In the dark you touch a reef. The hull is damaged."); }
      else this.ui.toast(`The crew goes on, sullen. Morale ${Math.round(v.morale)}.`);
    } else { s.waypoint = h.t; v.morale -= 2; this.setAuto(true); }
    this.dirty = true;
  };
  G.shipwreck = async function () {
    const s = this.s, w = this.w, v = s.vessel;
    let best = null, bd = 1e9;
    for (let dr = -20; dr <= 20; dr++) for (let dc = -20; dc <= 20; dc++) { const c = s.c + dc, r = s.r + dr; if (w.isLand(c, r) && !w.navigable(c, r, "boat") && dc * dc + dr * dr < bd) { bd = dc * dc + dr * dr; best = [c, r]; } }
    const lostFood = Math.ceil(s.sup.food / 2), goods = this.goodsCount();
    s.sup.food -= lostFood; s.goods = {}; s.vessel = null; s.aboard = false; s.auto = false; s.trip = null; delete s.cond.damaged;
    if (best) { s.c = best[0]; s.r = best[1]; }
    s.clock += 12; this.anim = null;
    this.log(`Shipwrecked: the ${U.esc(v.kind.toLowerCase())} went down; washed ashore.`, "hook");
    await this.ui.say([`<b class="late">The ${U.esc(v.kind.toLowerCase())} goes down.</b> You come ashore on wreckage hours later ${T("mixed")}.`,
      `Lost: the vessel${v.mode === "hired" ? " (and the deposit)" : ""}, half your food (${lostFood} rations)${goods ? `, all your goods (${goods} units)` : ""}. ${v.crew ? "Of the crew there is no sign." : ""} You keep your purse.`]);
    this.afterStep();
  };

  // ------------------------------------------------------------------ the vessel's hold
  // back with your vessel, her hold is yours again; leaving her, what you cannot carry stays aboard
  G.syncVessel = function () {
    const s = this.s, v = s.vessel, withV = this.withVessel();
    if (v && v.damaged) s.cond.damaged = true; else delete s.cond.damaged;
    if (v && withV) this.takeHold();
    else if (v && s.wasWithVessel !== false) this.stowHold();
    s.wasWithVessel = withV;
  };
  G.stowHold = function () {
    const s = this.s, v = s.vessel, hold = this.holdOf(v), cap = this.capacity(), L = [];
    const extra = s.sup.food - cap.food;
    if (extra > 0) { hold.food += extra; s.sup.food = cap.food; L.push(`${extra} rations`); }
    let extraG = this.goodsCount() - cap.goods;
    for (const [gid, n] of Object.entries(s.goods || {}).filter(([, k]) => k > 0).sort((a, c) => ((s.basis || {})[a[0]] || 0) - ((s.basis || {})[c[0]] || 0))) {
      if (extraG <= 0) break;
      const k = Math.min(n, extraG);
      s.goods[gid] -= k; hold.goods[gid] = (hold.goods[gid] || 0) + k; extraG -= k;
      L.push(`${k} ${this.know.good(gid).toLowerCase()}`);
    }
    if (!L.length) return;
    this.log(`Left in the hold of the ${U.esc(v.kind.toLowerCase())}: ${U.esc(L.join(", "))}.`);
    this.ui.toast(`More than you can carry: ${U.esc(L.join(", "))} stay in the hold of the ${U.esc(v.kind.toLowerCase())} ${T("mixed")}.`);
  };
  G.takeHold = function () {
    const s = this.s, v = s.vessel;
    if (!v || !v.hold) return;
    const h = v.hold, L = [], waited = v.waited || 0;
    s.goods = s.goods || {};
    if (h.food > 0) { s.sup.food += h.food; L.push(`${h.food} rations`); }
    for (const [gid, n] of Object.entries(h.goods || {})) if (n > 0) { s.goods[gid] = (s.goods[gid] || 0) + n; L.push(`${n} ${this.know.good(gid).toLowerCase()}`); }
    v.hold = { food: 0, goods: {} }; v.waited = 0; v.patience = null;
    if (L.length || waited) this.ui.toast(`Back with the ${U.esc(v.kind.toLowerCase())}${waited ? ` after ${waited} day${waited > 1 ? "s" : ""}` : ""}${L.length ? `: ${U.esc(L.join(", "))} in the hold` : ""}.`);
  };
  // going ashore where hands stay aboard: how much food do you take, and how much do you leave them?
  G.goAshore = async function (t, confirmed) {
    const s = this.s, v = s.vessel, n = this.crewFed(v), kind = U.esc(v.kind.toLowerCase()), verb = v.cls === "air" ? "Set down and step out" : "Go ashore", foot = this.footCapacity();
    const step = () => { s.aboard = false; s.auto = false; s.trip = null; v.anchored = true; v.waited = 0; if (t) { s.c = t[0]; s.r = t[1]; } this.anim = null; this.afterStep(); };
    if (!n) {
      if (confirmed) return step();
      const k = await this.ui.choose(`The ${kind} waits, with no one aboard. On foot you carry up to ${foot.food} rations and ${foot.goods} units of goods; the rest stays in the hold ${T("mixed")}.`, [{ label: verb }, { label: "Stay aboard" }], { cancel: 1, title: `${verb} here?` });
      if (k === 0) step();
      return;
    }
    const run = this.runToPort(v), patience = this.patienceOf(v), total = s.sup.food, pname = run ? U.esc(run.port.name) : "", opts = [];
    for (const take of [...new Set([Math.min(total, foot.food), Math.min(total, Math.ceil(foot.food / 2)), Math.min(total, 3), 0])].sort((a, c) => c - a)) {
      const leave = total - take, wait = Math.min(patience, Math.floor((leave - (run ? run.food : 0)) / n));
      const what = run && leave < run.food ? `too little for their run to ${pname} (${run.food} rations)` : wait <= 0 ? (run ? `they sail for ${pname} at the next dawn` : "they go hungry from tomorrow") : `they wait about ${wait} day${wait > 1 ? "s" : ""}`;
      opts.push({ label: `Take ${take} rations, leave ${leave}`, detail: what, take, leave });
    }
    opts.push({ label: "Stay aboard" });
    const k = await this.ui.choose(`${n} ${n > 1 ? "hands stay" : "hand stays"} aboard and eat${n > 1 ? "" : "s"} from what you leave: ${n} ration${n > 1 ? "s" : ""} a day. ${run ? `They keep enough for the run to ${pname}: ${run.food} rations, ${run.days} day${run.days > 1 ? "s" : ""}.` : "No harbour can be reached from here by water."} ${T("mixed")}`, opts, { cancel: opts.length - 1, title: `${verb} here?`, wide: true });
    const o = opts[k];
    if (o.take == null) return;
    if (run && o.leave < run.food) {
      const enough = total - run.food;
      const k2 = await this.ui.choose(`“${o.leave} rations, and ${run.days} day${run.days > 1 ? "s" : ""} from ${pname}? You are leaving us to die out here.” Morale ${Math.round(v.morale)}${v.strikes ? `, strikes ${v.strikes} of 3` : ""} ${T("mixed")}.`,
        [{ label: enough >= 0 ? `Leave them enough for the run (take ${enough} rations)` : `You have too little food to leave them enough`, disabled: enough < 0 }, { label: "Go anyway: they take her to port, and it counts as a strike" }, { label: "Stay aboard" }], { cancel: 2, title: "The mate blocks the way", who: "The mate" });
      if (k2 === 2) return;
      if (k2 === 0) { o.take = enough; o.leave = run.food; }
      else {
        v.strikes = (v.strikes || 0) + 1; v.morale -= 20;
        this.holdOf(v).food += o.leave; s.sup.food = o.take;
        this.log(`Went ashore and left the crew too little to reach ${pname} (strike ${v.strikes}).`, "hook");
        step();
        return this.crewSailsOff(v, run, "refused");
      }
    }
    this.holdOf(v).food += o.leave; s.sup.food = o.take; v.patience = patience;
    step();
  };
  // more than you can carry: in a town you store it or sell it (20_vessels); elsewhere it stays behind
  G.enforceCapacity = function () {
    const s = this.s, w = this.w;
    if (!s || this.ui.busy()) return;
    this.syncVessel();
    const cap = this.capacity(), b = w.burgAt.get(w.idx(s.c, s.r));
    const extraFood = s.sup.food - cap.food;
    let extraGoods = this.goodsCount() - cap.goods;
    if (extraFood <= 0 && extraGoods <= 0) return;
    if (b && this.surplusChoice) return this.surplusChoice(b, cap);
    const L = [];
    if (extraFood > 0) { s.sup.food = cap.food; L.push(`${extraFood} rations`); }
    for (const [gid, n] of Object.entries(s.goods || {}).filter(([, k]) => k > 0)) {
      if (extraGoods <= 0) break;
      const k = Math.min(n, extraGoods); s.goods[gid] -= k; extraGoods -= k; L.push(`${k} ${this.know.good(gid).toLowerCase()}`);
    }
    this.log(`Left behind: ${U.esc(L.join(", "))}.`);
    this.ui.toast(`You cannot carry it all: ${U.esc(L.join(", "))} left behind.`);
  };
  const after0 = G.afterStep;
  G.afterStep = function (...a) { after0.apply(this, a); this.enforceCapacity(); };
})();
