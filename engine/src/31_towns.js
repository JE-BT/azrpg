// =============================================================================================
// 31_towns.js · Alpha 7: towns as menu scenes.
//   Stepping into a town opens its menu: the places (inn, market, temple, harbour, notice board,
//   warehouse, stables, marked places nearby) and the people (harbourmaster, merchant, the watch
//   or the elder, townsfolk; the innkeeper and the priest are found at the inn and the temple).
//   Everything on it comes from the town's data: what it makes, its people and faith, its size,
//   walls and port, its state's wars and friendships, the zones that touch it.
//   Anyone you speak to can help with a quest: the harbourmaster finds you a sailing, the merchant
//   reckons your food, the watch knows the borders, the priest the faiths, the townsfolk the way.
// =============================================================================================
(() => {
  const G = AZ.Game.prototype, U = AZ.U, T = AZ.T;
  const village = b => /hamlet|village/.test(b.group || "");

  // ------------------------------------------------------------------ the people of a town
  AZ.Know.prototype.townPeople = function (b, g) {
    const w = this.w, P = this.P, tv = this.tv, cell = b.cell, st = this.st(b.state), cu = P.cultures[b.culture], re = P.religions[w.C.religion[cell]];
    const kin = b.culture === tv.culture, faith = w.C.religion[cell] === tv.faith, sim = AZ.sim;
    const occ = sim && sim.occupied[b.i] != null && sim.occupied[b.i] !== b.state ? sim.occupied[b.i] : null;
    let rel = (occ ?? b.state) ? (sim ? sim.rel(tv.homeState, occ ?? b.state) : this.rel(tv.homeState, b.state)) : "Unknown";
    const sst = (g.s?.stand?.s || {})[b.state] || 0;
    if (sst <= -2 && rel !== "Enemy") rel = "Suspicion";
    if (sst >= 2 && /Suspicion|Rival/.test(rel)) rel = "Neutral";
    const nm = role => this.person(`${b.i}:${role}`, b.culture);
    const greet = kin ? `speaks to you in your own ${cu.name} tongue` : `takes in a ${P.cultures[tv.culture].name} stranger`;
    const scale = w.W.units.population?.scale || 1000, people = [];
    const add = (role, key, blurb, talk, more = {}) => people.push({ role, name: nm(key), blurb, talk, ...more });
    if (b.port) add("Harbourmaster", "harbour", "Sailings, sea lanes and the dangers on them.", () => {
      const lanes = new Set();
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) { const rt = w.inb(b.t[0] + dc, b.t[1] + dr) && w.route(b.t[0] + dc, b.t[1] + dr); if (rt && rt.group === "searoutes" && rt.name) lanes.add(rt.name); }
      const fleets = P.military.filter(u => u.naval && u.state === b.state && Math.hypot(u.t[0] - b.t[0], u.t[1] - b.t[1]) < 6);
      const pir = w.near(b.t[0], b.t[1], 60).filter(n => n.kind === "marker" && /pirate|sea-monster/.test(n.o.type));
      const L = [`${nm("harbour")}, harbourmaster of ${U.esc(b.name)}, ${greet} ${T("new")}.`];
      L.push(lanes.size ? `“Ships out of here keep to the ${[...lanes].slice(0, 3).map(U.esc).join(", ")}.” ${T("data")}` : `“Few named sea lanes touch ${U.esc(b.name)}.” ${T("data")}`);
      if (fleets.length) L.push(`The ${fleets.map(f => U.esc(f.name)).join(" and ")} ${fleets.length > 1 ? "lie" : "lies"} in the roads ${T("data")}.`);
      if (pir.length) L.push(`“Mind the water ${U.compass(pir[0].dc, pir[0].dr)}: ${/pirate/.test(pir[0].o.type) ? "pirate sails have been seen" : `${U.esc(pir[0].o.name)}, the old sailors say`}, ${U.num(Math.round(pir[0].d * w.miles / 10) * 10)} miles off.” ${T("data")}`);
      return L;
    });
    add(village(b) ? "Host at the hearth" : "Innkeeper", "inn", "News from the road, and rumours.", () => {
      const L = [`${nm("inn")} keeps the ${village(b) ? "only hearth that takes guests" : "inn"} ${T("new")}, and ${greet}.`];
      const inn = w.near(b.t[0], b.t[1], 8).find(n => n.kind === "marker" && n.o.type === "inns");
      if (inn) L.push(`“${U.esc(inn.o.name)} is ${this.dirDist(b.t[0], b.t[1], inn.o.t).txt}: ${U.esc(inn.o.note)}” ${T("data")}`);
      const food = Object.keys(b.production || {}).map(x => P.goods.find(y => y.i === +x)).filter(x => x && (x.tags || []).some(t => /food|drink/.test(t)));
      if (food.length) L.push(`On the table: ${food.slice(0, 3).map(x => x.name.toLowerCase()).join(", ")}, all made here ${T("data")}.`);
      const news = g.sim && (g.s.known || []).slice(-2).map(i => g.sim.news[i]).filter(Boolean);
      if (news && news.length) L.push(`“The latest from the road: ${news.map(n => U.esc(n.text)).join(" ")}” ${T("mixed")}`);
      const rm = this.rumour(b.t[0], b.t[1], U.rng(`${b.i}:${Math.floor(g.s.clock / 24)}`), g);
      if (rm) L.push(`“${rm}`.replace(/ <span/, "” <span"));
      return L;
    });
    if (Object.keys(b.production || {}).length) add("Merchant", "market", "What is made here, what it fetches, and where it sells dearer.", () => {
      const mk = P.markets.find(m => m.i === b.market), top = Object.entries(b.production).sort((a, c) => c[1] - a[1]).slice(0, 4);
      const L = [`${nm("market")} trades in ${U.esc(b.name)}${mk ? `, through the ${U.esc(P.burgs[mk.centerBurgId]?.name || "")} market` : ""} ${T("data")}.`];
      L.push(`“Made here: ${top.map(([x, u]) => `${this.good(x).toLowerCase()} (${u} units)`).join(", ")}.” ${T("data")}`);
      const sells = this.tradeList(P.trade.sell[b.i]), buys = this.tradeList(P.trade.buy[b.i]);
      if (sells) L.push(`“We send out ${sells.toLowerCase()}.” ${T("data")}`);
      if (buys) L.push(`“We bring in ${buys.toLowerCase()}.” ${T("data")}`);
      L.push(`The town's treasury stands at ${U.num(b.treasury, 2)}; its trade earned ${U.num(b.product, 2)} ${T("data")}.`);
      return L;
    }, { extra: bb => [{ label: "Ask what is worth your while", desc: "He reads the markets around him for you.", run: () => g.merchantAdvice(bb) }] });
    add(b.temple ? "Priest" : "Shrine-keeper", "temple", `Keeper of the ${U.esc(re?.name || "old ways")}.`, () => {
      const L = [`${nm("temple")} keeps the ${b.temple ? "temple" : "shrine"} of the ${U.esc(re.name)}: ${re.type}${re.form ? ", " + re.form : ""}${re.deity ? `; they pray to ${U.esc(re.deity)}` : ""} ${T("data")}.`];
      if (re.center === cell) L.push(`<b class="hook">This is the seat of the ${U.esc(re.name)}.</b> ${T("data")}`);
      const sf = (g.s?.stand?.f || {})[w.C.religion[cell]] || 0, destRel = this.jr ? w.C.religion[this.jr.segs[this.jr.segs.length - 1].to] : -1;
      if (sf <= -2) L.push(`${nm("temple")} knows your name, and not kindly ${T("mixed")}.`);
      else if (sf >= 2 && !faith) L.push(`Word of your kindness to the faith has come ahead of you ${T("mixed")}.`);
      if (faith) L.push(`You share the faith. ${nm("temple")} blesses ${U.esc(tv.token)} ${T("new")}.`);
      else if (this.jr && w.C.religion[cell] === destRel) L.push(`You are not of this faith, but your road ends in ${U.esc(this.jr.dest.name)}, and that is enough to be welcome ${T("mixed")}.`);
      else L.push(`You are not of this faith. You are given water and courtesy, no more ${T("mixed")}.`);
      if (re.center !== cell) { const seat = P.burgs.find(x => x && x.cell === re.center); if (seat) L.push(`“The seat of the faith is ${U.esc(seat.name)}, ${this.dirDist(b.t[0], b.t[1], seat.t).txt}.” ${T("data")}`); }
      return L;
    });
    add(b.walls || b.citadel || b.capital ? "Captain of the watch" : "Elder", "watch", "Who rules here, the law, and the town's troubles.", () => {
      const L = [], s0 = occ ? this.st(occ) : st;
      if (!b.state) return [`${nm("watch")} is the eldest here. No state claims ${U.esc(b.name)} ${T("data")}.`];
      if (occ) L.push(`<b class="hook">${U.esc(b.name)} is held by ${U.esc(s0.fullName)}</b> ${T("mixed")}; their officer keeps the gate.`);
      L.push(`${nm("watch")} speaks for ${U.esc(s0.fullName)}, a ${s0.form.toLowerCase()} ${T("data")}. Your people stand to theirs as <b>${rel}</b> ${T(occ ? "mixed" : "data")}.`);
      if (rel === "Enemy") L.push(`You are held and questioned for six hours before they let you go ${T("mixed")}.`);
      else if (/Suspicion|Rival/.test(rel)) L.push(`They ask your business twice and write your name down ${T("mixed")}.`);
      for (const z of w.zonesOfCell(cell)) L.push(`“The ${U.esc(z.name)} is our trouble now: ${z.type.toLowerCase()}.” ${T("data")}`);
      const wars = (st.campaigns || []).filter(cp => cp.end == null);
      if (wars.length) L.push(`At war: ${wars.map(cp => `${U.esc(cp.name)} (since ${cp.start})`).join("; ")} ${T("data")}.`);
      const allies = (st.diplomacy || []).map((d, i) => (d === "Ally" ? this.st(i)?.name : null)).filter(Boolean);
      if (allies.length) L.push(`Allies: ${allies.map(U.esc).join(", ")} ${T("data")}.`);
      if (g.sim) { const f = g.sim.foodFor(b), M = g.sim.mk.get(b.market); if (M && f.rations < 20) L.push(`“Bread is short this season; the granaries are low.” ${T("mixed")}`); }
      L.push(`Taxes: ${Math.round(st.salesTax * 100)}% on sales, ${Math.round(st.pollTax * 100)}% poll ${T("data")}.`);
      return L;
    }, { cost: () => (rel === "Enemy" ? 6 : /Suspicion|Rival/.test(rel) ? 1 : 0) });
    add("Townsfolk", "folk", "Gossip, and what people here live by.", () => {
      const feats = ["walls", "citadel", "plaza", "temple", "shanty", "port"].filter(k => b[k]);
      const L = [`${U.esc(b.name)}: ${U.article(b.group.replace("_", " "))} of ${U.num(b.population * scale)} ${U.esc(cu.name)} people, a ${b.type.toLowerCase()} town ${T("data")}${feats.length ? `, with ${feats.join(", ")}` : ""}.`];
      const top = Object.entries(b.production || {}).sort((a, c) => c[1] - a[1])[0];
      if (top) L.push(`“Most of us live by the ${this.good(top[0]).toLowerCase()}.” ${T("mixed")}`);
      const rm = this.rumour(b.t[0], b.t[1], U.rng(`${b.i}:folk:${Math.floor(g.s.clock / 24)}`), g);
      if (rm) L.push(`Someone says: “${rm}`.replace(/ <span/, "” <span"));
      return L;
    });
    return people;
  };

  // ------------------------------------------------------------------ the town menu
  G.town = async function (b) {
    const s = this.s;
    this.held = [];
    this.inTownOf = b; this.checkCheckpoints(); this.inTownOf = null;
    const people = this.know.townPeople(b, this);
    this.saveGame();
    for (;;) {
      if (this.burgHere() !== b) break;
      const opts = this.townOptions(b, people), w = this.w, cell = b.cell, pv = w.C.province[cell], st = w.P.states[b.state];
      const head = `Population ${U.num(b.population * (w.W.units.population?.scale || 1000))} · ${U.esc(b.type)} · ${b.walls ? "walled" : "no walls"}${b.citadel ? " · citadel" : ""}${b.port ? " · port" : ""}<br><span class="dim">${AZ.Clock.fmt(s.clock)} · 🟡 ${U.rn(s.purse, 1)} · food ${s.sup.food} rations</span>`;
      const k = await this.ui.choose(head, opts, { cancel: opts.length - 1, title: U.esc(b.name), sub: `${U.esc(w.P.cultures[b.culture]?.name || "")} · ${pv ? U.esc(w.P.provinces[pv].fullName) + ", " : ""}${U.esc(st?.fullName || "unclaimed land")}`, wide: true });
      const o = opts[k];
      if (!o || o.leave) break;
      const was = [s.aboard, this.riding(), s.c, s.r].join();
      await o.run();
      this.dirty = true;
      if ([s.aboard, this.riding(), s.c, s.r].join() !== was || s.trip) break;
    }
  };
  G.townOptions = function (b, people) {
    const s = this.s, w = this.w, P = AZ.Prices, opts = [], pp = re => people.find(p => re.test(p.role));
    for (const a of this.pendingActs(b)) opts.push({ label: `★ ${U.esc(a.label)}`, detail: "the journey", cls: "hook", desc: "A task of the journey, done here.", run: () => this.doTownAct(a, b, people) });
    for (const [th, st] of this.threadSteps(b)) opts.push({ label: `◆ ${U.esc(st.text)}`, detail: U.esc(th.title), cls: "side", desc: "A step of a side quest.", run: () => this.completeStep(th, b) });
    for (const o of this.boardOptions(b)) opts.push({ label: o.label, cls: "hook", run: o.act.go });
    for (const o of this.journeyVesselOptions(b)) opts.push(o);
    const inn = pp(/Innkeeper|Host/), hrs = Math.max(1, AZ.Clock.nextDawn(s.clock, this.lat()) - s.clock);
    opts.push({ label: village(b) ? "Hearth" : "Inn", detail: `a bed until dawn · ${Math.round(hrs)} h · 🟡 ${P.inn(w, b)}`, desc: `${U.esc(inn.name)} keeps it: a bed, news and rumours.`, run: () => this.innMenu(b, people) });
    const made = Object.entries(b.production || {}).sort((a, c) => c[1] - a[1]).slice(0, 2).map(([g]) => this.know.good(g).toLowerCase());
    opts.push({ label: "Market", detail: ["food", ...made].join(", "), desc: `Food at 🟡 ${P.ration(w, b)} a day; goods to buy and sell.`, run: () => this.market(b) });
    const re = w.P.religions[w.C.religion[b.cell]];
    opts.push({ label: b.temple ? "Temple" : "Shrine", detail: `${U.esc(re?.name || "the old ways")}`, desc: `Give alms, ask for healing, talk with ${U.esc(pp(/Priest|Shrine/).name)}.`, run: () => this.templeMenu(b, people) });
    if (b.port || (this.sim && this.sim.lines.some(L => L.from === b.i))) {
      const n = this.sim ? this.sim.departures(b, s.clock).filter(d => d.t > s.clock).length : 0;
      opts.push({ label: b.port ? "Harbour" : "Coach office", detail: `${n} departure${n === 1 ? "" : "s"} in twelve days`, desc: b.port ? "Book a passage or a coach; the shipwright hires and sells vessels." : "Coaches and carriers' wagons.", run: () => this.harbour(b) });
    }
    const offers = this.questOffers(b).length;
    opts.push({ label: "Notice board", detail: offers ? `${offers} errand${offers > 1 ? "s" : ""} posted` : "tax notices", cls: offers ? "side" : "", desc: "Work and errands drawn from the state of the world.", run: () => this.noticeBoard(b) });
    for (const x of this.townExtras(b)) { const [lab, ...rest] = x.label.split(":"); opts.push({ label: lab, detail: rest.join(":").trim(), run: x.act.extra }); }
    for (const n of w.near(b.t[0], b.t[1], 2)) if (n.kind === "marker") opts.push({ label: U.esc(n.o.name), detail: n.d < 0.5 ? "in town" : "just outside", cls: "side", desc: U.esc((n.o.note || "").slice(0, 150)), run: () => this.events.marker(n.o, false) });
    for (const re2 of [/Harbourmaster/, /Merchant/, /Captain|Elder/, /Townsfolk/]) { const p = pp(re2); if (p) opts.push({ label: p.role, detail: U.esc(p.name), desc: p.blurb, run: () => this.personMenu(p, b) }); }
    opts.push({ label: "Leave", detail: "back to the world map", leave: true });
    return opts;
  };
  G.doTownAct = async function (a, b, people) {
    const U2 = U, s = this.s;
    switch (a.id) {
      case "alms": return this.giveAlms(b);
      case "rest": return this.sleepAtInn(b);
      case "book": return this.harbour(b);
      case "resupply": return this.market(b);
      case "gather": return this.meetCompany(b);
      case "rumours": return this.personMenu(people.find(p => /Innkeeper|Host/.test(p.role)), b);
      case "board": { const o = this.journeyVesselOptions(b)[0]; return o ? o.run() : this.ui.say("The company's vessel is not at this quay."); }
      case "camp": case "anchor": return this.ui.say("That is done at nightfall: camp outside the town (R), or anchor aboard.");
      case "bounty": {
        const pay = AZ.U.rn(AZ.money("bounty", b) / 10, 2), act = this.doAct("bounty", b);
        s.purse = U2.rn(s.purse + pay, 2);
        return this.ui.say(`You read the notice twice and put your name to it. The clerk counts out 🟡 ${pay} in advance ${T("mixed")}.${act ? ` <span class="hook">★ ${U2.esc(act.label)}</span>` : ""}`);
      }
      default: {
        const out = this.events.fx({ time: a.hours || 6 }, `${U2.esc(a.label)}.`), act = this.doAct(a.id, b);
        return this.ui.say(`${U2.esc(a.label.replace(/\s*\(\d+ h\)$/, ""))}: the hours pass in ${U2.esc(b.name)}.${out}${act ? ` <span class="hook">★ done</span>` : ""}`);
      }
    }
  };

  // ------------------------------------------------------------------ the inn and the temple
  G.innMenu = async function (b, people) {
    const s = this.s, w = this.w, host = people.find(p => /Innkeeper|Host/.test(p.role));
    for (;;) {
      const cost = AZ.Prices.inn(w, b), gather = this.pendingActs(b).find(a => a.id === "gather");
      const opts = [{ label: "Take a room until morning", detail: `🟡 ${cost}`, disabled: s.purse < cost, act: "room", desc: `${this.shipWarn() ? "Your ship sails before morning." : "Sleep, and wake rested at dawn."}` },
        { label: `Talk to ${U.esc(host.name)}`, detail: host.role.toLowerCase(), act: "talk", desc: host.blurb }];
      if (gather) opts.push({ label: `★ ${U.esc(gather.label)}`, cls: "hook", act: "gather" });
      opts.push({ label: "Back", act: "back" });
      const k = await this.ui.choose("", opts, { cancel: opts.length - 1, title: `${U.esc(b.name)}: the ${village(b) ? "hearth" : "inn"}` });
      const o = opts[k];
      if (o.act === "back") return;
      if (o.act === "room") return this.sleepAtInn(b);
      if (o.act === "talk") await this.personMenu(host, b);
      if (o.act === "gather") await this.meetCompany(b);
    }
  };
  G.sleepAtInn = async function (b) {
    const s = this.s, t0 = s.clock;
    const out = this.events.fx({ coin: -AZ.Prices.inn(this.w, b), time: Math.max(1, AZ.Clock.nextDawn(s.clock, this.lat()) - s.clock), sleep: true, cure: ["hurt"] });
    this.slept();
    const act = this.doAct("rest", b);
    await this.scene(`Morning in ${b.name}`, () => this.ui.say(`You sleep in ${U.esc(b.name)}. ${AZ.Clock.span(s.clock - t0)} pass ${T("mixed")}.${out}${act ? ` <span class="hook">★ ${U.esc(act.label)}</span>` : ""}`));
  };
  G.giveAlms = async function (b) {
    const w = this.w, cost = AZ.Prices.alms(w, b);
    if (this.s.purse < cost) return this.ui.say(`Alms here are 🟡 ${cost}; your purse holds less.`);
    const out = this.events.fx({ coin: -cost, time: 2, stand: [["f", w.C.religion[b.cell], 1]] }, `Alms given in ${U.esc(b.name)}.`);
    const act = this.doAct("alms", b);
    await this.ui.say(`You give alms at the ${b.temple ? "temple" : "shrine"} of the ${U.esc(w.P.religions[w.C.religion[b.cell]].name)}.${out}${act ? ` <span class="hook">★ ${U.esc(act.label)}</span>` : ""}`);
  };
  G.templeMenu = async function (b, people) {
    const s = this.s, w = this.w, priest = people.find(p => /Priest|Shrine/.test(p.role));
    for (;;) {
      const alms = AZ.Prices.alms(w, b), sick = s.cond.fever || s.cond.gravely, heal = this.healCost(b);
      const opts = [{ label: "Give alms", detail: `🟡 ${alms}`, disabled: s.purse < alms, act: "alms", desc: "Two hours of prayer; the faith remembers." }];
      if (sick) opts.push({ label: "Ask to be treated for your fever", detail: heal ? `🟡 ${heal}` : "free", disabled: s.purse < heal, act: "heal", desc: "Bitter tea, cool cloths and a long prayer: six hours." });
      opts.push({ label: `Talk to ${U.esc(priest.name)}`, detail: priest.role.toLowerCase(), act: "talk", desc: priest.blurb }, { label: "Back", act: "back" });
      const k = await this.ui.choose("", opts, { cancel: opts.length - 1, title: `${U.esc(b.name)}: the ${b.temple ? "temple" : "shrine"}`, sub: U.esc(w.P.religions[w.C.religion[b.cell]]?.name || "") });
      const o = opts[k];
      if (o.act === "back") return;
      if (o.act === "alms") await this.giveAlms(b);
      if (o.act === "heal") { const out = this.events.fx({ coin: -heal, time: 6, cure: ["fever", "gravely"] }, `Treated for fever in ${U.esc(b.name)}.`); await this.ui.say(`By evening the fever breaks.${out}`); }
      if (o.act === "talk") await this.personMenu(priest, b);
    }
  };
  G.meetCompany = async function (b) {
    const party = this.formParty(b, true), act = this.doAct("gather", b), s = this.s;
    const who = s.party.map(p => `<b>${U.esc(p.name)}</b>, ${p.role}`).join("; ");
    await this.ui.say(`${party.length ? "In the common room the company gathers" : "The company is already with you"}: ${who || "no one but yourself"} ${T("new")}.${act ? ` <span class="hook">★ ${U.esc(act.label)}</span>` : ""}`);
  };

  // ------------------------------------------------------------------ talking to people
  G.meet = function (p, b) {
    const s = this.s;
    if (!s.met.some(m => m.name === p.name && m.town === b.i)) s.met.push({ name: p.name, role: p.role, town: b.i, t: s.clock });
  };
  G.personMenu = async function (p, b) {
    const s = this.s, who = `${U.esc(p.name)} · ${U.esc(p.role)}`;
    this.meet(p, b);
    if (p.cost && !p._charged) { p._charged = true; const h = p.cost(); if (h) { s.clock += h; this.awakeTick(h); } }
    for (;;) {
      const obj = this.objective(), opts = [{ label: "Talk", desc: p.blurb, act: "talk" }];
      if (obj && obj.tile) opts.push({ label: `Ask about the journey: ${U.esc(obj.short)}`, cls: "hook", act: "obj", desc: "Directions, sailings, provisions: whatever this person knows." });
      for (const th of s.threads.filter(t => !t.done).slice(0, 4)) opts.push({ label: `Ask about “${U.esc(th.title)}”`, cls: "side", act: "th", th });
      if (p.extra) for (const x of p.extra(b)) opts.push(x);
      opts.push({ label: "Goodbye", act: "bye" });
      const k = await this.ui.choose("", opts, { cancel: opts.length - 1, who });
      const o = opts[k];
      if (o.act === "bye") return;
      if (o.act === "talk") {
        await this.ui.say(p.talk(), who);
        if (/Innkeeper|Host|Townsfolk/.test(p.role)) { const a = this.doAct("rumours", b); if (a) this.ui.toast(`<span class="hook">★ ${U.esc(a.label)}</span>`, "gold"); }
      } else if (o.act === "obj") await this.ui.say(this.questHelp(p, b, obj), who);
      else if (o.act === "th") await this.ui.say(this.questHelp(p, b, this.threadTarget(o.th)), who);
      else if (o.run) await o.run();
    }
  };
  // what lies along the straight line between two tiles: states, land, zones, marked places, roads
  G.alongLine = function (a, t) {
    const w = this.w, out = { states: new Set(), biomes: new Map(), zones: new Set(), markers: new Map(), road: 0, n: 0 };
    const n = Math.max(2, Math.min(40, Math.round(Math.hypot(t[0] - a[0], t[1] - a[1]) / 4)));
    for (let k = 1; k < n; k++) {
      const c = Math.round(a[0] + ((t[0] - a[0]) * k) / n), r = Math.round(a[1] + ((t[1] - a[1]) * k) / n);
      if (!w.inb(c, r)) continue;
      const cell = w.cell(c, r);
      out.n++;
      if (w.isLand(c, r)) { out.states.add(w.C.state[cell]); const bn = w.P.biomes[w.C.biome[cell]]?.name; out.biomes.set(bn, (out.biomes.get(bn) || 0) + 1); }
      for (const z of w.zonesOfCell(cell)) out.zones.add(z.name);
      for (const m of w.near(c, r, 3)) if (m.kind === "marker") out.markers.set(m.o.i, m.o);
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (w.inb(c + dc, r + dr) && (w.bits(c + dc, r + dr).road || w.bits(c + dc, r + dr).trail)) { out.road++; dr = dc = 2; }
    }
    return out;
  };
  G.threadTarget = function (th) {
    const st = th.steps[th.phase], g = st.goal || {}, P = this.w.P, tile = this.stepTile(st);
    const burg = g.burg ? P.burgs[g.burg] : tile ? P.burgs.find(b => b && b.t[0] === tile[0] && b.t[1] === tile[1]) : null;
    const m = g.marker != null ? P.markers.find(x => x.i === g.marker) : null;
    return { short: st.text, tile, burg, role: g.role, name: burg ? burg.name : m ? m.name : g.unit ? "the regiment" : "the place" };
  };
  G.questHelp = function (p, b, tgt) {
    const s = this.s, w = this.w, P = w.P, L = [];
    if (!tgt || !tgt.tile) return [`“I cannot help you with that.”`];
    if (tgt.burg && tgt.burg.i === b.i) return [`“That is here, in ${U.esc(b.name)}.${tgt.role ? ` Ask for the ${U.esc(tgt.role.toLowerCase())}.` : ""}”`];
    const dd = this.know.dirDist(b.t[0], b.t[1], tgt.tile), name = U.esc(tgt.name), al = this.alongLine(b.t, tgt.tile);
    const tCell = w.cell(...tgt.tile), sameLand = w.isLand(...tgt.tile) && w.C.feature[tCell] === w.C.feature[b.cell], eat = this.eaters();
    if (/Harbourmaster/.test(p.role)) {
      const all = this.sim ? this.sim.departures(b, s.clock).filter(d => d.ok && d.t > s.clock) : [], bi = tgt.burg?.i, foe = d => this.sim.rel(this.tv.homeState, d.L.flag) === "Enemy", deps = all.filter(d => !foe(d));
      if (all.some(d => foe(d) && (d.L.to === bi || (d.L.via || []).includes(bi)))) L.push(`“Ships of ${U.esc(P.states[all.find(foe).L.flag]?.name || "this port")} will not carry your people.” ${T("data")}`);
      const direct = deps.find(d => d.L.to === bi || (d.L.via || []).includes(bi));
      if (direct) L.push(`“${U.esc(direct.L.ship)} goes to ${name}: it leaves ${AZ.dayWords(direct.t)} (${AZ.Clock.fmt(direct.t)}), and runs every ${direct.L.period} days. Book it at the office.” ${T("mixed")}`);
      else {
        const best = deps.map(d => ({ d, x: P.burgs[d.L.to] })).map(o => ({ ...o, gap: Math.hypot(o.x.t[0] - tgt.tile[0], o.x.t[1] - tgt.tile[1]) * w.miles })).sort((a, c) => a.gap - c.gap)[0];
        if (best && best.gap < dd.mi * 0.75) L.push(`“Nothing that runs from here goes to ${name}. ${U.esc(best.d.L.ship)} goes to ${U.esc(best.x.name)}, ${U.num(Math.round(best.gap / 10) * 10)} miles short of it, leaving ${AZ.dayWords(best.d.t)}.” ${T("mixed")}`);
        else L.push(`“Nothing that runs from here goes anywhere near ${name}.” ${T("mixed")}`);
      }
      if (!sameLand) L.push(`“Or hire a vessel from the yard and sail her yourself: ${dd.txt}.”`);
      else L.push(`“It is ${dd.txt} overland; you could walk it, or take a coach if one runs.”`);
    } else if (/Merchant/.test(p.role)) {
      const foot = Math.max(1, Math.ceil((dd.mi * 1.3) / (this.walkSpeed * 8))), v = s.vessel;
      const boat = v ? Math.max(1, Math.ceil((dd.mi * 1.2) / ((v.speed || 6) * (this.keepsWatches(v) ? 24 : 12)))) : Math.max(1, Math.ceil((dd.mi * 1.2) / (10 * 24)));
      L.push(`“${name} is ${dd.txt}. ${sameLand ? `On foot, call it ${foot} days at eight hours' walking: ${foot * eat} rations for ${eat === 1 ? "you" : `${eat} mouths`}.` : `By water, call it ${boat} days: ${boat * eat} rations for ${eat === 1 ? "you" : `${eat} mouths`}, and more if the weather turns.`}” ${T("mixed")}`);
      L.push(`“Food here is 🟡 ${AZ.Prices.ration(w, b)} a ration. You carry ${s.sup.food}.”`);
      if (this.sim) { const left = this.foodLeft(b, this.sim.foodFor(b)); L.push(left < (sameLand ? foot : boat) * eat ? `“We can spare only ${left} rations this week.” ${T("mixed")}` : `“We have food enough to sell you.” ${T("mixed")}`); }
    } else if (/Captain|Elder/.test(p.role)) {
      const sts = [...al.states].filter(x => x && x !== b.state).map(i => P.states[i]).filter(Boolean);
      const stance = i => (this.sim ? this.sim.rel(this.tv.homeState, i) : this.know.rel(this.tv.homeState, i));
      L.push(sts.length ? `“The way crosses ${sts.map(x => `${U.esc(x.name)} (to your people: ${stance(x.i)})`).join(", ")}.” ${T("data")}` : `“You stay within ${U.esc(P.states[b.state]?.name || "these lands")} the whole way.” ${T("data")}`);
      L.push(al.zones.size ? `“Trouble on that road: the ${[...al.zones].map(U.esc).join(", ")}.” ${T("data")}` : "“No trouble on that road that I have heard of.”");
    } else if (/Priest|Shrine/.test(p.role)) {
      const rel = P.religions[w.C.religion[tCell]], mine = rel && rel.i === this.tv.faith;
      L.push(`“At ${name} they keep the ${U.esc(rel?.name || "old ways")}.${rel && rel.center === tCell ? " It is the seat of that faith." : ""}${mine ? " Your own faith: you will be welcome." : ""}” ${T("data")}`);
      const sf = (s.stand.f || {})[rel?.i] || 0;
      if (sf) L.push(`“They will have heard of you there, ${sf > 0 ? "and kindly" : "and not kindly"}.” ${T("mixed")}`);
    } else {
      const lands = [...al.biomes.entries()].sort((a, c) => c[1] - a[1]).slice(0, 2).map(x => x[0].toLowerCase());
      L.push(`“${name}? That is ${dd.txt}.${lands.length ? ` ${U.cap(lands.join(", then "))} most of the way.` : ""}” ${T("mixed")}`);
      L.push(!sameLand ? "“You cannot walk it: there is water between. Ask at a harbour.”" : al.road > al.n * 0.5 ? `“There is a road most of the way: head ${dd.dir} and keep to it.” ${T("data")}` : `“No road goes that way; you will be on rough ground, heading ${dd.dir}.” ${T("data")}`);
      const ms = [...al.markers.values()].slice(0, 2);
      if (ms.length) L.push(`“On the way you will pass ${ms.map(m => U.esc(m.name)).join(" and ")}.” ${T("data")}`);
    }
    return L;
  };

  // ------------------------------------------------------------------ the merchant reads the markets for you
  G.merchantAdvice = async function (b) {
    const s = this.s, w = this.w, F = AZ.fieldOf(w), mi = x => Math.round(Math.hypot(x.t[0] - b.t[0], x.t[1] - b.t[1]) * w.miles);
    const near = w.P.burgs.filter(x => x && x !== b && F.byId.has(x.market)).map(x => ({ x, d: F.eff(b, x) })).filter(o => o.d <= 1.5 * F.T).sort((a, c) => a.d - c.d).slice(0, 30).map(o => o.x);
    const buys = [];
    for (const g of w.P.goods.map(x => x.i).filter(g => F.available(b, g) && this.goodQuote(b, g))) {
      const q = this.goodQuote(b, g); let best = null;
      for (const x of near) { const q2 = this.goodQuote(x, g); if (q2 && (!best || q2.sell > best.sell)) best = { sell: q2.sell, x }; }
      if (best && best.sell > q.buy) buys.push({ g, here: q.buy, there: best.sell, x: best.x, gain: U.rn(best.sell - q.buy, 2) });
    }
    buys.sort((a, c) => c.gain / c.here - a.gain / a.here);
    const packs = Object.entries(s.goods || {}).filter(([, n]) => n > 0).map(([g]) => {
      const q = this.goodQuote(b, g); if (!q) return `${U.esc(this.know.good(g))}: nobody here buys it.`;
      let best = null; for (const x of near) { const q2 = this.goodQuote(x, g); if (q2 && (!best || q2.sell > best.sell)) best = { sell: q2.sell, x }; }
      return best && best.sell > q.sell * 1.05 ? `${U.esc(this.know.good(g))}: 🟡 ${q.sell} here; ${U.esc(best.x.name)} pays 🟡 ${best.sell} (${U.num(mi(best.x))} mi).` : `${U.esc(this.know.good(g))}: 🟡 ${q.sell} here, as good as you will find nearby.`;
    });
    const L = [buys.length ? `“Cheap here, dearer elsewhere: ${buys.slice(0, 3).map(o => `${U.esc(this.know.good(o.g).toLowerCase())} (🟡 ${o.here} here; ${U.esc(o.x.name)}, ${U.num(mi(o.x))} mi, pays 🟡 ${o.there})`).join("; ")}.” ${T("mixed")}` : `“Nothing here pays to carry away.” ${T("mixed")}`];
    if (packs.length) L.push(`Your packs: ${packs.join(" ")}`);
    await this.ui.say(L, `${U.esc(this.know.person(`${b.i}:market`, b.culture))} · Merchant`);
  };
})();
