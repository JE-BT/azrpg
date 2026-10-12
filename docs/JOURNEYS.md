# Journeys

azrpg plays the first journey saved in an Azgaar map. This page explains how a journey is read, so
that you can design one that plays well.

Most of the page describes the game as it is (Alpha 2.1). Parts marked **(Alpha 3)** or
**(Alpha 5)** describe what those versions add: vessel classes in Alpha 3, and in Alpha 5 a
narrative engine that gives each journey a story built from the map. The design behind them is in
[DESIGN.md](DESIGN.md).

## The parts of a journey

A journey is a list of segments. A segment with the transport **Stay** is a stop: the company
spends that many hours in a place. Any other segment is a leg: travel by that transport, at its
speed and hours per day, along the segment's points.

In the game:

- Each place where a leg ends becomes a **checkpoint**, with a **par time** worked out from the
  plan: legs at their transport's speed and hours per day, stops for their hours, starting at dawn
  on Day 1.
- The stops at a checkpoint become its **tasks** (marked ★). The player does them in person.
- The player may take any route and any means. Arriving at the last checkpoint completes the
  journey. Going straight into a later town skips the checkpoints between.
- The plan's course is drawn as a gold line. Aboard your own vessel, F follows it to the next
  checkpoint from wherever you are.

The journey starts where its first segment begins: in a town, or in the wilds if no town is there.

Par follows the plan's hours per day. Crews that stop at night sail only the daylight hours, so a
winter leg at high latitude runs well behind par; the journal shows how far.

## Journey types

The journey's type sets the tone, the travellers offered, the size and roles of the company met at
a Gathering, and the reason given for the destination. In Alpha 5 it also sets how freely the
player moves, whether the player may lead, which layers of the map the story is built from, and the
story's shape.

| Type | Company met at a Gathering | Own vessel for water and air legs | Free movement (Alpha 5) | Leader playable (Alpha 5) |
|---|---|---|---|---|
| Pilgrimage | fellow pilgrim, guide | no | yes | yes |
| Quest | sword-for-hire, guide, healer | no | collective decision | yes |
| Caravan | caravan master, guard, drover, cook | no | the leader decides after discussion | yes |
| Military campaign | sergeant, scout, surgeon, quartermaster | yes | orders | no |
| Embassy | ambassador, secretary, guard | no | the leader decides after discussion | yes |
| Raid | raider, scout, steersman | yes | orders | yes |
| Smuggling run | fence, lookout | yes | yes | yes |
| Courier ride | (rides alone) | no | yes | alone |
| Expedition | surveyor, naturalist, porter | yes | collective decision | yes |
| Refugee flight | elder, neighbour, child | no | collective decision | yes |
| Treasure hunt | map-reader, digger | no | collective decision | yes |
| Monster hunt | tracker, hunter, trapper | no | collective decision | yes |
| Exile's flight | loyal servant | no | yes | alone |
| Royal progress | courtier, herald, guard, chamberlain | yes | orders | no |
| Airship voyage | aeronaut, rigger, navigator | yes | the leader decides after discussion | yes |
| Arcane errand | apprentice | no | yes | alone |
| Mercenary contract | captain of the company, sergeant, archer | yes | orders | yes |
| Wandering | (alone) | no | yes | alone |

If the type is missing, it is guessed from the journey's name. A name that begins with a person
("Culzan and the road through the forest") makes that person the company's leader, provided the
name is not also a town, state, culture or faith.

**Free movement (Alpha 5).** *Yes:* you go where you like. *Collective decision:* at each fork the
companions weigh the choice by their roles, and overruling them costs morale. *The leader decides
after discussion:* the companions advise and whoever leads decides. *Orders:* the company follows
its orders, and leaving them is desertion. **Leader playable:** with *yes*, you may take the
leader's place at the start; with *no*, the leader is a companion; *alone* means there is no company
to lead.

## How a journey's story is built (Alpha 5)

Each type reads the map through a few **main layers**. Where those layers meet along the route, the
story finds its hooks: a faith border on a pilgrimage, a price gap on a caravan, a regiment on a
campaign's road. The **story shape** puts the hooks in order. Other layers still colour the scenes.

