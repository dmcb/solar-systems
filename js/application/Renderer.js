import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import Application from './Application.js';

export default class Renderer {
  constructor() {
    this.application = new Application();
    this.canvas = this.application.canvas;
    this.viewport = this.application.viewport;
    this.scene = this.application.scene;
    this.camera = this.application.camera;

    this.setInstance();
  }

  setInstance() {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ 
      canvas: this.canvas,
      alpha: true, 
      antialias: true 
    });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap;
    this.renderer.setPixelRatio(this.viewport.pixelRatio);
    this.renderer.setSize(this.viewport.width, this.viewport.height);
    this.renderScene = new RenderPass(this.scene, this.camera.instance);

    // Bloom
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(this.viewport.width, this.viewport.height), 1.5, 0.4, 0.85);
    this.bloomPass.threshold = 0.95;
    this.bloomPass.strength = 1.5;
    this.bloomPass.radius = 0.5;

    // Compose render and bloom
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(this.renderScene);
    this.composer.addPass(this.bloomPass);
  }

  resize() {
    this.renderer.setSize(this.viewport.width, this.viewport.height);
    this.composer.setSize(this.viewport.width, this.viewport.height);
  }

  update() {
    this.composer.render();
  }
}