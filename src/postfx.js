import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }     from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass }from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export let composer;

export function makeComposer(renderer, scene, camera) {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.7, 0.4, 0.85);
  composer.addPass(bloom);
  return composer;
}

export function onResizeComposer() {
  composer?.setSize(innerWidth, innerHeight);
}
