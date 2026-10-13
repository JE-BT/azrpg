# Design notes: Alpha 3 to Alpha 7

These notes set out how the next five versions are built. Each version has one **control table**:
the table its rules are read from, in the way the game already reads stop wordings from a table.
Each control table comes with a worked example on a real map. [ROADMAP.md](ROADMAP.md) gives the
order; [JOURNEYS.md](JOURNEYS.md) is the map maker's view of the narrative engine.

| Version | Subject | Control table |
|---|---|---|
| Alpha 2.1 | fixes: vessels, the hold, sleep (the bridge to Alpha 3) | — |
| Alpha 3 (released) | vessels and control | who decides aboard |
| Alpha 4 (released) | markets | what moves a price; what costs and what pays |
| Alpha 5 | stories | who decides in the company |
| Alpha 6 | traffic and knowledge | what you know, and how old it is |
| Alpha 7 | war | the check |

The examples use the worlds in the project's test set: Pyeongak (the pilgrimage to Chelhazpo),
Nouileland (Culzan's quest) and Presia (its wars of the year 441). Figures marked as proposals are
starting values for tuning; every other figure is read from the map or from the game as it stands.

## Principles

**Many simple systems, meeting in many places.** azrpg is meant to be interesting because small
rules collide. A hull class says how a vessel handles a storm; distance from land says how bad the
storm is; the crew's morale says whether they obey the order to ride it out; the hold says how long
they can wait for better weather. None of these rules knows about the others. Each version lists
its systems and the places where they meet, and new work should add a system with one clear job
before it adds a special case to an old one.

**Control tables.** Where several arrangements share the same questions (who steers, who pays,
who decides), the answers live in one table, and the code reads the table. A new arrangement is a
new row; a new question is a new column that every row must answer.

**The world is the reason.** Every rule reads the map: transports, cultures, markets, states,
regiments, zones, markers. The journey is the expected course through that world, and the world is
why the traveller leaves it.

**Three kinds of fact.** Text keeps its tags: *data* from the map, *mixed* where a stated rule is
applied to the data, *new* where something is made up.

**What the traveller knows.** News travels about sixty miles a day. Events out of sight (a crew
sailing off, a town falling, a price collapse) reach the player as news and sightings. Alpha 2.1
tells the player some things at once; Alpha 6 moves them into the news.

---

## Alpha 3: vessels and control

### As built

Alpha 3 builds all nine steps below, with all eight classes. In the code (`engine/src/20_vessels.js`):

- **The tables** are data: `AZ.VCLASS` (classes), `AZ.HULLS` and `AZ.YARDS` (realisation), `AZ.CONTROL`
  (the control table, with machine rules and the text the journal shows), `AZ.LANDV` (land vehicles).
- **The control table is read** for who eats from your stores, how long hands left aboard wait, whether
  a crew keeps watches or calls for stops, what hands do when they give up, who decides in a storm, and
  whether hands may come ashore as porters. Daily hire and wages still follow Alpha 2's own code, which
  gives the same result as the table's *Money* column.
- **The company row** calls stops by the hands' custom until Alpha 5 brings decision rules; the
  *under command* row waits for Alpha 7.
- **Prices** are multiples of the town's daily boat hire, repair price and wage, so they follow the
  market and the state's tax.
- **Long courses** that prefer the coast or the open sea search more of the map; a search that runs
  out falls back to the plain course.

Added on the way, from public tests: **the warehouse.** Every town stores goods and food for a deposit
of a twentieth of their value and a hundredth a week, due on collection; anything left a year is sold
to cover the fees. Over your limit in a town, you choose to store or sell. Outside towns the surplus
is still left behind. Caches (burying goods in the wild) wait for Alpha 6, where your chart can mark
them and others can find them; Alpha 7 ties both to suspicion.

### What Alpha 2 has

Four arrangements grew up one at a time: a booked passage on a captain's ship, a hired boat with a
crew, an owned boat (the shipmaster traveller), and the company's own vessel for raids, campaigns
and expeditions. Each has its own rules for steering, food, sleep, morale and F. Alpha 2.1 gives
them a common hold and common rules for crews left aboard. The map's Rowboat has no vessel of its
own: every boat leg is sailed in a hired sailing boat with three hands.

### Control table: who decides aboard

| | Passenger | Signed crew | Hirer | Owner | Company | Under command |
|---|---|---|---|---|---|---|
| **Steers** | the captain | the captain | you | you | the leader (you, if you lead) | the commander |
| **F** | days pass faster; P holds the ship | days pass faster | the plan's course, or your waypoint | the plan's course, or your waypoint | the plan's course | follow the flagship or the unit's march |
| **Stops called by** | the captain's itinerary: ports of call with fixed stays | the captain | the crew, by custom: at dusk, or never if they sail round the clock | the crew, by custom; with no crew, your own tiredness | the journey's decision rule (Alpha 5); until then the plan's stops and the crew's custom | the commander's orders |
| **Sleep** | each night aboard, without asking | in your off-watch, eight hours in each day | at the crew's stops, or below in your off-watch | as the hirer; single-handed, only at anchor | below, in watches | by the watch bill |
| **Morale window** | never: the crew is the captain's | your standing with the mate | yes: calls, ultimatums, three strikes | yes, and you may dismiss hands | the company's morale | the unit's morale, shown with the orders |
| **Food** | your own stores | the ship's stores | you feed every hand | you feed every hand | you feed the hands outside the party; the party carries its own | issued from the unit's stores |
| **Money** | the fare, at booking | wages, paid off at the last port | hire and wages each dawn, three days in advance | wages each dawn; repairs; she can be sold | no fare and no wages; the company's purse pays repairs (Alpha 4) | pay each month, while the treasury holds |
| **Storms decided by** | the captain: he heaves to, and the hours are lost | the captain; your watch works through it | you; the crew's morale answers | you; the crew's morale answers | the leader, after the company's say | the commander |
| **Stepping off** | in port only, with a passenger's baggage (60 rations, 10 units) | in port, on leave, with your sea chest (60 and 10) | anywhere she can reach; what you cannot carry stays in the hold, and you choose the hands' food | as the hirer | as the hirer | only with leave; otherwise you are absent |
| **While you are away** | she sails on time, with or without you | she sails on time; missing her before the last port is desertion | the hands eat from the hold and wait while food and patience last, keeping the run to port; then they take the boat back to her owner | as the hirer; when they go, they bring her into port, take their wages and quit; she stays yours | the hands wait in the nearest port, however long, once the run is fed | absent for a day, then a deserter (Alpha 7) |
| **How it ends** | at her last port of call, or by missing a sailing | paid off at the last port | pay off and hand her back in any harbour | sell her, or lose her to wreck or seizure | at the journey's end, or when the company breaks up | discharge at peace or at the campaign's end; capture; desertion |
| **Alpha 2 name** | booked passage | signed on as crew | hired boat | owned boat | company vessel | new in Alpha 7 |

### Worked example: a hired boat on the pilgrimage to Chelhazpo

Pyeongak's journey leaves Durcojhler for a stop near Slof by Sailing boat: 2,558 miles, 426 hours
under sail at 12 hours a day, par from Day 25, 15:50 to Day 61, 10:34 (data).

1. **Choosing the row.** The pilgrimage has no vessel of its own, so at Durcojhler harbour the
   traveller hires a boat: the *Hirer* column. Hire is 🟡 0.12 a day and each of three hands draws
   🟡 0.17, so 🟡 0.63 a day, three days (🟡 1.89) paid at once (mixed). The hands eat from the
   traveller's stores: a ration costs 🟡 0.12 at Durcojhler, so feeding them adds 🟡 0.36 a day.
2. **F.** The row says *the plan's course*. From Durcojhler's boat harbour, F's path now runs
   entirely along the gold line; the shortest way by water, which Alpha 2 took, shares only 7% of it.
3. **Stops.** A boat's crew sails by custom: twelve hours a day, then they call for anchor at dusk.
   The morale window opens with each call.
4. **Stepping off.** Day 52, 22:09: the boat lies 389 steps along the 507-step course, off a
   wetland coast of Cielb near Nilsirt, in autumn at 41.8° south with 9.8 hours of daylight. The
   traveller goes ashore with 120 rations aboard. On foot they can carry 20; the other 100 stay in
   the hold. The nearest harbour the boat can reach is Thres, 183 miles away: four days at autumn
   daylight, so the hands keep 12 rations for the run (mixed). With morale at 70, they wait at most
   21 days. The 88 spare rations would feed them for 29 days, so the choice reads *they wait about
   21 days*.
5. **Too little.** Had the traveller held only 30 rations, taking 20 would leave the hands 10,
   short of the 12 for the run. The mate blocks the way and offers *leave them enough for the run
   (take 18 rations)*; going anyway counts as a strike, and the hands take the boat to Thres at once.
6. **While away.** The hands eat three rations a day. On the 22nd dawn their patience is spent.
   They sail for Thres with 37 rations aboard, eat 12 on the run, and hand the boat back to her
   owner with the other 25 (the *Hirer* row). The traveller hears of it at once in Alpha 2.1, and by news in Alpha 6.
7. **The other rows.** As an *Owner*, the same crew would bring the boat into Thres, take their
   wages and leave her moored there with 25 rations aboard. As a *Company* with hands of its own,
   they would wait in Thres for as long as it took; their patience at morale 70 is 32 days.
8. **What Alpha 3 adds.** The Sailing boat is the *boat* class: it prefers to keep within sight of
   land, so F's waypoint courses hug the coast. Durcojhler's people are the Rake (Drakonic), whose
   namebase is an invented one, so the boat's kind and name are generated from it; their culture is
   of the Generic type, so the harbour offers the full range of classes.

### Classes

| Class | Hands | Hold (rations) | Rivers from | Stops at | Prefers | In a storm |
|---|---|---|---|---|---|---|
| Skiff | you, and one or two more | 20 | 10 m³/s | any bank or beach; carried past rapids | rivers, lakes, the shore | deadly offshore, safe beached |
| Boat | 2–4 | 220 | 40 m³/s | beach, anchorage, harbour | within sight of land | risky offshore, safe beached |
| Small ship | 6–12 | 600 | 200 m³/s | anchorage, harbour | coasts and short crossings | rides out most; reefs near land |
| Ship | 15–40 | 1,500 | 400 m³/s | harbour, sheltered anchorage | open sea | safest offshore; a lee shore is the danger |
| Great ship | 40 and more | 4,000 | the sea only | harbours of large ports | ocean lanes | the safest; slow to reach shelter |
| Galley | 20–150 rowers | 300 | 200 m³/s | beach, harbour | coasts, rowed in any wind | swamped offshore |
| Light craft | 1–2 | 10 | flies over every river | any open ground | fair weather | grounded until it passes |
| Airship | 4–20 | 400 | flies over every river | towns and mooring masts | steady lines between towns | climbs above it, or moors |

The figures are proposals. The map's own transports take classes: Rowboat → skiff, Sailing boat →
boat, Sailing Ship and Steamship → ship (steam sails in any wind and takes on coal in port), Modern
Ship → great ship, Dirigible → airship, Aircraft, Helicopter and Modern Airplane → light craft with
fuel stops. Teleport stays a crossing. The map decides speed and hours per day; the class decides
the rest. Small ships and galleys appear in harbours and on passenger lines without a transport of
their own.

### Realisation: names and looks by culture

| Namebase family | Skiff | Boat | Small ship | Ship | Great ship | Galley |
|---|---|---|---|---|---|---|
| Norse, Germanic | faering | knarr | byrding | cog | hulk | longship |
| English, Romance | rowboat | sailing boat | sloop | brig | barque | galley |
| Arabic, Persian | hawari | felucca | sambuk | baghlah | ganja | ghurab |
| Chinese, Korean, Japanese | sampan | fishing junk | junk | great junk | treasure ship | oared junk |
| Island and Pacific | outrigger | double canoe | proa | voyaging canoe | great voyaging canoe | war canoe |
| Invented (Elven, Dwarven, Draconic …) | generated from the base | generated | generated | generated | generated | generated |

The culture's type sets what its ports offer: Naval ports every class; Generic ports every class in
smaller numbers; River and Lake ports skiffs, boats and galleys; Highland, Hunting and Nomadic towns
skiffs only. Sails and pennants take the port's culture and state colours (data). Families not
listed use the English column.

### Land vehicles

Pack animal, cart, wagon and coach are classes with the same columns (hands, hold, the roads they
need, where they stop, what ground they prefer, how weather stops them), realised by culture (camel
string, mule train, ox cart, sledge) and run under the same control rows. A caravan is a company of
land vehicles.

### Where the systems meet

- **Class and course.** F's route uses a cost per tile that follows the class: skiffs and boats
  pay for distance from land; ships and great ships pay for shoals and narrows.
- **Class, storm and distance from land.** One risk table, read by class.
- **Hours per day, hands and watches.** A crew sails round the clock only with hands for two
  watches (about twice the class's least crew). With fewer, they call a stop at dusk.
- **Daylight and pace.** Crews that stop at night sail only the hours of daylight; the journal says
  why a winter leg ran long.
- **Hold, hands and time at sea.** The hold divided by the hands aboard is how long she can stay
  out, and how long hands left aboard can wait.
- **Draft and rivers; harbour size.** River discharge and port size (data) decide which classes
  reach which towns.
- **Culture and supply.** What a port builds, hires and sells, and what it calls it.
- **Markets and prices.** Hire, purchase, repairs and wages follow the town's market (Alpha 4).
- **Flags and war.** A vessel flies her port's flag; enemy flags are refused, searched or seized
  (Alpha 7).
- **Control and the company.** The company row follows the journey's decision rule (Alpha 5).

### Build steps

1. **One vessel record** for class, realisation, control, hold, damage, crew and position, with
   saves converted. *Check:* every Alpha 2 arrangement plays as before; the vessels test passes.
2. **The control table as data**, read by F, stop calls, sleep, the morale window, food, money,
   storms and stepping off. *Check:* a test takes each column of the control table through a day at
   sea and a step ashore and compares the result with the table.
3. **Classes and transports**, the Rowboat as a skiff that you row yourself (rowing hours count as
   awake hours and effort), portage for skiffs. *Check:* a Rowboat leg is rowed; a skiff passes a
   river a boat cannot; a great ship refuses a small port.
4. **Courses by class** for F, waypoints and passenger lines. *Check:* a boat's waypoint course
   keeps near land where the coast allows; a ship's course avoids shoals.
5. **Storms by class.** *Check:* damage and sinking odds per class match the table at three
   distances from land.
6. **Names and looks by culture.** *Check:* the text test passes on every world in the set.
7. **The harbour as a market for vessels:** hire and buy by class, sell your own, hire and dismiss
   hands, repairs by class.
8. **Hands ashore.** Owners and companies bring hands ashore as porters, at a cost in morale for
   every day on land; hired crews stay with their owner's boat.
9. **Land vehicles** on the same lines.

### Carried over from Alpha 2.1

- Craft the map gives fewer than 24 hours a day in the air (Aircraft 4, Helicopter 6, Modern
  Airplane 12) are not yet made to land; step 2 gives them a stop call.
- The scripted journey test needs a skipper who plans food by the leg's real pace, so that its pass
  mark can return to four checkpoints.

---

## Alpha 4: markets

### As built

Alpha 4 builds steps 1 to 7 below in `engine/src/21_markets.js`; step 8 (company purse, patron's writ,
credit) waits for a later version. Where the code differs from the text:

- **A market's reach** scales with the world: about two-thirds of the median distance from a market
  centre to its nearest neighbour. That is 400 effective miles on Pyeongak, as in the tables; Presia's
  31 crowded markets reach about 250. Without it, crowded worlds pulled their centres off their own
  prices.
- **The money table** is `AZ.MONEY`, one row for each line of the table, each a rule in R and W.
  `AZ.Prices` reads it, and so do the scenes, errands, fares, bounties, vessels and animals that used
  fixed coins.
- **Your own trading** moves the town at once and fades over a week; the same trade passes into the
  markets that pull on the town over that week and fades from them over the next four.
- **Events** read the changing world: dearth zones as famine, disease zones, disasters, wars, sieges
  (a regiment waiting at the gates), occupation, and lines that are closed.
- **Fixes found in play:** F asks for rest at nightfall and when you tire; delivery errands buy
  their goods when taken; a meal at a famous inn is a rest.
- **Questions 6 and 7** take option (a) for now: a quarter of chance in starting money, and alms,
  portal fees and bounties that grow with a town's size as well as its wage.

### Starting point: the economy the map already has

Azgaar's map carries two simple systems, and azrpg builds on both as they are.

- **Markets** work like watersheds. Every cell belongs to one market region; each region has a
  centre (the burg at its centre of gravity, usually its largest market) and a price for each good
  it holds. Pyeongak has 13 markets, from Khatho's 6 burgs to Oim's 57 (data).
- **Goods** are the geographic overlay. Each good has a spread function that places it on cells by
  biome, height, temperature, shore and rivers; a cell holds at most one good, and no good takes more
  than `ceil(200 × cells ÷ 5000)` cells ([Azgaar's wiki](https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Goods-spread-functions)).
  These are the cells' bonus goods: 522 of Pyeongak's 3,877 cells hold one (data). Towns produce
  goods from their land and from recipes, and the map's deals record who sells to whom.

The economy that comes out of these two systems is emergent. Alpha 4 codes only what matches the
systems, and balances the one thing the systems leave to the game: **money**. Two control tables
do that. The first says what moves a price in a given town, from the markets and goods around it.
The second lists everything that costs or pays money, each tied to two local measures that the
first table produces: the price of a day's food and the worth of a day's work. Both tables are
filled from the world.

### What the tests found

- Prices are flat across a market region. Froi, 484 miles from its centre at Wildgemea, pays
  Wildgemea's prices to the last copper, and Bayfront, halfway between two market centres, pays only
  one of them.
- One unit sold moves the price in every town of the region, and for goods a region does not make,
  one unit halves it.
- A town lists only the ten best-stocked goods it makes.
- A twelve-hour shift at the Bluszils clay mine pays 🟡 4, while a boat with three hands costs 🟡 0.59
  a day in the same town. Wages everywhere else sit near 🟡 0.17 a day.
- Starting money is a random 0.6 to 1.4 times the plan's cost. A low start (🟡 125) that left the
  traveller living off the land for two seasons was good play, and that balance stays.

### Control table 1: what moves a price

A town's price for a good is a weighted blend: each market pulls on the town with a weight that
falls with distance from its centre, and the town has a voice of its own. The weights come from the
first four rows; the town's own price from the next two; the rest act on the blend.

| Influence | Reads (map data) | Rule | Range | Acts on | On Pyeongak |
|---|---|---|---|---|---|
| **Home market** | the cell's market region, its centre burg, its price for each good | pull = size × e^−(d ÷ 400)², with d in effective miles | 1 at the centre; 0.14 at 560 effective miles | every good | at Wildgemea, the centre, 74% of each price comes from its own market |
| **Other markets** | every other market's centre and prices | the same pull, from each | as above | every good | Bayfront: Deadkeep 31%, Hauls 28%; Bluszils: Oim 54%, Wildgemea 31% |
| **Market size** | the number of burgs in the region | the square root of its share of the mean | about 0.4–1.5 | each market's pull | Oim's 57 burgs pull at 1.40; Khatho's 6 at 0.45 |
| **Travel options** | ports, roads and trails at both ends | effective miles = miles × 0.6 between two ports, 0.8 by road, 1.0 by trail, 1.3 across country | ×0.6–×1.3 | every distance in this table | Froi to Wildgemea, 484 miles by sea, count as 290 |
| **Local production** | the town's production and its cell's bonus good | the town's own voice weighs 0.15, three times that for goods it makes, which it prices at 0.7 of its home market | ×0.7 | goods made here | Froi makes wood (its cell's bonus good): 🟡 1.54 at Wildgemea, 1.40 in Froi |
| **Distance from supply** | effective miles to the home centre | for goods the town does not make, its own price rises a tenth for every 100 effective miles, to double at most | ×1–×2 | goods not made here | Bayfront makes no wood and lies 526 miles from Deadkeep: its own voice says 1.69 |
| **Season** | the latitude and the date | food ×0.9 after the harvest, ×1.15 in late winter and spring | ×0.9–×1.15 | food | the boat off Cielb on Day 52 is in a southern autumn: harvest prices |
| **Events** | the changing world's zones, wars, sieges and closed lines | famine ×1.6 on food; disease ×1.5 on salt and medicines; war ×1.3 on arms and horses and ×1.15 on food; siege ×3 on food inside the walls; occupation ×1.1; disaster ×1.4; a closed line ×1.2 on what it carried | ×1–×3 | the named goods, in the zone or the state | Froi's notice board asks for relief for Lostshell, inside a zone |
| **Tax** | the state's sales tax | buyers pay it on top | +0–40% | buying | Froi, in Voh: 18% |
| **Merchants' margin** | — | sellers receive 85% of the price | ×0.85 | selling | wood sells for 1.19 in Froi |
| **Your own trading** | your sales and purchases in this town | each unit moves the town's own price by 0.2 ÷ its population in thousands at once, fading into the field over a week | ±1.5% a unit in Froi; ±20% in a village | goods you trade | ten units of wood sold in Froi lower Froi first, its neighbours later |
| **The day's food (R)** | the field prices of the town's foods | R = k × the mean of the three cheapest foods, with tax; k is set once per world so the median town keeps Alpha 3's ration | — | the money table | Pyeongak: k = 0.058; median ration 🟡 0.07 |
| **The day's work (W)** | R | W = c × R; c is set once per world so the median town keeps Alpha 3's wage | — | the money table | Pyeongak: c = 2.43; median wage 🟡 0.17 |

### Worked example: four towns on Pyeongak

| Town | Where it lies (data) | Pulls on its prices (mixed) | Wood: market → field | Iron: market → field | R | W |
|---|---|---|---|---|---|---|
| Wildgemea | a market centre, a port on a road | Wildgemea 74%, Oim 8%, its own voice 9% | 1.54 → 1.54 | 4.72 → 4.42 | 0.067 | 0.16 |
| Froi | 484 miles from Wildgemea by sea; makes wood, ropes and tar | Wildgemea 72%, Oim 12%, its own voice 15% | 1.54 → 1.40 | 4.72 → 4.68 | 0.073 | 0.18 |
| Bayfront | inland on a trail, 526 miles from Deadkeep and 523 from Hauls | Deadkeep 31%, Hauls 28%, its own voice 23% | 1.11 → 1.37 | 3.72 → 3.64 | 0.046 | 0.11 |
| Bluszils | a clay-mining port in Oim's region, 450 miles from Oim and 617 from Wildgemea | Oim 54%, Wildgemea 31%, its own voice 9% | 1.77 → 1.71 | 2.73 → 3.40 | 0.071 | 0.17 |

1. **At the centre** the field gives Wildgemea its own market's prices, give or take what Oim's
   cheaper iron does to the margin.
2. **Far from the centre**, Froi still follows Wildgemea, because 484 miles of sea count as 290. The
   wood its own forests give it is cheaper there than at the centre.
3. **Between two markets**, Bayfront hears both, and its own voice is loud: no market lies close.
   Wood is dearer there than either market quotes, because Bayfront makes none and the nearest wood
   is far off.
4. **Two markets at once:** Bluszils belongs to Oim, but Wildgemea's buyers pay 4.72 for iron and
   their pull reaches Bluszils at 31%. Iron that cost 2.73 there under Alpha 3 costs 3.40 in the
   field.
5. **Food and work** follow. Bayfront's cheap food makes its labour cheap: a hand there is worth
   🟡 0.11 a day, two-thirds of a hand in Froi.

### Control table 2: what costs and what pays

Every row keeps its Alpha 3 shape, rewritten in R and W: each constant becomes that constant ÷ the
median wage, times the town's W. The median town pays exactly what it paid in Alpha 3; dear towns
cost more and cheap towns less. Three rows change on purpose (marked ●): the mine, vessels, and
starting money. The example column is Durcojhler, where food is dear (R 0.116, W 0.281), except
where it says otherwise.

| Row                                                                                   | Costs or pays    | Alpha 3 rule                                                       | Alpha 4 rule                                                                                            | Durcojhler: Alpha 3 → Alpha 4                         | The world's reason                                                                                                          |
| ------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| A day's food                                                                          | costs            | the cheapest food ×0.1, with tax                                   | R                                                                                                       | 0.12 → 0.12                                           | what the land and the markets around bring                                                                                  |
| A room until morning                                                                  | costs            | 0.3 + 2 rations, with tax                                          | 1.8W + 2R                                                                                               | 0.60 → 0.74                                           | the innkeeper's day and two meals                                                                                           |
| A meal at a roadside inn                                                              | costs            | 🟡 1                                                               | 4R                                                                                                      | 1.00 → 0.46                                           | four rations of good food                                                                                                   |
| Alms                                                                                  | costs            | 0.5 + 0.01 per thousand people                                     | 3W + 0.06W per thousand people                                                                          | 0.90 → 1.53                                           | a day's work for the temple, more in great towns                                                                            |
| Treating a fever                                                                      | costs            | 1 + 5R                                                             | 6W + 5R                                                                                                 | 1.60 → 2.27                                           | the healer's time and five days' broth                                                                                      |
| A sea passage                                                                         | costs            | 0.004 a mile (🟡 1 at least), with tax                             | W × 0.024 a mile (6W at least)                                                                          | 500 mi: 2.30 → 3.37                                   | the crew's time and the port's dues                                                                                         |
| A coach                                                                               | costs            | 0.006 a mile (🟡 0.5 at least), with tax                           | W × 0.035 a mile (3W at least)                                                                          | 100 mi: 0.70 → 0.98                                   | the driver's time and the team's feed                                                                                       |
| A hand's wage, a day                                                                  | costs            | 0.15, with tax                                                     | W                                                                                                       | 0.17 → 0.28                                           | the local day's work                                                                                                        |
| Hiring a boat, a day                                                                  | costs            | 0.10, with tax                                                     | her price ÷ 365                                                                                         | 0.12 → 0.12                                           | a boat pays for herself in a year of hire                                                                                   |
| ● Buying a vessel                                                                     | costs            | 150 days' hire (a boat 🟡 18)                                      | materials and labour: a boat is 10 wood, 2 ropes, 2 sails and 30W; other classes by Alpha 3's multiples | a boat: 18 → 43                                       | what she is made of, at this town's prices                                                                                  |
| Repairs                                                                               | costs            | 0.3 sail + 0.3 rope, with tax                                      | 0.3 sail + 0.3 rope + W for every 12 hours in the yard                                                  | 3.90 → 3.61                                           | materials and the yard's time                                                                                               |
| A pack animal                                                                         | costs            | 30 wages                                                           | the field price of Horses (Camels in deserts)                                                           | 5.10 → 7.82                                           | animals are goods on the map                                                                                                |
| A cart; a wagon                                                                       | costs            | 80 and 200 wages                                                   | Cattle + 8 wood + 10W; 2 Horses + 16 wood + 20W                                                         | 13.6 → 22.8; 34.0 → 44.3                              | the beasts and the timber                                                                                                   |
| The warehouse                                                                         | costs            | a twentieth of the value now, a hundredth a week                   | the same, valued at the field's prices                                                                  | —                                                     | a share of what is stored                                                                                                   |
| The portal keepers                                                                    | costs            | 1 + 0.15 per thousand people                                       | W × (6 + 0.9 per thousand people)                                                                       | 7.15 → 12.05                                          | keepers charge what the town can bear                                                                                       |
| Tolls: rebels; pirates paid off                                                       | costs            | 🟡 4; 🟡 8                                                         | 24W; 47W                                                                                                | 4.00 → 6.74; 8.00 → 13.21                             | what a band can ask of a traveller here                                                                                     |
| A fine from an enemy watch                                                            | costs            | up to 🟡 4                                                         | up to 24W                                                                                               | 4.00 → 6.74                                           |                                                                                                                             |
| Diversions: a circus, the library's copyists, an offering at a grove, a stake at dice | costs            | 🟡 1, 2, 2, 1                                                      | 6W, 12W, 12W, 6W                                                                                        | 1.00 → 1.69; 2.00 → 3.37                              | a day's or two days' work                                                                                                   |
| ● A shift at a mine (12 hours)                                                        | pays             | 🟡 4                                                               | 1.5W + a quarter of a unit of the mine's own good, at the town's price                                  | at Bluszils: 4.00 → 0.53                              | a miner's wage and a share of what he digs; a gold mine pays more than a clay pit                                           |
| Working a passage                                                                     | pays             | the wage, each day                                                 | W each day, paid at the last port                                                                       | 0.17 → 0.28 a day                                     | the ship's day's work                                                                                                       |
| Delivering goods                                                                      | pays             | the destination's price × units × 1.1, + 0.003 a mile              | the destination's field price × units × 1.1, + W a day of travel                                        | glass for Aghagos: 31.2 → about 32                    | the goods' worth there, and your days on the road                                                                           |
| Relief for a stricken town                                                            | pays             | 0.6 × cost + 1                                                     | 0.6 × cost + 6W                                                                                         | at Froi, Lostshell: 2.10 → 2.21                       | the temple repays most of it                                                                                                |
| Dispatches to a regiment                                                              | pays             | 1 + 0.005 a mile                                                   | W × (6 + 0.03 a mile)                                                                                   | 40 mi: 1.20 → 2.02                                    | a runner's days, and the danger                                                                                             |
| The truth about a marked place                                                        | pays             | 1.5 + 0.004 a mile                                                 | W × (9 + 0.024 a mile)                                                                                  | 50 mi: 1.70 → 2.87                                    | someone's curiosity, paid in days of work                                                                                   |
| Story rewards (letters, papers, relics)                                               | pays             | 🟡 3, 5, 8, 10                                                     | 18W, 30W, 47W, 60W                                                                                      | 5.00 → 8.43                                           |                                                                                                                             |
| A bounty, in advance; on proof                                                        | pays             | 5 + 0.6 per thousand people, at most 60; three times that on proof | W × (30 + 3.5 per thousand people), at most 350W; three times that on proof                             | 29.6 → 48.7                                           | a great town pays a hunter well                                                                                             |
| Selling goods                                                                         | pays             | the market's price × 0.85                                          | the field price × 0.85                                                                                  | wood: 1.11 → 1.22                                     |                                                                                                                             |
| Selling a vessel or an animal                                                         | pays             | 60% of her price                                                   | the same, at the field's prices                                                                         | a boat: 10.8 → 25.9                                   |                                                                                                                             |
| Living off the land                                                                   | feeds            | fishing and foraging give food                                     | the same                                                                                                | —                                                     | the land gives food, never coin                                                                                             |
| ● Starting money                                                                      | —                | the plan's cost × the kind's share × 0.6–1.4 at random             | the plan's cost at Alpha 4 prices × the kind's share × √(home prosperity) × 0.75–1.25                   | from Oxbreak, returning home: 126–293 → about 144–241 | savings follow the home town's wealth: prosperity is its product per thousand people over the world's median (Oxbreak 0.85) |
| A company purse                                                                       | pays             | —                                                                  | each companion puts in 20–60W by role at the Gathering                                                  | new                                                   | the company's own savings                                                                                                   |
| A patron's writ                                                                       | pays             | —                                                                  | credit up to 200W of the patron's town, honoured by its friends                                         | new                                                   | a ruler's, temple's or guild's name                                                                                         |
| Credit                                                                                | pays, then costs | —                                                                  | up to 100W, repaid with a tenth more at a named town by a date                                          | new                                                   | a merchant's or temple's trust                                                                                              |

### Worked example: the mine, the boat, and a stranded start

1. **The mine.** At Bluszils, a clay-mining port of 33,557 people (data), Alpha 3 pays 🟡 4 for a
   shift, and a boat with three hands costs 🟡 0.59 a day: one shift pays for a week of the boat.
   In Alpha 4, W at Bluszils is 0.172 and clay costs 1.09 in the field, so a shift pays 1.5 × 0.172
   + 0.25 × 1.09 = 🟡 0.53, and the boat with three hands costs 0.123 + 3 × 0.172 = 🟡 0.64 a day. A
   miner earns three times a hand's wage, and a shift buys most of a day of a crewed boat.
2. **Still a way back.** A traveller stranded at Bluszils with nothing can live off the shore and
   work the pit: a week of shifts (🟡 3.7) buys a 500-mile passage from the port (W × 12 = 🟡 2.06)
   with food to spare. The road back to the journey takes weeks of work, which is the point.
3. **The start.** Pyeongak's plan costs 🟡 209 at Alpha 3 prices. Its median town keeps its prices
   in Alpha 4, so the plan's cost moves only where the route passes dear or cheap towns: Durcojhler,
   the pilgrims' first stop, is dear (W 0.281), which raises the cost of its stays and its boat.
   Oxbreak's prosperity is 0.85, so a traveller returning home starts with about 🟡 144–241. A
   stranger (share 0.9) starts with about 130–217, a soldier (0.8) with 116–193, and a fugitive
   (0.45) with 65–109: the lean start that ends in a season of fishing is still there, and it now
   follows from who the traveller is and where they come from.

### Where it meets the other versions

- **Alpha 3.** Vessels, carts and animals are priced from their materials and the goods they are
  (rows *Buying a vessel*, *A pack animal*, *A cart; a wagon*), and hire follows from price.
- **Alpha 5.** A caravan's story reads its hooks from the field: the gaps between towns, the goods
  a town makes, the markets that pull on it.
- **Alpha 6.** Rumours of prices are made from the field's real gaps; carriers on the lines are the
  reason two markets pull on one town; your price book records field prices with their dates.
- **Alpha 7.** War, sieges and occupation reach prices through the *Events* row; a patron's writ is
  honoured by friends and dangerous among enemies.

### Build steps

1. **The field.** Weights for every town, computed once per world and kept; prices for every good
   in every town. *Check:* at each market centre the field stays within a tenth of the market's own
   prices, and the four Pyeongak towns match the worked example.
2. **R and W**, calibrated per world. *Check:* the median town's ration and wage equal Alpha 3's.
3. **The money table as data** (`AZ.MONEY`), with every cost and payment in the game reading its row,
   and `AZ.Prices` reading the table. *Check:* a test prints every row at Durcojhler, Bluszils,
   Bayfront and Froi; a mine shift pays less than a day of a boat with three hands.
4. **The market screen:** every good with a field price, made here or brought in, and where its
   price comes from ("Wildgemea 72%, Oim 12%, Froi 15%"). *Check:* every good on Azgaar's goods map
   for the region appears.
5. **Season and events.** *Check:* famine in a zone raises food there, and nowhere else.
6. **Your own trading.** *Check:* ten units sold in Froi move Froi at once and its neighbours over the
   following week.
7. **Starting money** from the plan at Alpha 4 prices, the kind and home prosperity. *Check:* on each
   test world the median traveller can pay for the plan with about a seventh to spare, and a
   fugitive cannot.
8. **Company purse, patron's writ and credit**, last; they can wait for a later version.

---

## Alpha 5: stories


### The idea

Each journey already has a type, a route, checkpoints and stops. Alpha 5 gives each type a story
shape and fills it from the places where the type's main layers meet along the route. The same
mechanics then read differently: a Rumours stop on a raid turns on the temples' silver and who
guards it; on a pilgrimage, on the shrine and its rites. JOURNEYS.md gives the types' movement
rules, main layers and story shapes, and the full table of stop readings.

This idea must be built out to encompass the mechanics the game has. Right now, every town has an Innkeeper, Merchant, Shrine-Keeper, Elder, and Townsfolk to talk to. Can also talk to captains of ships, passengers, there could be a captain of the watch, a warehouse or harbor master, a wainwright, a shopkeeper at the market, and many others. All these are potential vehicles for the story to be told. If the story is a mystery, perhaps you can interrogate people. If you are on an adventure, perhaps they ask to hear your story or you can ask about your specific quest. All the different story types can affect this.

The story should also react to the character's culture, religion, and so forth, making these systems real. In Alpha 2, the game makes biomes real through the camping bonus: swamps give nothing while rainforests give an extra ration, so the traveler avoids the swamps. In a narrative, perhaps a minority culture is disliked in a state, and so when a person of that culture travels to the majority region, there is risk involved, perhaps prices are higher, people react negatively, perhaps even robbery and things, which may be punished by the guard or not, depending on how sanctioned the discrimination is. In a theocracy, persecuting a person of a different religion would be expected, so you could get no help there. But in a republic perhaps all religions are protected, so you could get help from the watch there.  People should not all react the same, their religion, culture, nationality, world situation, hunger, personality, all affect their response.  Other layers should be made real in the same way.
### Control table: who decides in the company

| | Free movement | Collective decision | The leader decides after discussion | Orders |
|---|---|---|---|---|
| **Route between checkpoints** | you | proposed by whoever leads, put to the company at each fork | the leader, after hearing the company | the orders: the plan, the commander or the unit's march |
| **F** | the plan's course, or your waypoint | the course the company agreed | the leader's course | follow the leader, the flagship or the unit |
| **Decisions at stops** (book, rest, buy, wait) | you | the company's vote | the leader | the orders |
| **Choices at story beats** | you | the vote; whoever leads breaks a tie | the leader | the commander; you may volunteer or refuse within the orders |
| **The companions' advice** | when asked (Space) | at every fork, each by their role | before every choice | the sergeant's briefing |
| **How companions weigh a choice** | they do not vote | by role: a guard weighs danger, a guide speed, a healer the sick and the food, a merchant profit, a priest the rites, a scout what is known | as in a vote, for advice | as the orders say |
| **Overruling them** | costs nothing | −10 morale for each who voted against; a companion overruled twice leaves at the next town | −5 morale for each whose advice you set aside, if you lead | insubordination: lost pay and standing; a second time is arrest |
| **When morale is low** | they grumble, and follow | they weigh their own role more heavily | they grumble; below 20 one of them leaves | the unit's discipline holds until it breaks |
| **Leaving the company** | part at any town; they wait at the next checkpoint | you may leave; the company goes on by the plan | as for a vote | absence, then desertion (Alpha 7) |
| **If you lead** | you lead in any case | you hold the casting vote | you decide | you give the orders (Raid, Mercenary contract) |
| **Same rule aboard** (Alpha 3 control table) | Hirer or Owner | Company | Company | Under command |
| **Types** | Pilgrimage, Smuggling run, Courier ride, Exile's flight, Arcane errand, Wandering | Quest, Expedition, Refugee flight, Treasure hunt, Monster hunt | Caravan, Embassy, Airship voyage | Military campaign, Raid, Royal progress, Mercenary contract |

### Worked example: Culzan and the road through the forest

Nouileland's journey is a Quest (data). Its name begins with a person who is no town, state,
culture or faith, so Culzan leads it (mixed). The company met at the Gathering in Ma'kan'ji is a
sword-for-hire, a guide and a healer. Quests read through biomes and markers, decide collectively,
and take the hero's journey as their shape.

1. **Leading.** Quests are leader-playable. Following Culzan, the traveller has one voice in four.
   Taking the lead at the start, the traveller holds the casting vote, and the story's choices are
   theirs.
2. **The hooks along the route** (data):
   - *Ma'kan'ji → Hosisiaq*, Sailing boat, 6,115 miles (about 85 days): forest, grassland and
     rainforest coasts of four states; the Ma'kan'ji Portal at the start; pirates; the Shegushean
     Intervention, an invasion zone. Hosisiaq is the seat of the Witnesses of Haqsh'zes.
   - *Hosisiaq → near Grath'tiss → Unzinb*, Sailing Ship, about 4,000 miles: pirates again.
   - *Unzinb → Rhecad*, Rowboat, 5,807 miles at 4 mph for 8 hours a day: about 181 days. Rhecad is
     the capital of the Principality of Rhicie, with markets, a temple and walls, on the Azure lane.
   - *Rhecad → Highgulch → Caven*, on foot, 2,292 miles through temperate rainforest: the
     Westhgrose Boars (brigands), the Steamberg Portal, Dustchpost Bridge, and the Orange Typhoid, a
     disease zone, around Caven, capital of the Raven Empire.
   - *Caven → Sunsirere*, on horseback, 2,980 miles into the taiga: the Dewgbureshi Pinery, a sacred
     grove, and Sunsirere, capital of the Kingdom of Quickia.
3. **The beats** the builder chooses:

   | Beat | Hook |
   |---|---|
   | home | Ma'kan'ji |
   | the call | the Gathering |
   | the threshold | the first sea leg, past the invasion zone |
   | trials and allies | the Witnesses' seat at Hosisiaq; the pirates near Grath'tiss |
   | the ordeal | the 181-day rowing leg, the hardest by far |
   | the reward | walled Rhecad, its market and temple |
   | the road back | brigands and typhoid on the forest road to Caven |
   | the return | the sacred pinery and Sunsirere |
   
4. **A collective decision at Unzinb.** The plan says Rowboat. The companions weigh it by role. The
   guide counts speed: a ship at 10 mph round the clock covers in a day what the rowboat covers in
   seven or eight. The healer counts food: four people rowing for 181 days need over 700 rations, more than
   any skiff can hold. The sword-for-hire counts danger: the Azure lane has pirates, but so has every
   sea on this route. The vote is three to nothing for a ship, if a line runs from Unzinb toward
   Rhecad.
5. **Overruling.** A leading traveller who insists on rowing loses 10 morale with each companion.
   Insisting again at the next fork (say, on the forest road through the typhoid) is a second
   overruling: the healer leaves at Caven, and the company goes on without a healer into the
   disease zone.
6. **Aboard.** On the company's ship the *Company* row of the Alpha 3 control table applies: the
   company's decision rule calls the stops, so a vote can put in at Rhecad early.

### Hook finders

| Layer | Hooks it finds |
|---|---|
| Religion | faith seats on or near the route; borders between faiths; places whose faith differs from their state's; faiths founded from another; crusade and proselytism zones |
| Culture | culture borders; peoples unlike their state; provinces named in another culture's style; the culture's type |
| Biomes | the hardest crossings by effort; changes of biome; wetlands (fever), deserts (water), forests (shelter) |
| Temperature | the coldest nights and hottest days on the route at the season of travel; snow |
| Markers | ruins, dungeons, monsters, shrines, battlefields, portals, libraries, and their notes |
| Markets, goods | price gaps along the route; what the destination buys; scarcity and famine |
| States, military | relations between the states crossed; wars and their dates; regiments near the route; occupied towns; capitals |
| Population | crowded places and empty ones; the largest cities; isolated villages |
| Zones | disease, disaster, invasion, rebels, crusade on or near the route |
| Burgs | walls, citadels, temples, ports, capitals; burg types that disagree with their trade |

A hook is a data fact, its place, how far along the journey it lies (0 at the start, 1 at the
end), its strength, and the beats it can serve.

### The story builder

1. List the route's tiles and checkpoints with their place along the journey.
2. Run the finders for the type's main layers at full weight, and the other layers at a third.
3. For each beat in order, choose the strongest unused hook inside the beat's window that serves its
   function, seeded so that the same world, journey and seed give the same story.
4. Write a story plan: each beat's place, facts (tagged), question and possible outcomes. The
   journal shows the beats behind you, and hints of those ahead.
5. In play, a beat opens when you reach its place, as a scene; its outcome sets flags that later
   beats read. The changing world can rebuild a beat: if a war ends before you reach the front, the
   crisis is rebuilt from what is now there.

### Build steps

1. **Story shapes as data**, with their beats and windows.
2. **Hook finders**, first as a converter report (`python -m azrpg hooks <World>`) that a map maker
   can read. *Check:* on Pyeongak the report finds Durcojhler, the seat of the faith the pilgrims
   keep, at the route's first stop after the sea crossing.
3. **The story builder** and a story page in the journal. *Check:* the same seed gives the same
   story; every beat has a place on the route.
4. **Stop readings** by family (JOURNEYS.md). *Check:* the text test passes for every type.
5. **Movement and leadership**, sharing code with the Alpha 3 control table. *Check:* a vote can
   overrule the player, and a companion overruled twice leaves.
6. **Beat scenes** with outcomes and flags. *Check:* a scripted run of each default shape reaches
   its climax on Pyeongak and Nouileland.
7. **Beats from the changing world:** wars, plagues and famines on the route.

---

## Alpha 6: traffic and knowledge

### What Alpha 2 has

News travels about sixty miles a day and is heard in towns. Rumours become leads. Timetables are
read at harbours and coach offices. The journal keeps the prices you saw. Lenses show the true
world, and the vehicles of the passenger lines are not drawn.

### Control table: what you know, and how old it is

| | Your own eyes | News | Rumours | Timetables | The price book | Charts | Hailing traffic | Letters from your carriers | Companions |
|---|---|---|---|---|---|---|---|---|---|
| **Tells you** | what lies within sight | wars, falls, plagues, closures, famines | leads: marked places, armies, price gaps | sailings and coaches, and whether they run | prices and food for sale where you have been | places, coasts, routes, marked places | the vehicle's timetable and cargo, prices at its last port, its news | what your wagon or boat bought, sold and met | what their trade and home know |
| **Where** | anywhere | in towns | inns, markets, decks, camps | harbours and coach offices | markets you visit | libraries and harbours; traded with captains | on the road or at sea, within a tile | at the town you name | anywhere (Space) |
| **How old** | now | the distance at sixty miles a day | older, the further off | current for that office; others are hearsay | as old as your visit | as old as the drawing | as old as its last port | the carrier's travel time | as old as their last time home |
| **How sure** | certain | true, and late | vaguer and sometimes wrong with distance and cultural difference | right for that office on that day | certain on the day | some are wrong: a missing town, a moved shoal | true for its last port | honest, unless the carrier was robbed | by role: a guide knows roads, a merchant prices, a priest seats of faith |
| **Costs** | nothing | time in town | a drink or an hour | nothing | nothing | coin, or a chart in trade | an hour, sometimes a coin | the carrier's wages | nothing |
| **Ages** | dated when seen; replaced when seen again | dated by the event | becomes a lead; settled when you see the place | lines close and open with war and quarantine | prices drift after your visit | the world changes after the drawing | as the price book | as the price book | as news |
| **Shown in** | the map, the lenses (your chart), the inspector | the journal's news | the journal's leads | the journal and the world map's lines | the journal and the market screen | the lenses | the price book and the news | the journal | advice |
| **Tag** | data | data, dated | mixed | mixed | data, dated | mixed | mixed | mixed | mixed |

### Worked example: is wood worth carrying from Froi to Bres?

1. **Your own eyes and the price book.** Arriving in Froi (Pyeongak), the traveller sees wood at
   🟡 1.54 in the market region, 🟡 1.82 to buy with Froi's 18% tax (data, dated today).
2. **A rumour.** In the inn, a carter says wood sells dear in Bres. Bres is 368 miles away, so the
   word is about six days old (mixed). Bres's region does pay more: 🟡 1.77 (data).
3. **The arithmetic.** Bought at 🟡 1.82 and sold to merchants who pay 85% of 🟡 1.77, each unit
   fetches 🟡 1.50: a loss of 🟡 0.32. The rumour is true and still not worth acting on, because tax
   and the merchants' margin are bigger than the gap. Knowledge (Alpha 6) meets prices (Alpha 4).
4. **Hailing traffic.** Off Froi, a carrier on Wildgemea's runs gives its prices at its last port;
   the price book records them with that port's date. A carrier that has just left Bres knows Bres
   better than any rumour.
5. **News at distance.** Froi lies 732 miles from Slof and 1,845 from Durcojhler: news from Slof
   takes about 12 days to reach Froi, and news from Durcojhler about a month. In Alpha 6, a crew
   that sails off from a beach is news of this kind, heard as late as the distance makes it.
6. **A chart.** Froi's harbour sells a chart of the coast to Bres, drawn some years ago. The lens
   shows the coast as the chart has it; a town founded since is missing from it until you see it.
7. **A letter.** A traveller who owns a boat on the Froi–Bres run (Alpha 3's *Owner* row, with a
   hired skipper) receives a letter at Froi after each run, saying what she carried and sold.

### The systems

| System | Keeps | One rule |
|---|---|---|
| Carriers | the vehicles of every line and trade flow | they move on their timetables and carry stock in batches |
| Your carriers | your own vehicles on runs you set | they trade by your orders and report by letter |
| Charts | what you know of each place, and when you learned it | lenses draw your chart; a chart is dated and may be wrong |
| Rumours of prices | — | made from real gaps between markets, older and vaguer with distance |
| Caches | goods buried in the wild, where and when | marked on your chart only; the longer they lie and the busier the road, the likelier they are found |
| News of the unseen | — | events away from you reach you at news speed |

### Build steps

1. **Carriers** drawn where their timetables put them, carrying stock between markets; a density
   limit and a switch keep the map readable. *Check:* closing a line by war stops its carriers and
   the stock they carry.
2. **Hailing** carriers for timetables, prices and news.
3. **Your own carriers:** a wagon or boat on a run you set, with letters.
4. **Charts:** the dated knowledge of every place; charts bought, traded and sometimes wrong;
   Sandbox keeps a view of the true world.
5. **Rumours of prices** from real gaps.
6. **News of the unseen:** crews sailing off, carriers robbed, towns falling, heard at news speed.

---

## Alpha 7: war

### What Alpha 2 has

Wars in the map are fought out: regiments march, besiege and fall back; towns fall and are
occupied; peace returns them. Talking to the watch of an enemy state holds you for questioning.
Scouting and dispatch errands follow the armies. Raids and campaigns, as journeys, run beside all of
this without touching it.

### Control table: the check

A check has two parts. First, **suspicion**: what the checker sees, as points.

| What the checker sees | Points |
|---|---|
| Your apparent allegiance is the checker's own state or an ally | 0 |
| Your apparent allegiance is neutral, friendly or unknown to the checker | +1 |
| Your apparent allegiance is under suspicion or a rival | +2 |
| Your apparent allegiance is an enemy | +3 |
| A pass or writ from the checker's side or an ally | −1 |
| No papers at all, in a state at war | +1 |
| Dress that does not match the allegiance you claim | +1 |
| Speech that does not match it (broken, or none) | +1 |
| Contraband: arms, the enemy's coin, letters, goods the war has banned | +1 |
| You are a soldier of a side at war with the checker | +1 |
| You are inside a regiment's camp | +2 |
| You are wanted: a deserter, an escaped prisoner, a name in the news | +2 |
| Signs of a faith at war with the checker's, in a crusade zone | +1 |

*Apparent allegiance* is what your papers, dress and flag claim together; where they disagree, the
checker takes the worst of them.

Second, the **outcome**, by the place's alert level and the points:

| Alert | Who checks, and where | 0 points | 1–2 | 3–4 | 5 or more |
|---|---|---|---|---|---|
| Peace | the town watch, only if you call on it | pass | pass | questioned, an hour | searched; contraband taken |
| Tension | gates of border towns | pass | questioned, two hours | searched; contraband taken | detained a day and fined |
| War | gates and harbours of every town of a state at war | pass | questioned, three hours | searched; contraband taken; papers stamped | detained three days and fined |
| Front | gates, harbours and road pickets within 80 miles of a regiment | questioned, an hour | searched; contraband taken | detained a week and fined, or conscripted | arrested |
| Siege | the besiegers' lines outside, the defenders' watch inside | questioned, then let through or turned back | searched and turned back | detained a week | arrested |
| Occupied | the occupier's gates and patrols | questioned, two hours | searched; papers stamped | detained three days and fined | arrested |
| Camp | sentries round a regiment's camp | pass, as one of their own | questioned and escorted out | arrested | arrested and held as a spy |

The outcomes: **questioned** costs hours; **searched** costs hours and any contraband; **detained**
costs days and a tenth of your purse; **conscripted** puts you *under command* (Alpha 3 control
table), where leaving is desertion; **arrested** holds you until you are exchanged, ransomed,
escape, or peace comes; **held as a spy** is arrest that ends only by escape or at peace, with a
loss of standing. At the front and in a siege, a civilian of fighting age (16 to 50) whose apparent
allegiance is the checker's own state or a neutral one may be conscripted when the checker's side
has lost a third of its men.

### Worked example: the gate of Bjerklaus

In Presia, Padamia has been at war with Alverenia since the year 441 (data). Thirty days into the
changing world, Padamia's 2nd (Madran) Regiment, 3,829 men, is marching on the Alverenian town of
Bjerklaus, 63 miles away (mixed). Bjerklaus is walled, has about 2,200 people of Norse culture, and
keeps the Occultism of the Chief of Lightning (data). With a regiment inside 80 miles, its alert is
**Front**. Both warring capitals, Ruela and Alverena, are Astellian; Casteleria is neutral to both
(data).

1. **A Castelerian merchant with arms in his packs.** Neutral allegiance +1, no papers in a state at
   war +1, contraband +1: 3 points. At the front that is *detained a week and fined*; the arms are
   taken. With a pass bought at the Alverenian court in Alverena (−1) he would be searched and lose
   only the arms.
2. **A Padamian soldier in his own colours.** Enemy allegiance +3, a soldier of the other side +1,
   no papers +1: 5 points. *Arrested*, held until exchanged or until peace.
3. **The same soldier as a spy.** Padamians and Alverenians are both Astellian peoples, so his
   speech already matches the allegiance he claims. He buys Alverenian dress in an Alverenian town,
   carries a forged pass (−1) and letters for his colonel (+1). Claiming Alverenia, his allegiance
   costs nothing: 0 points. *Questioned for an hour* and let through. Shared culture makes this war a
   spy's war.
4. **Back to his own camp in the wrong clothes.** At the 2nd (Madran) Regiment's camp, his
   Alverenian dress and pass make his apparent allegiance the enemy's: +3, inside a camp +2, the
   letters +1: 6 points. *Arrested and held as a spy*, by his own side, until his colonel vouches
   for him. Blend in for the gate; change back before the camp.
5. **The traveller as a Bjerklaus local.** A Norse woman of Bjerklaus, Alverenian by allegiance,
   with no papers: own state 0, no papers +1: 1 point. *Searched*. She is a civilian of fighting age
   and her own state's checker could conscript her once Alverenia has lost a third of its men.

### The systems

| System | Keeps | One rule |
|---|---|---|
| Alert | a level for each town and road near a war | from the changing world: regiments, battles, occupation, news |
| Allegiance | what you appear to belong to | papers, dress, speech, faith signs, flag; the worst counts |
| Checks | — | suspicion points against the alert level, read from the control table |
| Camps | each regiment's camp and its reach | a camp check adds two points |
| Service | the unit you serve, its orders | the unit's march is your plan; leaving it is absence, then desertion |
| Blending | dress, speech, rites | dress is bought in a culture's markets; speech grows with days among a people and lessons from companions; rites come from a faith's temples |

### Where they meet

- **Alert and travel.** Lines close and roads are picketed at the front; prices rise (Alpha 4).
- **Allegiance and vessels.** A vessel's flag is part of your allegiance (Alpha 3).
- **Allegiance and writs.** A patron's writ (Alpha 4) lowers suspicion among friends and raises it
  among enemies.
- **Service and stories.** A campaign's beats are its regiment's march, battles and sieges; the
  *Orders* column of the Alpha 5 control table is service.
- **Raids and the world.** A raid raises the target's alert, sends its nearest regiment or fleet in
  pursuit, turns treasury into plunder, and changes relations, all as news (Alpha 6).
- **Occupation and the Beta.** Checks use the occupation the changing world has; claims, control
  and contestation (Beta) later decide who checks whom.
- **Storage and suspicion.** A warehouse keeps a ledger: contraband stored in a town at war is found
  in searches, and goods stored in an enemy town add a point of suspicion when you come to collect
  them. Caches are safe from ledgers and searches, and open to anyone who finds them.

### Build steps

1. **Alert levels** for towns and roads, as a lens and in the inspector. *Check:* alert rises as a
   regiment approaches and falls after peace.
2. **Allegiance and the check**, read from the control table, at gates, harbours and pickets.
   *Check:* the five travellers of the worked example land where the table says.
3. **Outcomes:** detention, conscription, confiscation, arrest, escape, as scenes with costs in
   time, money, standing and the journey's par.
4. **Camps** for every regiment.
5. **Service and desertion**, under the Alpha 3 *Under command* row.
6. **Blending:** dress, speech and rites; spying errands that need them.
7. **Campaigns and raids** that join the wars of the changing world.
8. **Death**, as decided below.

---

## Questions to settle

1. **Death (Alpha 7).**
   (a) No death: the worst outcomes are capture, wounds, robbery and lost time, and the journey
   always goes on.
   (b) Death in war and violence only, with warnings before the risk; the game ends and the record
   can be exported.
   (c) Death with succession, as a difficulty setting: a companion or kin takes up the journey, the
   world keeps the consequences, and the grave becomes a marker.
2. **How many vessel classes (Alpha 3).** Settled for Alpha 3: all eight are built. Small ships,
   galleys and light craft can be withdrawn if they crowd the yards.
3. **How strict checks are (Alpha 7).**
   (a) As the control table stands.
   (b) One band milder by default, with the table as a harder setting.
   (c) A difficulty setting that also sets the starting purse.
4. **Who chooses the story shape (Alpha 5).**
   (a) The type's default, always.
   (b) The player, on the title screen, from the type's alternatives.
   (c) The map maker, by a word in the journey's name.
5. **Your own carriers.**
   (a) In Alpha 6, after carriers on the lines.
   (b) In the Beta, with the growing network.
6. **Starting money (Alpha 4).**
   (a) The plan's cost × the kind's share × √(home prosperity) × 0.75–1.25, as in the money table.
   (b) The same with Alpha 3's wider spread, 0.6–1.4.
   (c) No chance at all: the kind's share and home prosperity only.
7. **Rows that rise in dear towns (Alpha 4).** Alms, portal fees and bounties grow with a town's size
   as well as its wage, so Durcojhler's portal costs 🟡 12 where Alpha 3 asked 7.
   (a) Keep them.
   (b) Let only the wage move them, holding the size term at Alpha 3's value.
