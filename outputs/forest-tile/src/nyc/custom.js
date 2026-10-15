import * as THREE from 'three';
import { buildParking } from './parking.js';
import { buildLux, buildGarage } from './lux.js';
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
import { createTraffic } from './drive/traffic.js';
import { G, CURB, HALF, EDGE, LANE, AV, ST, MAN, NS, PLAN, blocks, onLand } from './drive/layout.js';

// The five store designs a place can use (src/plan/plan.js STYLES).
const DESIGN = {
  studio: NikeBlock,
  shop: MiBlock,
  office: GoogleBlock,
  agency: McDonaldsBlock,
  hq: AppleBlock,
};
const SPECIAL = new Set(['place', 'boutique', 'garage']);
const BAY = (EDGE + HALF) / 2; // parking lane centre, from the road's centre line

// A city made in the builder (PLAN), built with the same pieces as Armin's New
// York: its roads, sidewalks, lights and buildings (buildCity reads the plan),
// and for each place, boutique or garage a building facing the nearest road with
// a parking bay in front. Returns what main.js needs, like buildNYCWorld.
export function buildCustomWorld({ prep, materials, player }) {
  const group = new THREE.Group();
  group.name = 'builder-city';
  const top = G + CURB;
  const bl = blocks(),
    special = bl.filter(b => SPECIAL.has(b.cell.kind)),
    keys = new Set(special.map(b => b.i + ',' + b.j));
  const city = buildCity({ reserved: keys, pave: keys });
  group.add(city.root);

  // The road a block faces: the first side with a road, in this order (south,
  // north, east, west). rot turns a store (built facing +z) toward it; the bay sits
  // in that road's parking lane, right in front.
  const { roads } = PLAN;
  function front(b) {
    const cx = (b.x0 + b.x1) / 2,
      cz = (b.z0 + b.z1) / 2;
    const sides = [
      {
        has: roads.h[b.j1 + 1]?.[b.i],
        rot: 0,
        bay: { x: cx, z: ST[b.j1 + 1] - BAY, side: -1, axis: 'x' },
        dir: [0, 1],
      },
      {
        has: roads.h[b.j]?.[b.i],
        rot: Math.PI,
        bay: { x: cx, z: ST[b.j] + BAY, side: 1, axis: 'x' },
        dir: [0, -1],
      },
      {
        has: roads.v[b.i1 + 1]?.[b.j],
        rot: Math.PI / 2,
        bay: { x: AV[b.i1 + 1] - BAY, z: cz, side: -1, axis: 'z' },
        dir: [1, 0],
      },
      {
        has: roads.v[b.i]?.[b.j],
        rot: -Math.PI / 2,
        bay: { x: AV[b.i] + BAY, z: cz, side: 1, axis: 'z' },
        dir: [-1, 0],
      },
    ];
    return { cx, cz, ...(sides.find(s => s.has) ?? { ...sides[0], bay: null }) };
  }

  // Display cars for the garage turntables (big vehicles shrink to fit).
  const showCar = (i, parent, color) => {
    const p = buildVehicle(i, parent, materials, prep);
    p.rig.position.set(0, 0, 0);
    p.rig.rotation.set(0, 0, 0);
    p.paint?.color.set(color ?? (i ? '#0f3a2c' : '#d8d4cc'));
    const L = Math.max(p.length ?? 4, (p.width ?? 2) * 2);
    if (L > 4.6) p.rig.scale.setScalar(4.6 / L);
    return p;
  };

  const storeList = [],
    solids = [],
    lux = [],
    bays = [];
  let garage = null;
  special.forEach((b, n) => {
    const f = front(b),
      kind = b.cell.kind;
    if (kind === 'place') {
      const p = b.cell.place,
        words = p.name.trim().split(/\s+/);
      // The place's brand on its store: name, logo, colour, tagline and link.
      const brand = {
        key: 'place-' + n,
        custom: true,
        name: p.name,
        short: p.name.length <= 12 ? p.name : words[0], // the sign's big word
        sub: p.name.length <= 12 ? p.role || '' : words.slice(1).join(' '),
        color: p.color,
        logo: p.logo || undefined,
        tagline: p.note,
        link: p.link,
      };
      const S = 2.3; // a place fills its block (Armin's row uses 1.7 for four in one block)
      storeList.push({
        C: DESIGN[p.style] ?? NikeBlock,
        x: f.cx,
        y: top,
        z: f.cz,
        rot: f.rot,
        scale: S,
        brand,
      });
      solids.push([f.cx, f.cz, 3.2 * S, 3.2 * S]);
      if (f.bay)
        bays.push({ id: 'place-' + n, name: p.name, place: p, ...f.bay, store: { x: f.cx, z: f.cz } });
    } else {
      // Boutiques and the garage face along x: toward the east or west road if there is one.
      const facing = f.dir[0] || -1;
      const L =
        kind === 'garage' && !garage
          ? buildGarage({ x: f.cx, z: f.cz, top, facing, makeCar: showCar })
          : buildLux({ x: f.cx, z: f.cz, top, w: 9, d: 17, facing, style: n });
      group.add(L.root);
      solids.push(L.solid);
      lux.push(L);
      if (kind === 'garage' && !garage) garage = L;
      const id = L === garage ? 'garage' : 'lux' + n;
      if (f.bay)
        bays.push({ id, name: L === garage ? 'Car garage' : '', ...f.bay, store: { x: f.cx, z: f.cz } });
    }
  });
  const stores = mountStores(group, storeList);
  const parking = buildParking({ top, places: bays });
  group.add(parking.root);
  // Each bay keeps its place's card data (the visit card reads it).
  for (const b of parking.bays) b.place = bays.find(q => q.id === b.id)?.place;

  city.root.traverse(m => {
    if (m.isMesh) [].concat(m.material).forEach(x => prep?.(x));
  });
  const traffic = createTraffic({ phase: city.phase, player, prep, parked: city.parking });
  group.add(traffic.root);
  const people = createPeople({ loops: city.loops, perLoop: 2 });
  group.add(people.root);
  const sky = createSky({ group, steam: city.steam });

  // Start 12 units behind the first place's bay, in its lane, facing the way the
  // bay's traffic runs (the place is just ahead); without places, on the first avenue.
  const firstBay = parking.bays.find(b => b.place) ?? parking.bays[0];
  const start = firstBay
    ? { x: firstBay.x - Math.sin(firstBay.h) * 12, z: firstBay.z - Math.cos(firstBay.h) * 12, h: firstBay.h }
    : { x: AV[0] + LANE, z: (ST[0] + ST[1]) / 2, h: 0 };

  return {
    parking: parking.bays,
    garage,
    group,
    solids: [...city.solids, ...solids, ...parking.solids],
    places: {},
    labels: [],
    row: null,
    lot: null,
    occluders: city.occluders,
    surface: (x, z) => (onLand(x, z) ? city.walkHeight(x, z) : null),
    trafficCars: traffic.cars,
    obstacles: () => traffic.obstacles(),
    vehicleBoxes: () => traffic.boxes(),
    circles: city.posts,
    bounds: { x0: MAN.x0 - 6, x1: MAN.x1 + 6, z0: NS.z0 - 6, z1: NS.z1 + 6 },
    start,
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
