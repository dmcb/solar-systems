import * as THREE from 'three';
import Application from '../Application.js';
import Map from '../utils/Map.js';
import NormalShader from '../shaders/NormalShader.js';
import RoughnessShader from '../shaders/RoughnessShader.js';
import GasPlanetTextureShader from '../shaders/GasPlanetTextureShader.js';
import RockyPlanetHeightShader from '../shaders/RockyPlanetHeightShader.js';
import RockyPlanetTextureShader from '../shaders/RockyPlanetTextureShader.js';
import RingShader from '../shaders/RingShader.js';

const exaggeratedDistanceFromSunModifier = 1.25;
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
    this.queue = this.application.queue;

    this.heightMap = new Map();
    this.normalMap = new Map();
    this.roughnessMap = new Map();
    this.planetTextureMap = new Map();
    this.ringTextureMap = new Map(256, 1);

    this.planetNumber = planetNumber;
    this.minimumDistance = minimumDistance;
    this.maximumDistance = maximumDistance;
    this.direction = direction;

    this.generateProperties();
    this.addTouchPoint();
    this.addDebug();
  }

  generateProperties() {  
    // Set size based off rocky or gaseous based off of distance from sun

    // Basing this off minimum leads to some not great results though, but
    // we don't have final orbit because final orbit is produced from size
    // so not sure what to do yet — we may have to regenerate everything
    this.rocky = Math.round(this.seed.fakeGaussianRandom((8*(this.maximumDistance-this.minimumDistance)/this.maximumDistance)-4));
    if (this.rocky) {
      this.size = this.seed.fakeGaussianRandom(-3)*3.5+1;
      // Atmosphere probability mostly based off being not too far or too close to sun
      let atmosphereProbabilityBias = -12*Math.abs(1-((this.maximumDistance-this.minimumDistance*1.3)/(this.maximumDistance*0.5)));
      // But size also affects it
      atmosphereProbabilityBias += Math.pow(Math.max(0, this.size-0.75), 3);
      atmosphereProbabilityBias = Math.max(-9, atmosphereProbabilityBias);
      // Would love orbit eccentricity to negatively affect this too
      // console.log([this.minimumDistance, atmosphereProbabilityBias]);
      this.atmosphere = this.seed.fakeGaussianRandom(atmosphereProbabilityBias, 10);
      if (this.atmosphere > 0.5 && this.atmosphere < 0.75) {
        this.habitable = 1;
        this.inhabited = Math.round(this.seed.fakeGaussianRandom(-4));
        if (this.inhabited) {
          console.log('Planet ' + this.planetNumber + ' is inhabited');
        }
        else {
          console.log('Planet ' + this.planetNumber + ' is habitable');
        }
      }
      else {
        this.habitable = 0;
        this.inhabited = 0;
        if (this.atmosphere >= 0.75) {
          console.log('Planet ' + this.planetNumber + ' has a runaway greenhouse effect');
        }
        else {
          console.log('Planet ' + this.planetNumber + ' lacks atmosphere');
        }
      }
    }
    else {
      this.size = this.seed.fakeGaussianRandom(1)*4.5+1.5;
      this.atmosphere = 1;
      this.habitable = 0;
      this.inhabited = 0;
      console.log('Planet ' + this.planetNumber + ' is a gas giant');
    }

    // Set rings
    this.hasRings = Math.round(this.seed.fakeGaussianRandom(this.size-4));
    this.ringSize = Math.abs(this.seed.fakeGaussianRandom(0,2)-0.5)*2*3.85+0.15;
    this.ringDistance = this.seed.fakeGaussianRandom(0,2)*3+0.85;
    this.ringTilt = (this.seed.fakeGaussianRandom()*180-90) * Math.PI/180;
    this.ringDensity = this.seed.getRandom();
    this.ringDefinition = this.seed.getRandom();
    this.ringThickness = this.seed.fakeGaussianRandom(0,2);
    this.ringColourVariability = this.seed.getRandom();
  
    // With complete size and rings defined, set occupied area
    this.planetOccupiedArea = this.size;
    if (this.hasRings) {
      this.planetOccupiedArea += this.ringSize + this.ringDistance;
    }
    this.planetSphereOfInfluence = this.planetOccupiedArea * 1.8;

    // Generate orbit
    this.orbitalPosition = this.seed.getRandom()*2*Math.PI;
    this.orbitOffset = this.seed.getRandom()*360;
    this.generateOrbit();

    // Set rotation
    this.rotationSpeed = this.seed.fakeGaussianRandom(-2);
    this.tilt = (this.seed.fakeGaussianRandom()*180-90) * Math.PI/180;

    // Set oblateness and flattening
    const oblatenessRolls = Math.max(1, 10-(18*Math.pow(this.rotationSpeed, 1.2)*Math.pow(this.size/6, 1.2)));
    this.oblateness = Math.abs(this.seed.fakeGaussianRandom(0, oblatenessRolls)-0.5)*2;
  
    // Generate untextured materials
    this.planetMaterial = new THREE.MeshStandardMaterial({
      visible: false,
      normalScale: new THREE.Vector2(0.25, 0.25)
    });
    this.ringMaterial = new THREE.MeshPhongMaterial({ 
      visible: false,
      transparent: true,
      side: THREE.DoubleSide
    });

    // Set terrain
    this.waterLevel = this.seed.fakeGaussianRandom();
    this.terrainSeed = this.seed.getRandom();
    this.terrainScale = this.seed.fakeGaussianRandom(0,2);
    this.terrainRidgeScale = this.seed.fakeGaussianRandom(0,2);
    this.terrainHeight = this.seed.fakeGaussianRandom(0,2);
    this.terrainRidgeHeight = this.seed.fakeGaussianRandom()*2-1;
    this.terrainRidgeDistribution = this.seed.fakeGaussianRandom(0,2);
    this.terrainBandLength = this.seed.fakeGaussianRandom(0,2);
    this.terrainSmoothness = this.seed.fakeGaussianRandom(1,2);
    if (this.rocky) {
      // Earthy tones for rocky planets
      this.hue = this.seed.getRandom()/8;
      this.saturation = this.seed.fakeGaussianRandom(-1,3);
      this.lightness = this.seed.fakeGaussianRandom(-1,3)*0.8+0.2;
    }
    else {
      this.hue = this.seed.getRandom();
      this.saturation = this.seed.fakeGaussianRandom(0,4)*0.6+0.4;
      this.lightness = this.seed.fakeGaussianRandom(0,4)*0.6+0.4;
    }
  }

  generateOrbit() {
    this.projectedDistanceFromSun = this.seed.fakeGaussianRandom(-12,13)*this.maximumDistance + this.minimumDistance;
    this.actualDistanceFromSun = this.projectedDistanceFromSun + this.planetSphereOfInfluence;
    this.orbitAxis = this.seed.fakeGaussianRandom(0,6*Math.pow(this.maximumDistance/this.actualDistanceFromSun, 1.5))*60-30;
    this.orbitEccentricity = Math.abs(this.seed.fakeGaussianRandom(0,5*Math.pow(this.maximumDistance/this.actualDistanceFromSun, 1.5))*1.2-0.6);
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
            // console.log('There was a collision, re-orbiting Planet' + this.planetNumber);
          }
        }
      }
    });
    if (collision) {
      this.generateOrbit();
    }
  }

  generateTextures() {
    this.colour = new THREE.Color();
    this.colour.setHSL(this.hue, this.saturation, this.lightness);
    let waterLevel = this.waterLevel * 0.1 + 0.45;
    if (!this.habitable) {
      waterLevel = 0;
    }
    if (this.rocky) {
      this.queue.add(() => {this.heightMap.generate(
        RockyPlanetHeightShader,
        {
          uColour: {value: new THREE.Vector3(1,1,1)},
          uSeed: {value: this.terrainSeed},
          uScale: {value: this.terrainScale},
          uRidgeScale: {value: this.terrainRidgeScale},
          uHeight: {value: this.terrainHeight},
          uRidgeHeight: {value: this.terrainRidgeHeight},
          uRidgeDistribution: {value: this.terrainRidgeDistribution}
        }
      )});
      this.queue.add(() => {this.normalMap.generate(
        NormalShader,
        {
          uHeightMap: {value: this.heightMap.map},
          uWaterLevel: {value: waterLevel}
        }
      )});
      this.queue.add(() => {this.roughnessMap.generate(
        RoughnessShader,
        {
          uHeightMap: {value: this.heightMap.map},
          uWaterLevel: {value: waterLevel}
        }
      )});
      this.queue.add(() => {this.planetTextureMap.generate(
        RockyPlanetTextureShader,
        {
          uHeightMap: {value: this.heightMap.map},
          uColour: {value: this.colour},
          uWaterLevel: {value: waterLevel}
        }
      )});
    }
    else {
      this.queue.add(() => {this.planetTextureMap.generate(
        GasPlanetTextureShader,
        {
          uColour: {value: this.colour},
          uSeed: {value: this.terrainSeed},
          uBandLength: {value: this.terrainBandLength},
          uSmoothness: {value: this.terrainSmoothness}
        }
      )});
    }
    this.queue.add(() => {this.ringTextureMap.generate(
      RingShader,
      {
        uColour: {value: this.colour},
        uSeed: {value: this.terrainSeed},
        uDensity: {value: this.ringDensity},
        uDefinition: {value: this.ringDefinition},
        uThickness: {value: this.ringThickness},
        uColourVariability: {value: this.ringColourVariability}
      }
    )});
    this.queue.addCallback(() => {this.updateMaterial()});
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
    let sphereGeometry = new THREE.SphereGeometry(this.size, 128, 64);
    // Add mesh to scene
    this.planetSphere = new THREE.Mesh(sphereGeometry, this.planetMaterial);
    this.planetSphere.name = "planetCore";
    this.planetSphere.receiveShadow = true;
    this.planetSphere.castShadow = true;
    // Add oblateness to planet
    this.planetSphere.geometry.scale(1, 1, (1-this.oblateness+7)/8);
    this.planetPivotPoint.add(this.planetSphere);
    this.planetPivotPoint.position.copy(this.determinePointInOrbit(this.orbitalPosition));

    // Add rings
    if (this.hasRings) {
      const ringStart = this.size + this.ringDistance
      const ringEnd = ringStart + this.ringSize;
      const ringGeometry = new THREE.RingGeometry(ringStart, ringEnd, 128, 32);
      // Reassign UVs to map ringGeometry texture by distance from centre
      var v3 = new THREE.Vector3();
      for (let i = 0; i < ringGeometry.attributes.position.count; i++){
        v3.fromBufferAttribute(ringGeometry.attributes.position, i);
        ringGeometry.attributes.uv.setXY(i, (v3.length()-ringStart)/4, 0);
      }
      this.planetRing = new THREE.Mesh(ringGeometry, this.ringMaterial);
      this.planetRing.name = "ring";
      this.planetRing.receiveShadow = true;
      this.planetRing.castShadow = false;
      this.planetRing.rotation.x = this.ringTilt;
      this.planetPivotPoint.add(this.planetRing);
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
      this.planetMaterial.dispose();
      this.planetSphere.geometry.dispose();
      this.planetSphere.removeFromParent();
    }

    if (this.axisLine) {
      this.toggleDebugAxisLine();
    }
    
    if (this.planetRing) {
      this.planetRing.material.dispose();
      this.planetRing.geometry.dispose();
      this.planetRing.removeFromParent();
    }

    this.hideOrbit();
  }

  removeTextures() {
    this.heightMap.destroy();
    this.normalMap.destroy();
    this.roughnessMap.destroy();
    this.planetTextureMap.destroy();
    this.ringTextureMap.destroy();
  }

  nextNeighbourMinimumDistance() {
    return this.actualDistanceFromSun + this.planetSphereOfInfluence;
  }

  update() {
    // Rotate the planet on its axis (day)
    this.planetSphere.rotation.z += this.rotationSpeed * 5 * this.time.delta * timeModifier;

    // Orbit the planet (year)
    this.orbitalPosition += this.determineSpeed() * this.direction * this.time.delta * timeModifier;
    let position = this.determinePointInOrbit(this.orbitalPosition);
    this.planetPivotPoint.position.copy(position);
  }

  updateMaterial() {
    this.planetMaterial.normalMap = this.normalMap.map;
    this.planetMaterial.roughnessMap = this.roughnessMap.map;
    this.planetMaterial.displacementMap = this.heightMap.map;
    this.planetMaterial.map = this.planetTextureMap.map;
    this.planetMaterial.visible = true;
    this.planetMaterial.needsUpdate = true;
    const flatness = Math.pow((1-((Math.min(this.size, 4.5)-1)/3.5))*0.8, 8); 
    console.log(flatness);
    this.planetMaterial.displacementScale = flatness;

    this.ringMaterial.map = this.ringTextureMap.map;
    this.ringMaterial.visible = true;
    this.ringMaterial.needsUpdate = true;
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
    this.removeTextures();

    this.planetPivotPoint.geometry.dispose();
    this.planetPivotPoint.material.dispose();
    this.planetPivotPoint.removeFromParent();
  }

  toggleDebugAxisLine() {
    if (!this.axisLine) {
      const axisLineMaterial = new THREE.LineBasicMaterial({ color: 0x666666 });
      let axisPoints = [];
      const axisPoint1 = new THREE.Vector3(0, 0, this.size*-6);
      const axisPoint2 = new THREE.Vector3(0, 0, this.size*6);
      axisPoints.push(axisPoint1);
      axisPoints.push(axisPoint2); 
      const axisLineGeometry = new THREE.BufferGeometry().setFromPoints(axisPoints);
      this.axisLine = new THREE.Line(axisLineGeometry, axisLineMaterial);
      this.planetPivotPoint.add(this.axisLine);
    }
    else {
      this.axisLine.geometry.dispose();
      this.axisLine.material.dispose();
      this.axisLine.removeFromParent();
      delete(this.axisLine);
    }
  }

  addDebug() {
    if(this.debug.active) {
      this.debugFolder = this.debug.ui.addFolder('Planet ' + this.planetNumber).close();

      this.debugFolder
        .add(this, 'rocky')
        .name('rocky')
        .min(0)
        .max(1)
        .step(1)
        .onFinishChange(() => {
          this.removeTextures();
          this.generateTextures();
        });

      this.debugFolder
        .add(this, 'atmosphere')
        .name('atmosphere')
        .min(0)
        .max(1)
        .step(0.01)
        .onFinishChange(() => {
          this.removeTextures();
          this.generateTextures();
        });

      this.debugFolder
        .add(this, 'habitable')
        .name('habitable')
        .min(0)
        .max(1)
        .step(1)
        .onFinishChange(() => {
          this.removeTextures();
          this.generateTextures();
        });

      this.debugFolder
        .add(this, 'waterLevel')
        .name('waterLevel')
        .min(0)
        .max(1)
        .step(0.01)
        .onFinishChange(() => {
          this.removeTextures();
          this.generateTextures();
        });

      this.debugFolder
        .add(this, 'terrainSeed')
        .name('terrainSeed')
        .min(0)
        .max(1)
        .step(0.01)
        .onFinishChange(() => {
          this.removeTextures();
          this.generateTextures();
        });

      this.debugFolder
        .add(this, 'terrainScale')
        .name('terrainScale')
        .min(0)
        .max(1)
        .step(0.01)
        .onFinishChange(() => {
          this.removeTextures();
          this.generateTextures();
        });

      this.debugFolder
        .add(this, 'terrainHeight')
        .name('terrainHeight')
        .min(0)
        .max(1)
        .step(0.01)
        .onFinishChange(() => {
          this.removeTextures();
          this.generateTextures();
        });

      this.debugFolder
        .add(this, 'terrainRidgeScale')
        .name('terrainRidgeScale')
        .min(0)
        .max(1)
        .step(0.01)
        .onFinishChange(() => {
          this.removeTextures();
          this.generateTextures();
        });

      this.debugFolder
        .add(this, 'terrainRidgeHeight')
        .name('terrainRidgeHeight')
        .min(-1)
        .max(1)
        .step(0.01)
        .onFinishChange(() => {
          this.removeTextures();
          this.generateTextures();
        });

        this.debugFolder
        .add(this, 'terrainRidgeDistribution')
        .name('terrainRidgeDist')
        .min(0)
        .max(1)
        .step(0.01)
        .onFinishChange(() => {
          this.removeTextures();
          this.generateTextures();
        });

      this.debugFolder
        .add(this, 'terrainBandLength')
        .name('terrainBandLength')
        .min(0)
        .max(1)
        .step(0.01)
        .onFinishChange(() => {
          this.removeTextures();
          this.generateTextures();
        });

      this.debugFolder
        .add(this, 'terrainSmoothness')
        .name('terrainSmoothness')
        .min(0)
        .max(1)
        .step(0.01)
        .onFinishChange(() => {
          this.removeTextures();
          this.generateTextures();
        });

      this.debugFolder
        .add(this, 'hue')
        .name('hue')
        .min(0)
        .max(1)
        .step(0.01)
        .onFinishChange(() => {
          this.removeTextures();
          this.generateTextures();
        });

      this.debugFolder
        .add(this, 'saturation')
        .name('saturation')
        .min(0)
        .max(1)
        .step(0.01)
        .onFinishChange(() => {
          this.removeTextures();
          this.generateTextures();
        });

      this.debugFolder
        .add(this, 'lightness')
        .name('lightness')
        .min(0)
        .max(1)
        .step(0.01)
        .onFinishChange(() => {
          this.removeTextures();
          this.generateTextures();
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
          this.updateMaterial();
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
        .add(this, 'oblateness')
        .name('oblateness')
        .min(0)
        .max(1)
        .step(0.01)
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
        .add(this, 'toggleDebugAxisLine');

      this.debugFolder
        .add(this, 'orbitAxis')
        .name('orbitAxis')
        .min(-30)
        .max(30)
        .step(0.1)
        .onChange(() => {
          this.removeFromScene();
          this.addToScene();
        });

      this.debugFolder
        .add(this, 'orbitEccentricity')
        .name('orbitEccentricity')
        .min(0)
        .max(0.6)
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
        .add(this, 'hasRings')
        .name('hasRings')
        .min(0)
        .max(1)
        .step(1)
        .onChange(() => {
          this.removeFromScene();
          this.addToScene();
        });

      this.debugFolder
        .add(this, 'ringSize')
        .name('ringSize')
        .min(0.15)
        .max(4)
        .step(0.01)
        .onChange(() => {
          this.removeFromScene();
          this.addToScene();
        });

      this.debugFolder
        .add(this, 'ringDistance')
        .name('ringDistance')
        .min(0.85)
        .max(3.85)
        .step(0.01)
        .onChange(() => {
          this.removeFromScene();
          this.addToScene();
        });

      this.debugFolder
        .add(this, 'ringTilt')
        .name('ringTilt')
        .min(-90 * Math.PI/180)
        .max(90 * Math.PI/180)
        .step(0.01)
        .onChange(() => {
          this.removeFromScene();
          this.addToScene();
        });

      this.debugFolder
        .add(this, 'ringDensity')
        .name('ringDensity')
        .min(0)
        .max(1)
        .step(0.001)
        .onFinishChange(() => {
          this.removeTextures();
          this.generateTextures();
        });

      this.debugFolder
        .add(this, 'ringDefinition')
        .name('ringDefinition')
        .min(0)
        .max(1)
        .step(0.001)
        .onFinishChange(() => {
          this.removeTextures();
          this.generateTextures();
        });

      this.debugFolder
        .add(this, 'ringThickness')
        .name('ringThickness')
        .min(0)
        .max(1)
        .step(0.001)
        .onFinishChange(() => {
          this.removeTextures();
          this.generateTextures();
        });

      this.debugFolder
        .add(this, 'ringColourVariability')
        .name('ringColourVariability')
        .min(0)
        .max(1)
        .step(0.001)
        .onFinishChange(() => {
          this.removeTextures();
          this.generateTextures();
        });
    }
  }
}
