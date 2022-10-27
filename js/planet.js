import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.145.0/three.module.js';
import { fakeGaussianRandom, randomFromSeed } from './utility.js';

const exaggeratedDistanceFromSunModifier = 1.2;
const speedModifier = 0.005;

class Planet {
  constructor(minimumDistance, maximumDistance, direction, colour, size, rotationSpeed, orbitEccentricity, rockiness, surfaceTexture) {
    this.minimumDistance = minimumDistance;
    this.maximumDistance = maximumDistance;
    this.direction = direction;
    this.colour = colour;
    this.size = size;
    this.rotationSpeed = rotationSpeed;
    this.orbitEccentricity = orbitEccentricity;
    this.rockiness = rockiness;
    this.surfaceTexture = surfaceTexture;

    if (!this.minimumDistance) this.minimumDistance = 20;
    if (!this.colour) this.colour = new THREE.Color( randomFromSeed()*0xffffff );
    if (!this.size) this.size = fakeGaussianRandom(-1,3)*7+1;
    if (!this.rotationSpeed) this.rotationSpeed = fakeGaussianRandom()*5;
    if (!this.orbitEccentricity) this.orbitEccentricity = fakeGaussianRandom()*0.2;
    if (!this.rockiness) this.rockiness = randomFromSeed();
    if (!this.surfaceTexture) this.surfaceTexture = Math.round(randomFromSeed()*3+1);

    this.distanceFromSun = this.minimumDistance + this.size*1.5 + fakeGaussianRandom(-9,10)*this.maximumDistance;
    this.orbitalPosition = randomFromSeed()*360;
    this.speed = speedModifier * Math.pow(16, exaggeratedDistanceFromSunModifier) * (1 / Math.pow(this.distanceFromSun, exaggeratedDistanceFromSunModifier));
  }

  addToScene(scene) {
    // Add planet to scene
    const textureLoader = new THREE.TextureLoader();
    const normalMap = textureLoader.load( 'textures/0' + this.surfaceTexture + '.jpg' );
    const sphereGeometry = new THREE.SphereGeometry( this.size );
    const sphereMaterial = new THREE.MeshLambertMaterial( { color: this.colour, normalMap: normalMap, normalScale: new THREE.Vector2( this.rockiness, this.rockiness ) } );
    this.sphere = new THREE.Mesh( sphereGeometry, sphereMaterial );
    this.sphere.position.set( this.distanceFromSun, 0, 0);
    scene.add(this.sphere);

    // Add orbit path to scene
    const lineMaterial = new THREE.LineBasicMaterial( { color: 0x333333 } );
    const points = [];
    for (let i=0; i < 2*Math.PI; i = i+Math.PI/32) {
      let position = this.determinePosition(i);
      points.push( new THREE.Vector3( position.x, position.y, position.z ) );
    }
    const lineGeometry = new THREE.BufferGeometry().setFromPoints( points );
    this.line = new THREE.Line( lineGeometry, lineMaterial );
    scene.add(this.line);
  }

  nextNeighbourMinimumDistance() {
    return this.distanceFromSun + this.size*1.5;
  }

  travel() {
    this.sphere.rotation.z += this.rotationSpeed*0.01;
    this.orbitalPosition += this.speed * this.direction;

    let position = this.determinePosition(this.orbitalPosition);

    this.sphere.position.x = position.x;
    this.sphere.position.y = position.y;
    this.sphere.position.z = position.z;
  }
  
  determinePosition(orbitalPosition) {
    let x = this.distanceFromSun;
    let y = this.distanceFromSun * Math.sqrt(1.0 - Math.pow(this.orbitEccentricity, 1));
    let z = Math.sin(0) * this.distanceFromSun;

    return { 
      x: Math.cos(orbitalPosition) * x,
      y: Math.sin(orbitalPosition) * y,
      z: Math.cos(orbitalPosition + 0) * z
    }
  }

  destroy() {
    this.sphere.geometry.dispose();
    this.sphere.removeFromParent();
    this.line.geometry.dispose();
    this.line.removeFromParent();
  }
}

export { Planet };