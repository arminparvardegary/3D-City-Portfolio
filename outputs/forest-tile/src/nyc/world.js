import * as THREE from 'three';
import { buildKeelSign } from './keel.js';
import { buildParking, experienceBoard } from './parking.js';
import { buildLux, buildKeelBoutique, buildRankdBoutique, buildGarage } from './lux.js';
import { buildVehicle } from '../vehicles.js';
import { mountStores } from '../stores/mount.tsx';
import AppleBlock from '../stores/AppleBlock.tsx';
import NikeBlock from '../stores/NikeBlock.tsx';
import MiBlock from '../stores/MiBlock.tsx';
import GoogleBlock from '../stores/GoogleBlock.tsx';
import McDonaldsBlock from '../stores/McDonaldsBlock.tsx';
import { createPeople } from './people.js';
import { createSky } from './sky.js';
import { buildCity } from './drive/build.js';
import { buildBridge } from './drive/bridge.js';
import { createTraffic } from './drive/traffic.js';
import {
  G,
  CURB,
  HALF,
  LANE,
  PARK,
  EDGE,
  ST,
  AV,
  BAV,
  MAN,
  BKN,
  NS,
  BRIDGE,
  blocks,
  bridgeHeight,
  bridgeDeck,
  onBridgeBand,
  onLand,
} from './drive/layout.js';

