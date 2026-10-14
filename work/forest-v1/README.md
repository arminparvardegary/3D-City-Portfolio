# A little clearing — Forest tile 01

A single live Three.js forest tile, implemented from the full Markdown brief and both reference images embedded in the PDF. This is the art-direction prototype only.

## Run

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev -- --port 5173
```

Open http://127.0.0.1:5173/ . Production: `npm run build`, then `npm run preview`.

## Adjust

The preview toolbar provides zoom, a breeze toggle, and an art-direction panel. The panel adjusts daylight, canopy fullness, material roughness, meadow/leaf/roof colors, and the grid overlay; it can export a PNG and reset defaults. Changes in the panel last for the current page session.

`src/config.js` holds the default palette, material settings, camera, lighting, vegetation, seed, and footprint. `src/house.js`, `src/trees.js`, and `src/tile.js` contain reusable procedural assets and the composition. All geometry is real 3D; there are no pre-rendered scene images or remote model dependencies. Fonts use Google Fonts, with local sans-serif fallbacks.

## Design and modularity

- One 100 × 100 design-pixel footprint maps to 10 × 10 world units. The preview enlarges it independently.
- The orthographic camera uses 45° azimuth and 32° elevation to follow the house reference. Its direction is locked; preview zoom does not orbit the scene.
- Tile borders share a height of 0.28. Future tiles snap by 10 world units on X/Z; the south path exits at x=1.65 with width 1.3. `TILE_SPEC` describes these connectors.
- Pale plaster, timber, individually modeled curved terracotta tiles, recessed windows, a cottage garden, four branching trees, ferns, flowers, stones, and a small fallen log.
- User refinements: a continuous, smooth meadow with sparse edge tufts; natural leaf geometry rather than faceted or spherical tree crowns.
- Soft daylight shadow filtering, ambient occlusion, procedural bump textures, and subtle foliage movement.

## Rendering

Static geometry is batched by material. Leaf geometry is merged per crown. The canvas pixel ratio is capped at 1.75; animation targets 30 FPS, shadows update at 6 Hz, and the scene stops rendering while the tab is hidden. Pausing the breeze enables rendering only when a setting changes. Reduced-motion preferences disable breeze by default. No orbit controls, character movement, gameplay, portfolio sections, or backend are included.

Only one tile is rendered. Connector dimensions are prepared for expansion; neighboring-tile art and seams have not yet been visually approved.
