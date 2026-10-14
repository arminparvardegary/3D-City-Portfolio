# My House — Block 001

A single minimal isometric 3D tile based on the supplied neighborhood reference: cream house, coral roof, turquoise windows, a smooth flat lawn, a vehicle you choose from a numbered list of 13 and drive yourself (W A S D or arrow keys, Space handbrake, R or the Park button to put it back; on touch screens use the on screen pad), and a small Turkish flag beside the entrance.

## Run

Use Node.js 20.19+ or 22.12+. Run `npm install`, then `npm run dev -- --port 5173`. Open http://127.0.0.1:5173/ . For production, run `npm run build` and `npm run preview`.

## Adjust

The toolbar offers zoom, breeze on/off, and an art-direction panel. Adjust daylight, tree size, roughness, lawn/tree/roof/car colors, or show the design grid. Save a PNG with “Save a view.” Reset restores defaults. Panel changes last for the current page session.

Defaults are in `src/config.js`: palette, lighting, fixed camera, house dimensions, car placement, and tile footprint. `src/home.js` creates the minimal house and Turkish flag; `src/vehicles.js` models the vehicles and `src/car.js` drives them; `src/tile.js` assembles the lawn, driveway, house, car, trees, and entrance path. `src/main.js` controls rendering and the interface.

Vehicles (src/vehicles.js), all original designs in the tile's clean toy style: 1 Hatchback, 2 Sedan, 3 Coupe, 4 Sports, 5 SUV, 6 Wagon, 7 Roadster, 8 Minivan, 9 Taxi, 10 City, 11 Ambulance, 12 Box truck, 13 Dump truck. `garage.html` shows them all side by side; `car.html?v=N` shows one close up (N from 0). It is not manufacturer CAD. All assets are live 3D geometry, with a local canvas texture for the Turkish crescent and star. No remote models or images are required. Interface fonts have sans-serif fallbacks.

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
