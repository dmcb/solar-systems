import * as THREE from 'three';
import Application from '../Application.js';

export default class Planet {
  constructor(minimumDistance, maximumDistance, direction) {
    const exaggeratedDistanceFromSunModifier = 1.2;
    const speedModifier = 0.005;

    this.application = new Application();
    this.seed = this.application.seed;
    this.scene = this.application.scene;
    this.time = this.application.time;
    this.resources = this.application.resources;

    this.minimumDistance = minimumDistance;
    this.maximumDistance = maximumDistance;
    this.direction = direction;

    this.projectedDistanceFromSun = this.seed.fakeGaussianRandom(-9,10)*this.maximumDistance + this.minimumDistance;
    this.colour = new THREE.Color( this.seed.getRandom()*0xffffff );
    this.size = this.seed.fakeGaussianRandom(-1,3)*6+1;
    this.rotationSpeed = this.seed.fakeGaussianRandom()*0.03;
    this.orbitEccentricity = this.seed.fakeGaussianRandom()*0;
    this.orbitAxis = this.seed.fakeGaussianRandom()*20-10;
    this.rockiness = this.seed.fakeGaussianRandom();
    this.surfaceTexture = Math.round(this.seed.getRandom()*6+1);
    this.tilt = this.seed.fakeGaussianRandom(-9,10)*90;
    this.ringSize = this.seed.fakeGaussianRandom(-5)*this.size*2.2;
    this.ringDistance = this.seed.fakeGaussianRandom()*4;
    this.ringAxis = this.seed.fakeGaussianRandom(-9,10)*90;
    this.numberOfRings = Math.floor(this.seed.fakeGaussianRandom()*10);
    if (this.ringSize < 1 || !this.numberOfRings) {
      this.ringSize = 0;
      this.ringDistance = 0;
      this.ringAxis = 0;
      this.numberOfRings = 0;
    }
    this.planetOccupiedArea = (this.size + this.ringSize + this.ringDistance) * 1.5;
    this.actualDistanceFromSun = this.projectedDistanceFromSun + this.planetOccupiedArea;
    this.orbitalPosition = this.seed.getRandom()*2*Math.PI;
    this.speed = speedModifier * Math.pow(16, exaggeratedDistanceFromSunModifier) * (1 / Math.pow(this.actualDistanceFromSun, exaggeratedDistanceFromSunModifier));
  }

  addToScene() {
    // Add planet to scene
    const normalMap = this.resources.items['normalMap0' + this.surfaceTexture];
    const sphereGeometry = new THREE.SphereGeometry( this.size );
    const sphereMaterial = new THREE.MeshPhongMaterial( { color: this.colour, shininess: 1, normalMap: normalMap, normalScale: new THREE.Vector2( this.rockiness, this.rockiness ) } );
    this.planetSphere = new THREE.Mesh( sphereGeometry, sphereMaterial );
    this.planetSphere.name = "planet";
    this.planetSphere.rotation.x = this.tilt;
    this.planetSphere.receiveShadow = true;
    this.planetSphere.castShadow = true;
    this.planetPivotPoint = new THREE.Object3D();
    this.scene.add(this.planetPivotPoint);
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
    this.scene.add(this.orbitLine);

    // Add rings
    this.planetRings = [];
    for (let i=0; i < this.numberOfRings; i = i+1) {
      let ring = {};
      ring.ringStart = this.size + this.ringDistance + i*(this.ringSize/this.numberOfRings);
      ring.ringEnd = ring.ringStart + (this.ringSize/this.numberOfRings);
      let ringGeometry = new THREE.RingGeometry(ring.ringStart, ring.ringEnd, 32);
      let ringMaterial = new THREE.MeshPhongMaterial( { color: this.colour, transparent: true, opacity: this.seed.getRandom()*0.8+0.2, side: THREE.DoubleSide } );
      ring.mesh = new THREE.Mesh (ringGeometry, ringMaterial);
      ring.mesh.name = "ring";
      ring.mesh.receiveShadow = true;
      ring.mesh.rotation.x = this.ringAxis;
      this.planetRings.push(ring);
      this.planetPivotPoint.add(ring.mesh);
    }
  }

  nextNeighbourMinimumDistance() {
    return this.actualDistanceFromSun +this.planetOccupiedArea;
  }

  update() {
    // Rotate the planet on its axis (day)
    this.planetSphere.rotation.z += this.rotationSpeed * this.time.delta * 0.0625;

    // Orbit the planet (year)
    this.orbitalPosition += this.speed * this.direction * this.time.delta * 0.0625;
    let position = this.determineOrbit(this.orbitalPosition);
    this.planetPivotPoint.position.x = position.x;
    this.planetPivotPoint.position.y = position.y;
    this.planetPivotPoint.position.z = position.z;
  }
  
  determineOrbit(orbitalPosition) {
    let x = this.actualDistanceFromSun;
    let y = this.actualDistanceFromSun * Math.sqrt(1.0 - Math.pow(this.orbitEccentricity, 1));
    let z = Math.sin(2 * Math.PI * this.orbitAxis/360 ) * this.actualDistanceFromSun;

    return { 
      x: Math.cos(orbitalPosition) * x,
      y: Math.sin(orbitalPosition) * y,
      z: Math.cos(orbitalPosition + 0) * z
    }
  }

  destroy() {
    this.planetSphere.geometry.dispose();
    this.planetSphere.material.dispose();
    this.planetSphere.removeFromParent();
    this.orbitLine.geometry.dispose();
    this.orbitLine.material.dispose();
    this.orbitLine.removeFromParent();
    this.planetRings.forEach((item, index, object) => {
      item.mesh.geometry.dispose();
      item.mesh.material.dispose();
      item.mesh.removeFromParent();
    });
  }
}
