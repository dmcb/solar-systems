import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.145.0/three.module.js';

class Planet {
  constructor(colour, size, daysInAYear, orbitDistance) {
    this.colour = colour;
    this.size = size;
    this.daysInAYear = daysInAYear;
    if (!this.colour) this.colour = new THREE.Color( Math.random()*0xffffff );
    if (!this.size) this.size = Math.random()*6;
    if (!this.daysInAYear) this.daysInAYear = 1;
    if (!this.orbitDistance) this.orbitDistance = -10 + Math.random()*-90;

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
  }
}

export { Planet };