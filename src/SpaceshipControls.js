import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import modelUrl from './assets/x-wing.glb'


export class SpaceshipControls {
  constructor() {
    this.group = new THREE.Group();     // root
    this.ship  = new THREE.Group();     
    this.group.add(this.ship);

    const loader = new GLTFLoader();
    loader.load(modelUrl, (gltf) => {
    const model = gltf.scene;
    model.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; }});
    model.scale.setScalar(0.04);
    model.rotation.set(0, -Math.PI, 0); // adjust position
    model.name = 'spaceship';
    this.ship.add(model);
    });

    // State
    this.vel = new THREE.Vector3();
    this.keys = new Set();
    addEventListener('keydown', e => this.keys.add(e.code));
    addEventListener('keyup',   e => this.keys.delete(e.code));
  }

  // Smooth “chase camera” targets
  getIdealCameraOffset() {
    const offset = new THREE.Vector3(0, 2, 6);
    return offset.applyQuaternion(this.ship.quaternion).add(this.ship.position);
  }
  getIdealLookAt() {
    const look = new THREE.Vector3(0, 1.0, 0);
    return look.applyQuaternion(this.ship.quaternion).add(this.ship.position);
  }

  update(dt) {
    const thrust = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0);
    const yaw    = (this.keys.has('KeyA') ? 1 : 0) - (this.keys.has('KeyD') ? 1 : 0);
    const pitch  = (this.keys.has('ArrowUp') ? 1 : 0) - (this.keys.has('ArrowDown') ? 1 : 0);
    const roll   = (this.keys.has('KeyQ') ? 1 : 0) - (this.keys.has('KeyE') ? 1 : 0);

    // Rotation
    const yawSpeed = 1.8, pitchSpeed = 1.4, rollSpeed = 2.0;
    this.ship.rotateY(yaw * yawSpeed * dt);
    this.ship.rotateX(pitch * pitchSpeed * dt);
    this.ship.rotateZ(-roll * rollSpeed * dt);

    // Forward acceleration
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.ship.quaternion);
    const accel = 10;
    this.vel.addScaledVector(forward, thrust * accel * dt);

    // Space drag (tweak for feel)
    this.vel.multiplyScalar(0.985);

    // Move
    this.ship.position.addScaledVector(this.vel, dt);
  }
}
