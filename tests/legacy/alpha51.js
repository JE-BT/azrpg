// Alpha 5.1 checks: the premise as part of the character, the journey chosen and kept, the company
// at the start, objectives and the corner, regard and suspicion, provisions, side-story focus, the
// company's vessel at the yard. Run: node tests/alpha51.js out/Bernoy_rpg.html
const { loadWorld, stubUI } = require("./harness.js");
const ok = (cond, msg) => { console.log(`${cond ? "ok  " : "FAIL"} ${msg}`); if (!cond) process.exitCode = 1; };
const later = () => new Promise(r => setTimeout(r, 5));
(async () => {
  const { AZ, P, w, mk } = await loadWorld(process.argv[2]);
  const U = AZ.U;
  const mkGame = (J = P.journeys[0], seed = 3) => {
    const jr = new AZ.Journey(w, J), ui = stubUI(), g = new AZ.Game(w, new AZ.Renderer(w, new AZ.Art(w, mk), mk(10, 10), mk), ui, jr, { getItem: () => null, setItem: () => {} });
    AZ.game = g; g.jr0 = jr; g.fresh(seed, null, 80, { mode: "journey" }); return [g, ui, jr];
  };
  // 1. the premise is part of the character, and another roll gives another
  {
    const jr = new AZ.Journey(w, P.journeys[0]), a = AZ.makeTraveller(w, jr, 11, null), b = AZ.makeTraveller(w, jr, 12, null);
    ok(a.tie && a.tie.text && typeof a.leads === "boolean" && AZ.premiseCard(w, jr, a).includes(a.tie.text), `a traveller comes with a tie: “${a.tie.text}” ${a.leads ? "(leads)" : "(follows)"}`);
    ok(a.tie.text !== b.tie.text || a.leads !== b.leads || a.name !== b.name, `another roll gives another: “${b.tie.text}”`);
  }
  // 2. the journey chosen is kept in the save
  {
    const k = Math.min(3, P.journeys.length - 1), [g] = mkGame(P.journeys[k]);
    ok(g.s.jIdx === k, `journey ${k + 1} of ${P.journeys.length} is kept in the save (${P.journeys[k].name})`);
  }
  // 3. a company without a Gathering forms at the start, with the traveller's tie among them; the corner shows the objective
  {
    const J0 = P.journeys.find(j => { const jr = new AZ.Journey(w, j); jr.replan(); jr.fixCourses(); return (AZ.ARCH[AZ.archOf(jr)]?.party || 0) > 0 && !jr.cps.some(cp => (cp.acts || []).some(a => a.id === "gather")); }), J = J0 || P.journeys[0];
    const [g, ui] = mkGame(J); g.started(); await later(); while (g.s.storyQ && g.s.storyQ.length) await g.playStory(g.s.storyQ.shift());
    const line = g.threadLine();
    ok((!J0 || g.s.party.length > 0) && ui.said.some(x => /You are /.test(x)) && /◇/.test(line), `${J.name}: the company forms at the start (${g.s.party.map(p => `${p.name}, ${p.tie || p.role}`).join("; ")}); the corner reads “${line.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 140)}”`);
  }
  // 4. regard: a theocracy's priests and a stranger's faith; the watch of a republic
  {
    const [g] = mkGame();
    const theo = P.burgs.find(b => b && /Theocracy/.test(P.states[b.state]?.form || "") && w.C.religion[b.cell] !== g.tv.faith && b.population > 2);
    if (theo) { const R = g.regard(theo, "Priest"), f = g.regardF(theo, "Priest"); ok(R.score < 0 && f >= 1.5, `in ${theo.name} (${P.states[theo.state].fullName || P.states[theo.state].name}), the priests regard a stranger of another faith at ${R.score} (${R.band}): alms and healing cost ×${U.rn(f, 2)}`); }
    const rep = P.burgs.find(b => b && /Republic/.test(P.states[b.state]?.form || ""));
    if (rep) ok(g.regard(rep, "Captain of the watch").watch === "protects", `in ${rep.name}, a republic, the watch protects everyone who keeps the law`);
    const town = theo || P.burgs.find(b => b && b.population > 5);
    g.addHeat(town.state, 4); g.s.heatAsk = null; g.s.c = town.t[0]; g.s.c = town.t[0]; g.s.r = town.t[1]; const t0 = g.s.clock; g.afterStep();
    ok(g.s.clock - t0 >= 2 && g.regard(town, "Captain of the watch").why.some(x => /trouble/.test(x)), `with suspicion in ${P.states[town.state].name}, the watch of ${town.name} holds you for questions`);
  }
  // 5. provisions: the next leg's days and rations, from the innkeeper and in the passage notice
  {
    const [g] = mkGame(); g.started(); const b = g.jr.origin.burg; g.s.c = b.t[0]; g.s.r = b.t[1];
    const p = g.provisions(g.s.cp), lines = g.personLines(b, "Innkeeper", "Brann").join(" ");
    ok(p && p.days > 0 && p.rations >= p.days && /rations for/.test(lines) && /reckon about/.test(g.foodHint()), `the innkeeper reckons ${p.days} days and ${p.rations} rations to ${p.to}`);
  }
  // 6. side stories: a new one takes the corner; any can be chosen
  {
    const [g] = mkGame(); g.started(); const b = g.jr.origin.burg; g.s.focus = null;
    g.startThread({ title: "A test errand", steps: [{ text: `Go to ${b.name}`, goal: { burg: b.i, role: "Townsfolk" } }] });
    const th = g.s.threads.find(t => t.title === "A test errand");
    ok(g.focusThread() === th && /A test errand/.test(g.threadLine()) && g.threadGoal(th)[0] === b.t[0], "a new side story takes the corner, with its direction");
  }
  // 7. the company's vessel at the yard
  {
    const [g, ui] = mkGame(); const port = P.burgs.find(b => b && b.port && w.harbour(b, "boat") && b.population > 3);
    const v = g.newVessel("boat", "owned", port, 3); v.mode = "company"; g.s.vessel = v; g.s.party = [{ name: "A", role: "raider" }];
    const opts = g.townExtras(port).map(o => o.label).join(" | ");
    ui.script = [/^Sell her/]; const p0 = g.s.purse; await g.companyVessel(port);
    ok(/company's/.test(opts) && !g.s.vessel && g.s.purse > p0, `the yard takes the company's vessel: sold, your share 🟡 ${U.rn(g.s.purse - p0, 2)}`);
  }
  console.log(process.exitCode ? "alpha51: FAILED" : "alpha51: all ok");
})().catch(e => { console.error(e); process.exit(1); });
