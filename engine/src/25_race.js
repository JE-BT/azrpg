// =============================================================================================
// 25_race.js · Alpha 5.2: the clock.
//   A journey is a race against its plan. Every stop has a par time; each journey type reads early
//   and late in its own way (a pilgrim waits for the holy day, a courier wants every hour, a raid
//   must beat the alarm, a campaign that arrives after the battle is lost). Arriving scores points,
//   the arrival page says how the race stands, the corner and the camp keep the count, choices that
//   cost time say what they cost against par, and the end is a report card to compare runs by.
// =============================================================================================
(() => {
  const G = AZ.Game.prototype, U = AZ.U, T = AZ.T;
  // early: bonus (each day early beyond the window adds points) | wait (offer to wait for the day) |
  // neutral | penalty; tol: the window, in days either side of par; k: points lost per day late
  // beyond it; fail: days late at the target that end the journey; waitBonus: points for waiting.
  const R = (deadline, target, stops, after, words, lost) => ({ deadline, target, stops, after: after || stops, words, lost });
  AZ.CLOCK = {
    "Pilgrimage": R("the holy day", { early: "wait", tol: 1, k: 15, waitBonus: 15, wait: "the feast" }, { early: "neutral", tol: 3, k: 4 }, null, ["with days to spare before the holy day", "in time for the holy day", "after the holy day has passed"]),
    "Quest": R("the appointed time", { early: "bonus", tol: 3, k: 6 }, { early: "bonus", tol: 5, k: 3 }, null, ["ahead of the appointed time", "at the appointed time", "late for the appointed time"]),
    "Caravan": R("market day", { early: "wait", tol: 2, k: 12, waitBonus: 10, wait: "market day" }, { early: "neutral", tol: 2, k: 6 }, null, ["before the market opens", "on market day", "after the market has closed"]),
    "Military campaign": R("the battle", { early: "penalty", earlyK: 5, tol: 1, k: 20, fail: 5 }, { early: "neutral", tol: 2, k: 8 }, null, ["early, eating the campaign's stores", "in time for the battle", "after the battle"], "The battle was fought without you, and the campaign is lost."),
    "Embassy": R("the audience", { early: "wait", tol: 1, k: 15, waitBonus: 5, wait: "the audience" }, { early: "neutral", tol: 3, k: 4 }, null, ["before the court will see you", "on the day of the audience", "late for the audience"]),
    "Raid": R("the alarm", { early: "bonus", tol: 2, k: 12 }, { early: "bonus", tol: 3, k: 5 }, { early: "bonus", tol: 2, k: 15 }, ["before the alarm is raised", "with the coast still asleep", "with the coast alarmed"]),
    "Smuggling run": R("the buyer's night", { early: "wait", tol: 1, k: 15, waitBonus: 5, wait: "the buyer's night" }, { early: "neutral", tol: 2, k: 5 }, null, ["before the buyer is ready", "on the buyer's night", "after the buyer has gone"]),
    "Courier ride": R("the deadline", { early: "bonus", perDay: 8, tol: 0.5, k: 25, fail: 10 }, { early: "bonus", tol: 1, k: 8 }, null, ["ahead of the deadline", "on the deadline", "past the deadline"], "Too late: the message is worth nothing now."),
    "Expedition": R("the season", { early: "bonus", tol: 7, k: 3 }, { early: "bonus", tol: 7, k: 2 }, null, ["with the season still young", "within the season", "with the season closing"]),
    "Refugee flight": R("the closing border", { early: "bonus", tol: 3, k: 8 }, { early: "bonus", tol: 3, k: 4 }, null, ["well ahead of the danger", "just ahead of the danger", "with the danger close behind"]),
    "Treasure hunt": R("the rivals", { early: "bonus", tol: 3, k: 6 }, { early: "bonus", tol: 5, k: 3 }, null, ["ahead of any rival", "level with your rivals", "behind your rivals"]),
    "Monster hunt": R("the dark of the moon", { early: "wait", tol: 2, k: 8, waitBonus: 10, wait: "the dark of the moon" }, { early: "neutral", tol: 4, k: 3 }, null, ["before the dark of the moon", "in the dark of the moon", "after the dark of the moon"]),
    "Exile's flight": R("the pursuit", { early: "bonus", tol: 2, k: 10, fail: 15 }, { early: "bonus", tol: 2, k: 6 }, null, ["well ahead of the pursuit", "a step ahead of the pursuit", "with the pursuit closing"], "The pursuit catches up with you."),
    "Royal progress": R("the court's calendar", { early: "penalty", earlyK: 8, tol: 1, k: 15 }, { early: "penalty", earlyK: 6, tol: 1, k: 8 }, null, ["before the town is ready", "on the day the town expects you", "late, with the town kept waiting"]),
    "Airship voyage": R("the timetable", { early: "neutral", tol: 1, k: 10 }, { early: "neutral", tol: 1, k: 8 }, null, ["ahead of the timetable", "on the timetable", "behind the timetable"]),
    "Arcane errand": R("the conjunction", { early: "wait", tol: 0.5, k: 30, fail: 3, waitBonus: 10, wait: "the conjunction" }, { early: "neutral", tol: 3, k: 4 }, null, ["before the conjunction", "at the conjunction", "after the conjunction"], "The conjunction has passed; the working cannot be done."),
    "Mercenary contract": R("the muster", { early: "neutral", tol: 2, k: 15, fail: 7 }, { early: "neutral", tol: 3, k: 6 }, null, ["early for the muster", "in time for the fighting", "after the fighting has begun"], "The fighting is over, and the contract is void."),
    "Wandering": R("no one's clock", { early: "neutral", tol: 30, k: 1 }, { early: "neutral", tol: 30, k: 1 }, null, ["in your own time", "in your own time", "in your own time"]),
  };
  AZ.stopPoints = function (rule, dDays, waited) {
    if (waited) return { p: 100 + (rule.waitBonus || 0), how: "on", waited: true };
    if (Math.abs(dDays) <= rule.tol) return { p: 100, how: "on" };
    if (dDays < 0) {
      const e = -dDays - rule.tol;
      if (rule.early === "bonus") return { p: Math.round(100 + Math.min(20, (rule.perDay || 5) * e)), how: "early" };
      if (rule.early === "wait") return { p: 85, how: "early" };
      if (rule.early === "penalty") return { p: Math.round(Math.max(40, 100 - (rule.earlyK || 8) * e)), how: "early" };
      return { p: 100, how: "early" };
    }
    const l = dDays - rule.tol;
    return { p: Math.round(Math.max(0, 100 - rule.k * l)), how: "late", fail: rule.fail != null && dDays > rule.fail };
  };
  G.clockRules = function () { const A = this.arc ? this.arc() : null; return A ? AZ.CLOCK[A.type] || AZ.CLOCK.Quest : null; };
  G.ruleFor = function (k) { const C = this.clockRules(), A = this.arc(); if (!C) return null; return k === A.target ? C.target : k > A.target ? C.after : C.stops; };
  const span = h => AZ.Clock.span(Math.abs(h));
  const policyWords = r => `${r.early === "bonus" ? "every day early counts for you" : r.early === "wait" ? `early, you wait for ${r.wait || "the day"}` : r.early === "penalty" ? "early is no better than late" : "early costs you nothing"}; ${r.fail != null ? "too late, and it is lost" : "late costs you"}`;

  // ------------------------------------------------------------------ how the race stands
  G.raceStatus = function () {
    const s = this.s, A = this.arc ? this.arc() : null;
    if (!A || s.done || !this.jr) return null;
    const cp = this.jr.cps[s.cp]; if (!cp) return null;
    const p = this.provisions ? this.provisions(s.cp) : null, ch = cp.legIn && cp.legIn.chain;
    let left = Math.hypot(cp.tile[0] - s.c, cp.tile[1] - s.r) * this.w.miles * 1.25;
    if (ch && ch.length > 1 && cp.legIn.miles) { // what is left of the plan's course, from the nearest point on it
      let bi = 0, bd = Infinity; for (let i = 0; i < ch.length; i += 2) { const dd = Math.abs(ch[i][0] - s.c) + Math.abs(ch[i][1] - s.r); if (dd < bd) { bd = dd; bi = i; } }
      left = cp.legIn.miles * (1 - bi / (ch.length - 1)) + bd * this.w.miles;
    }
    const hpm = p && p.miles ? (p.days * 24) / p.miles : 1 / 3;
    const eta = s.clock + left * hpm, ahead = cp.parArrive - eta; // hours ahead of par (negative: behind)
    return { cp, ahead, eta, rule: this.ruleFor(s.cp), target: s.cp === A.target, C: this.clockRules() };
  };
  G.raceLine = function () {
    const r = this.raceStatus(); if (!r) return "";
    const tol = (r.rule.tol || 1) * 24, place = r.cp.place.name;
    const pace = Math.abs(r.ahead) <= tol ? "on pace for par" : r.ahead > 0 ? `on pace to arrive ${span(r.ahead)} ahead of par` : `on pace to arrive ${span(r.ahead)} behind par`;
    return r.target ? `${U.cap(r.C.deadline)} at ${place}: par ${AZ.Clock.fmt(r.cp.parArrive)}, and you are ${pace}.` : `${place} by ${AZ.Clock.fmt(r.cp.parArrive)} (par): ${pace}.`;
  };
  G.raceBrief = function () {
    const A = this.arc(), C = this.clockRules(); if (!A || !C) return "";
    const tcp = this.jr.cps[A.target], last = this.jr.cps[this.jr.cps.length - 1];
    return `<b class="hook">The clock:</b> ${this.jr.cps.length - 1} stops, each with a par time; ${U.esc(C.deadline)} at ${U.esc(tcp.place.name)} is par ${AZ.Clock.fmt(tcp.parArrive)}${tcp !== last ? `, and the end at ${U.esc(last.place.name)} is par ${AZ.Clock.fmt(last.parArrive)}` : ""}. There, ${policyWords(C.target)} ${T("mixed")}.`;
  };
  const tl1 = G.threadLine;
  G.threadLine = function () {
    const h = tl1.call(this), line = this.raceLine ? this.raceLine() : "";
    if (!line) return h;
    const i = h.indexOf("</div>");
    return i >= 0 && /◇/.test(h.slice(0, i)) ? `${h.slice(0, i + 6)}<div class="hook">⏱ ${U.esc(line)}</div>${h.slice(i + 6)}` : `<div class="hook">⏱ ${U.esc(line)}</div>${h}`;
  };
  // choices that cost time say what they cost against par
  const scene1 = AZ.Events.prototype.scene;
  AZ.Events.prototype.scene = async function (head, note, options, key) {
    const g = this.g, r = g.raceStatus ? g.raceStatus() : null;
    if (r && Array.isArray(options)) for (const o of options) {
      const t = o && o.fx && typeof o.fx === "object" ? o.fx.time || 0 : 0;
      if (t >= 3 && !o._race) { o._race = true; const after = r.ahead - t, tol = (r.rule.tol || 1) * 24; o.label = `${o.label} · ${after >= -tol ? (after > tol ? "still ahead of par" : "still on par") : r.ahead >= -tol ? "puts you behind par" : "further behind par"}`; }
    }
    return scene1.call(this, head, note, options, key);
  };

  // ------------------------------------------------------------------ arriving: one page for the event
  G.arrivalPages = function (cp, k, d, L) {
    const s = this.s, A = this.arc ? this.arc() : null;
    if (!A) return L;
    const rule = this.ruleFor(k), C = this.clockRules(), dd = d / 24, P = AZ.stopPoints(rule, dd), isT = k === A.target;
    const words = isT ? C.words[P.how === "early" ? 0 : P.how === "on" ? 1 : 2] : P.how === "early" ? "ahead of par" : P.how === "on" ? "on par" : "behind par";
    const head = P.how === "on" ? `★ ${U.esc(cp.place.name)}: on par!` : P.how === "early" ? `★ ${U.esc(cp.place.name)}: ${span(d)} ahead of par!` : `${U.esc(cp.place.name)}: ${span(d)} behind par.`;
    const parts = [`<div style="font-size:1.35em;line-height:1.3"><b class="hook">${head}</b></div><div>Par ${AZ.Clock.fmt(cp.parArrive)} · arrived ${AZ.Clock.fmt(s.clock)} · ${U.esc(words)} · <b>${P.p} points</b> against the clock ${T("mixed")}.</div>`];
    if (isT && rule.early === "wait" && P.how === "early") { s.waitOffer = { k, until: cp.parArrive - rule.tol * 24 }; parts.push(`<div>${U.cap(U.esc(rule.wait))} is ${span(cp.parArrive - rule.tol * 24 - s.clock)} off. You can wait for it here.</div>`); }
    if (P.fail && isT) { s.failed = true; parts.push(`<div class="late"><b>${U.esc(C.lost || "Too late.")}</b></div>`); this.log(`Too late at ${U.esc(cp.place.name)}: ${U.esc(C.lost || "the journey is lost")}.`, "hook"); }
    const mis = s.story && s.story.mislead;
    if (mis && k === mis.at + 1) { parts.push(`<div>The lead was false: what you were told of ${U.esc(mis.what)} came to nothing here. The trail runs on.</div>`); s.story.mislead = null; if (this.storyNote) this.storyNote(`At ${U.esc(cp.place.name)} the lead proved false.`, -0.25); }
    if (L[1]) parts.push(`<div>${L[1]}</div>`);
    const next = A.legs[k + 1];
    if (next && !s.failed) parts.push(`<div class="hook">◇ ${U.esc(next.objective)}. Next par: ${AZ.Clock.fmt(this.jr.cps[k + 1].parArrive)}.</div>`);
    this.dirty = true;
    return [parts.join("")];
  };
  // waiting for the day at the target
  const climax1 = G.climax;
  G.climax = async function () {
    const s = this.s, A = this.arc(), wo = s.waitOffer;
    if (wo && wo.k === A.target && s.clock < wo.until && !s.story.climaxed) {
      const rule = this.ruleFor(wo.k), days = Math.ceil((wo.until - s.clock) / 24), town = this.jr.cps[wo.k].place.burg;
      const cost = U.rn(days * (town ? AZ.Prices.inn(this.w, town) : 0), 2);
      const k = await this.ui.choose(`<b>${U.cap(U.esc(rule.wait))}</b> is ${days} day${days > 1 ? "s" : ""} off ${T("mixed")}. Waiting for it scores as on the day, with ${rule.waitBonus || 0} points more; going ahead now scores as early.`,
        [{ label: `Wait for ${U.esc(rule.wait)} (${days} d; lodging 🟡 ${cost})` }, { label: "Go ahead now" }], { cancel: 1 });
      if (k === 0) { const rec = s.cpRec[wo.k] = s.cpRec[wo.k] || { acts: {} }; rec.waited = true; s.purse = U.rn(Math.max(0, s.purse - cost), 2); s.clock = wo.until; this.slept && this.slept(); this.log(`Waited ${days} days in ${U.esc(this.jr.cps[wo.k].place.name)} for ${U.esc(rule.wait)}.`, "hook"); }
      s.waitOffer = null;
    }
    return climax1.call(this);
  };

  // ------------------------------------------------------------------ the report card
  G.raceCard = function () {
    const s = this.s, A = this.arc ? this.arc() : null, jr = this.jr;
    if (!A) return null;
    const rows = []; let num = 0, den = 0;
    for (let k = 1; k < jr.cps.length; k++) {
      const cp = jr.cps[k], rec = s.cpRec[k], rule = this.ruleFor(k), w = k === A.target ? 3 : k === jr.cps.length - 1 ? 2 : 1;
      if (!rec || (!rec.arrive && !rec.skipped)) { if (s.done) { den += w * 100; rows.push({ k, name: cp.place.name, par: cp.parArrive, how: "never reached", p: 0, w }); } continue; }
      if (rec.skipped) { den += w * 100; rows.push({ k, name: cp.place.name, par: cp.parArrive, how: "skipped", p: 0, w }); continue; }
      const P = AZ.stopPoints(rule, (rec.arrive - cp.parArrive) / 24, rec.waited);
      num += w * P.p; den += w * 100;
      rows.push({ k, name: cp.place.name, par: cp.parArrive, at: rec.arrive, d: rec.arrive - cp.parArrive, how: P.waited ? "waited for the day" : P.how, p: P.p, w });
    }
    const clock = den ? Math.round((1000 * num) / den) : 0;
    const grade = s.failed ? "F" : clock >= 1000 ? "S" : clock >= 900 ? "A" : clock >= 750 ? "B" : clock >= 600 ? "C" : clock >= 400 ? "D" : "E";
    const acts = jr.cps.reduce((a, cp) => a + cp.acts.length, 0), done = s.cpRec.reduce((a, r) => a + Object.keys((r && r.acts) || {}).length, 0);
    const story = 50 * U.clamp(Math.floor((s.story && s.story.measure) || 0), 0, 4), tasks = acts ? Math.round((100 * done) / acts) : 100;
    return { rows, clock, grade, story, tasks, total: clock + story + tasks, acts, done, run: `${this.w.P.world.name} · ${jr.J.name} · ${s.seed}` };
  };
  G.bestKey = function () { return `azrpg:best:${this.w.P.world.name}:${this.w.P.journeys.indexOf(this.jr.J)}`; };
  G.finishPages = function () {
    const s = this.s, A = this.arc ? this.arc() : null, card = this.raceCard();
    if (!A || !card) return [];
    const noun = AZ.noun(this.jr), m = U.clamp(Math.floor(s.story.measure), 0, 4), tv = this.tv;
    const tie = tv.tie && tv.tie.who && tv.tie.who.joins ? ((s.party || []).some(p => p.name === tv.tie.who.name) ? `${U.esc(tv.tie.who.name)}, your ${U.esc(tv.tie.who.role)}, came through it with you.` : `${U.esc(tv.tie.who.name)}, your ${U.esc(tv.tie.who.role)}, did not see the end of it with you.`) : "";
    const deeds = (s.deeds || []).slice(-3).map(d => d.text).filter(Boolean);
    const epilogue = `<b class="hook">The ${U.esc(noun)} is ${s.failed ? "lost" : "over"}.</b> ${U.esc(U.cap(A.arc.endings[m]))}. ${tie}${deeds.length ? ` They will remember: ${deeds.map(U.esc).join("; ")}.` : ""} ${U.esc(A.arc.label)}: ${U.esc(A.arc.measure[m])}.`;
    let best = null; try { best = JSON.parse((this.store && this.store.getItem(this.bestKey())) || "null"); } catch (e) { best = null; }
    const isBest = !best || card.total > best.total;
    if (isBest) try { this.store && this.store.setItem(this.bestKey(), JSON.stringify({ total: card.total, clock: card.clock, grade: card.grade, name: tv.name, seed: s.seed })); } catch (e) { /* no storage */ }
    const rows = card.rows.map(r => `<tr><td>${U.esc(r.name)}${r.w > 1 ? " ★" : ""}</td><td>${AZ.Clock.fmt(r.par)}</td><td>${r.at != null ? AZ.Clock.fmt(r.at) : "—"}</td><td>${r.d != null ? (Math.abs(r.d) < 1 ? "on par" : `${span(r.d)} ${r.d < 0 ? "early" : "late"}`) : ""}</td><td>${U.esc(r.how)}</td><td>${r.p}${r.w > 1 ? ` ×${r.w}` : ""}</td></tr>`).join("");
    const cardHtml = `<div style="font-size:1.5em"><b class="hook">Against the clock: ${card.clock} · ${card.grade}</b></div>
      <table class="plan"><tr><th>Stop</th><th>Par</th><th>Arrived</th><th></th><th>How</th><th>Points</th></tr>${rows}</table>
      <div>Story: ${U.esc(A.arc.measure[m])} (+${card.story}) · the plan's tasks ${card.done} of ${card.acts} (+${card.tasks}) · <b>total ${U.num(card.total)}</b>${isBest ? " · your best on this journey" : best ? ` · your best: ${U.num(best.total)} (${U.esc(best.grade)})` : ""}.</div>
      <div class="dim">${U.esc(card.run)} · 🟡 ${U.rn(s.purse, 1)} · side stories finished: ${s.threads.filter(t => t.outcome === "done").length}. The journal (J) keeps this card; you can keep exploring.</div>`;
    s.report = { clock: card.clock, grade: card.grade, total: card.total };
    this.log(`Against the clock: ${card.clock} (${card.grade}); total ${card.total}.`, "hook");
    return [epilogue, cardHtml];
  };
  // the journal: the race so far
  const jh1 = G.journeyHtml;
  G.journeyHtml = function () {
    const h = jh1 ? jh1.call(this) : "", card = this.raceCard ? this.raceCard() : null;
    if (!h || !card || !card.rows.length) return h;
    return `${h}<h3>Against the clock${this.s.done ? `: ${card.clock} · ${card.grade}` : " so far"}</h3><table class="plan"><tr><th>Stop</th><th>Par</th><th>Arrived</th><th>How</th><th>Points</th></tr>${card.rows.map(r => `<tr><td>${U.esc(r.name)}</td><td>${AZ.Clock.fmt(r.par)}</td><td>${r.at != null ? AZ.Clock.fmt(r.at) : "—"}</td><td>${U.esc(r.how)}</td><td>${r.p}</td></tr>`).join("")}</table>`;
  };
})();
