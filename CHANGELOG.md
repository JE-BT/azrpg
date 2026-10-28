# Changelog

## Alpha 6, playtest round 1: three levels of time, one Story screen

**Three levels.** Memory and Inventory are the inner world: the clock stands still. Story is the
world you can touch: the clock runs at one second a second and cannot be changed. World and Journey
are the planned world: the clock runs at the pace you set and can be paused, and only there do
pop-ups and warnings appear; a pop-up that arises on Story brings up World (on foot) or Journey
(carried). Coming back to World or Journey from another screen pauses the clock. The play buttons
start the clock at once: standing still, time passes in place. The pace buttons are greyed out
on Memory, Inventory and Story.

**Screens in a new order:** 1 Memory, 2 Inventory, 3 Story, 4 World, 5 Journey. The bottom bar is the
same on every screen, with the leg's progress on all of them. Space opens Story.

**Moving.** An arrow steps one tile: the clock runs for that step and stops. Walk there, F and the
crew's course still run on at the pace.

**Story.** The viewing window sits above the Decision panel, which gathers options from every system:
the town, the vehicle, the company, what is here, food from the land, documents and the day
(docs/OPTIONS.md lists them all). Arrow keys move through the options from top to bottom. Each
option answers in the Information panel, where sub-menus such as the market and the harbour are
chosen, and Make a note (N) copies the answer into the notebook. At night most of a town is asleep.

**The end of the day.** End the day shows the day's summary and heads to bed at the hour of the sleep
routine (eight hours before dawn by default); asleep, the Decision panel holds one option, Wake up;
you wake at the hour you set (dawn by default). The inn, camp, sleeping aboard while she sails on,
and the crew's night (anchor, or sail on in watches) are its forms. Set the default sleep routine
chooses bedtime, waking, the crew at night and the company at night. The day card at dusk has three
forms: carried (Carry on), on your own vessel (End the day), walking (Camp); each with Options (Story)
and Pause here.

**Tasks** (writing in the notebook, copying a board, planning with the captain, gossip) wait for the
clock and are named in the clock's status line. Carried, the vehicle goes on; on foot, you stop by
the road, and when the task is done a card asks whether to walk on. A short note marks the end.

**Warnings**, a new class, stop the clock and come with options: food (two days left on land, five at
sea), health (hurt, fevered, gravely ill), exhaustion (a note at 20 hours awake, a warning at 48;
collapse moves from 44 to 52 hours), the crew's patience.

**Sleep and waking.** The clock window always shows awake or asleep and for how long; hours awake now
follow the clock through waits and voyages.

**A short beginning.** The introduction is five cards: the title, who you are, where you stand, the
goal, and what to do first. The full introduction and the story's opening are in Memory, under The
beginning.

**A damaged vessel** shows on the Journey screen and in the viewing window (a torn sail, a gap in the
rail, water on the deck).

**Tests.** `tests/browser.js` follows the new rules: one tile per arrow, time in place, Memory stopping
the clock, Story at one second a second, the town and harbour on Story, the inn's night with Wake up
as the only option, the day cards aboard.

## Alpha 6 (first playtest): five screens, the clock and what you know

The design is in `docs/ALPHA6.md`. This first version builds steps 1 to 7 of its build order; traffic,
carriers, caches, charts and the spread of news (step 8) come later.

**The timeline.** Only the player controls time. The clock on screen runs at the pace on the timeline
(a game day in 24, 12 or 6 seconds, set in Settings) and plays out what each step, wait or task costs:
a step lasts its hours at that pace, and a night at the inn plays out in place under a waiting card.
When you stand still, the clock waits for you. ❚❚ ▶ ▶▶ ▶▶▶ set the pace; Play a day runs the next 24
hours and stops. Nothing in the game changes the pace. Holding a key no longer runs time away.

