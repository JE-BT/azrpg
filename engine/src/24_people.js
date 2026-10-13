// =============================================================================================
// 24_people.js · Alpha 5.1: the people who carry the story, and how they see you.
//   Regard is one number for one person toward you, built from simple parts: your people and
//   theirs, your faith and theirs, your state and theirs, their state's form, the state of the world,
//   their nature, your standing, and suspicion (the part of Alpha 7 that is built now). It sets
//   prices, help, what they tell you, and at night whether someone robs you and whether the watch
//   cares. Townspeople help with the systems (provisions for the road, the law, the land) and carry
//   the story when it needs them. The corner shows the objective and one side story of your choosing.
// =============================================================================================
(() => {
  const G = AZ.Game.prototype, U = AZ.U, T = AZ.T;

  // ------------------------------------------------------------------ regard (with suspicion)
  const STANCE = { Ally: 2, Friendly: 1, Neutral: 0, Unknown: 0, Suspicion: -1, Rival: -2, Enemy: -3 };
  const NATURES = ["plain", "plain", "plain", "generous", "wary", "devout", "greedy"];
  G.regard = function (b, role = "Townsfolk") {
    const s = this.s, w = this.w, P = w.P, tv = this.tv;
    if (!b || !tv || !s) return { score: 0, band: "neutral", why: [], watch: "at its pleasure", nature: "plain" };
    const why = [], st = P.states[b.state] || {}, cap = P.burgs[st.capital], bcul = w.C.culture[b.cell], brel = w.C.religion[b.cell];
    const nature = NATURES[Math.floor(U.rnd2(b.i, role.length, 7) * NATURES.length)], devout = nature === "devout" ? 2 : 1;
    let sc = 0;
    if (bcul === tv.culture) { sc += 2; why.push("you are of their people"); }
    else { sc -= 1; if (cap && w.C.culture[cap.cell] === bcul && tv.culture !== bcul) { sc -= 1; why.push(`the ${P.cultures[bcul]?.name || "people"} here think little of yours`); } else why.push("you are a stranger"); }
    if (brel === tv.faith) { sc += 2 * devout; why.push("you share their faith"); } else { sc -= devout; why.push(`you keep another faith than the ${P.religions[brel]?.name || "local one"}`); }
    const home = P.burgs[tv.home], hs = home ? home.state : null;
    if (hs != null && hs !== b.state) { const stance = (st.diplomacy || [])[hs] || "Neutral", v = STANCE[stance] ?? 0; sc += v; if (v) why.push(`${st.name || "this state"} holds ${P.states[hs]?.name || "your state"} in ${stance.toLowerCase() === "ally" ? "alliance" : stance.toLowerCase()}`); }
    const form = st.form || "Monarchy";
    if (/Theocracy/.test(form) && brel !== tv.faith) { sc -= 2; why.push("the faith rules here"); }
    const sim = this.sim;
    if (sim && hs != null && sim.wars.some(x => !x.over && ((x.a === b.state && x.d === hs) || (x.d === b.state && x.a === hs)))) { sc -= 2; why.push("their state is at war with yours"); }
    const E = this.eventsAt ? this.eventsAt(b) : {};
    if (E.famine) { sc -= 1; why.push("there is hunger here"); }
    if (E.disease) { sc -= 1; why.push("travellers bring sickness"); }
    if (nature === "generous") sc += 1; else if (nature === "wary") sc -= 1;
    const stand = s.stand || {};
    sc += Math.round((((stand.s || {})[b.state] || 0) + ((stand.f || {})[brel] || 0)) / 2);
    // suspicion: the watch counts all of it, others a third. Alpha 7 adds papers, dress, speech,
    // contraband and the alert level here, as more suspicion.
    const heat = (s.heat || {})[b.state] || 0;
    sc -= /Captain|Elder/.test(role) ? Math.round(heat) : Math.floor(heat / 3);
    if (heat >= 1) why.push("they have heard of trouble you were part of");
    const band = sc >= 3 ? "warm" : sc >= 0 ? "neutral" : sc >= -2 ? "cool" : "hostile";
    const watch = /Republic/.test(form) ? "protects" : /Theocracy/.test(form) ? (brel === tv.faith ? "protects" : "looks away") : hs === b.state ? "protects" : "at its pleasure";
    return { score: sc, band, why, watch, nature, form, faith: brel, culture: bcul };
  };
  G.regardF = function (b, role) {
    if (!b || !this.s || !this.tv) return 1;
    const R = this.regard(b, role);
    return ({ warm: 0.9, neutral: 1, cool: 1.1, hostile: 1.25 }[R.band] || 1) * (R.nature === "greedy" ? 1.1 : 1) * (/Priest|Shrine/.test(role) && /Theocracy/.test(R.form) && R.faith !== this.tv.faith ? 1.5 : 1);
  };
  const live = () => (AZ.game && AZ.game.s && AZ.game.tv ? AZ.game : null);
  for (const [k, role] of [["inn", "Innkeeper"], ["alms", "Priest"], ["heal", "Priest"]]) { const f0 = AZ.Prices[k]; AZ.Prices[k] = (w, b, ...a) => { const g = live(); return U.rn(f0(w, b, ...a) * (g && b ? g.regardF(b, role) : 1), 2); }; }
  const q1 = G.goodQuote;
  G.goodQuote = function (b, gid) { const q = q1.call(this, b, gid); if (!q || !this.s) return q; const f = this.regardF(b, "Merchant"); return { ...q, buy: U.rn(q.buy * f, 2), sell: U.rn(q.sell / f, 2) }; };
  G.addHeat = function (state, n) { const s = this.s; if (state == null) return; s.heat = s.heat || {}; s.heat[state] = U.clamp((s.heat[state] || 0) + n, 0, 10); };
  const BAND = { warm: "greets you warmly", neutral: "deals with you fairly", cool: "deals with you coolly", hostile: "will hardly look at you" };
  const WATCH = { protects: "The watch here protects you as it would anyone who keeps the law.", "looks away": "The watch here keeps the faith's law, and looks away from what is done to those outside it.", "at its pleasure": "The watch here protects the crown's subjects; strangers are at its pleasure." };

  // ------------------------------------------------------------------ provisions: how much food the next leg needs
  G.legDays = function (i) {
    const s = this.s, w = this.w, jr = this.jr, cp = jr && jr.cps[i], leg = cp && cp.legIn;
    if (!leg) return null;
    const sea = leg.domain !== "land" || (leg.chain && leg.chain.length && leg.chain.filter(([c, r]) => !w.isLand(c, r)).length / leg.chain.length >= 0.3);
    let speed = leg.speed || 3, hpd = leg.hoursPerDay || 8, how = `by ${leg.transport.toLowerCase()}`;
    const v = s.vessel;
    if (sea && v && !this.riding()) { speed = v.speed || speed; hpd = this.keepsWatches(v) ? 24 : Math.max(4, Math.min(v.hpd || 12, AZ.Clock.sun(s.clock, this.lat()).dl + 0.75)); how = `in your ${v.kind.toLowerCase()}`; }
    else if (sea && leg.domain === "land") { speed = 10; hpd = 24; how = "by ship for the crossing"; }
    else if (!sea && s.mount) { speed = s.mount.speed; how = "on horseback"; }
    return { to: cp.place.name, miles: Math.round(leg.miles), days: Math.max(1, Math.ceil((leg.miles * 1.15) / (speed * hpd))), how, sea };
  };
  G.provisions = function (i) { const d = this.legDays(i); if (!d) return null; const n = this.eaters(); return { ...d, eaters: n, rations: d.days * n }; };
  G.foodHint = function () { const p = this.provisions(this.s.cp); return p ? `For the plan's next leg, to ${U.esc(p.to)}, reckon about ${p.days} days and ${p.rations} rations for ${p.eaters === 1 ? "yourself" : `the ${p.eaters} of you`}; the innkeeper or the harbourmaster will reckon it again for you.` : ""; };

  // ------------------------------------------------------------------ what each person adds
  const tp0 = AZ.Know.prototype.townPeople;
  AZ.Know.prototype.townPeople = function (b, g) {
    const people = tp0.call(this, b, g);
    for (const p of people) { if (p.role === "Notice board") continue; const t0 = p.talk; p.talk = () => { const L = t0() || []; return [...L, ...(g.personLines ? g.personLines(b, p.role, p.name) : [])]; }; }
    return people;
  };
  G.personLines = function (b, role, name) {
    const s = this.s, w = this.w, P = w.P, R = this.regard(b, role), L = [], who = name ? U.esc(name) : `The ${role.toLowerCase()}`;
    L.push(`${who} ${BAND[R.band]}: ${U.esc(R.why.slice(0, 2).join("; "))} ${T("mixed")}.`);
    const next = this.jr && !s.done ? this.jr.cps[s.cp] : null, prov = next ? this.provisions(s.cp) : null;
    if (/Innkeeper|Host/.test(role)) {
      if (prov) L.push(`For the road to ${U.esc(prov.to)} (${U.num(prov.miles)} mi ${U.esc(prov.how)}${prov.sea && next.legIn.domain === "land" ? ", with a sea crossing the plan does not show" : ""}), ${who.split(" ")[0]} reckons ${prov.days} days: ${prov.rations} rations for ${prov.eaters === 1 ? "you" : `the ${prov.eaters} of you`}. You carry ${s.sup.food} ${T("mixed")}.`);
      if (R.band === "cool" || R.band === "hostile") L.push("A room costs a stranger's price here.");
    } else if (/Priest|Shrine/.test(role)) {
      if (/Theocracy/.test(R.form) && R.faith !== this.tv.faith) L.push("The faith's law is the law here, and you keep another faith: no blessing for you, and healing only at a price.");
      else if (R.faith === this.tv.faith) L.push("You are among your own: alms here are counted, and help is given.");
      else L.push("Strangers of other faiths may give alms here, and are tended if they fall ill.");
    } else if (/Captain|Elder/.test(role)) {
      L.push(WATCH[R.watch]);
      const heat = (s.heat || {})[b.state] || 0;
      if (heat >= 3) L.push(`<span class="late">They know of the trouble you were part of, and watch you ${T("mixed")}.</span>`);
      const danger = w.near(b.t[0], b.t[1], 40).find(n => n.kind === "marker" && /brigand|pirate|monster|beast|troll|dragon/i.test(n.o.type));
      if (danger) L.push(`On the roads: ${U.esc(danger.o.name)}, ${this.know.dirDist(b.t[0], b.t[1], danger.o.t).txt} ${T("data")}.`);
      if (/Elder/.test(role) && P.biomes[0] && P.biomes[0].habitability != null) {
        const around = new Map(); for (let dr = -12; dr <= 12; dr += 3) for (let dc = -12; dc <= 12; dc += 3) { const c = b.t[0] + dc, r = b.t[1] + dr; if (w.inb(c, r) && w.isLand(c, r)) { const bi = w.C.biome[w.cell(c, r)]; around.set(bi, P.biomes[bi]); } }
        const list = [...around.values()].filter(x => x && x.habitability != null).sort((a, c) => c.habitability - a.habitability);
        if (list.length > 1) L.push(`The ${U.esc(list[0].name.toLowerCase())} round here feeds a camp; the ${U.esc(list[list.length - 1].name.toLowerCase())} starves one ${T("data")}.`);
      }
    } else if (/Harbourmaster/.test(role) && prov && prov.sea) {
      L.push(`To ${U.esc(prov.to)} by sea: ${prov.days} days ${U.esc(prov.how)}, ${prov.rations} rations for ${prov.eaters === 1 ? "you" : `the ${prov.eaters} of you`} ${T("mixed")}.`);
    } else if (role === "Townsfolk" && R.band === "hostile") L.push("Doors close as you pass. Keep your purse close tonight.");
    const told = this.storyTalk ? this.storyTalk(b, role) : null;
    if (told) L.push(told);
    return L;
  };

  // ------------------------------------------------------------------ the night: thieves, and whether the watch cares
  const nd9 = G.newDay;
  G.newDay = function (...a) {
    const r = nd9.apply(this, a), s = this.s, w = this.w;
    if (!s || s.carefree) return r;
    for (const k of Object.keys(s.heat || {})) s.heat[k] = Math.max(0, s.heat[k] - 0.1); // suspicion cools
    const b = w.burgAt.get(w.idx(s.c, s.r)) || w.near(s.c, s.r, 3).find(n => n.kind === "burg")?.o;
    if (b && !s.aboard) {
      const R = this.regard(b, "Townsfolk");
      if (R.band === "hostile" && U.rnd2(b.i, Math.floor(s.clock / 24), 41) < 0.15) {
        const loss = U.rn(s.purse * 0.1, 2);
        if (R.watch === "protects") { this.ui.toast(`A thief in the night: the watch of ${U.esc(b.name)} caught them, and your purse is whole.`); this.log(`A thief in ${U.esc(b.name)}, caught by the watch.`); }
        else { s.purse = U.rn(s.purse - loss, 2); this.ui.toast(`A thief in the night took 🟡 ${loss}. The watch of ${U.esc(b.name)} shrugs ${T("mixed")}.`); this.log(`Robbed of 🟡 ${loss} in ${U.esc(b.name)}; the watch did nothing.`, "hook"); }
      }
    }
    return r;
  };
  // entering a town whose watch has heard of you (the full check is Alpha 7's)
  const after9 = G.afterStep;
  G.afterStep = function (...a) {
    const r = after9.apply(this, a), s = this.s, w = this.w;
    const b = s && w.burgAt.get(w.idx(s.c, s.r));
    if (b && s.heatAsk !== b.i && ((s.heat || {})[b.state] || 0) >= 3 && !this.ui.busy()) {
      s.heatAsk = b.i; const heat = s.heat[b.state];
      s.clock += 2;
      if (heat >= 6) { const fine = Math.min(s.purse, AZ.money("fine", b)); s.purse = U.rn(s.purse - fine, 2); this.ui.toast(`The watch of ${U.esc(b.name)} has heard of you: two hours of questions, and a fine of 🟡 ${fine} ${T("mixed")}.`); }
      else this.ui.toast(`The watch of ${U.esc(b.name)} has heard of you: two hours of questions ${T("mixed")}.`);
    } else if (s && !b) s.heatAsk = null;
    return r;
  };

  // ------------------------------------------------------------------ the corner: the objective, the measure, one side story
  G.threadGoal = function (th) {
    const st = th && th.steps[th.phase], g = st && st.goal, w = this.w;
    if (!g) return null;
    if (g.burg != null && w.P.burgs[g.burg]) return w.P.burgs[g.burg].t;
    if (g.marker != null) { const m = w.P.markers.find(x => x.i === g.marker); if (m) return m.t; }
    if (g.tile) return g.tile;
    if (g.reg != null && this.sim) { const rg = this.sim.regs.find(x => x.i === g.reg); if (rg) return rg.t; }
    return null;
  };
  G.focusThread = function () { const s = this.s, act = (s.threads || []).filter(t => !t.done); return act.find(t => t.id === s.focus) || null; };
  G.threadLine = function () {
    const s = this.s; let h = "";
    const obj = this.objective ? this.objective() : "";
    if (obj) h += `<div class="hook">◇ ${U.esc(obj)}</div>`;
    if (this.arc && this.arc() && s.story && s.story.opened) h += `<div class="dim">${U.esc(this.measureWords())}</div>`;
    const th = this.focusThread();
    if (th) { const t = this.threadGoal(th), dd = t ? this.know.dirDist(s.c, s.r, t) : null; h += `<div class="side">◆ ${U.esc(th.title)}: ${U.esc(th.steps[th.phase].text)}${dd ? ` <span class="arrow">${U.arrow(t[0] - s.c, t[1] - s.r)}</span> ${U.num(dd.mi)} mi` : ""}</div>`; }
    return h;
  };

  // ------------------------------------------------------------------ the journal: the journey, the road ahead, side stories you can pick
  const journal2 = G.journal;
  G.journal = function () {
    journal2.call(this);
    const s = this.s, w = this.w, tv = this.tv, A = this.arc ? this.arc() : null, sheet = this.ui.el.modal && this.ui.el.modal.querySelector(".sheet");
    if (!sheet) return;
    if (A && s.story) {
      const rows = [];
      for (let i = Math.max(1, s.cp); i < this.jr.cps.length; i++) { const p = this.provisions(i); if (p) rows.push(`<tr><td>${U.esc(p.to)}</td><td>${U.esc(p.how)}${p.sea && this.jr.cps[i].legIn.domain === "land" ? " (a sea crossing)" : ""}</td><td>${U.num(p.miles)} mi</td><td>${p.days} d</td><td>${p.rations}</td></tr>`); }
      const comp = (s.party || []).map(p => `${U.esc(p.name)} (${U.esc(p.tie || p.role)})`).join(", ");
      const d = document.createElement("div");
      d.innerHTML = `<h3>The journey ${T("mixed")}</h3><p>${U.esc(tv.tie ? tv.tie.text : "")} ${tv.leads ? "You lead." : this.leaderName() ? `${U.esc(this.leaderName())} leads.` : ""}${comp ? ` With you: ${comp}.` : ""}</p>
        <p class="hook">◇ ${U.esc(this.objective())}</p><p>${U.esc(this.measureWords())}</p>
        ${s.story.record.length ? `<div class="log">${s.story.record.slice(-8).reverse().map(e => `<div><span class="dim">${AZ.Clock.fmt(e.t)}</span> ${e.html}</div>`).join("")}</div>` : ""}
        ${rows.length ? `<h3>The road ahead</h3><table class="plan"><tr><th>To</th><th>How</th><th>Miles</th><th>Days</th><th>Rations for ${this.eaters()}</th></tr>${rows.join("")}</table>` : ""}`;
      sheet.insertBefore(d, sheet.children[1] || null);
    }
    const act = (s.threads || []);
    const divs = [...sheet.querySelectorAll("div")].filter(x => /^◆ /.test(x.textContent));
    divs.forEach((div, k) => {
      const th = act[k]; if (!th || th.done) return;
      div.style.cursor = "pointer"; div.title = "Show in the corner and set a waypoint";
      if (th.id === s.focus) div.innerHTML = `<b>${div.innerHTML}</b>`;
      div.onclick = () => { s.focus = th.id; const t = this.threadGoal(th); if (t) s.waypoint = [t[0], t[1]]; this.ui.closeModal(); this.ui.toast(t ? "Shown in the corner; waypoint set. F follows it." : "Shown in the corner."); this.dirty = true; };
    });
    const h3 = [...sheet.querySelectorAll("h3")].find(x => x.textContent === "Side stories");
    if (h3) h3.textContent = "Side stories (click one to show it in the corner and set a waypoint)";
  };
  // new side stories take the corner if none is shown
  const st0 = G.startThread;
  G.startThread = function (def) { const r = st0.call(this, def), s = this.s; if (!this.focusThread()) { const t = (s.threads || []).filter(x => !x.done).slice(-1)[0]; if (t) s.focus = t.id; } return r; };

  // ------------------------------------------------------------------ the company's vessel at the yard
  const extras1 = G.townExtras;
  G.townExtras = function (b) {
    const out = extras1.call(this, b), s = this.s, v = s.vessel;
    if (v && v.mode === "company" && this.vesselHere(b)) out.push({ label: `The company's ${U.esc(v.kind.toLowerCase())}: leave her, sell her, or send her home`, act: { extra: () => this.companyVessel(b) } });
    return out;
  };
  G.companyVessel = async function (b) {
    const s = this.s, v = s.vessel, share = U.rn(this.sellPrice(v, b) / ((s.party || []).length + 1), 2);
    const k = await this.ui.choose(`<b>The company's ${U.esc(v.kind.toLowerCase())}</b> lies in ${U.esc(b.name)} harbour. She belongs to the company; you can see to her ${T("mixed")}.`,
      [{ label: "Leave her in the harbour's care: the company pays" }, { label: `Sell her, and take your share (🟡 ${share})` }, { label: "Send her home with a hand" }, { label: "Back" }], { cancel: 3 });
    if (k === 0) { v.watch = { b: b.i, since: s.clock, weekly: 0 }; this.ui.toast("The harbour will watch her, at the company's cost."); }
    else if (k === 1 || k === 2) { this.takeHold(); if (k === 1) s.purse = U.rn(s.purse + share, 2); this.log(k === 1 ? `Sold the company's ${U.esc(v.kind.toLowerCase())} in ${U.esc(b.name)}.` : `Sent the company's ${U.esc(v.kind.toLowerCase())} home from ${U.esc(b.name)}.`); s.vessel = null; s.aboard = false; s.c = b.t[0]; s.r = b.t[1]; this.afterStep(); }
  };

  // ------------------------------------------------------------------ which journey: kept in the save
  const fresh2 = G.fresh;
  G.fresh = function (...a) { const r = fresh2.apply(this, a); if (this.s && this.jr) this.s.jIdx = this.w.P.journeys.indexOf(this.jr.J); return r; };
  const load2 = G.loadGame;
  G.loadGame = function (...a) {
    const ok = load2.apply(this, a), s = this.s, P = this.w.P;
    if (ok && s && s.jIdx != null && P.journeys[s.jIdx] && (!this.jr || this.jr.J !== P.journeys[s.jIdx])) { this.jr = this.jr0 = new AZ.Journey(this.w, P.journeys[s.jIdx]); this._arc = null; }
    return ok;
  };
})();