| Type | Main layers | Story shape | Other shapes |
|---|---|---|---|
| Pilgrimage | religion, culture | the hero's journey | the long voyage |
| Quest | biomes, markers | the hero's journey | slay the dragon, the chase |
| Caravan | markets, goods, culture | the long voyage | three acts |
| Military campaign | states, military | three acts | siege |
| Embassy | states, culture | mystery | three acts |
| Raid | culture, religion, population | five rooms | three acts |
| Smuggling run | markets, goods, states | the chase | mystery |
| Courier ride | burgs, biomes, temperature | three acts | the chase |
| Expedition | biomes, culture, markers | the marches | the long voyage |
| Refugee flight | zones, states, population | three acts | the underdog |
| Treasure hunt | markers, goods, biomes | nodes | five rooms |
| Monster hunt | markers, biomes | slay the dragon | mystery |
| Exile's flight | states, military, culture | the underdog | the hero's journey |
| Royal progress | states, burgs | the long voyage | mystery |
| Airship voyage | markets, goods, burgs | the long voyage | three acts |
| Arcane errand | religions, states | mystery | nodes |
| Mercenary contract | states, culture, religion | three acts | siege |
| Wandering | biomes, temperature | the marches | the long voyage |

The shapes, in brief:

- **Three acts:** a hook at the start, complications on the legs, a turn at the middle checkpoint,
  a crisis on the last leg, the climax at the destination.
- **The hero's journey:** home, the call, the threshold (the first border or the first sea leg),
  trials and allies, the ordeal on the hardest leg, the reward, the road back, the return.
- **Five rooms:** the guardian at the way in, an obstacle, a setback, the climax, the reward.
- **The long voyage:** a self-contained episode at each port or checkpoint, held together by the goal.
- **The marches:** fragments of a history placed in the land, gathered in any order; the last one
  waits at the destination.
- **Slay the dragon:** a threat that grows nearer the route, preparation, the lair, the fight.
- **The chase:** an object on the move, rivals after it, clues in towns, a race.
- **Mystery:** a happening, places to question, suspects from the factions on the route, a hidden
  hand, the backstory, the revelation.
- **Nodes:** places that each hold part of an answer, in any order; the end opens when enough are
  found.
- **Siege:** a place under pressure, preparation, days of attack, a turning point, the outcome.
- **The underdog:** a weak start, allies gathered from the aggrieved, small victories, a rising.

## Stops

The stop's wording decides its task. Words are matched anywhere in the stop's name; a stop can
carry more than one task.

| Wording | Task |
|---|---|
| Gathering, Muster, Meet | meet the company |
| Rumours, News, Tidings | listen for rumours; they become leads, with the reasons for the next leg |
| Booking passage, Waiting for a ship, Hire | book a passage or hire a boat at the harbour |
| Loading, Embark, Board, quay | load and board the company's own vessel for the next leg |
| Resupply, Supplies, Provisions, Market | buy supplies at the market |
| Alms | give alms at the temple |
| Rest, Shelter, Inn, A night at (an inn) | take a room at the inn |
| Camp | camp there |
| A night near, Stopped near, at anchor | camp, or anchor if the place is at sea |
| Bounty, Reward, Contract, Commission, Writ | sign it: an advance now, the reward on proof |
| anything else | spend the stop's hours in the town |

### How each stop reads (Alpha 5)

The task stays the same; what it is about follows the type's first main layer. The types fall into
five families:

| Family | Layers | Types |
|---|---|---|
| Faith | religion, culture | Pilgrimage, Raid, Arcane errand |
| Trade | markets, goods | Caravan, Smuggling run, Airship voyage |
| Power | states, military | Military campaign, Embassy, Exile's flight, Royal progress, Mercenary contract |
| Land | biomes, markers, temperature | Quest, Expedition, Treasure hunt, Monster hunt, Wandering |
| People | population, zones, burgs | Refugee flight, Courier ride |

The family says what a stop is about; the type says why the company cares. A Rumours stop on a
pilgrimage and on a raid both turn on shrines and temples: the pilgrims want the rites, the raiders
want the silver and who guards it.

