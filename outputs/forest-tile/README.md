# My House — Block 001

A single minimal isometric 3D tile based on the supplied neighborhood reference: cream house, coral roof, turquoise windows, a smooth flat lawn, the City car, which you drive yourself (W A S D or arrow keys, Space handbrake, R or the Park button to put it back; on touch screens use the on screen pad), and a small Turkish flag beside the entrance.

## Drive New York (the main page)

The main page is the low poly New York at three times the diorama size (`src/nyc/world.js`), driven with your car (coral). The camera stays close on the car at one fixed zoom (no zoom or pan); where a building hides the car, its outline shows through. Traffic is light (four taxis) and the car bumps into them; sidewalks and the river are solid. The white campus is still at `?world=campus`.
- **Experience Row** (`src/nyc/district.js`): Armin's four companies side by side, oldest to newest, each its own design and a nod to its place: Big Uppetite (Australia) a red brick warehouse with a sawtooth roof and arched windows; AAQ Real Estate (UK) London stone with a slate mansard, dormers, chimneys and a portico; Hindra Studio (Turkey) white terraces with blue arches, planters, a pergola and a blue dome; Rush Graphics (USA) a glass tower with fins and a slanted coral crown. Each shows its name and years. In front: Experience Parking, one bay per company.
- **Park and press Enter**: stopping in a bay shows "Enter · See my experience". The story (`src/world/story.js`) walks oldest to newest, then About: a column rises in each bay sized by the time worked, a card floats in front of each building (role, dates, place, what he did), a 2019 to 2026 timeline fills in on the lot, and the About card shows who he is. Arrow keys or the buttons step; Esc leaves. The car does not move during the story.
- **Skills Street**: twelve small places named after his tools and skills (Figma Café, Behance Restaurant, Photoshop Bakery, React Pizza, Three.js Arcade and more), along the riverside and on the north avenue.
- All facts come from `src/data/profile.js` (his CVs); nothing is invented.

## The corner block (block.html)

A single low poly block on its own page (`/block.html`, `src/block/`): a two storey corner restaurant with striped awnings, glowing shop windows, a sign, café tables, a rooftop terrace with umbrellas and a flat roof with AC units; a road with three vintage cars and four figures in coats and hats; a utility pole, hydrant, lantern, faceted tree, hedge, scooter and manhole. The base shows a dark asphalt layer over pale stone with a wavy line between them. Flat shaded, pastel, ambient occlusion, a soft shadow on a teal backdrop. Drag turns it a little (it eases back), the wheel zooms.

## New York (nyc.html)

New York as one low poly diorama in the corner block's style (`/nyc.html`, `src/nyc/`): the Empire State, Chrysler and One World Trade Center, a dark glass tower, a copper domed tower, the Statue of Liberty on her star fort and the Brooklyn Bridge over the river, brick towers with water tanks, faceted trees, taxis driving the streets and the bridge (one instanced draw call), clouds and the sun. The title shows today's date and the live New York weather (Open-Meteo); the temperature hides if the request fails. Both diorama pages share `src/diorama/stage.js` (view, light, backdrop, shadow) and `src/diorama/kit.js` (low poly modelling and window textures).

## Run

Use Node.js 20.19+ or 22.12+. Run `npm install`, then `npm run dev -- --port 5173`. Open http://127.0.0.1:5173/ . For production, run `npm run build` and `npm run preview`.

## Adjust

The toolbar offers zoom, breeze on/off, and an art-direction panel. Adjust daylight, tree size, roughness, lawn/tree/roof/car colors, or show the design grid. Save a PNG with “Save a view.” Reset restores defaults. Panel changes last for the current page session.

Defaults are in `src/config.js`: palette, lighting, fixed camera, house dimensions, car placement, and tile footprint. `src/home.js` creates the minimal house and Turkish flag; `src/vehicles.js` models the vehicles and `src/car.js` drives them; `src/tile.js` assembles the lawn, driveway, house, car, trees, and entrance path. `src/main.js` controls rendering and the interface.

Vehicles (src/vehicles.js), all original designs in the tile's clean toy style: 1 Hatchback, 2 Sedan, 3 Coupe, 4 SUV, 5 Wagon, 6 Minivan, 7 Taxi, 8 City, 9 Ambulance, 10 Box truck, 11 Dump truck. The page shows only the scene and drives the City car (hardcoded in main.js); there is no picker. `garage.html` shows them all side by side; `car.html?v=N` shows one close up (N from 0). It is not manufacturer CAD. All assets are live 3D geometry, with a local canvas texture for the Turkish crescent and star. No remote models or images are required. Interface fonts have sans-serif fallbacks.

