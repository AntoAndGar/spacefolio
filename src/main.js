import * as THREE from 'three';
import { makeStars } from './starfield.js';
import { makeCollidableStars } from './collidableStars.js';
import { Exploder } from './explosions.js';
import { SpaceshipControls } from './SpaceshipControls.js';
import { makeMeteorField } from './meteorField.js';

// import { composer, onResizeComposer } from './postfx.js';

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

// ship collision radius (tweak to fit your model)
const SHIP_RADIUS = 1.5;

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


  for (let i = 0; i < pos_meteor.length; i++) {
    if (!active_meteor[i]) continue;
    //const sum = radii[i] + SHIP_RADIUS;
    const sum_meteor = (radii_meteor[i] + amps_meteor[i] * 0.9) + SHIP_RADIUS; // conservative padding

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
      controls.vel.multiplyScalar(-0.4);
    }
  }
}

const clock = new THREE.Clock();


function animate() {
  const dt = Math.min(0.05, clock.getDelta());
  controls.update(dt);
  // composer ? composer.render() :
  checkStarCollisions();
  exploder.update(dt);
  renderer.render(scene, camera);

  // Chase-cam follows the ship smoothly
  const o = controls.getIdealCameraOffset().clone();
  const l = controls.getIdealLookAt().clone();
  camera.position.lerp(o, 1 - Math.pow(0.001, dt));
  camera.lookAt(l);

  requestAnimationFrame(animate);
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  // onResizeComposer?.();
});
