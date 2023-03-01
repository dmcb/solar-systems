import * as THREE from 'three';
import Application from '../Application.js';
import TextureMap from '../maps/TextureMap.js';

const exaggeratedDistanceFromSunModifier = 1.2;
// To do: timeModifier shouldn't be locked away in Planet but set by the scene
const timeModifier = 0.0003125;
export default class Planet {
  constructor(planetNumber, minimumDistance, maximumDistance, direction) {
    this.application = new Application();
    this.seed = this.application.seed;
    this.scene = this.application.scene;
    this.time = this.application.time;
    this.solarSystem = this.application.solarSystem;
    this.debug = this.application.debug;
    this.textureMap = new TextureMap();

    this.planetNumber = planetNumber;
    this.minimumDistance = minimumDistance;
    this.maximumDistance = maximumDistance;
    this.direction = direction;

    this.generateProperties();
    this.addTouchPoint();
    this.addDebug();

    this.textureMap.on('generation', () => {
      this.updateMaterial();
    });
  }

  generateProperties() {
    this.size = this.seed.fakeGaussianRandom(-2,4)*5+1;
    this.rotationSpeed = this.seed.fakeGaussianRandom();
    this.tilt = (this.seed.fakeGaussianRandom()*180-90) * Math.PI/180;

    this.materials = [];
    this.hue = this.seed.getRandom();
    this.saturation = this.seed.fakeGaussianRandom()*0.2+0.6;
    this.lightness = this.seed.fakeGaussianRandom()*0.2+0.4;
    this.rockiness = this.seed.fakeGaussianRandom();
    this.iciness = this.seed.fakeGaussianRandom(-5,6)*50;

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
  
    this.planetOccupiedArea = this.size + this.ringSize * this.numberOfRings + this.ringDistance;
    this.planetSphereOfInfluence = this.planetOccupiedArea * 1.8;
    this.orbitalPosition = this.seed.getRandom()*2*Math.PI;
    this.orbitOffset = this.seed.getRandom()*360;
  
    // Generate potential orbit
    this.generateOrbit();
  }

  generateOrbit() {
    this.projectedDistanceFromSun = this.seed.fakeGaussianRandom(-12,13)*this.maximumDistance + this.minimumDistance;
    this.actualDistanceFromSun = this.projectedDistanceFromSun + this.planetSphereOfInfluence;
    this.orbitAxis = this.seed.fakeGaussianRandom(0,6*Math.pow(this.maximumDistance/this.actualDistanceFromSun, 1.5))*90-45;
    this.orbitEccentricity = Math.abs(this.seed.fakeGaussianRandom(0,6*Math.pow(this.maximumDistance/this.actualDistanceFromSun, 2))*1-0.5);
    this.setOrbit();
    this.checkOrbitCollision();
  }

  setOrbit() {
    this.orbitPoints = [];
    for (let i=0; i < 2*Math.PI; i = i+Math.PI/128) {
      let position = this.determinePointInOrbit(i);
      this.orbitPoints.push( new THREE.Vector3(position.x, position.y, position.z));
    }
  }

  checkOrbitCollision() {
    // Check for orbit collisions
    let collision = false;
    this.solarSystem.planets.forEach((item, index, object) => {
      // Loop through all points in orbit and check distance to established orbits
      // This is super brute force and could be improved with some real math
      for (let i=0; i < item.orbitPoints.length; i++) {
        for (let j=0; j < this.orbitPoints.length; j++) {
          let distance = item.orbitPoints[i].distanceTo(this.orbitPoints[j]);
          if (!collision && distance < this.planetSphereOfInfluence + item.planetSphereOfInfluence) {
            collision = true;
            console.log('There was a collision, re-orbiting Planet' + this.planetNumber);
          }
        }
      }
    });
    if (collision) {
      this.generateOrbit();
    }
  }

  addTouchPoint() {
    const tappableSphereGeometry = new THREE.SphereGeometry(16);
    const tappableSphereMaterial = new THREE.MeshBasicMaterial({visible: false});
    this.planetPivotPoint = new THREE.Mesh(tappableSphereGeometry, tappableSphereMaterial);
    this.planetPivotPoint.name = "planet";
    this.planetPivotPoint.planetNumber = this.planetNumber;
    this.scene.add(this.planetPivotPoint);
  }