## Modular footprint

One 100 × 100 design-pixel square maps to 10 × 10 world units. The enlarged preview is independent of this footprint. The camera is orthographic at 45° azimuth and 35.264° elevation, with zoom only.

Future tiles snap in 10-unit increments along X/Z. Lawn edges share height 0.12. The south driveway is centered at x=2.2, 2.8 units wide, with surface height 0.145; these values are recorded in `TILE_SPEC`. Only this house tile is implemented.

Static geometry is batched by material. Pixel ratio is capped at 1.75. Breeze targets 30 FPS; shadows update at 6 Hz. Rendering pauses in hidden tabs and runs on demand with breeze off. Reduced-motion preferences disable breeze by default.

The previous forest study was preserved in the workspace's `work/forest-v1/` directory before this redesign. 

## Rendering and engine notes

Stack: Three.js r180 (vanilla, no React), Vite 7, `postprocessing` 6.39.5 (pmndrs composer), `n8ao` 2.0.1 (ambient occlusion). React Three Fiber, drei, Leva, r3f-perf and Rapier were evaluated and not adopted: the app has no React, collision is a handful of static shapes, and each benefit is available directly in Three.js at a fraction of the bundle cost.

- Pipeline: one multisampled HDR scene pass, N8AO from depth (no second scene render; transparency detection off, it cost ~10 ms), one merged pass for tone mapping and sRGB output. Default tone mapping ACES (keeps the established palette); Neutral and AgX in the developer panel.
- Light: `src/world/lighting.js` holds lighting presets (sun by azimuth/elevation, sky, fill, environment, exposure, fog, AO). A prefiltered RoomEnvironment gives soft reflections with no download.
- Quality: `src/quality.js` has High / Balanced / Performance (pixel ratio cap, MSAA, shadow map size, shadow filter taps, AO resolution and samples, decor density). Chosen from the GPU and device, forced with `?quality=`, or set in the developer panel. A frame monitor lowers render scale in small steps with hysteresis and a cool-down, and steps the preset down once if needed (never up automatically).
- Loop: renders at display rate only while something moves or changed; driving runs a fixed 120 Hz simulation interpolated for display, so it feels the same at 60 or 144 Hz.
- World kit: `src/world/units.js` (1 unit = 10 design pixels, tile = 10 units = 100 design pixels, tile origin at its centre, edge connectors), `src/world/vegetation.js` (faceted round and pine trees, instanced meadow scatter with GPU wind and density control).
- Developer tools (dev builds only, stripped from production): a Developer section inside the Workbench (quality, render scale, sun, sky, environment, exposure, tone mapping, shadow softness, AO, fog, decor density, animation speed, colours, saved and exported presets), a stats overlay, and `forestTile.bench(n)` for timed frames.
- Production chunks: app ~46 kB, three ~520 kB, effects ~212 kB (gzip 18 / 132 / 96 kB).

## The map

A square of 81 tiles of 100 x 100 design pixels (9 across, 9 down, 90 x 90 units), numbered 1 to 81 row by row from the north west corner (`src/world/grid.js`); the start plaza is tile 41, in the middle. Add `?tiles` to the URL to see the numbers. Drag to pan, scroll or pinch to zoom; the camera angle never changes and the view follows the car while it drives.

## Driving

W / Up gas, S / Down brake then reverse, A D / Left Right steer, Space handbrake, R back to the parking space. Top speed 9.6 units/s (0 to 4.8 in 0.8 s, to 9 in about 3 s), brakes stop from full speed in about 0.7 s. The car follows its front wheels exactly: tight at low speed (radius about 3 units), wider arcs at speed (about 4.7 at 5 units/s, 7.5 at full speed, where tyre grip caps it and the car runs wide instead of snapping round). Steering eases in and centres quickly; the handbrake lets the rear slide. The camera follows faster as speed rises.

## Road and traffic (tiles 79 to 87)

An east-west road runs across tiles 79 to 87, directly in front of the house; the house driveway joins it at tile 83 (`src/world/roads.js`). Two lanes (right-hand traffic), dashed centre line, sidewalks, zebra crossings either side of the driveway, stop lines and three traffic lights: one for each road direction and one facing the driveway. The road lights cycle green 25 s, yellow 3 s, red 25 s (no timer is shown); the driveway light is green only while the road is red.

