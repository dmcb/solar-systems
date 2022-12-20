import * as THREE from 'three';
import { SelectiveBloomEffect, BlendFunction, EffectComposer, EffectPass, RenderPass } from 'postprocessing';

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
      powerPreference: "high-performance",
      antialias: false,
      stencil: false,
      depth: false
    });
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(this.viewport.pixelRatio);
    this.renderer.setSize(this.viewport.width, this.viewport.height);
    this.renderScene = new RenderPass(this.scene, this.camera.instance);

    // Bloom
    this.bloomPass = new SelectiveBloomEffect(this.scene, this.camera.instance, {
      blendFunction: BlendFunction.ADD,
			mipmapBlur: true,
			luminanceThreshold: 0.15,
			luminanceSmoothing: 0.05,
			intensity: 1.2
    });
    this.bloomPass.inverted = true;

    // Compose render and bloom
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(this.renderScene);
    this.composer.addPass(new EffectPass(this.camera.instance, this.bloomPass));
  }

  resize() {
    this.renderer.setSize(this.viewport.width, this.viewport.height);
    this.composer.setSize(this.viewport.width, this.viewport.height);
  }

  update() {
    this.composer.render();
  }
}