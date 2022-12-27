import * as THREE from 'three';
import Application from '../Application.js';

export default class Planet {
  constructor(planetNumber, minimumDistance, maximumDistance, direction) {
    this.application = new Application();
    this.seed = this.application.seed;
    this.scene = this.application.scene;
    this.time = this.application.time;
    this.resources = this.application.resources;
    this.debug = this.application.debug;

    this.planetNumber = planetNumber;
    this.minimumDistance = minimumDistance;
    this.maximumDistance = maximumDistance;
    this.direction = direction;

    this.generateProperties();
    this.addTouchPoint();
    this.addDebug();
  }

  generateProperties() {
    const exaggeratedDistanceFromSunModifier = 1.2;
    const speedModifier = 0.005;

    this.projectedDistanceFromSun = this.seed.fakeGaussianRandom(-12,13)*this.maximumDistance + this.minimumDistance;
    this.hue = this.seed.getRandom();
    this.saturation = this.seed.fakeGaussianRandom()*0.2+0.6;
    this.lightness = this.seed.fakeGaussianRandom()*0.2+0.4;
    this.size = this.seed.fakeGaussianRandom(-2,4)*6+1;
    this.rotationSpeed = this.seed.fakeGaussianRandom()*0.02;
    this.orbitEccentricity = this.seed.fakeGaussianRandom()*0;
    this.orbitAxis = this.seed.fakeGaussianRandom()*20-10;
    this.rockiness = this.seed.fakeGaussianRandom();
    this.iciness = this.seed.fakeGaussianRandom(-5,6)*50;
    this.surfaceTexture = Math.round(this.seed.getRandom()*6+1);
    this.tilt = (this.seed.fakeGaussianRandom()*180-90) * Math.PI/180;
    this.hasRings = this.seed.fakeGaussianRandom(this.size-5,12);
    if (this.hasRings >= 0.5) this.hasRings = true;
    else this.hasRings = false;
    this.ringSize = this.seed.fakeGaussianRandom(-1)*0.7;
    this.ringDistance = this.seed.fakeGaussianRandom(-1)*4+0.5;
    this.ringTilt = (this.seed.fakeGaussianRandom()*180-90) * Math.PI/180;
    this.numberOfRings = Math.floor(this.seed.fakeGaussianRandom(this.size-3)*10);
    if (!this.hasRings || this.ringSize < 0.15 || !this.numberOfRings) {
      this.ringSize = 0;
      this.ringDistance = 0;
      this.ringTilt = 0;
      this.numberOfRings = 0;
    }
    this.planetOccupiedArea = (this.size + this.ringSize * this.numberOfRings + this.ringDistance) * 1.8;
    this.actualDistanceFromSun = this.projectedDistanceFromSun + this.planetOccupiedArea;
    this.orbitalPosition = this.seed.getRandom()*2*Math.PI;
    this.speed = speedModifier * Math.pow(16, exaggeratedDistanceFromSunModifier) * (1 / Math.pow(this.actualDistanceFromSun, exaggeratedDistanceFromSunModifier));
  }

  addTouchPoint() {
    const tappableSphereGeometry = new THREE.SphereGeometry(12);
    const tappableSphereMaterial = new THREE.MeshBasicMaterial({visible: false});
    this.planetPivotPoint = new THREE.Mesh(tappableSphereGeometry, tappableSphereMaterial);
    this.planetPivotPoint.name = "planet";
    this.planetPivotPoint.planetNumber = this.planetNumber;
    this.scene.add(this.planetPivotPoint);
  }