**Moving.** An arrow sets a heading, and you keep going at the timeline's pace until you stop, turn,
or a stop you chose fires; the opposite arrow or Space stops; pressing an arrow while paused starts the
clock again. Click or tap a tile on World for the hours on foot by the paths you know, and Walk there.
Aboard your own vessel the crew sails the agreed course (the plan's next stop, or a place you name);
T or an arrow takes the helm, and "Sail on to…" names the next course. Booked ships and coaches keep
their own course.

**Stops you choose.** A check-in (every 6 hours, at dusk by default, at dawn, at the next town or
port, or only when needed) shows the day card and asks how to go on. Settings choose what else stops
the clock: arriving at a town, scenes, two days of food left, 16 hours awake, the crew's patience,
notes. Each alarm fires once and stays on screen. There is no alarm for falling behind par.

**One voice.** Every message passes the narrator: decisions are cards over the open screen, scenes
are cards (or, with scenes off, lines in the feed), notes and routine go to the feed. A day card is
filed at dusk: miles, where, weather, food eaten, one story line and the race. No sentence is filed
twice in a day, and one sighting reported by two systems is filed once. Toasts are gone.

**Five screens** on buttons and keys 1 to 5, inside a frame that never changes: the next stop and its
par and the side story in focus at the top; the clock, sunrise and sunset, the pace, food and purse at
the bottom.
- *Memory:* the journey, documents you carry or stand by, prices and sailings you know, news, gossip,
  places, side stories and leads (click to make a target), people, the traveller, the log.
- *Inventory:* what you carry and the vehicle's hold; write prices into the notebook; copy a sailings
  board onto a handbill.
- *World:* the tiles, fogged by what you know; zoomed out (− or M), the mental map; lens, info, today's
  reach and hours to here. The minimap is retired.
- *Journey:* the race (par, your pace, slack, every stop), the leg strip, the vehicle card, stores
  ahead, the days, and the viewing window.
- *Story:* towns and camp as grouped cards, pastimes and tasks, the arrival result, the planning
  window for the next leg (the ways you know, with arrival, par, food and source), and the story so far.

**What you know.** Every place carries a level (in sight, seen, heard of), a date and a source. Ground
you have seen is dimmed on the map and fades with age; places heard of are a dashed ring and a name.
Fog has three settings: land shown with the changing world hidden (default), full fog, none. Prices
you have seen stay exact for three weeks and then read as cheap, usual or dear; sailings stay exact
for two weeks and then read as "about weekly"; news keeps its date. The notebook and handbills keep
figures exact. Units and vessels are drawn only in sight.

**Pastimes and tasks** play out over their hours; carried, the vessel goes on meanwhile: plan with the
captain, gossip with the passengers, talk to the crew, dice on deck, write up the notebook, copy a
sailings board, rest, sleep until dawn, wait aboard until she sails.

**The viewing window.** A pixel scene drawn from the moment: the deck, a small boat, the quay, a town
street, a road through the country by biome, the back of a wagon, camp, an airship's rail; its light
follows sunrise and sunset at your latitude, with weather, snow in winter, roofs in the culture's
colour and the state's flag on the citadel.

**Sandbox** keeps all five screens; Journey shows the map's journey as a view only, and the menu's
Atlas mode shows the true world. The game runs offline: there is no link out to the generator.

**Fixes.** "The captain of the the …" loses its doubled article.

**Tests.** `tests/alpha6.js` (knowledge, blur, notebook and handbills, the feed, day cards, saves,
every viewing-window scene); `tests/browser.js` rewritten for the Alpha 6 shell (the clock against the
pace, the town on the Story screen, a voyage with day cards and check-ins, the five screens).

## Alpha 5.2: the clock

**The race.** A journey is a race against its plan. Every stop has a par time, and each journey type
reads early and late its own way: a pilgrim can arrive early and wait for the holy day; a courier
wants every hour; a raid must beat the alarm; a caravan wants market day; a royal progress must not
arrive before the town is ready; a campaign that comes after the battle is lost. Each stop scores up
to 100 points (more for waiting for the day, or for speed where speed counts); the target counts
three times.

**Arrival** is one page, in large type: ★ on par, or ahead of par, or behind; par and arrival; the
verdict in the journey's own words; the points; what the plan has you do; the next objective and its
par.

**The report card.** At the end: an epilogue in the story's voice, then the card: every stop with
par, arrival, verdict and points; the score against the clock, with a grade (S to E, F if lost); the
story and the plan's tasks; the total; and your best on that journey, kept between runs.

**The clock everywhere.** The opening says how this journey reads the clock. The corner shows ⏱ the
next stop's par and your pace along the plan's course. Camp reports carry the race line; companions
speak of it. Choices that cost time say whether you stay ahead of par.

**You lead.** The player always leads; the journey's named leader backs it. Votes and following are
set aside while the clock is the challenge.

**The narrator.** Camp reports in a country you know say only what changed. The crew asks once how
to spend the nights and keeps your standing order (change it in town).

**Deeds remembered.** What you do to a state or a faith is kept, and its people see you by it.

**The false lead** proves false at the next stop.

**People you know.** People you talk to remember you. Companions can settle in a town, during the
journey (the company, in town) or at its end, and greet you there, put you up, or come with you again.

**Story beats** scale with the leg's length, about one every four days of travel.

**Tests.** `tests/alpha52.js`; the text log (`docs/textlog/`) rerun under 5.2.

## Alpha 5.1.1: the text review

**A review of what the player reads.** `docs/TEXT_REVIEW.md` sets out a method for reading the game's
text as story, built from Carlquist's *Playing the Story* (2002), applies it to a log of eight
scripted games, and plans the fixes. `tests/textlog.js` builds the log: every page, prompt, option,
toast, banner, journal page, status-line change and log line, with the game time and the system that
produced it, and measures it. The logs are in `docs/textlog/`.

**Fixes.**
- The last checkpoint's message arrives as whole pages, never one character at a time: the ending is passed as a
  page, and the message box joins any list of single letters into one page.
- In a town, the first person says why they see you as they do; the others say how.
- The temple speaks with one voice; the watch's regard is the person's own.
- At most one night thief a week in any one town.
- The harbourmaster points to the company's vessel waiting at the quay.
- The opening names the leader once and says the objective once.
- Companions tied to you by contract or custom are the bookkeeper and the eldest.
- Nights at sea read "You sleep aboard, at anchor."
- "Visit the The ..." loses its doubled article.
- Pirates and sea monsters at sea are told once, by the sea's own encounters.
- A marked place whose name is its type is named once; place names starting a sentence are capitalised.

## Alpha 5.1: the story, hidden
## Alpha 5.1

The narrative engine works out of sight, through people, places and objectives. The design is in
`docs/NARRATIVE.md`.

**Who you are.** Every traveller comes with a tie to the journey (kin, a contract, a custom of your
people, a vow, a debt, a duty, flight or curiosity) and with whether you lead it or follow. Both are
part of the character: "Another traveller like this" rolls a new one. Kin, recruiters and elders join
the company by name.

**Any journey.** The title screen lets you choose any of the map's journeys, and the save remembers
which.

**The company at the start.** Journeys that have a company and no Gathering form it before you set
out. The opening tells you who you are, who goes with you, what the first leg is for, and what to do
first.

**Arcs and leg roles.** Each journey type has an arc: what it wants, a measure told in words ("the
haul: a fair haul", "devotion: steadfast"), and five endings. Each journey draws its structure by
weighted chance; each leg takes a role from its arc (harry the coast, the fence, the false lead, the
vigil, the guardian) and an objective. The leg into the target is its approach; the climax happens
at the target and needs the company with you; a stop after it holds the return. Legs the map sends
over water say so, and ask you to find a passage.

**The corner** shows the objective, the measure, and one side story of your choosing.

**Moments on the way.** Raiders want to strike the villages they pass; pilgrims gather at shrines;
caravans stop at market towns; foragers find granaries; surveyors find what the map marks. Borders of
faith and people, toll posts, quarantine, hunger, soldiers, beasts and hard ground meet you as the
world shows them. A leader decides; a follower goes with the leader, or holds back.

**People who carry the story.** When a leg ends in a question ("ask a merchant who will buy what the
company has taken"), the right person answers it, and some answers are false. Every person you talk
to says how they see you and why; the innkeeper reckons the food for the next leg, the priests say
whether they will help a stranger of your faith, the watch says what the law is here and what it has
heard of you, the elder says which country feeds a camp.

**Regard and suspicion, as one system.** How a person sees you comes from your people and faith
against theirs, your state against theirs, their state's form (a theocracy's priests do not help
other faiths; a republic's watch protects everyone), war, hunger and plague, their nature, your
standing, and suspicion from what you have done. It sets the price of rooms, alms, healing and goods.
In a town that wants you gone, a thief may come in the night, and the watch catches them or looks
away. A watch that has heard of you holds you for questions. Alpha 7 adds papers, dress, speech,
contraband and alert levels to the same system.

**Food for the road.** The innkeeper, the harbourmaster and the passage notice reckon days and rations
for the next leg; the journal's new page lists the road ahead, leg by leg.

**Side stories.** Click one in the journal to show it in the corner and set a waypoint to it.

**The company's vessel** can be left in the harbour's care at the company's cost, sold for your
share, or sent home, at the yard.

**Tests.** `tests/alpha51.js`; `tests/stories.js` now builds and plays every journey's arc;
`docs/STORIES_BERNOY.md` is its report on Bernoy.

## Alpha 5: stories

**Every journey is a story.** Its type sets a family, the layers of the map it reads, a story shape
(three acts, the hero's journey, five rooms, the long voyage, the marches, slay the dragon, the
chase, mystery, nodes, siege, the underdog) and a rule for who decides. Hook finders read the map
along the route: borders of state, culture and faith; faith seats; hard ground, cold and heat;
marked places; price gaps between the stops; wars and regiments; walls, capitals, ports and great
cities; zones of plague, famine, invasion and rebellion.

**Stories fit their stops.** Each kind of hook matters to each type high, medium or low. The builder
fits the shape to the stops the journey has, folds what will not fit, gives the climax to the target
(the stop the journey's name gives, or the one the map marks) and closes at the last stop.

**Beats are scenes.** The call, thresholds, trials, turns, the ordeal, rewards, the climax, the
return and episodes play when you arrive at a stop or come near a hook on the way. Their choices run
through money, time, food, standing, tiredness, hurt, fever, morale, the market and the company; at
hard choices the company votes by role, and the journey's rule settles it.

**Out of order.** A later stop reached early asks before it counts: count it now, at the cost the
story sets for finishing early, or only visit.

**The end of a journey.** Each companion chooses whether to stay; hired hands stay for a wage. The
company's vessel becomes yours.

**The journal** shows the story: the beats behind you, and the next one.

**Tests.** `tests/stories.js` builds and plays the story of every journey in a world;
`docs/STORIES_BERNOY.md` is its report on Bernoy's twelve journeys.

## Alpha 4.1

**Fixes.**
- Goods are sold where the map has them: where a town makes them, where its land holds them (its
  own cell and the cells around it), where the map's deals bring them, and at a market's centre.
  Anything with a price can still be sold.
- Skiffs stay in the water. At the shore, Space offers to carry her overland; back in the water,
  the carrying ends. Every other vessel stops at the shore.

**People who explain the systems.**
- **The merchant** (from the market screen) reads the markets around him: goods that are cheap here
  and dearer in towns he knows, after tax and his trade's cut; goods worth bringing here; what your
  packs would fetch here and elsewhere; and a tenth off five of whatever he has too much of. A
  merchant who distrusts you (your standing with his state is below zero) shades his news.
- **The harbourmaster** gives directions to the next stop, the days it takes in your vessel at this
  season and the food it needs, sailing advice, and a watch on your vessel. Walk away from a vessel
  with no one aboard and he asks whether the harbour should watch her, for a weekly fee paid when
  you return. Unwatched, a vessel may be gone when you come back: more likely on a beach than in a
  harbour.
- **The wainwright** reads the road to the next stop (how much of it is road, trail or open country)
  and says what will manage it, and sells riding horses. A horse carries you at the map's
  Horseback pace, grazes on open ground and eats your food elsewhere, and waits in the stables when
  you board a skiff or a boat.
- **Animals aboard.** Pack animals and horses go aboard galleys, small ships, ships and great ships.

**Tests.** `tests/alpha41.js`.

## Alpha 4: markets

**The field.** Every town's price for every good blends the markets around it. Each market pulls
with a weight that falls with distance from its centre, counted in effective miles (two ports are
close by sea; a road shortens the way; open country lengthens it), and with the number of towns it
serves. The town has a voice of its own: cheaper for what it makes or its land holds as a bonus
good, dearer for what comes from far away. Towns near a centre follow it closely; towns between two
markets hear both. A market's reach follows how far apart the world's markets lie.

**Season and events.** Food is cheaper after the harvest and dearer in spring. Famine, plague, war,
sieges, occupation, disasters and closed lines move the prices of the goods they touch, in the
places they touch.

**Your own trading.** Each unit you buy or sell moves the town's price at once, a little in a city
and a lot in a village; over the following week the effect passes into the markets around it.

**A day's food and a day's work.** Every town has both, from the field, set once per world so that
the median town keeps Alpha 3's ration and wage.

**The money table.** Every cost and payment in the game is written in those two measures: food,
rooms, meals, alms, healing, fares, coaches, wages, hire, vessels, repairs, animals, carts, portal
fees, tolls, fines, diversions, mine shifts, working a passage, errands, story rewards and bounties.
Dear towns cost more and cheap towns less. A mine shift pays a day and a half's wage and a share of
the mine's own good, and vessels are priced from their timber, rope, sails and labour.

**The market screen.** Every good the town makes or the markets around it bring, with its buying
and selling price; choose one to see where its price comes from ("Sharnarthi 72%, Oim 12%, the town
itself 15%") and to buy or sell one or five.

**Starting money** follows the plan's cost, who the traveller is, and how prosperous their home
town is, with a quarter either way left to chance.

**The journal** shows a day's food, a day's work, a room, a passage and alms in the nearest town.

**Fixes.**
- F on foot, or aboard a vessel with no hands, asks you to camp (or anchor) at nightfall and when
  you grow tired; camping, F goes on in the morning.
- Delivery errands buy their goods when you take them: the cost leaves your purse at once and the
  goods go into your packs. Delivering them pays; selling them on loses the errand. An errand whose
  goods you cannot carry cannot be taken.
- A meal at a famous inn is an hour at the table, and a rest: it can never end in sleep.

**Tests.** `tests/alpha4.js` checks the field at every market centre, the design's worked example,
the median town, the money table, the mine against a crewed boat, the market screen, famine,
your own trading, starting money and the three fixes.

## Alpha 3: vessels and control

**Classes.** Every vessel has a class: skiff, boat, galley, small ship, ship, great ship, light craft
or airship. The class sets the hands she needs, what she holds (a skiff 20 rations, a boat 220, a
ship 1,500), the rivers she can use, whether she can beach, the water she prefers and how she meets
a storm. The map's transports take classes: the Rowboat is a skiff, the Sailing boat a boat, the
Sailing Ship and Steamship ships, the Modern Ship a great ship, the Dirigible an airship, and
Aircraft, Helicopters and Modern Airplanes light craft.

**Names and looks by culture.** A vessel takes the name her port's people give her class: a knarr
or a cog in Norse and Germanic ports, a felucca or a sambuk in Arabic and Persian ones, a sampan or
a junk in the east, an outrigger or a proa in the islands. Peoples with invented namebases name
their own hulls. Sails take the port's culture colour. What a yard builds follows its people:
Naval ports build everything, River and Lake ports skiffs, boats and galleys, Highland, Hunting and
Nomadic towns skiffs only.

**Who decides aboard.** One control table answers the same eleven questions for six arrangements:
passenger, signed crew, hirer, owner, company and (for Alpha 7) under command. The game reads it for
who eats from your stores, how long hands left aboard will wait, whether a crew keeps watches or
calls for stops, what hands do when they give up waiting, and who decides in a storm. The journal
shows your row.

**The shipwright.** Harbours, and landings in river towns, have a yard: hire a vessel with hands,
buy one, hire and dismiss hands for your own, repair her, or sell her. Prices follow the town's
market and tax; repairs take a class's own time (four hours for a skiff, two days for a ship).

**Courses and storms by class.** F and waypoints keep boats, skiffs and galleys near the coast and
ships and great ships off it. Storms are worse offshore for small hulls and near land for large
ones; a ship caught near land can claw off into open water.

**Rowing and portage.** A skiff is rowed: hours at the oars tire you half as much again as hours
walking. She can be carried over land at twice the walking time.

**Watches.** A crew sails round the clock only with hands enough for two watches: fifteen for a
ship, forty for a great ship. With fewer, they call for a stop at dusk. Light craft set down for the
night over land.

**Porters.** An owner or a company can bring hands ashore as porters. Each carries 10 rations and 2
units more, eats from your pack, and loses heart on land.

**Pack animals, carts and wagons.** Stables in every town sell a pack animal (a mule, a camel, a
reindeer or a packhorse, by the land and its people), a cart or a wagon. They carry 40, 120 or 300
rations more. Carts slow off the roads and wagons crawl; animals graze on open ground and eat your
food elsewhere. None of them can go aboard: board in a town and they wait in its stables.

**The warehouse.** Every town keeps a warehouse. Leave goods or food there for a deposit of a
twentieth of their value and a hundredth a week, due when you collect; anything left a year is sold
to cover the fees. When you have more than you can carry in a town, you choose: store it or sell
it.

**Saves.** Alpha 2 saves load: vessels take the class of their kind.

**Tests.** `tests/alpha3.js` checks the tables, the shipwright, capacity, watches, courses, storms,
rowing and portage, porters, the warehouse, the stables, light craft and old saves.

## Alpha 2.1

The bridge between Alpha 2 and Alpha 3: fixes from the first public tests of Alpha 2.

**Vessels.**
- Damage belongs to the vessel. It goes with the boat when she is lost or handed back, and the next
  boat starts sound. Repairs need the boat in that town's harbour.
- Collapsing from hunger or fever aboard your own vessel: the crew, or a passing fishing boat,
  brings her into the nearest harbour, where she waits with her damage. A hired boat goes back to her
  owner.
- F aboard your own vessel follows the plan's course to the next checkpoint (the gold line) from
  wherever she is: a harbour, a detour, or a stretch you steered yourself. She joins the course at the
  nearest point ahead of where she left it.
- Crews that sail round the clock (ships the map gives 24 hours a day) keep watches: after a long
  day aboard you turn in below for eight hours while the watch sails on.

**The hold, and the crew while you are ashore.**
- What you can carry follows how you travel: your vessel's hold (220 rations, 30 units of goods)
  while you are aboard or in the town where she lies; 60 rations and 10 units with a booked passage;
  20 and 6 on foot.
- When you leave your vessel, what you cannot carry stays in her hold, and it is yours again when
  you return.
- Going ashore where hands stay aboard, you choose how much food to take. The hands eat from what
  you leave. They keep enough for the run to the nearest harbour and wait as long as food and morale
  allow: about three weeks at high morale, ten days at middling, four at low, and half as long again
  for the company's own hands. Then they sail. A hired crew takes the boat back to her owner; an
  owned boat's crew brings her into port and quits; the company's hands take her into port and wait
  there. Leave them too little for the run and the mate blocks the way.
- In harbour the hands eat from the hold, then ashore at your cost.
- The journal and the status line show where your vessel lies, what is in her hold, and how long
  the hands will wait.

**Time and sleep.** Hours spent on things count as hours awake: repairs, alms, healing, reading,
paid work, detours and scenes. Nights at inns and taverns, and two days' rest, are sleep. A stretch of
twenty hours or more includes a night's sleep.

**Sandbox.** Harbours and markets open in a fixed world and in free roam.

**Journeys.** The reasons for each leg describe land, air and teleport legs as what they are; they
all read as hired boats before. The design notes for Alpha 3 to Alpha 7, with a control table and a
worked example for each version, are in `docs/DESIGN.md`; `docs/JOURNEYS.md` shows map makers how
Alpha 5 will read their journeys.

**Tests.** `tests/vessels.js` checks all of the above on any world. The scripted journey mends its
hull in harbour; its bar is three checkpoints, since F now keeps to the plan's longer coastal course.

## Alpha 2

**A changing world.** Markets, passenger lines, hazards and wars run day by day from the world's
seed. Harbours and coach offices post fixed timetables; lines stop for war, bad relations,
occupation, quarantine and disaster. Disease spreads along trade routes; famine follows empty
granaries and halves the food a town can sell. The wars under way in the map are fought out:
regiments march, towns are besieged and fall, peace returns them. News travels about 60 miles a
day.

**Modes.** Journey or Sandbox on the title screen; Sandbox in a changing or a fixed world.

**Journeys by type.** The journey's type (Quest, Caravan, Pilgrimage, Raid and fourteen more)
shapes the travellers, the company and the reasons given for each leg. Every stop wording does
something: gathering the company, rumours, booking, loading the company's own vessel, resupply,
alms, rest, camp, anchor, bounties. A leader named in the journey's title leads it. Journeys may
start away from any town. Air journeys fly in the company's craft; teleport legs cross at once.

**Travel.** Passenger lines by sea and road, including long sailings along each named sea lane;
refusal or higher fares from states hostile to yours; harbours within a short walk of town; boats
on rivers; fords by river size; storms that grow worse away from land and can sink a boat; crews
on rivers; three strikes before a mutiny; portals with fees and misfires.

**The traveller.** Purses vary; each traveller has a trait (long-legged, haggler, sea legs, hardy,
well-connected). Moving targets are found by their last known position, tracks and news. Camping
depends on the place. Exhaustion and falling asleep are announced. The journal lists what you
carry, and leaving a vessel you keep only what you can carry.

**The map.** Clearer mountains and hills, an Effort lens for travel on foot, lens readings on the
world map, known passenger lines on the world map.

**Building.** Maps saved with Unix line endings; maps with damaged characters in notes; older maps
that list biome icons by name; grid overlays outside 1–20 miles replaced by 5-mile squares.

## Alpha 1

The first playable version: a tile world built from an Azgaar map, procedural pixel art, an
inspector and lenses for every map layer, the map's journey as checkpoints with par times, booked
ships and hired boats with crews, seasons and daylight by latitude, weather, prices from market
data, food, trading between markets, fishing and foraging, events at marked places and zones,
travellers drawn from the map, errands from notice boards, rumours and leads, and saves in the
browser.
