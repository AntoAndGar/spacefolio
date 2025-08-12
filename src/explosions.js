// src/explosions.js
import * as THREE from 'three';

function makeCircleTexture(size = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  g.addColorStop(0.0, 'rgba(255,255,255,1)');
  g.addColorStop(0.2, 'rgba(255,255,255,1)');
  g.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,size,size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Exploder {
  constructor(scene) {
    this.scene = scene;
    this.bursts = [];
    this.sprite = makeCircleTexture(); // round points via alpha map
  }
  // spawn N particles from 'pos'
  spawn(pos, { count = 90, speed = 6, lifetime = 0.8 } = {}) {
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions.set([pos.x, pos.y, pos.z], i * 3);

      // random direction on unit sphere
      const u = Math.random(), v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi   = Math.acos(2*v - 1);
      const dir = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi)
      );
      dir.multiplyScalar(speed * (0.6 + 0.4*Math.random()));
      velocities.set([dir.x, dir.y, dir.z], i * 3);
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.15,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      alphaMap: this.sprite, // makes the points round
      map: this.sprite
    });

    const points = new THREE.Points(geom, mat);
    points.frustumCulled = false;
    this.scene.add(points);

    this.bursts.push({ points, life: 0, lifetime });
  }

  update(dt) {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      const pos = b.points.geometry.attributes.position;
      const vel = b.points.geometry.attributes.velocity;

      for (let j = 0; j < pos.count; j++) {
        // integrate
        vel.array[j*3+0] *= 0.98;
        vel.array[j*3+1] = vel.array[j*3+1] - 2.0*dt; // slight "gravity" down
        vel.array[j*3+2] *= 0.98;

        pos.array[j*3+0] += vel.array[j*3+0] * dt;
        pos.array[j*3+1] += vel.array[j*3+1] * dt;
        pos.array[j*3+2] += vel.array[j*3+2] * dt;
      }
      pos.needsUpdate = true;

      b.life += dt;
      const t = Math.min(1, b.life / b.lifetime);
      b.points.material.opacity = 1 - t;

      if (b.life >= b.lifetime) {
        this.scene.remove(b.points);
        b.points.geometry.dispose();
        b.points.material.dispose();
        this.bursts.splice(i, 1);
      }
    }
  }
}
