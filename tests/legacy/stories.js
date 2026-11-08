// Alpha 5.1: the narrative engine on every journey in a world. For each journey: the traveller's premise
// (tie, lead or follow), the arc and structure the journey drew, each leg's role and objective, and a
// played run: the opening, the moments along every leg, each arrival, any person the story needs,
// the climax and the ending, through the game's own systems. Checks that every leg has a role and an
// objective, the climax falls at the target, and the run ends with an ending in words.
// Run: node tests/stories.js out/Bernoy_rpg.html [--md]
const { loadWorld, stubUI } = require("./harness.js");
const md = process.argv.includes("--md"), out = [], say = x => out.push(x);
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.error(`FAIL ${m}`); } };
const strip = x => String(x || "").replace(/<[^>]+>/g, "").replace(/\s+(data|mixed|new)\b(?=[.,:;)]|\s|$)/g, "").trim();
(async () => {
  const { AZ, P, w, mk } = await loadWorld(process.argv[2]);
  const U = AZ.U;
  say(`# Stories in ${process.argv[2].replace(/.*\//, "").replace(/_rpg\.html$/, "")}\n`);
  say(`${P.journeys.length} journeys. For each: who the traveller is, the story the journey drew, and a run with the first choice at every turn. What the player sees is quoted; the hidden machinery is in brackets.\n`);
  for (const J of P.journeys) {
    const jr = new AZ.Journey(w, J), ui = stubUI(), g = new AZ.Game(w, new AZ.Renderer(w, new AZ.Art(w, mk), mk(10, 10), mk), ui, jr, { getItem: () => null, setItem: () => {} });
    AZ.game = g; g.jr0 = jr; g.fresh(5, null, 80, { mode: "journey" });
    const s = g.s, A = g.arc();
    say(`## ${J.name}\n`);
    say(`[${A.type}; ${A.shapeName}; target ${jr.cps[A.target].place.name}; ${jr.cps.length} stops; tie: ${g.tv.tie.id}; ${g.tv.leads ? "leads" : "follows"}]\n`);
    g.started(); await new Promise(r => setTimeout(r, 1));
    while (s.storyQ && s.storyQ.length) { const k = s.storyQ.shift(); await g.playStory(k); }
    say(`> ${strip(ui.said.filter(x => /You are/.test(x)).slice(-1)[0]).replace(/^SAY /, "")}\n`);
    say(`| Leg | [Role] | Objective | Moments on the way |\n|---|---|---|---|`);
    for (const L of A.legs.slice(1)) {
      say(`| to ${jr.cps[L.i].place.name} | ${L.role} (${L.kind}) | ${L.objective} | ${L.moments.map(m => m.kind === "purpose" ? `${m.sub} at ${m.name}` : m.sub).join("; ") || "none"} |`);
      ok(L.role && L.objective, `${J.name}: leg ${L.i} has a role and an objective`);
    }
    // the run: every moment, every arrival, the person the story needs, the climax
    const rows = [];
    for (let i = 1; i < jr.cps.length; i++) {
      const L = A.legs[i];
      for (let j = 0; j < L.moments.length; j++) { const n0 = ui.said.length; s.cp = i; await g.moment(i, j); await new Promise(r => setTimeout(r, 1)); const q = ui.said.slice(n0).find(x => /^CHOOSE/.test(x)) || ""; rows.push(`| on the way to ${jr.cps[i].place.name} | ${strip(q.split(" :: ")[0].replace(/^CHOOSE/, "")).slice(0, 110)} | ${strip((q.split(" :: ")[1] || "").split(" | ")[0]).slice(0, 50)} |`); }
      s.cp = i + 1; const cp = jr.cps[i], b = cp.place.burg; if (b) { s.c = b.t[0]; s.r = b.t[1]; }
      await g.arrival(i); await new Promise(r => setTimeout(r, 1));
      if (s.story.seek && !s.story.seek.done && b) { const role = s.story.seek.carrier || "Townsfolk", line = g.storyTalk(b, role); rows.push(`| ${cp.place.name} | asks ${role.toLowerCase()} about ${s.story.seek.what} | ${strip(line).slice(0, 80)} |`); }
      if (i === A.target && i < jr.cps.length - 1) { const n0 = ui.said.length; await g.climax(); const q = ui.said.slice(n0).find(x => /^CHOOSE/.test(x)) || ""; rows.push(`| ${cp.place.name} | ${strip(q.split(" :: ")[0].replace(/^CHOOSE/, "")).slice(0, 110)} | ${strip((q.split(" :: ")[1] || "").split(" | ")[0]).slice(0, 50)} |`); }
    }
    if (!s.story.climaxed) { const n0 = ui.said.length; await g.climax(); const q = ui.said.slice(n0).find(x => /^CHOOSE/.test(x)) || ""; rows.push(`| ${jr.cps[A.target].place.name} | ${strip(q.split(" :: ")[0].replace(/^CHOOSE/, "")).slice(0, 110)} | ${strip((q.split(" :: ")[1] || "").split(" | ")[0]).slice(0, 50)} |`); }
    ok(s.story.climaxed, `${J.name}: the climax played`);
    const ending = A.arc.endings[U.clamp(Math.floor(s.story.measure), 0, 4)];
    say(`\n| Where | What the player meets | First choice |\n|---|---|---|\n${rows.join("\n")}\n`);
    say(`**${g.measureWords()}.** Ending: *${ending}.*\n`);
    ok(ending, `${J.name}: an ending in words`);
  }
  if (md) console.log(out.join("\n")); else console.log(out.filter(x => /^## |^\[|FAIL/.test(x)).join("\n"));
  console.log(fails ? `stories: ${fails} FAILED` : `stories: all ok (${P.journeys.length} journeys)`);
  if (fails) process.exitCode = 1;
})().catch(e => { console.error(e); process.exit(1); });
