import * as THREE from 'three';
import Sun from '../objects/Sun.js';
import Planet from '../objects/Planet.js';
import Application from '../Application.js';

export default class SolarSystem {
  constructor() {
    this.application = new Application();
    this.seed = this.application.seed;
    this.scene = this.application.scene;
    this.time = this.application.time;
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
    this.sunPivotPoint = new THREE.Object3D();
    this.scene.add(this.sunPivotPoint);
    let sun = new Sun();
    this.minimumDistance = sun.size*3;
    this.suns.push(sun);
    let secondSun = new Sun();
    if (sun.size + secondSun.size < 13) {
      sun.addToScene(this.sunPivotPoint, true);
      secondSun.addToScene(this.sunPivotPoint, true);
      this.suns.push(secondSun);
      this.placeSuns();
    }
    else {
      sun.addToScene(this.sunPivotPoint);
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

  placeSuns() {
    // Space out suns
    this.solarRadius = this.suns[0].size + this.suns[1].size + 20;
    this.suns[1].sun.position.x = this.solarRadius;
    this.minimumDistance = this.solarRadius * 1.5;
    // Find center of mass
    const centerOfMass = this.suns[1].mass*this.suns[1].sun.position.x/(this.suns[0].mass + this.suns[1].mass);
    // Move suns around center of mass
    this.suns[0].sun.position.x = -centerOfMass;
    this.suns[0].distanceFromCenter = Math.abs(this.suns[0].sun.position.x);
    this.suns[1].sun.position.x = this.suns[1].sun.position.x - centerOfMass;
    this.suns[1].distanceFromCenter = Math.abs(this.suns[1].sun.position.x);
  }

  orbitSuns() {
      this.sunPivotPoint.rotation.z += this.direction * this.time.delta * 1/this.solarRadius * 0.01;
  }

  update() {
    if (this.suns.length == 2) {
      this.orbitSuns();
    }
    this.planets.forEach(planet => {
      planet.update();
    });
  }

  destroy() {
    this.ambientLight.removeFromParent();
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
