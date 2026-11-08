# azrpg

azrpg turns a world made in [Azgaar's Fantasy Map Generator](https://azgaar.github.io/Fantasy-Map-Generator/)
into a tile-based role-playing game in the style of RPG Maker. You walk, sail and fly across the
map itself: every tile carries the map's biome, height, climate, state, culture, faith, rivers,
roads and markets, and you can read all of it as you go.

Current version: **Alpha 7** (the pivot back to the RPG Maker feel; see `docs/ALPHA7.md`).

Online demo: https://je-bt.github.io/azrpg/

## Play

A built world is a single HTML file. Open it in a recent browser (Chrome, Firefox, Safari or Edge);
nothing else is needed, and games are saved in the browser.

On the title screen, start the map's journey (or choose another journey in the world), explore
freely without one, or continue a saved game. Then choose a traveller: each kind is drawn from the
map (natives of the places on the route, soldiers of states at war, envoys, traders, scholars,
refugees, and the roles of the journey's own type).

### How it plays

- **Time follows your actions.** A step costs its hours (terrain, road, river, weather, the dark,
  your condition); standing still costs nothing. Camping, sleeping at an inn and waiting skip ahead.
- **Towns open when you step into them**: inn, market, temple, harbour or coach office, notice
  board, warehouse, stables, and the people who live there. Ask anyone about your journey: the
  harbourmaster finds a sailing, the merchant reckons your food, the watch knows the borders, the
  priest the faiths, the townsfolk the way.
- **The journey is your quest log.** Its checkpoints are quest steps; what the plan does at each stop
  (book passage, give alms, rest, gather the company) appears as ★ in that town.
- **Journeys.** Book a passage or a coach, or plan a journey yourself with F and walk or sail there on
  your own. Boarding and arriving play as a scene in the viewing window; under way you watch the
  world map, and Space pauses with the journey's options.
- **The company speaks** when you are tired, hungry, low on food or out after dark.
- **The living world runs on**: markets, passenger lines, disease and the map's wars. You hear of it
  from innkeepers, timetables and notice boards.
- **The atlas** fills as you travel: peoples, faiths, realms, towns, trade, marked places and lands.

### Keys

| Key | Action |
|---|---|
| Arrows / WASD | Walk one tile; aboard your own vessel, steer |
| Space / Enter | Whatever is here: a town, a marked place, your vessel; on a journey, its options |
| F | Plan a journey (on a journey: its options) |
| R | Camp, wait, fish or forage |
| L | Look around: the land, and the hours a step takes each way |
| V | The viewing window |
| Esc · M · J · I | The menu: Status, Items, Journal, Map, Atlas (1 to 5 inside it) |
| + / − | Zoom |
| H | How to play |

On the Map tab, arrows move a cursor; Enter plans a journey there and W marks it. In the Journal,
Enter sets out for a quest step or tracks a side quest.

### Tags

Text in the game is tagged: **data** is read from the map, **mixed** is a stated rule applied to
the map (an interpolated height, a price with tax), **new** is made up for the game (a traveller's
name, an innkeeper).

## Build a world

Requirements: Python 3.10 or later with `numpy`, `scipy` and `Pillow`.

From Azgaar's generator, save the map (`.map`) and export the cells (Export → GeoJSON → Cells). Put
both in a folder named after the world, next to this folder:

```
Azgaar/
  azrpg/            this project
  MyWorld/
    MyWorld 2026-10-08-12-00.map
    MyWorld Cells 2026-10-08-12-01.geojson
```

Then, from `azrpg/`:

```
python -m azrpg build MyWorld          # writes out/MyWorld_rpg.html
python -m azrpg build MyWorld --map "MyWorld 2026-10-08-12-00.map"
```

The newest `.map` is used unless `--map` is given. The Cells export is matched to the map by its
content, so its file name does not matter. Maps saved by Azgaar 1.153 and 1.154 are supported.

**Tile size.** Tiles follow the map's grid overlay (Style → Grid) when its cells are between 1 and
20 miles across; otherwise tiles are 5 miles square. A square overlay lines the game up exactly with
the map.

**Journeys.** Every journey in the map can be played; the title screen offers the first and lets you choose another. See
[docs/JOURNEYS.md](docs/JOURNEYS.md) for how journeys are read and how to write your own.

## How the map becomes a game

| Layer | Source |
|---|---|
| Cell per tile | the Cells export, at each tile's centre |
| Land and water | the map's own coastline and lake outlines |
| Height per tile | the map's height grid, interpolated |
| Temperature, rain | the map's climate grid |
| Mountains, hills | the map's relief rules |
| Trees, grass, dunes | each biome's icons and density |
| Rivers | each river's course; boats use rivers above 40 m³/s, ships above 400 m³/s |
| Roads, trails, sea lanes | the map's routes |
| Towns, markers, armies, fleets | the map's burgs, markers and military |
| Production and trade | Azgaar's production formula and the map's trade deals |
| Journey | the map's journey: segments, transports, speeds, stays |

## Project layout

```
azrpg/      converter (Python): reads the map, builds tiles, writes the world pack and the HTML
engine/     the game (JavaScript), one module per file, joined in name order
  shell.html
  src/00_util.js … 36_atlas.js   (module map in docs/ALPHA7.md)
tests/      converter tests (Python) and the game test (Node); legacy/ holds the Alpha 1 to 6 tests
docs/       Alpha 7 design notes, journeys key, roadmap; legacy/ holds the Alpha 6 documents
```

## Tests

```
python -m unittest discover -s tests -t .      # converter; needs the Pyeongak world
node tests/alpha7.js out/Pyeongak_rpg.html     # a journey played headless: towns, quest help, a booked
                                               # voyage, a journey of your own, the atlas, save and load
node tests/alpha7.js out/Bernoy_rpg.html       # the same on a raid: the company's own vessel
```

The Node test uses only Node; the drawing code is not exercised.

## Credits

Worlds come from Azgaar's Fantasy Map Generator. Name lists are Azgaar's namebases (MIT licence),
and names are generated with Azgaar's own method. Town maps and dwellings are not part of azrpg.
