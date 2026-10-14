# My House — Block 001

A single minimal isometric 3D tile based on the supplied neighborhood reference: cream house, coral roof, turquoise windows, a smooth flat lawn, a pearl-white Tesla Model S that you drive yourself (W A S D or arrow keys, Space handbrake, R or the Park button to put it back; on touch screens use the on screen pad), and a small Turkish flag beside the entrance.

## Run

Use Node.js 20.19+ or 22.12+. Run `npm install`, then `npm run dev -- --port 5173`. Open http://127.0.0.1:5173/ . For production, run `npm run build` and `npm run preview`.

## Adjust

The toolbar offers zoom, breeze on/off, and an art-direction panel. Adjust daylight, tree size, roughness, lawn/tree/roof/car colors, or show the design grid. Save a PNG with “Save a view.” Reset restores defaults. Panel changes last for the current page session.

Defaults are in `src/config.js`: palette, lighting, fixed camera, house dimensions, car placement, and tile footprint. `src/home.js` creates the minimal house and Turkish flag; `src/tesla.js` models the car; `src/tile.js` assembles the lawn, driveway, house, car, trees, and entrance path. `src/main.js` controls rendering and the interface.

The Model S is a stylized procedural model with a fastback profile, panoramic glass roof, flush handles, slim lights, and five-spoke wheels. It is not manufacturer CAD. All assets are live 3D geometry, with a local canvas texture for the Turkish crescent and star. No remote models or images are required. Interface fonts have sans-serif fallbacks.

## Modular footprint

One 100 × 100 design-pixel square maps to 10 × 10 world units. The enlarged preview is independent of this footprint. The camera is orthographic at 45° azimuth and 35.264° elevation, with zoom only.

Future tiles snap in 10-unit increments along X/Z. Lawn edges share height 0.12. The south driveway is centered at x=2.2, 2.8 units wide, with surface height 0.145; these values are recorded in `TILE_SPEC`. Only this house tile is implemented.

Static geometry is batched by material. Pixel ratio is capped at 1.75. Breeze targets 30 FPS; shadows update at 6 Hz. Rendering pauses in hidden tabs and runs on demand with breeze off. Reduced-motion preferences disable breeze by default.

The previous forest study was preserved in the workspace's `work/forest-v1/` directory before this redesign. The active preview uses the Tesla replacement.
