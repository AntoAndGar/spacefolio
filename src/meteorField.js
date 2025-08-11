import * as THREE from 'three';

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

function rockifyInstancedStandardMaterial(material) {
  material.onBeforeCompile = (shader) => {
    // Inject attributes + noise helpers
    shader.vertexShader =
/* glsl */`
attribute vec3 aSeed;
attribute float aAmp;

// hash/noise (compact value-noise + fbm)
float hash(vec3 p){
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
}
float noise(vec3 p){
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f*f*(3.0-2.0*f);
  float n000 = hash(i + vec3(0,0,0));
  float n100 = hash(i + vec3(1,0,0));
  float n010 = hash(i + vec3(0,1,0));
  float n110 = hash(i + vec3(1,1,0));
  float n001 = hash(i + vec3(0,0,1));
  float n101 = hash(i + vec3(1,0,1));
  float n011 = hash(i + vec3(0,1,1));
  float n111 = hash(i + vec3(1,1,1));
  return mix(
    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
    f.z
  );
}
float fbm(vec3 p){
  float a = 0.5;
  float f = 0.0;
  for (int i = 0; i < 5; i++) {
    f += a * noise(p);
    p *= 2.01;
    a *= 0.5;
  }
  return f;
}
` + shader.vertexShader;

    // Replace the standard vertex transform to push along the normal
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
/* glsl */`
  vec3 p = position;
  // Two octaves at different frequencies, seeded per instance
  float n1 = fbm(p * 1.6 + aSeed);
  float n2 = fbm(p * 3.1 + aSeed * 1.7);
  // Center around 0 and scale
  float disp = ((n1*0.7 + n2*0.3) - 0.5) * 2.0 * aAmp;
  vec3 displaced = p + normalize(normal) * disp;
  vec3 transformed = displaced;
`
    );
  };
  material.needsUpdate = true;
}


export function makeMeteorField({
  count = 800,
  shellMin = 60,
  shellMax = 140,
  rMin = 0.5,
  rMax = 1.2,
  ampMin = -0.95,      // how “rocky”
  ampMax = 0.75
} = {}) {
  // Icosahedron gives nice faceted starting geometry
  const geom = new THREE.IcosahedronGeometry(1, 3);
  const mat  = new THREE.MeshStandardMaterial({
    color: 0xaba7a7,   // medium dark gray 
    roughness: 0.95,
    metalness: 0.15
  });

  const mesh = new THREE.InstancedMesh(geom, mat, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const positions = new Array(count);
  const radii     = new Float32Array(count);
  const active    = new Uint8Array(count); active.fill(1);

  // per-instance attributes for the shader
  const seeds = new Float32Array(count * 3);
  const amps  = new Float32Array(count);

  const m4 = new THREE.Matrix4();

  for (let i = 0; i < count; i++) {
    const radiusShell = THREE.MathUtils.lerp(shellMin, shellMax, Math.random());
    const p = onSphere(radiusShell); positions[i] = p;

    const baseR = THREE.MathUtils.lerp(rMin, rMax, Math.random());
    radii[i] = baseR;

    const amp = THREE.MathUtils.lerp(ampMin, ampMax, Math.random());
    amps[i] = amp;

    // random seed for unique shape
    seeds.set([Math.random()*10, Math.random()*10, Math.random()*10], i*3);

    m4.compose(p, new THREE.Quaternion(),
               new THREE.Vector3(baseR, baseR, baseR));
    mesh.setMatrixAt(i, m4);
  }
  mesh.instanceMatrix.needsUpdate = true;

  // Attach instanced attributes (yes, you can add custom instanced attrs on InstancedMesh)
  mesh.geometry.setAttribute('aSeed',
    new THREE.InstancedBufferAttribute(seeds, 3));
  mesh.geometry.setAttribute('aAmp',
    new THREE.InstancedBufferAttribute(amps, 1));

  // stash for collisions
  mesh.userData.positions = positions;
  mesh.userData.radii     = radii;
  mesh.userData.amps      = amps;
  mesh.userData.active    = active;

  // patch material to displace vertices on GPU
  rockifyInstancedStandardMaterial(mesh.material);
  return mesh;
}


