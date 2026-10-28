# azrpg Alpha 6 plan: five screens, the clock and what you know

Oct 25, 2026 · @Jason Eric

## Purpose and status

This plan settles steps 1 and 2 of Alpha 6, the screen design and the mechanics behind it, so step 3 can start building the knowledge systems.

- Visual reference: the [design canvas](https://claude.ai/artifact/Y7sLkg2D9NLc47LaeSqBpr). Boards 7 and 8 still use older names (Pack is now Inventory; Here is split between World and Story); this plan supersedes them.
- Examples come from Pyeongak's Pilgrimage to Chelhazpo: Day 14 aboard the Draven, Oxbreak to Durcojhler.
- Settled points are stated plainly. Leanings and proposals are gathered in the last sections.

## The problem in numbers

The game shows too much, too often, and its clock follows the keyboard.

- Clutter: in `docs/textlog/measures.json`, the Pyeongak pilgrimage run made 1,391 text events in 338 game days (445 toasts, 376 message pages, 375 choice prompts). Mechanics wrote 825 lines; the story wrote 17. The quest run made 2,298 events in 566 days.
- The lost week: `tryMove` adds each step's hours to the clock, and a held key repeats every 140 ms. A 6.25-mile tile costs about 1.25 to 7.5 h on foot, so a held arrow runs time at roughly 9 to 50 game hours per second.

## Design rules

Seven rules govern every screen and mechanic below.

1. The race against par is the centre. Each screen helps answer: where am I going, will I make it, and what do I know that helps?
2. Only the player controls time. Nothing in the game changes the pace, time is never skipped, and stops are pauses the player chose in Settings.
3. The character sees only what he carries or remembers. A document is exact while carried or present; otherwise it is a dated memory that may blur.
4. At heart a planning game. Planning aids are always at hand, including while moving.
5. One voice. Every message passes the narrator, which files it as a decision, scene, note or routine.
6. Slow disclosure. The five screens exist from the start; their sections unlock when a person or the story brings a system in.
7. The true world is never punished. Azgaar's generator is linked from the menu (with `maplink` when the .map is hosted), and Sandbox has an Atlas mode.

## The five screens

Five screens sit on buttons along the bottom and on keys 1 to 5, inside a frame that never changes.

| Key | Screen | Holds | Rules |
| --- | --- | --- | --- |
| 1 | Memory | Character knowledge: documents, ledgers, reading, news, recent gossip, people, leads, the log | Documents show only when they are in the Inventory or at the character's location; everything else is memory, dated, and figures blur unless written in the notebook |
| 2 | Inventory | Items and goods carried, the vehicle's hold when aboard, money | Item actions: write in the notebook, copy a timetable, use an item on another item or on the world |
| 3 | World | The tile screen | Walk, navigate, inspect nearby tiles (travel time, the map info overlay), see travel targets. Movement only out of a vehicle; aboard it is view only, with no "walk there" and no arrows. Zoomed out it is the mental map. Knowledge legend as a toggle |
| 4 | Journey | The current leg | Par, pace, arrival estimate, the journey strip; vehicle information when aboard; the viewing window on what the character can see |
| 5 | Story | Events and interactions open to the character | Comes up at camp, in a town and when a leg ends. Holds the story feed and a planning window for the story and the next leg |

The frame, on every screen:

- Top line (journey mode): the next stop and its par time, and the side story in focus. No pace verdict there; the player checks pace on Journey.
- Bottom: the timeline (clock, pace buttons, Play a day, check-in rule), food and purse chips, the five screen buttons.
- Decisions arrive as a card over whichever screen is open; their record goes to Story.

| Event | Screen that comes up |
| --- | --- |
| Boarding a vehicle | Journey |
| Landing, disembarking, leaving a town | World |
| Entering a town (town tile maps later) | Story |
| Making camp | Story |
| Finishing a leg | Story, with the arrival result |
| A decision | A card over the current screen |

## Where every system goes

Each system from Alpha 1 to 5.2 gets one home on the five screens; nothing new is invented here except the counting house, charts and books.

| System today | Alpha 6 home |
| --- | --- |
| Walking, arrow keys | World: a press sets a heading kept at the timeline's pace; "walk there" on a tile; out of vehicles only |
| F, autopilot | Timeline play controls; on foot, "walk there" on World; aboard, the vehicle runs the leg |
| Clock, day and night, seasons, weather | Timeline; light and weather in Journey's viewing window |
| R: camp, wait, fish, forage, recover | Story, at camp |
| Booked passage, coaches, lines | Story in town (harbour or coach office); Journey once aboard; timetables in Memory |
| Hired and owned vessels, crew, morale, strikes, orders, watches | Journey (vehicle card, standing orders); decisions; Story (shipwright); Inventory (the hold) |
| Mounts, pack animals, carts | Inventory; Story (wainwright, stables) |
| Food, purse, goods, capacity | Inventory; chips in the frame; Journey shows stores to the next stops |
| Warehouse | Story in town; Memory ("left at Froi, Day 88") |
| Market screen, price field | Story (market, live prices); prices seen enter Memory; prices written stay exact in the notebook |
| Merchant's reading; counting house (new) | Story; the counting house only in market-centre towns |
| Timetables | Memory: the board while present, a handbill while carried, blurred when remembered |
| Charts, books (new) | Inventory as items; read in Memory; drawn on World |
| News, gossip, rumours, sightings, leads | Memory; leads and sightings as targets on World |
| Checkpoints, par, tasks, race score, report card | Journey; the arrival result on Story |
| Premise, arcs, beats, camp reports | Story (scenes, day cards) |
| Side stories, notice board | Story (board, planning window); targets on World; focus in the frame |
| Townspeople, company, regard, deeds, people known | Story (who is present and what you can do with them); Memory (what you know of them, in words) |
| World map (M), minimap, lenses (L), inspector (I) | World: zoom, info overlay, lenses painted from what you know. Minimap retired. Full inspector and fidelity tags in Atlas mode |
| Journal (J), help (H), log | Memory (journal and log; any entry sets a World target); help in the menu |
| Hazards, zones, markers, encounters | Decisions and scenes; on World once seen or heard |
| Traffic, hailing, carriers, caches (roadmap) | World (vehicles in sight); Story (hail); Inventory (letters); Memory (caches) |
| About, settings, the generator link | The menu |

## Time and the timeline

The timeline is the only control over time, and it sits on every screen.

| State | Where | The clock |
| --- | --- | --- |
| Still | In town, at camp, at a decision | Stopped until you choose something that takes time; then those hours play out at your pace |
| Moving | On foot or riding | Runs at your pace |
| Carried | Aboard a vehicle | Runs at your pace |
| Waiting | For a sailing or for dawn | Runs at your pace, in place, with pastimes and Memory open |

- Pace: a game day in 24, 12 or 6 seconds (proposal), with the player's slowest and fastest set in Settings. Play a day runs the next 24 hours, then stops.
- Check-in rule: every 6 hours, at dusk (default), at dawn, at the next port or town, or only when needed.
- Never skipped: a choice that costs two days plays them out, by waiting, a task, or a small game such as dice aboard or a way round a flood (proposal).
- Arrow keys (World, out of vehicles): a press sets a heading, and the character keeps going at the timeline's pace until you stop or turn, or a chosen stopper fires. On touch screens you tap a destination; the pad is off by default.
- Dawn and dusk come from the game's AZ.Clock: day length from latitude and day of year, with dawn and dusk the hour either side of sunrise and sunset. Check-ins follow it. At 26.5°S on Day 14 the sun is up 06:10 to 17:50; Oxbreak (43.2°S) in midwinter 07:36 to 16:24; 70°S in midwinter has no sunrise.
- Reading: Memory, Inventory and Story pause the clock while open, as a Setting on by default (proposal).

What may stop the clock is chosen in Settings. Each alarm fires once and then stays visible; play resumes at the pace you left. There is no alarm for falling behind par.

| Stopper | Default |
| --- | --- |
| Decisions | Always, since they need an answer; standing orders can answer some |
| Your check-in rule | On, at dusk |
| Arriving at a town or stop | On |
| Scenes | On |
| Hunger: two days of food left (proposal) | On |
| Sleep: 16 hours awake (proposal) | On |
| Crew patience nearly gone | On |
| Notes: sightings, catches, weather | Off |

## The narrator

Every toast, page and prompt passes one narrator, which files it into one of four classes.

| Class | Stops the clock | Examples | How often |
| --- | --- | --- | --- |
| Decision | Yes | Crew calls for a stop, a storm, a toll, a ford, dice on deck | About one a travel day |
| Scene | Setting, on | Story beats, a new country, the company speaks | Beats about every four travel days |
| Note | Setting, off | A sighting, a catch, a change of weather | As they happen |
| Routine | Never | Eating, camping, steady wind, a content crew | Folded into the day card |

- Day card: one per travel day, filed to Story at dusk: date, miles, where, weather if it changed, food eaten, one story line. Clicking it sets a World target on that day's track.
- No sentence twice in a day; a known country is told in what changed.
- Pastimes (Story, while carried or waiting) each play out over their hours, and most add to Memory: study a chart (2 h), read a book (an afternoon), plan with the captain or guide (1 h), talk to the crew (1 h), gossip with passengers (1 h), copy a timetable (1 h), hail passing traffic (an hour hove to, if the captain allows), write up the notebook (1 h), write letters (1 h), dice or cards (an evening), work a watch (a watch), rest (3 h or until dawn).

## Knowledge

Everything the character knows about a place, line or price carries a level, a date, a source and how sure it is.

| Level | Means | World draws it as |
| --- | --- | --- |
| In sight | Live, now: people, units, traffic, weather. 4 tiles on low ground and at sea, up to 10 from high ground (the game's rule); less at night and in fog (proposal) | Full colour |
| Seen | As it was when seen, dated; nothing that moves | Dimmed, fading with age |
| Charted | Coasts, harbours and lanes as the chart has them | Ink on the land's edge |
| Heard of | A name and roughly where | A dashed ring |
| Unknown | Nothing | Land as land (fog option b) or dark (option a) |

Memory draws on three sources:

- Carried: documents in the Inventory (charts, handbills, letters, the notebook), exact as of the day they were made.
- Present: documents at the location (the sailings board, the market), exact and current, only while there.
- Remembered: everything else, dated, with figures that blur.

Blur rules (proposal): prices stay exact for three weeks, then read as cheap, usual or dear; sailings stay exact for two weeks, then read as "about weekly"; news keeps its date and never blurs; places seen fade on World with age. Writing in the notebook (an Inventory action of about 30 min, proposal) keeps figures exact. The notebook can be stolen; memory survives the loss.

Fog has three options to test: full fog; land shown with the changing world hidden (leaning); none.

## Planning aids

Every aid reads only what the character knows or carries, and each has one home screen.

| Aid | Screen | Shows |
| --- | --- | --- |
| Route planner | Story (planning window) | Every leg still ahead; the ways you know of for each, with arrival against par, food, cost and source; a draft plan kept and compared on arrival |
| The race | Journey | Par for every stop, your pace and slack, and what a draft plan does to them |
| Stores ahead | Journey | Food and money to the next two stops, per eater; where food can be bought |
| Sailings and coaches | Memory | Lines you know: exact if copied, blurred if remembered; closures heard of |
| Prices you know | Memory | The notebook by town and date; remembered prices in words; what goods would fetch after tax and the merchant's cut |
| News and gossip | Memory | Dated, with source and distance; rumours marked |
| Places you know | Memory and World | What you know of each place, and when |
| Leads and side stories | Story and World | Where each lies against the route; the detour in days |
| Hours to here | World | Hours on foot to any tile by the paths you know |
| Today's reach | World | A line round the tiles you can reach before dusk |
| Back by | World | How far you can go and still make a booked sailing |
| Lenses | World | Prices, faiths and lines you know, painted on the map |

Worked example (canvas board 9): Day 24, 09:30, west of Durcojhler. The Disturbed Burial is 8.7 h away on foot, dusk is in 8.2 h, and the Ssagantyrma sails Day 26 at 06:00, so a night's camp still makes the sailing.

## Sandbox

Sandbox keeps all five screens, but Journey becomes a static view of the journey stored in the map: it cannot be followed or run and carries no par.

- Aboard a vehicle, World follows it as today.
- There is no objective line unless the player sets an aim.
- Atlas mode shows the true world, the full inspector and the fidelity tags.

## Devices and look

One layout scales from desktop to phone, in the RPG Maker windows and DotGothic16 font (leaning).

- Colours: gold for the journey and its clock, teal for side stories and what you learn.
- Desktop: frame at top and bottom, the open screen in between; Journey sets the viewing window beside the leg overview.
- Phone: the five buttons as a bottom bar with 48 px targets, the timeline above them, one screen at a time, decision cards full width.
- Viewing window: a pixel scene picked by travel mode, biome, weather, light and season (deck, quay, forest road, wagon, camp); its light follows AZ.Clock.

## Open questions and leanings

Nine points are still open; the leanings are starting positions for playtesting.

| Question | Current leaning |
| --- | --- |
| Fog of war | Land shown, the changing world hidden; test full fog |
| Clock rhythm | Continuous at pace with check-ins; Play a day tests a stepped rhythm |
| Mental map rendering | Flat tiles: World zoomed out |
| Arrow keys | Heading model on World; tap to move on touch |
| Steering your own vessel | Open. World is view only aboard, so steering needs a home: a course set on Journey that the crew sails, or a "take the helm" mode |
| Reading pauses the clock | A Setting, on by default; confirm |
| Writing in the notebook | An Inventory action of about 30 min; confirm |
| Par in the frame | Next stop and par time only; confirm |
| Town tile maps | Later; Story covers towns for now |

## Build order for step 3

Build the timeline first, since it fixes the lost week and everything else hangs on it.

1. Timeline: a tick-driven clock freed from key repeat; pace, Play a day, check-ins, stoppers in Settings; AZ.Clock for dawn and dusk.
2. Narrator: route every toast, page and prompt through the four classes; day cards.
3. Shell: the five screens, the frame and keys 1 to 5; fold the minimap, the journal modal and the camp and town menus into their new homes.
4. Knowledge store: level, date, source and sureness per place; documents as items with dated contents; the blur rules; the notebook.
5. World: knowledge layers on the tiles, info overlay, targets, hours to here, today's reach, back by; view only aboard.
6. Journey: leg overview, vehicle card, the viewing window renderer.
7. Story: town and camp interactions, pastimes, the planning window, the arrival result.
8. Roadmap content on top: traffic and hailing, carriers, caches, charts, news spread.
