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
    this.tilt = fakeGaussianRandom(-9,10)*90;
    this.ringSize = fakeGaussianRandom(-5)*this.size*2.2;
    this.ringDistance = fakeGaussianRandom()*4;
    this.ringAxis = fakeGaussianRandom(-9,10)*90;
    this.numberOfRings = Math.floor(randomFromSeed()*10);
    if (this.ringSize < 1 || !this.numberOfRings) {
      this.ringSize = 0;
      this.ringDistance = 0;
      this.ringAxis = 0;
      this.numberOfRings = 0;
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
    this.planetSphere = new THREE.Mesh( sphereGeometry, sphereMaterial );
    this.planetSphere.rotation.x = this.tilt;
    this.planetSphere.receiveShadow = true;
    this.planetSphere.castShadow = true;
    this.planetPivotPoint = new THREE.Object3D();
    scene.add(this.planetPivotPoint);
    this.planetPivotPoint.add(this.planetSphere);

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
    this.planetRings = [];
    for (let i=0; i < this.numberOfRings; i = i+1) {
      let ring = {};
      ring.ringStart = this.size + this.ringDistance + i*(this.ringSize/this.numberOfRings);
      ring.ringEnd = ring.ringStart + (this.ringSize/this.numberOfRings);
      let ringGeometry = new THREE.RingGeometry(ring.ringStart, ring.ringEnd, 32);
      let ringMaterial = new THREE.MeshPhongMaterial( { color: this.colour, transparent: true, opacity: randomFromSeed()*0.8+0.2, side: THREE.DoubleSide } );
      ring.mesh = new THREE.Mesh (ringGeometry, ringMaterial);
      ring.mesh.receiveShadow = true;
      ring.mesh.rotation.x = this.ringAxis;
      this.planetRings.push(ring);
      this.planetPivotPoint.add(ring.mesh);
    }
  }

  nextNeighbourMinimumDistance() {
    return this.actualDistanceFromSun +this.planetOccupiedArea;
  }

  travel() {
    // Rotate the planet on its axis (day)
    this.planetSphere.rotation.z += this.rotationSpeed*0.01;

    // Orbit the planet (year)
    this.orbitalPosition += this.speed * this.direction;
    let position = this.determineOrbit(this.orbitalPosition);
    this.planetPivotPoint.position.x = position.x;
    this.planetPivotPoint.position.y = position.y;
    this.planetPivotPoint.position.z = position.z;

    // Rotate rings
    this.planetRings.forEach((item, index, object) => {
      // Bug here, this is trying to undo planets rotation, but ring
      // is tilted, so this Z rotation modifier is acting on rotated disk
      // item.mesh.rotation.z = -1 * this.planetSphere.rotation.x;
      // item.position.setFromMatrixPosition( this.object.matrixWorld )
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
    this.planetSphere.geometry.dispose();
    this.planetSphere.removeFromParent();
    this.orbitLine.geometry.dispose();
    this.orbitLine.removeFromParent();
    this.planetRings.forEach((item, index, object) => {
      item.mesh.geometry.dispose();
      item.mesh.removeFromParent();
    });
  }
}

export { Planet };