  addToScene() {
    // Add planet to scene
    this.colour = new THREE.Color();
    this.colour.setHSL(this.hue, this.saturation, this.lightness);
    const normalMap = this.resources.items['normalMap0' + this.surfaceTexture];
    normalMap.generateMipMaps = false;
    normalMap.magFilter = THREE.NearestFilter;
    const sphereGeometry = new THREE.SphereGeometry( this.size, 48, 48 );
    const sphereMaterial = new THREE.MeshStandardMaterial( { color: this.colour, specular: this.colour, shininess: this.iciness, normalMap: normalMap, normalScale: new THREE.Vector2( this.rockiness, this.rockiness ) } );
    this.planetSphere = new THREE.Mesh( sphereGeometry, sphereMaterial );
    this.planetSphere.name = "planetCore";
    this.planetSphere.receiveShadow = true;
    this.planetSphere.castShadow = true;
    this.planetPivotPoint.add(this.planetSphere);
    
    // Debug axis
    if (this.debug.active) {
      const axisLineMaterial = new THREE.LineBasicMaterial({ color: 0x666666 });
      let axisPoints = [];
      const axisPoint1 = new THREE.Vector3(0, 0, this.size*-3);
      const axisPoint2 = new THREE.Vector3(0, 0, this.size*3);
      axisPoints.push(axisPoint1);
      axisPoints.push(axisPoint2); 
      const axisLineGeometry = new THREE.BufferGeometry().setFromPoints(axisPoints);
      this.axisLine = new THREE.Line(axisLineGeometry, axisLineMaterial);
      this.planetPivotPoint.add(this.axisLine);
    }

    // Add orbit path to scene
    const orbitLineMaterial = new THREE.LineBasicMaterial({ color: 0x222222 });
    const orbitPoints = [];
    for (let i=0; i < 2*Math.PI; i = i+Math.PI/128) {
      let position = this.determineOrbit(i);
      orbitPoints.push( new THREE.Vector3(position.x, position.y, position.z));
    }
    const orbitLineGeometry = new THREE.BufferGeometry().setFromPoints( orbitPoints );
    this.orbitLine = new THREE.Line( orbitLineGeometry, orbitLineMaterial );
    this.scene.add(this.orbitLine);

    // Add rings
    this.planetRings = [];
    for (let i=0; i < this.numberOfRings; i = i+1) {
      let ring = {};
      ring.ringStart = this.size + this.ringDistance + i*(this.ringSize);
      ring.ringEnd = ring.ringStart + this.ringSize;
      let ringGeometry = new THREE.RingGeometry(ring.ringStart, ring.ringEnd, 64, 32);
      let ringMaterial = new THREE.MeshStandardMaterial({ color: this.colour, transparent: true, opacity: this.seed.getRandom()*0.8+0.2, side: THREE.DoubleSide });
      ring.mesh = new THREE.Mesh (ringGeometry, ringMaterial);
      ring.mesh.name = "ring";
      ring.mesh.receiveShadow = true;
      ring.mesh.rotation.x = this.ringTilt;
      this.planetRings.push(ring);
      this.planetPivotPoint.add(ring.mesh);
    }

    // Tilt planet and rings
    this.planetPivotPoint.rotation.y = this.tilt;
  }

