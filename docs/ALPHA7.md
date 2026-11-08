# Alpha 7: the pivot

Alpha 7 rebuilds azrpg around the classic RPG Maker loop: walk the tiles, enter towns, talk to
people, board a ship, watch the world go by. It follows the pivot plan (tile-stepped time, a menu
overlay, the journey as a quest log, data-driven towns, journey scenes, the living world surfaced
through people, and the atlas) with four decisions settled during the build:

1. The engine is allowed to grow past 4,000 lines so that the warehouse, stables, porters and army
   errands survive. It came out at about 6,400 lines: about 4,000 in the kept libraries after their
   superseded code was removed, and about 2,400 new.
2. The atlas is built now, as the fifth menu tab.
3. Towns open when you step into them. A journey under way passes through towns that are not its end.
4. Fast travel is folded into the journey system. Besides booked journeys (passages, coaches, the
   company's own craft) you can plan a journey yourself (F): choose where to, and you walk, ride or
   sail there on your own, with the same scenes and the same options under way.

## Time

The clock is a number of hours. A step adds its hours at once (terrain, road, river, weather, the
dark, your condition); a choice that takes time adds its hours; standing still adds nothing. Dawn
and dusk come from latitude and day of the year. Wait commands (camp until dawn, rest, wait until
the ship sails) skip forward. Nothing ticks on its own: the frame loop only plays out what the clock
already holds, and moves a vehicle you are riding one tile at a time.

## Journeys

A journey is either booked or planned.

| | Booked | Planned by you |
|---|---|---|
| Who steers | the captain, driver or pilot | you, or your crew on the course you set |
| How it starts | book at a harbour or coach office; board; it leaves on its timetable | F, or Enter on the map or in the Journal |
| Start and end | a scene: the viewing window fills the screen and the captain speaks | a scene: a companion (or your mate) speaks; alone, you think it aloud |
| Under way | the vehicle moves on the world map; Space pauses with options | you move on the world map; Space pauses with options |
| Options | talk to the captain or passengers, supplies, rest, sleep, days pass until the next port, get off at the next port, pace | carry on, pace, camp or anchor until dawn, supplies, talk to a companion, stop here |
| Interruptions | storms, shipboard events, port calls | night (camp?), the crew's stops, storms, events, a blocked way |

The map's own journey is the main quest. Its checkpoints are quest steps; the tasks the plan does
at each stop (book passage, give alms, rest, gather the company, read the bounty, spend a stay)
appear as ★ options in the town where they are done.

## Towns and people

The town menu lists places (inn or hearth, market, temple or shrine, harbour or coach office, notice
board, warehouse, stables, marked places nearby) and people (harbourmaster, merchant, the captain of
the watch or the elder, townsfolk; the innkeeper and priest are inside the inn and temple). Each
line has a detail column and a help line drawn from the data. Anyone can be asked about the journey
or a side quest:

| Who | What they help with |
|---|---|
| Harbourmaster | sailings from here to the destination or nearest to it, refusals by flag, hiring a vessel |
| Merchant | days and rations for the way, the price of food here, whether the town can spare it; what is worth trading |
| Watch or elder | the states the way crosses and how they stand to you, zones on the way |
| Priest | the faith kept at the destination, whether it is a seat, your standing |
| Innkeeper, townsfolk | direction and distance, the land on the way, whether a road goes there, marked places passed |

## Module map

| File | Origin | Role |
|---|---|---|
| 00 util, 01 core, 02 art, 03 render | kept | utilities, world data, 16 px art, tile renderer |
| 04 clock | from 04_story | clock, tags, the journey reader, air transports |
| 05 know | from 04_story | the text layer: describe, survey, rumours |
| 06 game | rewritten | state, saves, checkpoints, tile-stepped movement, the loop |
| 07 events | kept | travellers, effects, marker and zone scenes |
| 08 nav | kept, air added | navigation, harbours, courses, checkpoints, weather, prices |
| 09 travel | kept, stripped | days, sleep, crews, storms, booked voyages, boarding |
| 10 quests | kept | side quests, notice boards, why the route goes as it does |
| 12 provisions | kept | fishing, foraging, shipboard events, camp and wait |
| 13 sim | kept | the living world: markets, lines, disease, war, news |
| 14 living | kept, trimmed | the simulation in play: news, timetables, sim harbour and market |
| 15 carry | from 15_journeys, 16_stops, 18_carry | journey types, traits, the company and its voice, the hold, camp, shipwreck |
| 20 vessels, 21 markets | kept | vessel classes and control, warehouse, stables, shipwright; the price field |
| 30 ui | new | message box and command windows |
| 31 towns | new | town menus, people, quest help, merchant advice |
| 32 quests | new | the quest log, objectives, the journey's own transport |
| 33 viewwin | kept | the viewing window |
| 34 scene | new | journey scenes, booked and planned journeys, Space menus, Look, events on approach |
| 35 shell | new | boot, input, HUD, minimap, the menu tabs, title screen |
| 36 atlas | new | the atlas pages |

## Departures from the plan

- **14_living is kept.** The plan listed it as "town people"; it is the wiring that brings the
  simulation to the player (news, timetables, the harbour and coach office, market food stocks,
  army errands). It is trimmed, not cut.
- **Parts of 04_story, 15_journeys, 16_stops and 18_carry are kept** inside 04, 05 and 15: the
  clock, the journey reader and the text layer, and the helpers the libraries call (riding, camp,
  shipwreck, the hold, going ashore, journey types and traits).
- **Lenses** remain on the Map tab only (biome, height, state, culture, faith and so on). The tile
  view has none.
- **Look (L)** shows the tile and the hours a step takes each way, with the full survey of map data
  one choice away: this is the plan's informational query.
- **Events** at marked places fire when you walk up to them (within one tile), once each; hazards
  keep their own radius. Event choices play as scenes with the viewing window.

## Known issues

- Long legs in small boats can outrun the hold: Bernoy's raid sends a skiff (20 rations) on a
  5,296-mile leg, and the crew starves well before arrival.
- Harbour timetable lines wrap untidily on narrow windows.
- The inn quotes the hours until the next dawn, which is a full day if you arrive just after sunrise.
- V and other shortcut keys do nothing while a message box is open.
