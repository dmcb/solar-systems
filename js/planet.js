import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.145.0/three.module.js';
import { cheapGaussianRandom } from './utility.js';

const exaggerateddistanceFromSunModifier = 1.6;
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
    if (!this.colour) this.colour = new THREE.Color( Math.random()*0xffffff );
    if (!this.size) this.size = cheapGaussianRandom(-2)*4+1;
    if (!this.daysInAYear) this.daysInAYear = 1;
    if (!this.orbitEccentricity) this.orbitEccentricity = cheapGaussianRandom()*0.1;

    this.distanceFromSun = this.minimumDistance + this.size*1.5 + cheapGaussianRandom(-9,10)*this.maximumDistance;
    this.orbitalPosition = Math.random()*360;
    this.speed = (0.8 / (Math.pow(this.distanceFromSun, exaggerateddistanceFromSunModifier)));
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