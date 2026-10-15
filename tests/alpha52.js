// Alpha 5.2 checks: you command; every journey type reads the clock its own way; one page per
// arrival; waiting for the day; arriving too late; the report card and your best; the camp report
// tells the race; the crew's standing night orders; deeds remembered; the false lead found out at the
// next stop; people you know, and companions who settle. Run: node tests/alpha52.js out/Bernoy_rpg.html
const { loadWorld, stubUI } = require("./harness.js");
const ok = (cond, msg) => { console.log(`${cond ? "ok  " : "FAIL"} ${msg}`); if (!cond) process.exitCode = 1; };
const later = () => new Promise(r => setTimeout(r, 5));
const plain = h => String(h || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
(async () => {
  const { AZ, P, w, mk } = await loadWorld(process.argv[2]);
  const U = AZ.U, store = new Map();
  const mkGame = (J = P.journeys[0], seed = 3) => {
    const jr = new AZ.Journey(w, J), ui = stubUI(), g = new AZ.Game(w, new AZ.Renderer(w, new AZ.Art(w, mk), mk(10, 10), mk), ui, jr, { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) });
    AZ.game = g; g.jr0 = jr; g.fresh(seed, null, 80, { mode: "journey" }); g.started(); return [g, ui, jr];
  };
  // 1. you command
  {
    const [g] = mkGame();
    ok(g.tv.leads && !(g.s.party || []).some(p => p.role === "leader") && g.leaderName() === null, `you lead the ${AZ.noun(g.jr)}${g.tv.patron ? `, with ${g.tv.patron}'s backing` : ""}; no one in the company outranks you`);
  }
  // 2. every journey type has its clock, and reads early and late its own way
  {
    const types = Object.keys(AZ.STORY), all = types.every(t => AZ.CLOCK[t] && AZ.CLOCK[t].target && AZ.CLOCK[t].stops);
    const cour = AZ.CLOCK["Courier ride"].target, pil = AZ.CLOCK.Pilgrimage.target, roy = AZ.CLOCK["Royal progress"].target, mil = AZ.CLOCK["Military campaign"].target;
    const a = AZ.stopPoints(cour, -3), b = AZ.stopPoints(cour, 3), c = AZ.stopPoints(pil, -4), d = AZ.stopPoints(pil, -4, true), e = AZ.stopPoints(roy, -3), f = AZ.stopPoints(mil, 6);
    ok(all && a.p > 100 && b.p < 100 && c.p === 85 && d.p > 100 && e.p < 100 && f.fail, `all ${types.length} types have clocks: a courier 3 d early scores ${a.p}, 3 d late ${b.p}; a pilgrim 4 d early ${c.p}, or ${d.p} waiting for the feast; a royal progress 3 d early ${e.p}; a campaign 6 d late is lost`);
  }
  // 3. arriving: one page with par, the verdict, the points and the next objective
  {
    const [g, ui, jr] = mkGame(P.journeys[0]); const A = g.arc();
    const k = 1, cp = jr.cps[k], b = cp.place.burg || { t: cp.tile }; g.s.c = b.t[0]; g.s.r = b.t[1]; g.s.clock = cp.parArrive - 24 * 4;
    g.checkCheckpoints(); await later();
    const page = plain(ui.said.filter(x => /against the clock/.test(x)).slice(-1)[0]);
    ok(/ahead of par|on par/.test(page) && /points/.test(page) && (k === jr.cps.length - 1 || /◇/.test(page)), `arrival at ${cp.place.name}: “${page.slice(0, 190)}”`);
  }
  // 4. waiting for the holy day, and the report card with your best
  {
    const J = P.journeys.find(j => j.type === "Pilgrimage") || P.journeys[0];
    const [g, ui, jr] = mkGame(J); const A = g.arc(), last = jr.cps.length - 1;
    for (let k = 1; k < last; k++) { g.s.cpRec[k] = { arrive: jr.cps[k].parArrive, acts: {} }; }
    g.s.cp = last; const cp = jr.cps[last], b = cp.place.burg || { t: cp.tile }; g.s.c = b.t[0]; g.s.r = b.t[1]; g.s.clock = cp.parArrive - 24 * 5;
    ui.script = [/^Wait for/]; g.checkCheckpoints(); await later(); await later();
    const card = plain(ui.said.find(x => /Against the clock:/.test(x)));
    const waited = (g.s.cpRec[last] || {}).waited, rule = g.ruleFor(last);
    ok(card && g.s.done && (rule.early !== "wait" || waited), `${J.name}: ${rule.early === "wait" ? `waited for ${rule.wait}; ` : ""}“${card.slice(0, 170)}”`);
    ok(store.has(g.bestKey()), `your best is kept: ${store.get(g.bestKey())}`);
  }
  // 5. too late at the target: the journey is lost
  {
    const J = P.journeys.find(j => AZ.CLOCK[j.type] && AZ.CLOCK[j.type].target.fail != null);
    if (J) {
      const [g, ui, jr] = mkGame(J); const A = g.arc(), k = A.target, cp = jr.cps[k], b = cp.place.burg || { t: cp.tile };
      g.s.cp = k; g.s.c = b.t[0]; g.s.r = b.t[1]; g.s.clock = cp.parArrive + 24 * (AZ.CLOCK[J.type].target.fail + 2); ui.script = [/Go ahead|Strike|Deliver|Join|See it|Keep/];
      g.checkCheckpoints(); await later(); await later();
      const card = plain(ui.said.find(x => /Against the clock:/.test(x)) || "");
      ok(g.s.failed && g.s.done && /· F/.test(card), `${J.name} (${J.type}), too late at ${cp.place.name}: the journey is lost, graded F`);
    } else ok(true, "no journey type here can be lost to the clock");
  }
  // 6. the camp report: a known country in a line, the race, and the company at the fire
  {
    const [g, ui] = mkGame(); g.s.party = [{ name: "Ama", role: "guard", tie: "sister" }];
    const land = (() => { const b = g.jr.origin.burg; for (let dr = -3; dr <= 3; dr++) for (let dc = -3; dc <= 3; dc++) { const c = b.t[0] + dc, r = b.t[1] + dr; if (w.isLand(c, r) && !w.burgAt.has(w.idx(c, r))) return [c, r]; } })();
    g.s.cp = Math.max(1, g.s.cp); g.s.c = land[0]; g.s.r = land[1];
    const n0 = ui.said.length; for (let i = 0; i < 3; i++) await g.campNight(); const nights = ui.said.slice(n0).map(plain);
    ok(/another night/i.test(nights[1] || "") && nights.every(x => /⏱/.test(x)) && nights.some(x => /Ama/.test(x)), `camp: “${(nights[1] || "").slice(0, 200)}”`);
  }
  // 7. standing night orders: the crew asks once
  {
    const [g, ui] = mkGame(); const port = P.burgs.find(b => b && b.port && w.harbour(b, "boat") && b.population > 3);
    const v = g.newVessel("boat", "hired", port, 3); g.s.vessel = v; g.s.aboard = true; g.s.c = v.c; g.s.r = v.r;
    ui.script = [/Anchor|Tie up/, /^Yes/]; await g.crewCall(); const asked = ui.said.filter(x => /^CHOOSE/.test(x)).length;
    await g.crewCall(); const asked2 = ui.said.filter(x => /^CHOOSE/.test(x)).length;
    ok(["anchor", "sail"].includes(v.orders) && asked2 === asked, "the crew asks how to spend the nights once, then keeps your order");
  }
  // 8. deeds are remembered, and change how people see you
  {
    const [g] = mkGame(); const b = g.jr.origin.burg; g.s.c = b.t[0]; g.s.r = b.t[1];
    const r0 = g.regard(b, "Townsfolk").score; g.events.fx({ stand: [["s", b.state, -2]] }, "You burned the granary.");
    const R = g.regard(b, "Townsfolk");
    ok(R.score < r0 && /what you did at/.test(R.why[0]), `after a deed in ${b.name}: “${R.why[0]}” (regard ${r0} → ${R.score})`);
  }
  // 9. the false lead is found out at the next stop
  {
    const J = P.journeys.find(j => { const g0 = new AZ.Journey(w, j); const A = AZ.arcPlan(w, g0, 3); return A.legs.some(l => l && l.kind === "mislead"); });
    if (J) {
      const [g, ui, jr] = mkGame(J, 3); const A = g.arc(), L = A.legs.find(l => l && l.kind === "mislead" && jr.cps[l.i].place.burg && l.i < jr.cps.length - 1);
      if (L) {
        const b = jr.cps[L.i].place.burg; g.s.story.seek = { cp: L.i, place: b.name, carrier: L.carrier, what: L.what, mislead: true, done: false };
        const said = plain(g.storyTalk(b, L.carrier));
        const cp2 = jr.cps[L.i + 1], b2 = cp2.place.at ? cp2.place.burg : { t: cp2.tile }; g.s.cp = L.i + 1; g.s.c = b2.t[0]; g.s.r = b2.t[1]; g.s.clock = cp2.parArrive;
        g.checkCheckpoints(); await later();
        ok(!/wrong/.test(said) && ui.said.some(x => /The lead was false/.test(x)), `${J.name}: told “${said.slice(0, 90)}”; at ${cp2.place.name}, the lead proves false`);
      } else ok(true, "no false lead at a town here");
    } else ok(true, "no false lead in this world's journeys");
  }
  // 10. people you know, and companions who settle
  {
    const [g, ui] = mkGame(); const b = g.jr.origin.burg; g.s.c = b.t[0]; g.s.r = b.t[1];
    g.personLines(b, "Innkeeper", "Brann"); g.s.clock += 24 * 10; const again = g.personLines(b, "Innkeeper", "Brann").join(" ");
    g.s.party = [{ name: "Ama", role: "guard", tie: "sister" }]; ui.script = [/^Ama/, /^Settle here/]; await g.manageCompany(b);
    g.s.greetAt = null; g.afterStep();
    ok(/remembers you/.test(again) && !g.s.party.length && g.townExtras(b).some(o => /Visit Ama/.test(o.label)) && ui.said.some(x => /Ama .* lives here now/.test(x)), "Brann remembers you; Ama settles here, greets you, and can be visited");
  }
  console.log(process.exitCode ? "alpha52: FAILED" : "alpha52: all ok");
})().catch(e => { console.error(e); process.exit(1); });
