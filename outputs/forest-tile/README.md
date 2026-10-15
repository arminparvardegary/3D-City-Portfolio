# Armin's New York

A portfolio you drive. A small night-time New York in the browser: park in front of each of my
companies and press Enter to see what I did there, visit Keel, choose a car in the Lux Garage and cross
the bridge to Brooklyn.

Live: https://forest-tile.vercel.app

## Play

| Key                 | Does                                           |
| ------------------- | ---------------------------------------------- |
| W A S D / arrows    | Drive                                          |
| Space               | Handbrake                                      |
| Command             | Front brake                                    |
| Q / E (both: back)  | Look left / right                              |
| V                   | Camera: chase, far, hood                       |
| H                   | Horn (sirens on police cars and the ambulance) |
| Enter               | Open the place you are parked at               |
| M (hold) or the map | Map: click a place to drive there              |
| N or the note       | Music on / off                                 |

## Run it

Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

Open http://127.0.0.1:5173. For a production build: `npm run build`, then `npm run preview`.

## How it is built

Three.js, no game engine. Everything is made in code; the only model files are the cars.

- **City** (`src/nyc/drive/layout.js`, `build.js`): the street plan, then roads with lane markings,
  crosswalks, traffic lights, sidewalks with curbs, lamps, trees and buildings from it.
- **Places** (`src/nyc/world.js`, `src/stores/`, `src/nyc/lux.js`): my four companies' stores, Keel,
  the Brooklyn boutiques, Rankd and the Lux Garage. Each has a parking bay; its card is in
  `src/ui/visit.js` and the facts in `src/data/profile.js`.
- **Cars** (`src/cars/models.js`, `src/car.js`): 21 low-poly models, each with its own speed, power,
  brakes, grip, weight and engine sound. The physics is a body-sized box against exact colliders, the
  car stands on its axles with suspension on every wheel, and every move is checked along its path.
- **Traffic** (`src/nyc/drive/traffic.js`): cars on the road network that keep their lane, stop at
  red and roll their wheels by the distance they travel.
- **Bridge** (`src/nyc/drive/bridge.js`): an arch over the river; its deck height and railing
  colliders match what you see.
- **Sound** (`src/audio.js`): synthesized live with the Web Audio API (no audio files): engines per
  car type, horns, sirens, the city and the music.
- **Look** (`src/main.js`): ambient occlusion, bloom, tone mapping and anti-aliasing; the quality adapts
  to the device to keep the frame rate smooth. Faces that share a plane are given a fixed draw order
  (`src/fx/coplanar.js`) so nothing flickers.

## Developer tools

Only in `npm run dev`:

- `?colliders` in the address draws every collision shape over the scene.
- `src/dev/bridge-bench.js` drives every car over the bridge and reports wheel contact, sticking and
  railing contact. In the console: `(await import('/src/dev/bridge-bench.js')).run()`.
- `src/dev/zfight.js` lists surfaces that would flicker.

Format the code with `npm run format`.

## Credits

Car models: [Free Low Poly Vehicles Pack by Rgsdev](public/cars/LICENSE-rgsdev.txt) (CC0).
