import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.145.0/three.module.js';
import { fakeGaussianRandom, randomFromSeed } from './utility.js';

const exaggeratedDistanceFromSunModifier = 1.2;
const speedModifier = 0.005;
class Planet {
  constructor(minimumDistance, maximumDistance, direction, colour, size, daysInAYear, orbitEccentricity) {
    this.minimumDistance = minimumDistance;
    this.maximumDistance = maximumDistance;
    this.direction = direction;
    this.colour = colour;
    this.size = size;
    this.daysInAYear = daysInAYear;
    this.orbitEccentricity = orbitEccentricity;

    if (!this.minimumDistance) this.minimumDistance = 20;
    if (!this.colour) this.colour = new THREE.Color( randomFromSeed()*0xffffff );
    if (!this.size) this.size = fakeGaussianRandom(-2)*6+0.5;
    if (!this.daysInAYear) this.daysInAYear = 1;
    if (!this.orbitEccentricity) this.orbitEccentricity = fakeGaussianRandom()*0.1;

    this.distanceFromSun = this.minimumDistance + this.size*1.5 + fakeGaussianRandom(-9,10)*this.maximumDistance;
    this.orbitalPosition = randomFromSeed()*360;
    this.speed = speedModifier * Math.pow(16, exaggeratedDistanceFromSunModifier) * (1 / Math.pow(this.distanceFromSun, exaggeratedDistanceFromSunModifier));
  }

  addToScene(scene) {
    const geometry = new THREE.SphereGeometry( this.size );
    const material = new THREE.MeshLambertMaterial( { color: this.colour } );
    this.sphere = new THREE.Mesh( geometry, material );
    this.sphere.position.set( this.distanceFromSun, 0, 0);
    scene.add(this.sphere);
  }

  nextNeighbourMinimumDistance() {
    return this.distanceFromSun + this.size*1.5;
  }

  travel() {
    this.sphere.rotation.z += this.daysInAYear*0.01;
    let x = this.distanceFromSun;
    let y = this.distanceFromSun * Math.sqrt(1.0 - Math.pow(this.orbitEccentricity, 1));
    let z = Math.sin(0) * this.distanceFromSun;
    this.orbitalPosition += this.speed * this.direction;

    this.sphere.position.x = Math.cos(this.orbitalPosition) * x;
    this.sphere.position.y = Math.sin(this.orbitalPosition) * y;
    this.sphere.position.z = Math.cos(this.orbitalPosition + 0) * z;
  }
}

export { Planet };