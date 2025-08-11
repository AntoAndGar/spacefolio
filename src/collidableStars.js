import * as THREE from 'three';

// random point on a shell
function onSphere(radius) {
  const u = Math.random(), v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi   = Math.acos(2 * v - 1);
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi)
  );
}

// Build an InstancedMesh of small spheres and remember their positions/radii
export function makeCollidableStars({
  count = 800,           // keep this modest for perf
  shellMin = 60,         // near distance
  shellMax = 140,        // far distance
  rMin = 0.15,           // star radius range
  rMax = 0.4
} = {}) {
  const geom = new THREE.SphereGeometry(1, 12, 12); // base sphere. Low segs = cheap. 
  const mat  = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x222222,
    roughness: 1
  });

  const mesh = new THREE.InstancedMesh(geom, mat, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); // we'll edit instances
  const m4 = new THREE.Matrix4();

  // book-keeping (for collisions)
  const positions = new Array(count);
  const radii     = new Float32Array(count);
  const active    = new Uint8Array(count); active.fill(1);

  for (let i = 0; i < count; i++) {
    const radius = THREE.MathUtils.lerp(shellMin, shellMax, Math.random());
    const p = onSphere(radius);
    positions[i] = p;

    const r = THREE.MathUtils.lerp(rMin, rMax, Math.random());
    radii[i] = r;

    m4.compose(p, new THREE.Quaternion(), new THREE.Vector3(r, r, r));
    mesh.setMatrixAt(i, m4);
  }
  mesh.instanceMatrix.needsUpdate = true;

  // stash data on the mesh
  mesh.userData.positions = positions;
  mesh.userData.radii     = radii;
  mesh.userData.active    = active;

  return mesh;
}
