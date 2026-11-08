# What the player reads: a review of azrpg's text as story

This review asks how well the text azrpg puts on screen tells a story. It sets out a method built
from Jonas Carlquist's *Playing the Story: Computer Games as a Narrative Genre* (Human IT 6.3, 2002),
logs every piece of text across eight scripted games, measures and reads the log by that method, and
ends with the fixes made now and a plan for the rest. Decisions for you are in section 6.

**In short.** The text is clean now: the one-letter pages are gone, along with the other faults the
log found. Its story is thin on the page. Across seven journeys the story systems produce 1–5% of
what the player reads; the camp, the weather and the ledger produce most of the rest, and repeat
themselves nightly. The frame ("You are...") and the people work. The ending reads as a scorecard,
the reversal is announced before it happens, nothing opposes the player, and the world rarely
remembers what the player did. The fix is a narrator: one layer through which every system speaks,
which merges, quiets, orders and remembers.

---

## 1. The method

Carlquist reads games through several lenses. Each becomes a question about the text, a measure in
the log, and a target.

| Lens (source in the article) | The question for azrpg's text | Measured in the log by | Target |
|---|---|---|---|
| **Where the story is told** (Rouse's three layers: in-game, out-of-game, external materials) | Is the story where the player acts (choices, people), or only in pages they read and in the journal? | Entries by channel (choice, page, toast, banner, journal, status line, log) and by system | Story carried by choices and people at least as much as by pages |
| **The frame and the address** ("You are...", the player as the focus: Moore) | Does a frame story make the player's actions logical, in the second person, present tense? | Share of pages and prompts addressing *you*; the opening; whether objectives give reasons | A frame at the start of every game; most pages address the player |
| **Immersion, agency, transformation** (Murray) | Does the text make places distinct, offer choices with visible results, and show the world changed by the player? | Place-specific lines; choices and their stated costs; later lines that refer back to the player's deeds | Distinct places; every story choice shows its cost; deeds come back |
| **Structure** (Vogler's hero's journey; Siegel's nine acts) | Which stages and acts does the text reach, and in what proportion? Games keep the ordinary world short, rarely refuse the call, spend 80–90% in tests, and leave reward and return to a closing page | Entries per stage, from the system that produced them | Every stage the journey type needs is present and told in the story's voice |
| **Narrative operators** (Pearce) | Which operators are present: experiential, performative, augmentary, descriptive, meta-story, story system? | Which systems produce which kind of text | Meta-story and story system as strong as the experiential and augmentary |
| **Branching** (linear; branching with a fixed start and end; open) | Does the text show the player what is open, what closed, and where the end is? | Objectives, out-of-order prompts, the sandbox's frame | The structure legible in the text |
| **Motivation** (Littlejohn: the reason matters more than the action) | Does every conflict and choice carry a want or need? | Prompts with a stated reason; story choices with a stake | Every story choice has a reason |
| **Cohesion** (textuality: Beaugrande and Dressler) | Does the text hold together: no contradictions, no repeats across systems, clean form, consistent names? | Repeated sentences within a day; contradictions; markup, missing values, split pages | No faults; repeats only by design |
| **Pacing** | How much text per day, how much of it story, and how much routine? | Entries per game day by system; routine reports per day | Routine quiet; a story beat every few days of travel |

The lenses come from the article; the measures and targets are this review's.

## 2. The log

`tests/textlog.js` plays eight games through an instrumented interface that records every page,
prompt with its options, toast, banner, journal page, status-line change and log line, with the game
time and the engine module and function that produced it. A scripted player buys food, sleeps at
night, talks to every person in every stop town, asks the merchant, the harbourmaster and the
wainwright, hires vessels for water legs, and follows the plan's course. It takes the default choice
at every prompt. The logs are in `docs/textlog/` (one readable transcript per game, `textlog.jsonl`
with everything, and `measures.json`).

| Game | World | Entries | Game days | Words | Story | Journey and scenes | Mechanics | Frame | Second person | Choices | Per day |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Pilgrimage | Pyeongak | 1,415 | 338 | 33,529 | 1% | 6% | 76% | 18% | 45% | 392 | 4.2 |
| Raid (The Leg Keels) | Bernoy | 1,218 | 365 | 26,922 | 2% | 3% | 78% | 17% | 49% | 346 | 3.3 |
| Treasure hunt | Bernoy | 334 | 34 | 10,918 | 5% | 18% | 27% | 50% | 43% | 106 | 9.7 |
| Caravan | Bernoy | 436 | 81 | 9,526 | 5% | 5% | 64% | 26% | 45% | 129 | 5.4 |
| Courier ride | Bernoy | 781 | 190 | 17,402 | 2% | 25% | 53% | 20% | 48% | 220 | 4.1 |
| Quest | Nouileland | 2,439 | 594 | 62,327 | 2% | 25% | 56% | 17% | 47% | 671 | 4.1 |
| Airship voyage | Presia | 1,002 | 140 | 32,473 | 3% | 15% | 46% | 36% | 41% | 234 | 7.2 |
| Sandbox | Pyeongak | 113 | 6 | 2,328 | 0% | 14% | 27% | 58% | 42% | 43 | 18.8 |

*Story* is the narrative engine and the people (modules 23, 24 and the frame text of 04); *journey and
scenes* the plan, the stops, the scenes and side stories (07, 10, 15); *mechanics* travel, food, camp,
vessels, markets and the world's changes (09, 12–14, 16, 18–22); *frame* the town menu, the status
line, banners and the journal (06, 11).

**Limits.** The scripted player presses R each night, so the rest prompt (about one a day) is the
script's habit; a person decides when to rest. The plan's long Bernoy legs run for months, so totals
are large. Default choices mean one path through each story. These shape the numbers; the findings
below rest on what happens whatever the player does.

## 3. Faults found and fixed

| Fault | Where | Cause | Fix (in this patch) |
|---|---|---|---|
| The last checkpoint's message one character per page, with markup showing | every journey's end | the story's ending was handed to the journey's finish as a string, which spread into letters | the ending is passed as a page; the message box also joins any list of single letters into one page |
| The same reasons said by every person in a town ("the Uruk here think little of yours; you keep another faith") | town talk | each person gave their regard with its reasons | the first person says why; the others say how they see you |
| The priest said both "given water and courtesy, no more" and "strangers may give alms here" | temples of another faith | two systems spoke for the priest | one voice: the temple's own line stands |
| The watch said "Neutral" and then "will hardly look at you" | towns | the state's stance and the person's regard read as one | the person speaks for themselves ("Kogri, for one, ...") |
| A thief several nights running in one town | hostile towns | a weak roll | at most one theft a week in any one town |
| "You have no vessel of your own" while the company's boat waited | the harbourmaster | he did not know of the company's vessel | he points to the quay |
| The opening named the leader twice and said the objective twice | the opening | the list and the leg line repeated | each said once |
| "Domramaruma (the books)" | companions | the tie's role label | "bookkeeper", "the eldest" |
| "You camp in the marine" | nights at sea | the camp text names the biome | "You sleep aboard, at anchor." |
| "Visit the The Light Wolf" | town menu | a name starting with *The* | the article is dropped |
| Pirates and sea monsters told twice, once as "Something on the road ahead" | at sea | the story's hooks and the sea's own encounters both fired | encounters at sea belong to the sea's events |
| "Pirates (pirates)" | hooks | a name that is its type | said once |
| "near Slof. On the way to Froi" | arrivals | a place name starting a sentence | capitalised |

After the fixes the log shows no faults: no single-letter pages, no markup, no missing values, no
pages over 700 characters, no errors.

## 4. The review

### 4.1 Where the story is told

The story lives in pages the player reads. The opening, arrivals and endings are pages; the moments
on the road are choices, but there are few of them. Almost every choice in the log belongs to the
mechanics: where to sleep, what to buy, how to answer the crew. People carry real story when a leg
ends in a question ("About who would join the company: they tell you what you came to learn"), and
the town menu brings everything together, though a town visit runs to thirty or forty pages and prompts.
The journal is the only place the whole story can be seen, and its "The journey" page is the best
piece of story text in the game.

### 4.2 The frame and the address

The frame works. Every journey opens in the second person with who you are, why you go and what to do
first:

> You are Eldraltirek, envoy's secretary of Vr'seramant, Rake (Drakonic) by birth and of the Rake
> (Drakonic)ism by faith. Your father Raugauraraut goes with the raid, and you go too.

Fewer than half of the pages and prompts address *you* (41–49%); the rest are reports in the
third person ("Weather: rain", "Sails: the 1st Fleet of Uzd, 15 mi north-east"). The frame is
strongest at the start and fades: after the opening, the player's tie is mentioned again only in the
journal and at the end. The sandbox has no frame at all.

### 4.3 Immersion, agency, transformation

**Immersion is strong in detail and weak in repetition.** The camp report is the most vivid text in
the game ("You camp in the taiga. The trees give shelter, and you find nuts and roots for breakfast
(+1 ration). A cold night (about 18°F), but there is wood for a fire."), and it comes every night:
"Water close by; a line in it overnight" appears 492 times in the quest. Repetition turns the
world's texture into noise.

**Agency is wide and shallow.** There are hundreds of choices, and most show their cost ("Go round
them (8 h)", "Pay the toll (🟡 1.36)"). Story choices are few: two or three a leg, sometimes none on
a long leg.

**Transformation is promised more than shown.** Choices say "They will remember it" and "The village
remembers who paid". Nothing in the log refers back to a deed later: no person mentions the food you
shared or the village you struck. Standing changes appear as numbers in the log and nowhere in what
people say. This is what Spector calls the illusion of freedom: the text claims consequences the
world does not keep.

### 4.4 Structure

| Stage (Vogler) | Present? | How it reads |
|---|---|---|
| Ordinary world | briefly | one page: "You stand in Leg, in spring, by day." |
| Call to adventure | yes | the tie and the first objective |
| Refusal of the call | no | (games rarely have it; a follower's journey could) |
| Meeting the mentor | yes, in pieces | the people who advise: innkeeper, merchant, harbourmaster, wainwright, the right person for a question |
| Crossing the first threshold | weakly | the first leg's objective; borders as moments |
| Tests, allies, enemies | yes, thin | moments on the road; no enemies who recur |
| Approach to the inmost cave | in the objective | "Come to Negnud unseen..." with nothing on the way that is about the approach |
| The ordeal | yes, one scene | "Strike Negnud with the company. [Strike] [Hold back]" |
| Reward | in the log | "The haul: a good haul" |
| The road back | rarely | only where the target comes before the last stop |
| Resurrection | no | |
| Return with the elixir | as a scorecard | "Checkpoints skipped: 0. The plan's tasks done: 1 of 1. Purse: 🟡 54.5. Side stories finished: 0." |

Against Siegel's nine acts, two are missing: **act 2, something bad happens** (no harm or opposition
sets anything in motion), and **acts 5–6, the wrong goal and the reversal**, which the false lead
ought to supply: its truth is told at once ("what they tell you sounds right, and is wrong; you will
find it out on the road"), so there is no reversal to find.

Carlquist notes that games spend most of their time in tests and leave the return to a closing
page. The log goes further: most of the text belongs to no stage at all. It belongs to the daily
round of sleeping, eating and weather.

### 4.5 Narrative operators

| Operator (Pearce) | Present? | In azrpg |
|---|---|---|
| Experiential | strong | hunger, weather, storms, crews, tiredness: the conflicts the systems make |
| Performative | n/a | a single-player game; the journal's log is the nearest thing |
| Augmentary | strong | facts from the map, rumours, news, the people's lines |
| Descriptive | moderate | the journal's log and record; cluttered with dates ("(happened Day 23, 00:00)") and ledger lines |
| Meta-story | thin | the opening and the objective in the corner |
| Story system | built, quiet | arcs, roles and moments exist, and produce one story line every 4–16 game days |

The two operators the game was built for, meta-story and story system, are the weakest on the
page. The narrative engine runs out of sight as intended, but too little of it reaches the page.

### 4.6 Branching

The journeys are Carlquist's second structure: a fixed start (A) and end (E), and a middle that can
be played in any order. The text shows E (the objective, the plan) but rarely what is open or closed
on the way there. The out-of-order prompt is the one place where the text names a closed path. The sandbox is the third
structure, fully open, and its text has no frame and no story (0%): it encourages exploring and
gives the explorer nothing to make a story of.

### 4.7 Motivation

The tie gives a reason to go. After the opening, reasons thin out. A toll post asks whether to pay
without saying what lies past it; a priest's offering has no stake beyond standing; "Look the place
over" has a reason only for raids. The objectives say what to do and seldom why.

### 4.8 Cohesion

After the fixes there are no form faults. What remains:

- **Several systems announce the same event.** Arriving at a checkpoint brings a banner, a "Reached"
  log line, a checkpoint page with par, a story page with the next objective, and a story-record line:
  five texts for one arrival, in two voices.
- **Toasts and log lines pair by design**, and the journal's log then holds both the event and its
  story echo ("Vr'seramant: open the market." twice).
- **Fidelity tags** (data, mixed, new) average 2–3 per hundred words. They are useful for a
  worldbuilder and break the voice for a player.
- **Long objectives** stack roles, crossings and the climax in one line: "Reach Vr'seramant with the
  company whole: a long crossing of taiga; the way there crosses the sea, so look for a passage. Then:
  Sell the company's goods in Vr'seramant."
- **Raw labels** stand in for prose: "But first: Tide and weather in Leg".
- **Many voices.** The story, the ledger, the clerk ("Checkpoint: Freys · Day 27, 17:00. Par was Day
  42, 09:59"), the naturalist and the news crier all speak in the same box.

### 4.9 Pacing

A journey produces 3–10 entries a game day, and about one camp report, half a weather toast and
under a tenth of a story line each day. A town visit is a burst of thirty to forty. Story beats are spread
by the map's hooks, so a 1,500-mile leg through empty country can pass with none.

## 5. The fix: a narrator, and a story that keeps its promises

The fixes in section 3 are made. The rest needs one new layer and several changes to the story. In
build order:

### 5.1 The narrator (one layer between every system and the screen)

Every system sends messages to the narrator; the narrator decides what reaches the player.

| Rule | What it does | Example |
|---|---|---|
| **One event, one telling** | messages with the same event key in the same moment merge into one page, story line first, ledger line after | arrival: one page ("Freys. The company...") with the par and record on a dim line, and one log entry |
| **Voices** | each message has a voice (story, person, world, ledger, system), and each voice has a place: story and people in pages and choices, the world in toasts, the ledger in the status line and journal | par times go to the status line and the journal |
| **Routine goes quiet** | a routine report (camp, weather, crew stops) is shown when it differs from the last one, or every fifth time, and otherwise goes to the status line | camp: the first night in a new country, a catch, a storm, a cold night; otherwise "camped (+1 ration)" in the status line |
| **No repeats within a day** | the same sentence from any system is said once a day | |
| **Escalation** | alarms (hunger, tiredness, unpaid crews) escalate once and then hold in the status line | "Your food is gone" once; then "food 0" in red |
| **Tags as a setting** | fidelity tags shown in worldbuilding mode, hidden in play mode | |
| **Style guard** | sentences start with capitals; objectives under about twenty words (a second line for notes); act labels turned into prose | "But first, wait out the tide and weather in Leg." |

### 5.2 The story keeps its promises

| Change | Lens | What it does |
|---|---|---|
| **Memory of deeds** | transformation | raids, gifts, shared food, offerings, thefts and broken contracts are kept; people mention them in their regard ("You shared your bread at Bozgrun; word travels"), and the ending names them |
| **A story beat every few days** | pacing, story system | moments per leg scale with its length (about one per three to five travel days), from towns near the route, the map's hooks, strangers met on the road, and the company at camp |
| **The company speaks** | frame, allies | the tie's character and the companions speak at camp, in place of a repeated camp line: about the leg, the last deed, the country, their stake |
| **Opposition** | acts 2–3, tests and enemies | each arc gets an opposing party (the target's watch, a rival company, pursuers, the creditor's men) named at the opening and met again on the road |
| **A real reversal** | acts 5–6 | the false lead sends the player on; the truth comes out at the next stop, and the objective changes there |
| **The return** | reward, return with the elixir | an epilogue in the story's voice before the scorecard: the measure in words, the tie's fate, the deeds remembered, standing changes as people put them; the scorecard moves to the journal |
| **Reasons in choices** | motivation | each story choice names its stake ("Past the toll lies Geg, where the Sigil's keepers live") |
| **A frame for the sandbox** | branching, meta-story | a sandbox traveller gets a tie to their start town and an open objective (find work, make a name, see the world), with leads as hooks |

### 5.3 Control of the company

The company forms at the start or at a Gathering, and today it shows only in the opening and the
journal. The player needs to see it form, see who is in it, and end it.

| Piece | What it does |
|---|---|
| **The company forms** | a page and a banner: who joins, who leads, what holds them together |
| **The company panel** (C, and the journal) | members with their role, tie, heart and wage; for each, *part ways*; for all, *disband* |
| **A home** | in any town, *make a home here*: the company's kin and followers settle there, and leave the party. Home is marked on the map. At home you rest for free, store goods without a fee, and find your people; they go with you again if you ask. One home at a time for now. |
| **Ending a journey** | as now, each companion chooses; family can also be sent home, or settled at your home |
| **Later** | property, lines and households at home (with the version that builds them) |

### 5.4 The text as a test

`tests/textlog.js` becomes a regression test, with thresholds: no faults; no sentence repeated across
systems within a day; story text at least a set share of pages; story beats at least one per given
number of travel days; no page over 700 characters; no forbidden forms (raw labels, lower-case
sentence starts, doubled articles).

## 6. Questions for you

1. **Routine reports.** Should camp, weather and crew stops go to the status line by default, with
   full reports as a setting?
2. **Tags.** Hide the fidelity tags in play, and keep them in a worldbuilding mode?
3. **The clerk's voice.** Should par times leave the arrival page for the status line and journal?
4. **Opposition.** Should each arc's opposing party be built now in a simple form (a named rival
   who appears on the road and at the target), or wait for Alpha 6's traffic and Alpha 7's war?
5. **The home.** One home at a time, giving free rest and storage and holding your kin, until
   property comes: is that the right scope?
6. **Story density.** Is one story beat every three to five travel days the right pace?


## 7. After Alpha 5.2

Your answers set the direction: the clock is the first layer and the opposition; the player leads;
routine reports carry the story; the tags and the par times stay large; named opposition and homes
wait. Alpha 5.2 built the clock and the narrator's first rules (DESIGN.md, Alpha 5.2). The same eight
games, rerun:

| Game | Story, race and narrator share of entries | Race lines a game day | "Water close by…" | Words |
|---|---|---|---|---|
| pilgrimage | 1% → 21% | 0.00 → 0.82 | 244 → 82 | 33,529 → 38,248 |
| raid | 2% → 25% | 0.00 → 0.79 | 273 → 92 | 26,922 → 32,814 |
| treasure | 5% → 16% | 0.00 → 1.22 | 33 → 11 | 10,918 → 11,635 |
| caravan | 5% → 23% | 0.00 → 1.08 | 81 → 28 | 9,526 → 11,360 |
| courier | 2% → 23% | 0.00 → 0.88 | 150 → 50 | 17,402 → 19,630 |
| quest | 2% → 23% | 0.00 → 0.91 | 492 → 158 | 62,327 → 65,723 |
| airship | 3% → 12% | 0.00 → 0.70 | 16 → 10 | 32,473 → 34,288 |
| sandbox | 0% → 5% | 0.00 → 0.00 | 2 → 1 | 2,328 → 2,185 |

The story's share of what the player reads rose from a few percent to between a sixth and a quarter
on the journeys, most of it the race: arrival pages, the corner, the camp's race line and the
companions' words. Camp reports in known country now say what changed. The sandbox is left as it was:
open, and quiet.

Still open from section 5: the merge of toasts with log lines, escalating alarms, reasons in every
story choice, and the text log as a regression test with thresholds.
