import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.145.0/three.module.js';

class Planet {
  constructor(colour, size, daysInAYear, orbitDistance, orbitEccentricity) {
    this.orbitPosition = 0;
    this.colour = colour;
    this.size = size;
    this.daysInAYear = daysInAYear;
    this.orbitDistance = orbitDistance;
    this.orbitEccentricity = orbitEccentricity;

    this.orbitalPosition = Math.random()*360;

    if (!this.colour) this.colour = new THREE.Color( Math.random()*0xffffff );
    if (!this.size) this.size = Math.random()*6;
    if (!this.daysInAYear) this.daysInAYear = 1;
    if (!this.orbitDistance) this.orbitDistance = -10 + Math.random()*-90;
    if (!this.orbitEccentricity) this.orbitEccentricity = Math.random()*0.1;

    const geometry = new THREE.SphereGeometry( this.size );
    const material = new THREE.MeshLambertMaterial( { color: this.colour } );
    this.sphere = new THREE.Mesh( geometry, material );
    this.sphere.position.set( this.orbitDistance, 0, 0);
  }

  addToScene(scene) {
    scene.add(this.sphere);
  }

  travel() {
    this.sphere.rotation.z += this.daysInAYear*0.01;
    let x = this.orbitDistance;
    let y = this.orbitDistance * Math.sqrt(1.0 - Math.pow(this.orbitEccentricity, 1));
    let z = Math.sin(0) * this.orbitDistance;
    this.orbitalPosition += 0.005;

    this.sphere.position.x = Math.cos(this.orbitalPosition) * x;
    this.sphere.position.y = Math.sin(this.orbitalPosition) * y;
    this.sphere.position.z = Math.cos(this.orbitalPosition + 0) * z;
  }
}

export { Planet };