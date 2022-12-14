import * as THREE from 'three';

import Debug from './utils/Debug.js';
import Seed from './utils/Seed.js';
import Time from './utils/Time.js';
import Viewport from './utils/Viewport.js';
import Resources from './utils/Resources.js';
import SolarSystem from './scenes/SolarSystem.js';
import Renderer from './Renderer.js';
import Camera from './Camera.js';
import SeedButton from './ui/SeedButton.js';
import Controls from './ui/Controls.js';
import ProgressBar from './ui/ProgressBar.js';

import sources from './data/sources.js';

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
    THREE.ColorManagement.legacyMode = false;
    this.debug = new Debug();
    this.seed = new Seed();
    this.time = new Time();
    this.scene = new THREE.Scene();
    this.progressBar = new ProgressBar();
    this.resources = new Resources(sources);
    this.solarSystemRadius = 160;
    this.solarSystem = new SolarSystem();
    this.viewport = new Viewport();
    this.camera = new Camera();
    this.renderer = new Renderer();
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
      this.setFocus(objectId); 
    });

    this.resources.on('ready', () => {
      this.seedButton = new SeedButton();
    })
  }

  reset() {
    this.camera.reset();
    this.solarSystem.reset();
  }

  resize() {
    this.camera.resize();
    this.renderer.resize();
  }

  setFocus(objectId) {
    this.solarSystem.setFocus(objectId);
    this.camera.setFocus(objectId);
  }

  update() {
    this.solarSystem.update();
    this.camera.update();
    this.renderer.update();
  }
}
