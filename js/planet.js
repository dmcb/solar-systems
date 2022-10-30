import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.145.0/three.module.js';
import { fakeGaussianRandom, randomFromSeed } from './utility.js';

const exaggeratedDistanceFromSunModifier = 1.2;
const speedModifier = 0.005;

class Planet {
  constructor(minimumDistance, maximumDistance, direction) {
    this.minimumDistance = minimumDistance;
    this.maximumDistance = maximumDistance;
    this.direction = direction;
    this.projectedDistanceFromSun = fakeGaussianRandom(-9,10)*this.maximumDistance + this.minimumDistance;

    this.colour = new THREE.Color( randomFromSeed()*0xffffff );
    this.size = fakeGaussianRandom(-1,3)*6+1;
    this.rotationSpeed = fakeGaussianRandom()*3;
    this.orbitEccentricity = fakeGaussianRandom()*0.2;
    this.rockiness = fakeGaussianRandom();
    this.surfaceTexture = Math.round(randomFromSeed()*6+1);
    this.ringSize = fakeGaussianRandom(-9,10)*this.size*2;
    this.ringDistance = fakeGaussianRandom()*4;
    if (this.ringSize < 1) {
      this.ringSize = 0;
      this.ringDistance = 0;
    }
    this.planetOccupiedArea = (this.size + this.ringSize + this.ringDistance) * 1.5;
    this.actualDistanceFromSun = this.projectedDistanceFromSun + this.planetOccupiedArea;
    this.orbitalPosition = randomFromSeed()*2*Math.PI;
    this.speed = speedModifier * Math.pow(16, exaggeratedDistanceFromSunModifier) * (1 / Math.pow(this.actualDistanceFromSun, exaggeratedDistanceFromSunModifier));
  }

  addToScene(scene) {
    // Add planet to scene
    const textureLoader = new THREE.TextureLoader();
    const normalMap = textureLoader.load( 'textures/0' + this.surfaceTexture + '.jpg' );
    const sphereGeometry = new THREE.SphereGeometry( this.size );
    const sphereMaterial = new THREE.MeshPhongMaterial( { color: this.colour, shininess: 1, normalMap: normalMap, normalScale: new THREE.Vector2( this.rockiness, this.rockiness ) } );
    this.sphere = new THREE.Mesh( sphereGeometry, sphereMaterial );
    this.sphere.position.set( this.actualDistanceFromSun, 0, 0);
    scene.add(this.sphere);

    // Add orbit path to scene
    const orbitLineMaterial = new THREE.LineBasicMaterial( { color: 0x333333 } );
    const orbitPoints = [];
    for (let i=0; i < 2*Math.PI; i = i+Math.PI/32) {
      let position = this.determineOrbit(i);
      orbitPoints.push( new THREE.Vector3( position.x, position.y, position.z ) );
    }
    const orbitLineGeometry = new THREE.BufferGeometry().setFromPoints( orbitPoints );
    this.orbitLine = new THREE.Line( orbitLineGeometry, orbitLineMaterial );
    scene.add(this.orbitLine);

    // Add rings
    const ringStart = this.size + this.ringDistance;
    const ringEnd = ringStart + this.ringSize;
    this.ringLines = [];
    for (let i=ringStart; i < ringEnd; i = i+0.2) {
      let ringPoints = [];
      let ringColourPoints = [];
      for (let j=0; j < 2*Math.PI; j = j+Math.PI/32) {
        let shadow = 1 - (Math.cos(j) + Math.sin(j)) / (Math.cos(Math.PI/4) + Math.sin(Math.PI/4));
        if (shadow > 1) {
          shadow = 1;
        }
        else if (shadow < 0.2) {
          shadow = 0.2;
        }
        ringPoints.push( new THREE.Vector3( Math.cos(j)*i, Math.sin(j)*i, 0 ) );
        ringColourPoints.push( this.colour.r * shadow, this.colour.g * shadow, this.colour.b * shadow );
      }
      let ringLineGeometry = new THREE.BufferGeometry().setFromPoints( ringPoints );
      ringLineGeometry.setAttribute('color', new THREE.Float32BufferAttribute( ringColourPoints, 3 ));
      let ringLineMaterial = new THREE.LineBasicMaterial( { vertexColors: true, transparent: true, opacity: fakeGaussianRandom()*0.5 });
      let ringLine = new THREE.Line( ringLineGeometry, ringLineMaterial );
      this.ringLines.push(ringLine);
      this.sphere.add(ringLine);
    }
  }

  nextNeighbourMinimumDistance() {
    return this.actualDistanceFromSun +this.planetOccupiedArea;
  }

  travel() {
    // Rotate the planet on its axis (day)
    this.sphere.rotation.z += this.rotationSpeed*0.01;

    // Orbit the planet (year)
    this.orbitalPosition += this.speed * this.direction;
    let position = this.determineOrbit(this.orbitalPosition);
    this.sphere.position.x = position.x;
    this.sphere.position.y = position.y;
    this.sphere.position.z = position.z;

    // Align ring shadows
    this.ringLines.forEach((item, index, object) => {
      item.rotation.z = (this.sphere.rotation.z * -1) + this.orbitalPosition - Math.PI/4;
    });
  }
  
  determineOrbit(orbitalPosition) {
    let x = this.actualDistanceFromSun;
    let y = this.actualDistanceFromSun * Math.sqrt(1.0 - Math.pow(this.orbitEccentricity, 1));
    let z = Math.sin(0) * this.actualDistanceFromSun;

    return { 
      x: Math.cos(orbitalPosition) * x,
      y: Math.sin(orbitalPosition) * y,
      z: Math.cos(orbitalPosition + 0) * z
    }
  }

  destroy() {
    this.sphere.geometry.dispose();
    this.sphere.removeFromParent();
    this.orbitLine.geometry.dispose();
    this.orbitLine.removeFromParent();
    this.ringLines.forEach((item, index, object) => {
      item.geometry.dispose();
      item.removeFromParent();
    });
  }
}

export { Planet };