// New York as the world you drive (world units, about 1.5 m each). The plan is
// in drive/layout.js: Manhattan, the East River, a strip of Brooklyn, water all
// round. Keel HQ, Armin's project, stands on street z = 78. Returns what main.js
// needs: the scene group, solids, the road height (surface), the start, places
// the camera can visit, tall buildings for the camera, and a per frame update.
export function buildNYCWorld({ prep, materials, player }) {
  const group = new THREE.Group();
  group.name = 'new-york';
  const bl = blocks(),
    find = (i, j) => bl.find(b => b.i === i && b.j === j);
  // Armin's blocks: Keel's store at (1, 4); his four companies' stores in one row
  // across the street, on the long block (0, 5).
  const top = G + CURB;
  // Brooklyn (blocks 9,0 to 9,5) is all luxury boutiques: open plazas, no city buildings.
  const BK = [0, 1, 2, 3, 4, 5].map(j => '9,' + j);
  const city = buildCity({ reserved: new Set(['1,4', '0,5', ...BK]), pave: new Set(['1,4', '0,5', ...BK]) });
  group.add(city.root);
  // Keel's store (one floor, glass front, the "Meet Keel." banner inside), with
  // the giant name on its roof.
  const kb = find(1, 4),
    KS = 2,
    kx = (kb.x0 + kb.x1) / 2,
    kz = (kb.z0 + kb.z1) / 2;
  const keel = {
    solids: [[kx, kz, 3.2 * KS, 3.2 * KS]],
    occluders: [],
    place: { x: kx, z: kz, y: top + 4, dist: 30 },
  };
  const keelSign = buildKeelSign({ x: kx, z: kz, y: top + 2.25 * KS, width: 12 });
  group.add(keelSign);
  // Work experience stores across the street, facing Keel (north). A block's origin
  // is the top of its platform: set at the sidewalk, the plinth sits in the ground.
  // All four in one row, newest on the left as you look from Keel: Rush, Hindra, AAQ, Big Uppetite.
  const S = 1.7,
    PW = 6.4 * S,
    GAP = 1.4,
    rb = find(0, 5),
    rc = (rb.x0 + rb.x1) / 2,
    rz = (rb.z0 + rb.z1) / 2;
  const spots = [0, 1, 2, 3].map(i => ({ x: rc + (1.5 - i) * (PW + GAP), z: rz }));
  const stores = mountStores(group, [
    ...[NikeBlock, MiBlock, GoogleBlock, McDonaldsBlock].map((C, i) => ({
      C,
      x: spots[i].x,
      y: top,
      z: spots[i].z,
      rot: Math.PI,
      scale: S,
    })),
    { C: AppleBlock, x: kx, y: top, z: kz, rot: 0, scale: KS },
  ]);
  const storeSolids = spots.map(p => [p.x, p.z, PW / 2, PW / 2]);
  // Brooklyn: a big one floor glass boutique on every block, facing the river.
  // The first one, where the bridge lands, is Keel's flagship.
  const KEEL_BK = 5,
    RANKD_BK = 4,
    GARAGE_BK = 3; // the second one is Rankd, the third the Lux Garage
  // Display cars for the garage turntables, in luxury paint.
  const showCar = (i, parent, color) => {
    const p = buildVehicle(i, parent, materials, prep);
    p.rig.position.set(0, 0, 0);
    p.rig.rotation.set(0, 0, 0);
    p.paint?.color.set(color ?? (i ? '#0f3a2c' : '#d8d4cc'));
    // Big vehicles shrink to fit the turntable (just for show).
    const L = Math.max(p.length ?? 4, (p.width ?? 2) * 2);
    if (L > 4.6) p.rig.scale.setScalar(4.6 / L);
    return p;
  };
  const lux = BK.map((key, j) => {
    const b = find(9, j),
      cx = (b.x0 + b.x1) / 2,
      cz = (b.z0 + b.z1) / 2;
    const L =
      j === KEEL_BK
        ? buildKeelBoutique({ x: cx, z: cz, top, facing: -1 })
        : j === RANKD_BK
          ? buildRankdBoutique({ x: cx, z: cz, top, facing: -1 })
          : j === GARAGE_BK
            ? buildGarage({ x: cx, z: cz, top, facing: -1, makeCar: showCar })
            : buildLux({ x: cx, z: cz, top, w: 9, d: 17, facing: -1, style: j });
    group.add(L.root);
    return { ...L, x: cx, z: cz, j };
  });
  // A parking bay in front of every place: park, press Enter.
  const IDS = ['rush', 'hindra', 'aaq', 'bigup'],
    NAMES = ['Rush Graphics', 'Hindra Studio', 'AAQ Properties', 'Big Uppetite'];
  // Parallel bays in the parking lane of street 78, in front of each store; Keel's
  // on the other side of the same street.
  const parking = buildParking({
    top,
    places: [
      ...spots.map((p, i) => ({
        id: IDS[i],
        name: NAMES[i],
        x: p.x,
        z: ST[5] + (EDGE + HALF) / 2,
        side: 1,
        store: { x: p.x, z: p.z },
      })),
      { id: 'keel', name: 'Keel', x: kx, z: ST[5] - (EDGE + HALF) / 2, side: -1, store: { x: kx, z: kz } },
      // Each Brooklyn boutique: a bay on the riverside road, right in front of it.
      ...lux.map(L => ({
        id:
          L.j === KEEL_BK
            ? 'keel-bk'
            : L.j === RANKD_BK
              ? 'rankd'
              : L.j === GARAGE_BK
                ? 'garage'
                : 'lux' + L.j,
        name: L.j === KEEL_BK ? 'Keel' : L.j === RANKD_BK ? 'Rankd' : L.j === GARAGE_BK ? 'Lux Garage' : '',
        x: BAV[0] + (EDGE + HALF) / 2,
        z: L.z,
        side: 1,
        axis: 'z',
        store: { x: L.x, z: L.z },
      })),
    ],
  });
  group.add(parking.root);
  // A smart board on the plaza at the start of the row, turned toward the crossing
  // you come from (east, on street 78).
  const bx = spots[0].x + PW / 2 + 4.6,
    bz = rb.z0 + 5.6,
    board = experienceBoard({ x: bx, z: bz, top, yaw: Math.atan2(AV[2] - bx, ST[5] - bz) });
  group.add(board.root);
  const bridge = buildBridge({ prep });
  group.add(bridge.root);
  for (const o of [city.root])
    o.traverse(m => {
      if (m.isMesh) [].concat(m.material).forEach(x => prep?.(x));
    });
  // Traffic: about twenty cars of every type, each with its own speed.
  const traffic = createTraffic({ phase: city.phase, player, prep, parked: city.parking });
  group.add(traffic.root);
  // People on every sidewalk loop.
  const people = createPeople({ loops: city.loops, perLoop: 2 });
  group.add(people.root);
  // Sky, clouds, stars and steam from the street stacks (shared with builder cities).
  const sky = createSky({ group, steam: city.steam });
  const solids = [
    ...city.solids,
    ...keel.solids,
    ...storeSolids,
    ...bridge.solids,
    ...parking.solids,
    board.solid,
    ...lux.map(L => L.solid),
  ];
  const occluders = [...city.occluders, ...bridge.occluders, ...keel.occluders];
  const places = { keel: keel.place };
  // Where the car can drive and how high: the streets and sidewalks on land, and
  // the bridge deck wherever the bridge is.
  function surface(x, z, y = 0) {
    const ground = onLand(x, z) ? city.walkHeight(x, z) : null,
      deck = onBridgeBand(x, z) ? bridgeDeck(x) : null;
    // Nothing passes under the bridge, so on its band the deck is the road.
    return deck !== null ? deck : ground;
  }
  return {
    parking: parking.bays,
    garage: lux.find(L => L.j === GARAGE_BK),
    group,
    solids,
    places,
    labels: [keelSign.userData.cta],
    row: null,
    lot: null,
    occluders,
    surface,
    trafficCars: traffic.cars,
    obstacles: () => traffic.obstacles(),
    vehicleBoxes: () => traffic.boxes(),
    circles: [...bridge.circles, ...city.posts],
    bounds: { x0: MAN.x0 - 6, x1: BKN.x1 + 6, z0: NS.z0 - 6, z1: NS.z1 + 6 },
    // Start on the street in front of Keel HQ, heading west: Keel on the right.
    start: { x: AV[2] + 12, z: ST[5] - LANE, h: -Math.PI / 2 },
    vehicle: 'Sports',
    carColor: '#b5121b',
    zoom: 0.62,
    fixedZoom: true,
    placeAt() {
      return null;
    },
    update(t, dt, camera) {
      city.update(dt);
      stores.update(dt);
      for (const L of lux) L.update?.(dt);
      parking.update(dt, player());
      city.sea.value += dt;
      traffic.update(dt);
      people.update(dt);
      sky.update(dt, camera);
      return 2;
    },
  };
}
