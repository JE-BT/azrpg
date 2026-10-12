# Design notes: Alpha 3 to Alpha 7

These notes set out how the next five versions are built. Each version has one **control table**:
the table its rules are read from, in the way the game already reads stop wordings from a table.
Each control table comes with a worked example on a real map. [ROADMAP.md](ROADMAP.md) gives the
order; [JOURNEYS.md](JOURNEYS.md) is the map maker's view of the narrative engine.

| Version | Subject | Control table |
|---|---|---|
| Alpha 2.1 | fixes: vessels, the hold, sleep (the bridge to Alpha 3) | — |
| Alpha 3 | vessels and control | who decides aboard |
| Alpha 4 | markets | how goods and money change hands |
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

### What the Alpha 2 tests found, and why

- **The goods list is short in large markets.** A town offers only goods it produces itself; the
  town at the centre of a market region offers every good the region holds. The list is then sorted
  by stock and cut to the ten best stocked, so a market centre loses everything below the tenth good.
- **One sale moves the price in every town of the market.** Prices are kept per market region,
  with one stock shared by all its towns.
- **One unit can halve a price.** Each good's target stock is twenty days of the region's own
  supply. For goods the region does not produce, that is a fraction of a unit, so one unit sold
  pushes the price to its floor. Demand from the map's trade deals is computed and then replaced by
  the supply figure.
- **Errands do not touch the market.** Goods for deliveries are bought and delivered outside it.
- **Trade flows are invisible.** The map's deals move stock between markets only when a passenger
  line between them closes.

### Control table: how goods and money change hands

| | Price or amount set by | What moves | Lands first | Spreads | Tax | Limits | You see | Tag |
|---|---|---|---|---|---|---|---|---|
| **Buy goods** | base × scarcity in the region × carriage × local glut | region stock −1 a unit | the town's price rises at once (glut) | the glut passes into the region's stock over a week | the state's sales tax, paid by the buyer | the town makes it or carries it in; stock; your hold | the market screen: price, stock, made here or carried in | mixed |
| **Sell goods** | the same price × 0.85, the merchants' margin | region stock +1 a unit | the town's price falls at once | over a week, as above | none for the seller | someone in the region uses the good; the scarcity floor | today's offer, and what you paid | mixed |
| **Buy food** | the cheapest food in the region, a tenth of a unit per ration, with carriage and tax | the region's food stocks | the town's weekly share for strangers | the region's stock | sales tax | the week's share; season; famine halves it | rations for sale this week | mixed |
| **Delivery errand** | the price gap between the two markets × units, plus distance | giver's region −units at the start; destination +units on delivery | the destination's price falls on delivery | through the destination's region over a week | buyer's tax at the start | deadline; your hold | the errand card, with the gap it rests on | mixed |
| **Relief errand** | the temple: cost and a share | food or salt from a market with stock to a stricken town | the stricken town's price falls and its famine eases | its region | none on temple goods | deadline; the zone must still hold | the errand card | mixed |
| **Carriage** | distance from the market centre: +2% per 100 mi on goods carried in, −1% per 100 mi on goods made here (proposal) | nothing | this town's price | fixed | none | none | "carried in from the centre, N mi" | mixed |
| **Company purse** | the journey type and the company's shares, pooled at the Gathering | coin into a shared purse | shared costs leave your own purse | companions' morale follows how it is spent | none | the shares; a company that breaks up takes its share | the purse line in the journal | mixed |
| **Patron's writ** | a ruler, a temple seat or a guild at a market centre (data) | credit honoured by the patron's friends | towns of states allied or friendly to the patron | relations; a writ is a danger where the patron has enemies (Alpha 7) | the patron's own lands waive it | honoured by allies and friends, refused by others, dangerous among enemies | the writ, in what you carry | mixed |
| **Paid work** | the town's wage × days worked | coin in; days pass | your purse | the plan's par slips | none | days before the plan's departure | work offers on the notice board | mixed |
| **Credit** | a merchant or temple: the rate by standing and distance | coin now; a debt to repay at a named town by a date | your purse | a default lowers standing with the lender's state and faith, and the news travels | none | your standing | debts, with places and dates | mixed |

### Worked example: ten units of wood and one of jewellery at Froi

Froi, in Pyeongak, is a town of about 13,000 people (data) whose market region is centred on
Wildgemea, 484 miles away. The region holds 71 goods; the sales tax is 18%. Froi makes wood, ropes
and tar.

