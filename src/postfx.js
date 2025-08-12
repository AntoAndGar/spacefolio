import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
// Optional but often helpful for correct color output:
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export function makeComposer(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  composer.setSize(innerWidth, innerHeight);

  // 1) Always start with a RenderPass
  composer.addPass(new RenderPass(scene, camera));

  // 2) Add Unreal Bloom
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(innerWidth, innerHeight),
    /* strength  */ 0.9,      // glow intensity
    /* radius    */ 0.4,      // spread
    /* threshold */ 0.8       // what’s bright enough to bloom
  );
  composer.addPass(bloom);

  // 3) Optional: ensure proper output conversion
  // If your colors look washed out or dull, include OutputPass:
  const output = new OutputPass();
  composer.addPass(output);

  // expose for tuning later:
  composer.bloom = bloom;
  return composer;
}