  removeFromScene() {
    // Reset pivot rotation
    this.planetPivotPoint.rotation.x = 0;
    this.planetPivotPoint.rotation.y = 0;
    this.planetPivotPoint.rotation.z = 0;

    if (this.planetSphere) {
      this.planetSphere.geometry.dispose();
      this.planetSphere.material.dispose();
      this.planetSphere.removeFromParent();
    }

    if (this.orbitLine) {
      this.orbitLine.geometry.dispose();
      this.orbitLine.material.dispose();
      this.orbitLine.removeFromParent();
    }

    if (this.axisLine) {
      this.axisLine.geometry.dispose();
      this.axisLine.material.dispose();
      this.axisLine.removeFromParent();
    }
    
    if (this.planetRings) {
      this.planetRings.forEach((item, index, object) => {
        item.mesh.geometry.dispose();
        item.mesh.material.dispose();
        item.mesh.removeFromParent();
      });
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

  determineFuturePosition(time) {
    const futureOrbitalPosition = this.orbitalPosition + this.speed * this.direction * time * 0.0625;
    return this.determineOrbit(futureOrbitalPosition);
  }
  
  determineOrbit(orbitalPosition) {
    let x = this.actualDistanceFromSun;
    let y = this.actualDistanceFromSun * Math.sqrt(1.0 - Math.pow(this.orbitEccentricity, 1));
    let z = Math.sin(2 * Math.PI * this.orbitAxis/360 ) * this.actualDistanceFromSun;

    return new THREE.Vector3(Math.cos(orbitalPosition) * x, Math.sin(orbitalPosition) * y, Math.cos(orbitalPosition + 0) * z);
  }

  destroy() {
    if (this.debug.active) {
      this.debugFolder.destroy();
    }

    this.removeFromScene();

    this.planetPivotPoint.geometry.dispose();
    this.planetPivotPoint.material.dispose();
    this.planetPivotPoint.removeFromParent();
  }

  addDebug() {
    if(this.debug.active) {
      this.debugFolder = this.debug.ui.addFolder('Planet ' + this.planetNumber).close();

      this.debugFolder
        .add(this, 'hue')
        .name('hue')
        .min(0)
        .max(1)
        .step(0.001)
        .onChange(() => {
          this.removeFromScene();
          this.addToScene();
        });

      this.debugFolder
        .add(this, 'saturation')
        .name('saturation')
        .min(0.6)
        .max(0.8)
        .step(0.001)
        .onChange(() => {
          this.removeFromScene();
          this.addToScene();
        });

      this.debugFolder
        .add(this, 'lightness')
        .name('lightness')
        .min(0.4)
        .max(0.6)
        .step(0.001)
        .onChange(() => {
          this.removeFromScene();
          this.addToScene();
        });

      this.debugFolder
        .add(this, 'size')
        .name('size')
        .min(1)
        .max(7)
        .step(0.001)
        .onChange(() => {
          this.removeFromScene();
          this.addToScene();
        });

      this.debugFolder
        .add(this, 'rotationSpeed')
        .name('rotationSpeed')
        .min(0)
        .max(0.03)
        .step(0.001)
        .onChange(() => {
          this.removeFromScene();
          this.addToScene();
        });

      this.debugFolder
        .add(this, 'orbitAxis')
        .name('orbitAxis')
        .min(-10)
        .max(10)
        .step(0.001)
        .onChange(() => {
          this.removeFromScene();
          this.addToScene();
        });

      this.debugFolder
        .add(this, 'rockiness')
        .name('rockiness')
        .min(0)
        .max(1)
        .step(0.001)
        .onChange(() => {
          this.removeFromScene();
          this.addToScene();
        });

        this.debugFolder
        .add(this, 'iciness')
        .name('iciness')
        .min(0)
        .max(50)
        .step(1)
        .onChange(() => {
          this.removeFromScene();
          this.addToScene();
        });

      this.debugFolder
        .add(this, 'surfaceTexture')
        .name('surfaceTexture')
        .min(1)
        .max(7)
        .step(1)
        .onChange(() => {
          this.removeFromScene();
          this.addToScene();
        });

      this.debugFolder
        .add(this, 'tilt')
        .name('tilt')
        .min(-90 * Math.PI/180)
        .max(90 * Math.PI/180)
        .step(0.001)
        .onChange(() => {
          this.removeFromScene();
          this.addToScene();
        });

      this.debugFolder
        .add(this, 'ringSize')
        .name('ringSize')
        .min(0)
        .max(0.7)
        .step(0.001)
        .onChange(() => {
          this.removeFromScene();
          this.addToScene();
        });

      this.debugFolder
        .add(this, 'ringDistance')
        .name('ringDistance')
        .min(0.5)
        .max(4.5)
        .step(0.001)
        .onChange(() => {
          this.removeFromScene();
          this.addToScene();
        });

      this.debugFolder
        .add(this, 'ringTilt')
        .name('ringTilt')
        .min(-90 * Math.PI/180)
        .max(90 * Math.PI/180)
        .step(0.001)
        .onChange(() => {
          this.removeFromScene();
          this.addToScene();
        });

      this.debugFolder
        .add(this, 'numberOfRings')
        .name('numberOfRings')
        .min(0)
        .max(10)
        .step(1)
        .onChange(() => {
          this.removeFromScene();
          this.addToScene();
        });
    }
  }
}
