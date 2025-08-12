import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SHIP_PRESETS } from './ship-presets.js';

export class SpaceshipControls {
  constructor() {
    this.group = new THREE.Group();     // root
    this.ship  = new THREE.Group();     
    this.group.add(this.ship);

    this.loader = new GLTFLoader();
    this.currentModel = null;

    this.shipRadius = 1.5;

    // State
    this.vel = new THREE.Vector3();
    this.keys = new Set();
    addEventListener('keydown', e => this.keys.add(e.code));
    addEventListener('keyup',   e => this.keys.delete(e.code));
    }

    async loadModel(url) {
      // If we already have a model loaded, dispose it
      if (this.currentModel) {
        this._disposeModel(this.currentModel);
        this.ship.remove(this.currentModel);
        this.currentModel = null;
      }

    const gltf = await this.loader.loadAsync(url);
    const model = gltf.scene;

    // optional - orientation and scale
    // --- PRESETS LOOKUP (by base filename) ---
    const base = url.split('/').pop().toLowerCase().replace(/\.(glb|gltf)$/, '').replace(/-.*/, '') ; //.replace(/^([^-\n]*-[^-\n]*)-.*$/, '$1');
    const preset = SHIP_PRESETS[base] ?? SHIP_PRESETS.default ?? {};
    
    this.shipRadius = preset.shipRadius ?? 1.5; // radius for collisions
    
    // 1) Center model at origin (nice pivot for flying)
    const box1 = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    box1.getCenter(center);
    model.position.sub(center);

    // 2) Scale: explicit from preset, else auto-scale to a target radius
    if (preset.scale != null) {
      model.scale.setScalar(preset.scale);
    } else {
      const sphere = new THREE.Sphere();
      box1.getBoundingSphere(sphere);
      const target = preset.autoScaleRadius ?? 1.0; // meters
      const s = target / (sphere.radius || 1);
      model.scale.setScalar(s);
    }

    // 3) Orientation (yaw around Y)
    if (preset.yaw != null) model.rotation.y = preset.yaw;

    // 4) Optional local offset (after centering/scaling/orienting)
    if (preset.offset) {
      model.position.add(new THREE.Vector3().fromArray(preset.offset));
    }

    // lights/shadows
    model.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; }});
    
    
    this.ship.add(model);
    this.currentModel = model;

    
  }


  _disposeModel(root) {
    root.traverse((o) => {
      if (o.isMesh) {
        o.geometry?.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => {
          if (!m) return;
          for (const k in m) {
            const v = m[k];
            if (v && v.isTexture) v.dispose();
          }
          m.dispose?.();
        });
      }
    });
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