Bot cars (`src/world/traffic.js`) use the Intelligent Driver Model: they keep a safe gap to the car ahead (including yours), stop behind the line on red, stop on yellow only when they comfortably can, and pull away on green. Cars leaving the road re-enter at the other end. Your car collides with them and with the light poles. In a 160 s simulated run: no red light violations, minimum gap 1.0 units, peak braking 1.2 units/s².

## Park (tile 98)

Across the road from the house (`src/world/park.js`): a stone fountain on a circular gravel path, four paths out to the tile edges (the north one meets the road's sidewalk), twelve faceted round trees and pines (three per quarter), four benches facing the fountain, four lamp posts, and a trimmed hedge framing the edges with openings at the paths. The car can drive on the grass and paths but collides with trees, benches, lamps, hedges and the fountain.

## Design system: storybook

All colours, light and surfaces come from one set of tokens in `src/world/theme.js`, so every tile shares the look. Storybook is an original style in the spirit of classic animated films: lush, saturated but soft greens; warm golden sunlight with sky-blue fill light in the shadows; cream walls and coral roofs; a soft sky gradient behind the world with faceted clouds drifting slowly over the map; contact shading tinted violet, never black.

## The white campus (current world)

The whole map is one architectural white model (`src/world/campus.js`), in the spirit of a white smart factory maquette: matte white blocks on raised plinths, floor level roads on a pale grid, soft high-key light with cool grey contact shading, and one accent, blue.
- Five hero buildings around the start plaza carry the sections: Work (two finned towers on a podium), Skills (stepped block with a gatehouse and a glass bridge), Contact (ribbed warehouse with trucks and pallets), About (the factory with a blue glass entrance and the ARMIN name plate) and Projects (banded block with an annex).
- Four outer campuses carry the studios Armin worked at (Rush Graphics, Hindra Studio, AAQ Real Estate, Big Uppetite); the quiet blocks hold sheds, solar rows, offices and parking.
- Each labelled building has a floating label card with a signal icon, a blue beam and a slow pulse on its roof (still with reduced motion).
- The plinths are solid: the car drives the roads and the plaza. Static geometry is merged per material (about 70 to 110 draw calls in view).
- All colours and light come from `THEME.campus`, `THEME.palette` and `THEME.light` in `src/world/theme.js`.

## Finding the experience

Work history is never more than one click away (`src/ui/experience.js`):
- An Experience list sits top left (a pill on phones), newest first, with years.
- Picking a job, clicking a studio's building or label, or clicking the Work tower opens one card: role, years and place, with Newer and Older to walk the timeline. Esc or × closes it.
- The camera glides to the studio and holds there until you drive again. Studio labels in the scene also show their years.

## The playground

Toys on the campus roads and plaza, all white, that the car pushes with real physics (`src/world/playground.js`):
- Big white 3D letters spelling ARMIN on the start plaza.
- A row of blocks across the Work road, ten bowling pins with a blue ball, cones along the main road and stacks of crates.
- Bumping something takes a little speed off the car, more for heavier things. Anything pushed off the edge comes back to where it started.
- Bodies sleep until touched, so a still scene costs nothing; shadows refresh only while something moves.

- Street furniture (lamps, benches, bins) topples when hit, rests a few seconds, then floats slowly back to its spot.
- The plinths are solid for the props too.
- Physics is Rapier (`@dimforge/rapier3d-compat`), loaded in the background after the scene shows (about 1 MB gzipped, WASM inlined).

## Feel

All motion shares `src/motion.js`: one smoothing helper, `damp(a, b, lambda, dt) = lerp(a, b, 1 - exp(-lambda*dt))`, and a fixed 1/120 s clock (car, physics, traffic) drawn interpolated between the last two steps. Frame time is clamped to 0.1 s and the clocks reset when the tab is hidden, so nothing ever jumps.
- Car body on spring-dampers: it squats under gas, dives under braking, leans in turns and bounces on hits. The handbrake drift leaves tyre marks that fade out and kicks up dust.
- Camera: a critically damped spring follow with look-ahead along the car's velocity, a slight zoom out at speed and a tiny shake on hard hits (off with reduced motion). Drag pans and wheel or pinch zooms glide to a stop after release.
- Every constant is in `FEEL` (motion.js) and live in the dev build's Feel panel (bottom left), saved per browser.

The earlier harbour district is kept in git history (commit 3bc1d28); its modules are still in `src/world/` for reuse. 
