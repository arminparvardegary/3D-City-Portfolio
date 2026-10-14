# My House — Block 001

A single minimal isometric 3D tile based on the supplied neighborhood reference: cream house, coral roof, turquoise windows, a smooth flat lawn, the City car, which you drive yourself (W A S D or arrow keys, Space handbrake, R or the Park button to put it back; on touch screens use the on screen pad), and a small Turkish flag beside the entrance.

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

150 tiles of 100 x 100 design pixels (15 across, 10 down), numbered 1 to 150 row by row from the north west corner (`src/world/grid.js`). The house is tile 68; every other tile is a plain grey block showing its number, waiting for its own content. Drag to pan, scroll or pinch to zoom; the camera angle never changes and the view follows the car while it drives.

## Driving

W / Up gas, S / Down brake then reverse, A D / Left Right steer, Space handbrake, R back to the parking space. Top speed 9.6 units/s (0 to 4.8 in 0.8 s, to 9 in about 3 s), brakes stop from full speed in about 0.7 s. The car follows its front wheels exactly: tight at low speed (radius about 3 units), wider arcs at speed (about 4.7 at 5 units/s, 7.5 at full speed, where tyre grip caps it and the car runs wide instead of snapping round). Steering eases in and centres quickly; the handbrake lets the rear slide. The camera follows faster as speed rises.

## Road and traffic (tiles 79 to 87)

An east-west road runs across tiles 79 to 87, directly in front of the house; the house driveway joins it at tile 83 (`src/world/roads.js`). Two lanes (right-hand traffic), dashed centre line, sidewalks, zebra crossings either side of the driveway, stop lines and three traffic lights: one for each road direction and one facing the driveway. The road lights cycle green 25 s, yellow 3 s, red 25 s (no timer is shown); the driveway light is green only while the road is red.

Bot cars (`src/world/traffic.js`) use the Intelligent Driver Model: they keep a safe gap to the car ahead (including yours), stop behind the line on red, stop on yellow only when they comfortably can, and pull away on green. Cars leaving the road re-enter at the other end. Your car collides with them and with the light poles. In a 160 s simulated run: no red light violations, minimum gap 1.0 units, peak braking 1.2 units/s².

## Park (tile 98)

Across the road from the house (`src/world/park.js`): a stone fountain on a circular gravel path, four paths out to the tile edges (the north one meets the road's sidewalk), twelve faceted round trees and pines (three per quarter), four benches facing the fountain, four lamp posts, and a trimmed hedge framing the edges with openings at the paths. The car can drive on the grass and paths but collides with trees, benches, lamps, hedges and the fountain.
