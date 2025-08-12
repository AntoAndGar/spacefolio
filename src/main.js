import * as THREE from 'three';
import { makeStars } from './starfield.js';
import { makeCollidableStars } from './collidableStars.js';
import { Exploder } from './explosions.js';
import { SpaceshipControls } from './SpaceshipControls.js';
import { makeMeteorField } from './meteorField.js';
import { makeComposer } from './postfx.js';


// Finds every .glb in src/assets (and subfolders) and returns URL strings
const fileMap = import.meta.glob('./assets/**/*.glb', {
  eager: true,
  import: 'default',
  query: '?url',          // tells Vite: give me a URL
});

// Turn that map into a friendly array
const ships = Object.entries(fileMap).map(([path, url]) => ({
  name: path.split('/').pop().replace(/\.glb$/i, ''),  // filename as label
  url,
}));
// choose default by filename
const pattern = /x[-_\s]?wing[-_\s]*/i; // expects a file like x-wing.glb

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);



const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000); // black

const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 1000);
camera.position.set(0, 2, 8);

const hemi = new THREE.HemisphereLight(0xffffff, 0x080820, 0.6);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(5, 10, 7);
sun.castShadow = true;
scene.add(sun);

// Stars! far background Points 
scene.add(makeStars(9000, 700));

// add near collidable stars
// const stars = makeCollidableStars({ count: 900, shellMin: 50, shellMax: 130 });
// scene.add(stars);

const meteors = makeMeteorField({ count: 900, shellMin: 50, shellMax: 130 });
scene.add(meteors);


// explosion helper
const exploder = new Exploder(scene);

const controls = new SpaceshipControls();
scene.add(controls.group); // controls.group is the ship + rig

// ship selection menu with default x-wing 
function makeShipMenu(list, onPick) {
  const wrap = document.createElement('div');
  wrap.className = 'ship-menu';
  wrap.innerHTML = `
    <label style="margin-right:8px">Spaceship:</label>
    <select id="shipSelect"></select>
  `;
  document.body.appendChild(wrap);

  const sel = wrap.querySelector('#shipSelect');
  list.forEach((s, i) => {
    const opt = document.createElement('option');
    opt.value = s.url;
    opt.textContent = s.name;
    sel.appendChild(opt);
  });

  // Fire loader whenever the selection changes
  sel.addEventListener('change', e => onPick(e.target.value));

  // Keep flying when the dropdown has focus
  sel.addEventListener('keydown', (e) => {
  const k = e.code;
  if (k === 'ArrowUp' || k === 'ArrowDown' || k === 'ArrowLeft' || k === 'ArrowRight' || k === 'Space') {
    e.preventDefault();  // blocks the select from changing option
    // DO NOT call e.stopPropagation(); we still want the ship controls to see the key
    }
  }, { passive: false });

  // ---- Auto-pick "x-wing" on boot ----
  if (list.length) {
    // match "x-wing", "xwing", "x_wing", etc.
    let idx = list.findIndex(s => pattern.test(s.name.toLowerCase()));
    if (idx < 0) idx = list.findIndex(s => /x[-_\s]?wing[-_\s]*/i.test(s.name));
    if (idx < 0) idx = 0; // fallback

    sel.selectedIndex = idx;                 // select the option
    sel.dispatchEvent(new Event('change'));  // trigger your onPick once
    sel.blur();                              // optional: drop focus so arrows fly the ship
  }

  // return a starter that also fires change
  return (index = 0) => {
    sel.selectedIndex = index;               // pick default option
    sel.dispatchEvent(new Event('change'));  // fire change programmatically
    sel.blur();                              // optional: drop focus so arrows fly the ship
  };
}

// minimal styles
const style = document.createElement('style');
style.textContent = `
.ship-menu{
  position:fixed;top:16px;left:16px;z-index:10;
  background:rgba(0,0,0,.6);backdrop-filter:blur(6px);
  color:#fff;padding:8px 12px;border-radius:12px;
  box-shadow:0 8px 24px rgba(0,0,0,.35);font:14px system-ui,sans-serif;
}
.ship-menu select{background:#111;color:#fff;border:1px solid #333;border-radius:8px;padding:6px 10px;}
`;
document.head.appendChild(style);

makeShipMenu(ships, url => {
  controls.loadModel(url);   // we’ll add this method below
});

// initialize selection + trigger load
// if (ships.length) {
//   const idx = defaultIndex >= 0 ? defaultIndex : 0;
//   console.log('Default ship index:', idx, ships[idx]);
//   startMenu(idx);           // sets selectedIndex and dispatches "change" for you
// }

const tmp = new THREE.Vector3();
const m4 = new THREE.Matrix4();

function checkStarCollisions() {
  // world-space ship position
  controls.ship.getWorldPosition(tmp);

  // const pos = stars.userData.positions;
  // const radii = stars.userData.radii;
  // const active = stars.userData.active;

  const pos_meteor = meteors.userData.positions;
  const radii_meteor = meteors.userData.radii;
  const active_meteor = meteors.userData.active;
  const amps_meteor  = meteors.userData.amps;

  // radius from controls with fallback to 1.5
  const ship_radius = controls.shipRadius ?? 1.5;

  for (let i = 0; i < pos_meteor.length; i++) {
    if (!active_meteor[i]) continue;
    //const sum = radii[i] + ship_radius;
    const sum_meteor = (radii_meteor[i] + amps_meteor[i] * 0.9) + ship_radius; // conservative padding

    // if (tmp.distanceToSquared(pos[i]) < sum * sum) {
    //   // mark inactive and visually remove the instance by scaling to 0
    //   active[i] = 0;
    //   m4.compose(pos[i], new THREE.Quaternion(), new THREE.Vector3(0,0,0));
    //   stars.setMatrixAt(i, m4);
    //   stars.instanceMatrix.needsUpdate = true;

    //   // explode!
    //   exploder.spawn(pos[i]);

    //   // optional: "bounce" the ship a bit by reversing velocity
    //   controls.vel.multiplyScalar(-0.4);
    // }

    if (tmp.distanceToSquared(pos_meteor[i]) < sum_meteor * sum_meteor) {
      // mark inactive and visually remove the instance by scaling to 0
      active_meteor[i] = 0;
      m4.compose(pos_meteor[i], new THREE.Quaternion(), new THREE.Vector3(0,0,0));
      meteors.setMatrixAt(i, m4);
      meteors.instanceMatrix.needsUpdate = true;

      // explode!
      exploder.spawn(pos_meteor[i]);

      // optional: "bounce" the ship a bit by reversing velocity
      controls.vel.multiplyScalar(-0.5);
    }
  }
}

const clock = new THREE.Clock();
const composer = makeComposer(renderer, scene, camera);

function animate() {
  const dt = Math.min(0.05, clock.getDelta());
  controls.update(dt);
  checkStarCollisions?.();
  exploder?.update(dt);


  // Chase-cam follows the ship smoothly
  const o = controls.getIdealCameraOffset().clone();
  const l = controls.getIdealLookAt().clone();
  camera.position.lerp(o, 1 - Math.pow(0.001, dt));
  camera.lookAt(l);

  composer.render();
  requestAnimationFrame(animate);
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  composer.setPixelRatio(Math.min(devicePixelRatio, 2));
});