  addToScene() {
    // Create geometry
    let sphereGeometry = new THREE.BoxGeometry(1, 1, 1, 32, 32, 32);
    for (let i=0; i < sphereGeometry.attributes.position.count; i++) {
      var x = sphereGeometry.attributes.position.getX(i);
      var y = sphereGeometry.attributes.position.getY(i);
      var z = sphereGeometry.attributes.position.getZ(i);
      let vertex = new THREE.Vector3(x,y,z);
      vertex.normalize().multiplyScalar(this.size);
      sphereGeometry.attributes.position.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    sphereGeometry.computeVertexNormals();
    
    // Set materials
    this.colour = new THREE.Color();
    this.colour.setHSL(this.hue, this.saturation, this.lightness);
    for (let i=0; i<6; i++) {
      let material = new THREE.MeshStandardMaterial({
        color: this.colour,
        // roughness: this.rockiness,
        // metalness: this.iciness
      });
      this.materials[i] = material;
    }
    this.textureMap.generate(this.colour);
    // normalMap.generateMipMaps = false;
    // normalMap.magFilter = THREE.NearestFilter;
    
    // Add mesh to scene
    this.planetSphere = new THREE.Mesh(sphereGeometry, this.materials);
    this.planetSphere.name = "planetCore";
    this.planetSphere.receiveShadow = true;
    this.planetSphere.castShadow = true;
    this.planetPivotPoint.add(this.planetSphere);
    this.planetPivotPoint.position.copy(this.determinePointInOrbit(this.orbitalPosition));
    
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

    // Add rings
    this.planetRings = [];
    for (let i=0; i < this.numberOfRings; i = i+1) {
      let ring = {};
      ring.ringStart = this.size + this.ringDistance + i*(this.ringSize);
      ring.ringEnd = ring.ringStart + this.ringSize;
      let ringGeometry = new THREE.RingGeometry(ring.ringStart, ring.ringEnd, 64, 32);
      let ringMaterial = new THREE.MeshPhongMaterial({ color: this.colour, transparent: true, opacity: this.seed.getRandom()*0.8+0.2, side: THREE.DoubleSide });
      ring.mesh = new THREE.Mesh (ringGeometry, ringMaterial);
      ring.mesh.name = "ring";
      ring.mesh.receiveShadow = true;
      ring.mesh.rotation.x = this.ringTilt;
      this.planetRings.push(ring);
      this.planetPivotPoint.add(ring.mesh);
    }

    // Tilt planet and rings
    this.planetPivotPoint.rotation.y = this.tilt;

    // Add orbit
    this.setOrbit();
    this.showOrbit();
  }

  removeFromScene() {
    // Reset pivot rotation
    this.planetPivotPoint.rotation.x = 0;
    this.planetPivotPoint.rotation.y = 0;
    this.planetPivotPoint.rotation.z = 0;

    if (this.planetSphere) {
      this.planetSphere.geometry.dispose();
      for (let i=0; i<6; i++) {
        this.materials[i].dispose();
      }
      this.planetSphere.removeFromParent();
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

    this.hideOrbit();
  }

  nextNeighbourMinimumDistance() {
    return this.actualDistanceFromSun +this.planetSphereOfInfluence;
  }

  update() {
    // Rotate the planet on its axis (day)
    this.planetSphere.rotation.z += this.rotationSpeed * this.time.delta * timeModifier;

    // Orbit the planet (year)
    this.orbitalPosition += this.determineSpeed() * this.direction * this.time.delta * timeModifier;
    let position = this.determinePointInOrbit(this.orbitalPosition);
    this.planetPivotPoint.position.copy(position);
  }

  updateMaterial() {
    for (let i=0; i<6; i++) {
      this.materials[i].map = this.textureMap.maps[i];
      this.materials[i].needsUpdate = true;
    }
  }

  determineFuturePosition(time) {
    const futureOrbitalPosition = this.orbitalPosition + this.determineSpeed() * this.direction * time * timeModifier;
    return this.determinePointInOrbit(futureOrbitalPosition);
  }
  
  determinePointInOrbit(orbitalPosition) {
    let x = this.actualDistanceFromSun;
    let y = this.actualDistanceFromSun * Math.sqrt(1.0 - Math.pow(this.orbitEccentricity, 1));
    let z = 0;

    return new THREE.Vector3(
      Math.cos(orbitalPosition) * x - (this.projectedDistanceFromSun * this.orbitEccentricity),
      Math.sin(orbitalPosition) * y,
      Math.cos(orbitalPosition) * z
    ).applyAxisAngle(new THREE.Vector3(1,0,0), this.orbitAxis * 2 * Math.PI/360).applyAxisAngle(new THREE.Vector3(0,0,1), this.orbitOffset * 2 * Math.PI/360);
  }

  determineSpeed() {
    return Math.pow(16, exaggeratedDistanceFromSunModifier) * (1 / Math.pow(this.planetPivotPoint.position.distanceTo(new THREE.Vector3(0,0,0)), exaggeratedDistanceFromSunModifier));
  }

  showOrbit() {
    if (!this.orbitLine) {
      const orbitLineMaterial = new THREE.LineBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.6 });
      const orbitLineGeometry = new THREE.BufferGeometry().setFromPoints( this.orbitPoints );
      this.orbitLine = new THREE.Line( orbitLineGeometry, orbitLineMaterial );
      this.scene.add(this.orbitLine);
    }
  }

  hideOrbit() {
    if (this.orbitLine) {
      this.orbitLine.geometry.dispose();
      this.orbitLine.material.dispose();
      this.orbitLine.removeFromParent();
      delete(this.orbitLine);
    }
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
        .max(6)
        .step(0.001)
        .onChange(() => {
          this.removeFromScene();
          this.addToScene();
        });

      this.debugFolder
        .add(this, 'rotationSpeed')
        .name('rotationSpeed')
        .min(0)
        .max(1)
        .step(0.01)
        .onChange(() => {
          this.removeFromScene();
          this.addToScene();
        });

      this.debugFolder
        .add(this, 'orbitAxis')
        .name('orbitAxis')
        .min(-45)
        .max(45)
        .step(0.1)
        .onChange(() => {
          this.removeFromScene();
          this.addToScene();
        });

      this.debugFolder
        .add(this, 'orbitEccentricity')
        .name('orbitEccentricity')
        .min(0)
        .max(0.5)
        .step(0.01)
        .onChange(() => {
          this.removeFromScene();
          this.addToScene();
        });

      this.debugFolder
        .add(this, 'orbitOffset')
        .name('orbitOffset')
        .min(0)
        .max(360)
        .step(1)
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