1. **Wood today (Alpha 2).** Base price 🟡 1.54; the region holds 102 units against a target of
   102, so the price is the base. Froi quotes 🟡 1.82 to buy (with tax) and 🟡 1.31 to sell. Selling
   ten units adds ten to the region's stock and drops the price to 🟡 1.47 in every town of
   Wildgemea's region at once.
2. **Jewellery today (Alpha 2).** Base 🟡 44.72; the region makes none, so its target stock is 0.2
   of a unit. One unit sold drops the price to 🟡 22.36, the floor, across the whole region.
3. **Carriage (Alpha 4).** Wood is made in Froi: −1% per 100 miles from the centre gives ×0.952.
   Jewellery is carried in: +2% per 100 miles gives ×1.097 (proposals).
4. **Local glut (Alpha 4).** Each unit you trade moves the town's own price by 0.2 ÷ the
   population in thousands (proposal): 1.5% a unit in Froi, where a village of a thousand would
   move 20%.
5. **Selling the wood (Alpha 4).** The first unit fetches 1.54 × 0.952 × 0.85 = 🟡 1.25; each unit
   after it 1.5% less, the tenth 🟡 1.07; 🟡 11.60 for the ten (rows *Sell goods*, *Carriage*).
   Over the next week the ten units pass into the region's stock at a seventh a day, and the other
   towns' prices drift down to the 🟡 1.47 that Alpha 2 shows at once, while Froi's glut fades.
6. **Pricing the jewellery (Alpha 4).** Demand now comes from consumption (the good's tags and the
   region's population) and the map's deals, and a thin market's target is never below ten units
   (proposal). At the target, Froi's price is 44.72 × 1.097 = 🟡 49.06; a buyer pays 🟡 57.89 with
   tax; a seller gets 🟡 41.70. One unit sold moves Froi by 1.5% at once and the region, after a
   week, by 4.7% (from ten units to eleven).
7. **An errand.** Froi's notice board offers wood for a town that buys it. In Alpha 4 the four units
   leave Wildgemea's stock when you buy them and enter the destination's when you deliver them
   (row *Delivery errand*), so the errand itself lowers the price it was posted on.
8. **Paying for the voyage.** The pilgrims' faith has its seat at Durcojhler, on the route (data).
   Its temple can write a *patron's writ* honoured in states friendly to Madas, or lend against the
   pilgrims' standing, repayable at Chelhazpo (row *Credit*).

### The systems

| System | Keeps | One rule |
|---|---|---|
| Market stock | stock per good, per market region | supply in, demand out, each day, by season |
| Consumption | demand per town | population and the good's tags set how much a town uses |
| Carriage | distance from the market centre | further from the centre, imports dearer and exports cheaper |
| Local glut | your trading per town | it moves the town's price at once and passes into the region over a week |
| Price | — | base × scarcity × carriage × glut × tax |
| Credit | debts and writs | borrowed money, repaid at a stated place and time |

### Where they meet

- **Stock and war.** Closed lines and seized ships starve markets (Alpha 6, Alpha 7).
- **Consumption and zones.** Famine and plague change what a town eats and can spare.
- **Errands and stock.** A delivery draws on one market and adds to another; shortages post
  errands.
- **Credit and politics.** A writ is honoured by friends and dangerous among enemies.

### Build steps

1. **A market screen** listing every good in the region, made here or carried in, with stock,
   price and your last-known price elsewhere. *Check:* every good on Azgaar's goods map for that
   market appears.
2. **Demand** from consumption and deals; targets from demand; the thin-market floor. *Check:* a
   table of price per unit sold for a local good, an import and a luxury stays within set bounds.
3. **Town prices:** carriage and local glut. *Check:* selling ten units in one town moves its
   price at once and its neighbours' over the following week.
4. **Errands that move goods**, and shortages that post them.
5. **Funding a long journey:** company purse, patron's writ, paid work, credit, difficulty levels.

---

## Alpha 5: stories

### The idea

Each journey already has a type, a route, checkpoints and stops. Alpha 5 gives each type a story
shape and fills it from the places where the type's main layers meet along the route. The same
mechanics then read differently: a Rumours stop on a raid turns on the temples' silver and who
guards it; on a pilgrimage, on the shrine and its rites. JOURNEYS.md gives the types' movement
rules, main layers and story shapes, and the full table of stop readings.

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
2. **How many vessel classes (Alpha 3).**
   (a) All eight.
   (b) The five the map's transports need (skiff, boat, ship, great ship, airship), with small
   ships, galleys and light craft in a later version.
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