| Stop | Faith | Trade | Power | Land | People |
|---|---|---|---|---|---|
| Gathering | the company meets at a temple or an elders' house: vows, rites, who vouches for whom | the company musters at the market: shares, cargo, beasts and wagons | the company assembles under orders or credentials: the order of march, papers, precedence | the company meets its guide: what is known of the way and the gear it needs | the household and neighbours gather: who comes, who stays, what is carried |
| Rumours | shrines, feasts, heresies, temple wealth and who guards it, on the road ahead | prices, shortages and gluts in the markets ahead; cargoes and carriers | armies, alliances, quarrels at court, closed borders | beasts, ruins, weather, hard ground and the ways round it | who has fled where, which towns take strangers, sickness and famine |
| Booking passage | pilgrim ships and passages given as alms; the captain's faith | freight space and its price; the captain's own trade | passage under a writ or a flag; friendly states' ships first | a local boat and a pilot who knows the water | crowded boats, the price of a place, who is turned away |
| Loading | the vessel blessed and the omens read | the cargo stowed and counted | troops or household embarked in order, flags and papers checked | stores for the unknown: water, tools, spares | who fits aboard, and what is left on the quay |
| Resupply | hospitality from those of the same faith; alms-food | buying here what sells further on | requisitions and the quartermaster's due | what the land gives: forage, game, fish, water | charity, barter, work for food |
| Alms | the rites of the faith at its temple | a tithe for safe conduct; the merchants' chapel | gifts that win a court's or a garrison's favour | offerings at the shrines of the land and its marked places | charity given, or received |
| Rest | the faith's hostel, and a night's vigil | the caravanserai, where traders swap prices | billets in a garrison or a lord's hall | a refuge hut; gear mended and dried | barns and back rooms, and the fear of being turned out |
| Camp, a night near, at anchor | a vigil at a holy place under the open sky | wagons circled and goods under guard | a fortified camp with sentries | camp as the ground allows: shelter, water, fuel | a hidden camp, small fires, a watch against thieves |
| Bounty and the like | a vow or a penance laid on the company | a commission to buy, sell or carry | a writ or commission from a ruler | a bounty on a beast, or a reward for a find | a debt, or a promise to someone left behind |
| Anything else | the stop's own name, filled with the faith and custom of the place | the stop's own name, filled with the place's markets | the stop's own name, filled with the place's rulers and soldiers | the stop's own name, filled with the land around | the stop's own name, filled with the place's people |

The story shape decides which stops carry its beats. In three acts, the first Rumours stop carries
the hook; in a mystery, every Rumours stop is a place to question; in the long voyage, each port's
stops are that port's episode.

## Transports

Transports come from the map's own list (Options → Transports), with their speed, hours per day
and domain.

- **Land** transports walk or ride overland.
- **Water** transports follow navigable water: the sea, lakes, and rivers wide enough for them
  (boats from 40 m³/s, ships from 400 m³/s). Ships call at harbours within a few miles of a town;
  boats also reach river towns.
- **Air** transports fly over land and sea and moor at towns. A **Teleport** leg is crossed at
  once.
- A booked ship or coach keeps its own timetable; a hired boat is the player's to steer; the
  company's own vessel (after a loading stop, or for the types marked above) is boarded at the
  quay with no fare.
- Your own vessel has a hold. Going ashore, you carry what you can on foot and the rest stays
  aboard; any hands left with her eat from it, and wait as long as food and patience allow.
- In Alpha 2.1 every boat leg, the Rowboat included, is sailed in a hired sailing boat with three
  hands. **(Alpha 3)** Each transport takes a vessel class: the Rowboat becomes a skiff you row
  yourself, the Sailing boat a boat, the Sailing Ship and Steamship a ship, the Modern Ship a great
  ship, the Dirigible an airship. Classes set the crew, the hold, the rivers she can use, where she
  can stop, the water she prefers and how she meets a storm. Her name and look come from the
  culture of the port that built her.

## Tips

- Put a stop at the start of a sea leg (booking, waiting for a ship, or loading) so the player
  knows how the company will travel.
- Name stops after what happens there; the wording above is what the game understands.
- Long sea legs in small boats need food: towns sell only part of their stock each week, so plan
  stops at ports along the way. A boat's crew sailing by day covers far less in winter than the
  plan's hours per day suggest.
- Very long legs in small craft (a rowboat leg of thousands of miles) are possible, and the
  player will look for another way. In Alpha 5 such a leg is read as the journey's ordeal.
- **(Alpha 5)** Put stops where the type's main layers meet: a Rumours stop where two faiths meet
  on a pilgrimage, a Resupply stop at a market that buys what a caravan carries, a Camp near a
  regiment on a campaign. The story finds these meetings on its own; a stop there gives the player
  a place to act on them.
