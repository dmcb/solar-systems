import * as THREE from 'three';
import Sun from '../objects/Sun.js';
import Planet from '../objects/Planet.js';
import Application from '../Application.js';
import StarrySkyShader from '../shaders/StarrySkyShader.js';

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

    this.addBackground();

    this.resources.on('ready', () => {
      this.create();
    });
  }
  
  addBackground() {
    var skyDomeRadius = 500;
    var sphereMaterial = new THREE.ShaderMaterial({
      uniforms: {
        skyRadius: { value: skyDomeRadius },
        env_c1: { value: new THREE.Color("#000000") },
        env_c2: { value: new THREE.Color("#130019") },
        envFrequency: { value: 5 },
        noiseOffset: { value: new THREE.Vector3(0, 0, 0) },
        starSize: { value: 0.0021 },
        starDensity: { value: 0.09 },
        starStrength: { value: 0.1 },
      },
      vertexShader: StarrySkyShader.vertexShader,
      fragmentShader: StarrySkyShader.fragmentShader,
      side: THREE.DoubleSide,
    })
    let starGeometry = new THREE.SphereGeometry(skyDomeRadius, 30, 30);
    var starDome = new THREE.Mesh(starGeometry, sphereMaterial);
    this.scene.add(starDome);
  }

  create() {
    this.maximumDistance = this.solarSystemRadius;
    this.direction = this.seed.getRandom();
    if (this.direction >= 0.5) this.direction = 1;
    else this.direction = -1;

    // Add ambient light
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.015);
    this.scene.add( this.ambientLight );

    // Add suns
    this.sunsPivotPoint = new THREE.Object3D();
    this.sunsPivotPoint.name = "sunsPivotPoint";
    this.scene.add(this.sunsPivotPoint);
    let sun = new Sun(1, this.direction);
    this.minimumDistance = sun.size*3;
    sun.addToScene();
    this.suns.push(sun);
    let secondSun = new Sun(2, this.direction);
    if (sun.size + secondSun.size < 16 && this.seed.getRandom() > 0.5) {
      this.sunDistance = this.seed.fakeGaussianRandom(0,2)*35+5;
      secondSun.addToScene();
      this.suns.push(secondSun);
      this.placeSuns();
    }
    else {
      secondSun.destroy();
    }

    // Add planets
    let planetNumber = 1;
    while (this.minimumDistance < this.maximumDistance) {
      let planet = new Planet(planetNumber, this.minimumDistance, this.maximumDistance, this.direction);
      planetNumber++;
      this.minimumDistance = planet.nextNeighbourMinimumDistance();
      if (this.minimumDistance < this.maximumDistance) {
        planet.addToScene(this.scene);
        this.planets.push(planet);
      }
      else {
        planet.destroy();
      }
    }
  }

  placeSuns() {
    if (this.suns.length > 1) {
      // Space out suns
      this.solarRadius = this.suns[0].size + this.suns[1].size + this.sunDistance;
      this.suns[1].sunPivotPoint.position.x = this.solarRadius;
      // Find center of mass
      const centerOfMass = this.suns[1].mass*this.suns[1].sunPivotPoint.position.x/(this.suns[0].mass + this.suns[1].mass);
      // Move suns around center of mass
      this.suns[0].sunPivotPoint.position.x = -centerOfMass;
      this.suns[0].distanceFromCenter = Math.abs(this.suns[0].sunPivotPoint.position.x);
      this.suns[1].sunPivotPoint.position.x = this.suns[1].sunPivotPoint.position.x - centerOfMass;
      this.suns[1].distanceFromCenter = Math.abs(this.suns[1].sunPivotPoint.position.x);
      // Determine minimum distance
      this.minimumDistance = Math.max(this.suns[0].distanceFromCenter+this.suns[0].size/2, this.suns[1].distanceFromCenter+this.suns[1].size/2) * 1.75;
    }
  }

  determineFutureSunsOrbit(time) {
    return this.sunsPivotPoint.rotation.z + this.direction * time * 1/this.solarRadius * 0.0035;
  }

  orbitSuns() {
    this.sunsPivotPoint.rotation.z += this.direction * this.time.delta * 1/this.solarRadius * 0.0035;
  }

  update() {
    if (this.suns.length == 2) {
      this.orbitSuns();
    }
    this.suns.forEach(sun => {
      sun.update();
    });
    this.planets.forEach(planet => {
      planet.update();
    });
  }

  destroy() {
    this.ambientLight.removeFromParent();
    this.sunsPivotPoint.removeFromParent();
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

  setFocus(objectId) {
    // Upscale planet?
  }
}
