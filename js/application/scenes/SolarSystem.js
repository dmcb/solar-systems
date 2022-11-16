import * as THREE from 'three';
import Sun from '../objects/Sun.js';
import Planet from '../objects/Planet.js';
import Application from '../Application.js';

export default class SolarSystem {
  constructor() {
    this.application = new Application();
    this.seed = this.application.seed;
    this.scene = this.application.scene;
    this.solarSystemRadius = this.application.solarSystemRadius;
    this.resources = this.application.resources;

    this.suns = [];
    this.planets = [];

    this.resources.on('ready', () => {
      this.create();
    });
  }

  create() {
    this.maximumDistance = this.solarSystemRadius;
    this.direction = this.seed.getRandom();
    if (this.direction >= 0.5) this.direction = 1;
    else this.direction = -1;

    // Add ambient light
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
    this.scene.add( this.ambientLight );

    // Add suns
    let sun = new Sun();
    this.minimumDistance = sun.size*3;
    this.suns.push(sun);
    let secondSun = new Sun();
    if (sun.size + secondSun.size < 14) {
      sun.addToScene(this.scene, true);
      secondSun.addToScene(this.scene, true);
      this.suns.push(secondSun);
      this.minimumDistance += secondSun.size + 10;
    }
    else {
      sun.addToScene(this.scene);
    }

    // Add planets   
    while (this.minimumDistance < this.maximumDistance) {
      let planet = new Planet(this.minimumDistance, this.maximumDistance, this.direction);
      this.minimumDistance = planet.nextNeighbourMinimumDistance();
      if (this.minimumDistance < this.maximumDistance) {
        planet.addToScene(this.scene);
        this.planets.push(planet);
      }
    }
  }

  update() {
    if (this.suns.length > 1) {
      // This is where suns will orbit eachother
      // For now a dumb static thing
      const totalSunsWidth = this.suns[0].size + this.suns[1].size + 10;
      this.suns[0].sun.position.x = -totalSunsWidth/2;
      this.suns[1].sun.position.x = this.suns[0].size + this.suns[1].size + 10 - totalSunsWidth/2;
    }
    this.planets.forEach(planet => {
      planet.update();
    });
  }

  destroy() {
    this.suns.forEach((item, index, object) => {
      item.destroy();
    });
    this.suns = [];

    this.planets.forEach((item, index, object) => {
      item.destroy();
    });
    this.planets = [];
  }

  reset() {
    this.destroy();
    this.create();
  }

  changeFocus(objectId) {
    // Upscale planet?
  }
}
