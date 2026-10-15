// =============================================================================================
// 26_narrator.js · Alpha 5.2: the narrator.
//   Routine reports carry the story: a camp report tells a new country in full and a known one in a
//   line, and always says how the race stands; the company speaks at the fire. The crew asks once
//   how to spend the nights, and keeps your standing order. Deeds are remembered, and change how
//   people see you. People you meet are known; companions can settle in a town and greet you there.
// =============================================================================================
(() => {
  const G = AZ.Game.prototype, U = AZ.U, T = AZ.T;

  // ------------------------------------------------------------------ the camp report tells the race
  const camp1 = G.campNight;
  G.campNight = async function () {
    const s = this.s, w = this.w, say0 = this.ui.say.bind(this.ui);
    const biome = w.P.biomes[w.C.biome[w.cell(s.c, s.r)]]?.name || "", cl = s.campLog = s.campLog || { biome: null, nights: 0, water: -9, n: 0 };
    const again = cl.biome === biome && w.isLand(s.c, s.r);
    cl.n++; cl.nights = again ? cl.nights + 1 : 1; cl.biome = biome;
    const race = this.raceStatus ? this.raceStatus() : null, line = race ? this.raceLine() : "";
    const band = race ? (race.ahead > (race.rule.tol || 1) * 24 ? "ahead" : race.ahead < -(race.rule.tol || 1) * 24 ? "behind" : "on") : null;
    const talk = this.campTalk(band, race, cl.n);
    this.ui.say = (p, who) => {
      let t = String(p);
      if (again) t = t.replace(/^(You(?: and the company \([^)]*\))?) camp in the ([^.]*?)\s*(<span[^>]*>[^<]*<\/span>)?\s*\./, (m0, a, b2) => `${a === "You" ? "Another night" : `${a.replace(/ camp$/, "")}: another night`} in the ${b2}.`);
      if (/Water close by; a line in it overnight\./.test(t)) { if (cl.n - cl.water <= 2) t = t.replace(/\s*Water close by; a line in it overnight\./, ""); else cl.water = cl.n; }
      // in a country you know, say only what changed since last night (the place line and the hours stay)
      const norm = x => x.replace(/<[^>]+>/g, "").replace(/[\d.,°FC]+/g, "#").trim();
      const sents = t.split(/(?<=\.)\s+(?=[A-Z<(])/), prev = new Set(cl.prev || []);
      cl.prev = sents.map(norm);
      if (again) t = sents.filter((x, i) => i === 0 || /^\(/.test(x.trim()) || !prev.has(norm(x))).join(" ");
      const extra = [line ? `<span class="hook">⏱ ${U.esc(line)}</span>` : "", talk].filter(Boolean).join(" ");
      return say0(extra ? `${t} ${extra}` : t, who);
    };
    try { return await camp1.call(this); } finally { this.ui.say = say0; s.campBand = band; }
  };
  // the company speaks at the fire: every third night, or when the race turns
  G.campTalk = function (band, race, n) {
    const s = this.s, party = (s.party || []).filter(p => p.name);
    if (!party.length || !race || (n % 3 && band === s.campBand)) return "";
    const p = party.find(x => x.tie) || party[n % party.length], name = U.esc(p.name), place = U.esc(race.cp.place.name), dl = U.esc((race.C && race.C.deadline) || "par");
    const say = {
      ahead: [`${name} counts the days on the fingers of one hand: “We'll make ${place} with time to spare.”`, `${name} is in good spirits: “Ahead of par, and the road is kind. Don't spend it.”`],
      on: [`${name}, by the fire: “Steady. Keep this pace and we're in ${place} on the day.”`, `${name} looks at the sky and says only: “On time.”`],
      behind: [`${name} is quiet by the fire, then: “If we lose another day, we miss ${dl}.”`, `${name}: “We're behind. Start before dawn tomorrow?”`],
    }[band] || [];
    return say.length ? `<i>${say[n % say.length]}</i>` : "";
  };

  // ------------------------------------------------------------------ the crew asks once how to spend the nights
  const crew1 = G.crewCall;
  G.crewCall = async function () {
    const s = this.s, v = s.vessel;
    if (!v) return crew1.call(this);
    if (v.orders === "anchor" && v.morale >= 20) {
      const t0 = s.clock; s.clock = AZ.Clock.nextDawn(s.clock, this.lat()); v.anchored = true; v.morale = Math.min(100, v.morale + 4); this.slept();
      const act = this.doAct("anchor") || this.doAct("camp"), line = this.raceLine ? this.raceLine() : "";
      this.ui.toast(`At anchor until dawn, by your standing order (${AZ.Clock.span(s.clock - t0)}). ${line ? `⏱ ${U.esc(line)}` : ""} ${act ? `<span class="hook">★ ${U.esc(act.label)}</span>` : ""}`, act ? "gold" : "");
      this.dirty = true; return;
    }
    if (v.orders === "sail" && v.morale >= 30) {
      v.morale -= 12;
      const nearLand = this.w.isLand(s.c, s.r) || this.landDistance(s.c, s.r, 3) <= 2;
      if (nearLand && U.rnd2(s.c, s.r, Math.floor(s.clock)) < 0.15) this.events.fx({ cond: "damaged", time: 3 }, "Struck in the dark, sailing on by your standing order.");
      else this.ui.toast(`The crew sails on through the night, by your standing order. Morale ${Math.round(v.morale)}.`);
      this.dirty = true; return;
    }
    const m0 = v.morale; v.anchored = false;
    await crew1.call(this);
    if (s.vessel !== v || v.orders === "ask") return;
    const chose = v.anchored ? "anchor" : v.morale <= m0 - 12 ? "sail" : null;
    if (!chose) return;
    const k = await this.ui.choose(`Make that your standing order for the nights, so the crew need not ask? ${T("new")}`,
      [{ label: chose === "anchor" ? "Yes: anchor at dusk until dawn" : "Yes: sail on through the night" }, { label: "No: ask me each night" }], { cancel: 1 });
    v.orders = k === 0 ? chose : "ask";
  };
  const extras2 = G.townExtras;
  G.townExtras = function (b) {
    const out = extras2.call(this, b), s = this.s, v = s.vessel;
    if (v && v.orders && this.vesselHere && this.vesselHere(b)) out.push({ label: `Night orders for the ${U.esc(v.kind.toLowerCase())}: ${v.orders === "anchor" ? "anchor at dusk" : v.orders === "sail" ? "sail on" : "ask each night"}`, act: { extra: async () => { const k = await this.ui.choose("Night orders", [{ label: "Anchor at dusk until dawn" }, { label: "Sail on through the night" }, { label: "Ask me each night" }], { cancel: 2 }); v.orders = ["anchor", "sail", "ask"][k]; } } });
    if ((s.party || []).length) out.push({ label: `The company (${s.party.length}): let someone go, or settle them here`, act: { extra: () => this.manageCompany(b) } });
    for (const p of ((s.acq || {})[b.i] || []).filter(p => p.settled)) out.push({ label: `Visit ${U.esc(p.name)} (${U.esc(p.tie || p.role)})`, act: { extra: () => this.visitKnown(b, p) } });
    return out;
  };

  // ------------------------------------------------------------------ deeds are remembered
  const fx2 = AZ.Events.prototype.fx;
  AZ.Events.prototype.fx = function (e, label) {
    const g = this.g, s = g && g.s;
    if (s && e && Array.isArray(e.stand) && e.stand.length && !s.carefree) {
      const b = g.townNear ? g.townNear() : null, place = b ? b.name : "the road";
      s.deeds = s.deeds || [];
      for (const [kind, id, n] of e.stand) if (n) s.deeds.push({ t: s.clock, kind, id, n, place, text: `${place}: ${String(label || "").replace(/<[^>]+>/g, "").replace(/\s*\(.*?\)\s*$/, "").slice(0, 90)}` });
      if (s.deeds.length > 60) s.deeds.splice(0, s.deeds.length - 60);
    }
    return fx2.call(this, e, label);
  };
  const regard1 = G.regard;
  G.regard = function (b, role) {
    const R = regard1.call(this, b, role), s = this.s;
    if (!b || !s || !s.deeds || !s.deeds.length) return R;
    const mine = s.deeds.filter(d => (d.kind === "s" && d.id === b.state) || (d.kind === "f" && d.id === R.faith));
    if (!mine.length) return R;
    const sum = U.clamp(mine.reduce((a, d) => a + d.n, 0), -3, 3), last = mine[mine.length - 1];
    if (!sum) return R;
    const score = R.score + sum, band = score >= 3 ? "warm" : score >= 0 ? "neutral" : score >= -2 ? "cool" : "hostile";
    return { ...R, score, band, why: [sum > 0 ? `word of what you did at ${last.place} has travelled` : `they know what you did at ${last.place}`, ...R.why] };
  };

  // ------------------------------------------------------------------ people you know, and companions who settle
  const pl1 = G.personLines;
  G.personLines = function (b, role, name) {
    const s = this.s, L = pl1.call(this, b, role, name);
    if (!name) return L;
    s.acq = s.acq || {};
    const list = s.acq[b.i] = s.acq[b.i] || [], k = list.find(p => p.name === name);
    if (k && k.met < s.clock - 24 * 7) L.unshift(`${U.esc(name)} remembers you from ${AZ.Clock.fmt(k.met)} ${T("new")}.`);
    if (!k) list.push({ name, role, met: s.clock });
    return L;
  };
  const after10 = G.afterStep;
  G.afterStep = function (...a) {
    const r = after10.apply(this, a), s = this.s, w = this.w;
    const b = s && w.burgAt.get(w.idx(s.c, s.r));
    if (b && s.greetAt !== b.i) {
      s.greetAt = b.i;
      const home = ((s.acq || {})[b.i] || []).filter(p => p.settled);
      if (home.length) this.ui.toast(`${home.map(p => `${U.esc(p.name)} (${U.esc(p.tie || p.role)})`).join(" and ")} ${home.length > 1 ? "live" : "lives"} here now, and ${home.length > 1 ? "come" : "comes"} out to meet you.`);
    } else if (s && !b) s.greetAt = null;
    return r;
  };
  G.visitKnown = async function (b, p) {
    const s = this.s;
    const k = await this.ui.choose(`<b>${U.esc(p.name)}</b> (${U.esc(p.tie || p.role)}) has made a home in ${U.esc(b.name)} since ${AZ.Clock.fmt(p.settled)} ${T("new")}.`,
      [{ label: `Stay the night with ${U.esc(p.name)}` }, { label: `Ask ${U.esc(p.name)} to come with you again` }, { label: "Go" }], { cancel: 2 });
    if (k === 0) { const t0 = s.clock; s.clock = AZ.Clock.nextDawn(s.clock, this.lat()); this.slept && this.slept(); s.partyMorale = U.clamp((s.partyMorale ?? 70) + 10, 0, 100); this.ui.toast(`A night under ${U.esc(p.name)}'s roof (${AZ.Clock.span(s.clock - t0)}).`); }
    if (k === 1) { s.party = s.party || []; s.party.push({ name: p.name, role: p.role, tie: p.tie }); s.acq[b.i] = s.acq[b.i].filter(x => x !== p); this.log(`${U.esc(p.name)} left home in ${U.esc(b.name)} to come with you.`); }
    this.dirty = true;
  };
  // the company, at any time in a town: let someone go, or settle them here
  G.manageCompany = async function (b) {
    const s = this.s;
    const k = await this.ui.choose(`<b>The company</b> ${T("new")}: ${s.party.map(p => `${U.esc(p.name)} (${U.esc(p.tie || p.role)})`).join(", ")}.`, [...s.party.map(p => ({ label: `${U.esc(p.name)} (${U.esc(p.tie || p.role)})` })), { label: "Back" }], { cancel: s.party.length });
    const p = s.party[k]; if (!p) return;
    const j = await this.ui.choose(`${U.esc(p.name)} (${U.esc(p.tie || p.role)})`, [{ label: `Settle here, in ${U.esc(b.name)}: you can visit` }, { label: "Part ways" }, { label: "Back" }], { cancel: 2 });
    if (j === 0) { this.settleCompanion(p, b); s.party = s.party.filter(x => x !== p); }
    if (j === 1) { this.log(`${U.esc(p.name)} went their own way.`); s.party = s.party.filter(x => x !== p); }
    this.dirty = true;
  };
  // settling: a companion can make a home in this town, during or at the end of the journey
  G.settleCompanion = function (p, b) {
    const s = this.s; if (!b) return false;
    s.acq = s.acq || {}; (s.acq[b.i] = s.acq[b.i] || []).push({ name: p.name, role: p.role, tie: p.tie || null, met: s.clock, settled: s.clock });
    this.log(`${U.esc(p.name)} settled in ${U.esc(b.name)}.`, "hook");
    return true;
  };
  G.knownHtml = function () {
    const s = this.s, w = this.w, rows = Object.entries(s.acq || {}).filter(([, l]) => l.length);
    if (!rows.length) return "";
    return `<h3>People you know</h3>${rows.map(([bi, l]) => `<div><b>${U.esc(w.P.burgs[bi]?.name || "?")}</b>: ${l.map(p => `${U.esc(p.name)} (${U.esc(p.tie || p.role)}${p.settled ? ", lives here" : ""})`).join(", ")}</div>`).join("")}`;
  };
  const jh2 = G.journeyHtml;
  G.journeyHtml = function () { return (jh2 ? jh2.call(this) : "") + (this.knownHtml ? this.knownHtml() : ""); };
  const journal3 = G.journal;
  G.journal = function () {
    journal3.call(this);
    const sheet = this.ui.el.modal && this.ui.el.modal.querySelector && this.ui.el.modal.querySelector(".sheet");
    if (sheet && !(this.arc && this.arc()) && this.knownHtml && this.knownHtml()) { const d = document.createElement("div"); d.innerHTML = this.knownHtml(); sheet.insertBefore(d, sheet.children[1] || null); }
  };
})();
