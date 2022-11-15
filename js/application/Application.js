import * as THREE from 'three';

import Seed from './utils/Seed.js';
import Time from './utils/Time.js';
import Viewport from './utils/Viewport.js';
import SolarSystem from './objects/SolarSystem.js';
import Renderer from './Renderer.js';
import Camera from './Camera.js';
import SeedButton from './ui/SeedButton.js';
import Controls from './ui/Controls.js';

let instance = null;

export default class Application {
  constructor(canvas) {
    // Singleton
    if (instance) {
      return instance;
    }
    instance = this;

    // Global access
    window.application = this;

    // Options
    this.canvas = canvas;

    // Setup
    this.seed = new Seed();
    this.time = new Time();
    this.scene = new THREE.Scene();
    this.solarSystemRadius = 160;
    this.solarSystem = new SolarSystem();
    this.viewport = new Viewport();
    this.camera = new Camera();
    this.renderer = new Renderer();

    // Add UI
    this.seedButton = new SeedButton();
    this.controls = new Controls();

    this.seed.on('set', () => {
      this.reset();
    });

    this.viewport.on('resize', () => {
      this.resize();
    });

    this.time.on('tick', () => {
      this.update();
    });

    this.controls.on('focus', (objectId) => {
      this.changeFocus(objectId); 
    });
  }

  reset() {
    this.solarSystem.destroy();
    this.solarSystem = new SolarSystem();
  }

  resize() {
    this.camera.setBounds();
    this.renderer.resize();
  }

  update() {
    this.solarSystem.update();
    this.camera.update();
    this.renderer.update();
  }

  changeFocus(objectId) {
    this.solarSystem.changeFocus(objectId);
    this.camera.changeFocus(objectId);
  }
}
