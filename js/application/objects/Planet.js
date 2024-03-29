import * as THREE from 'three';
import Application from '../Application.js';
import ShaderMap from '../utils/ShaderMap.js';
import GradientMap from '../utils/GradientMap.js';
import DisplacementShader from '../shaders/DisplacementShader.js';
import NormalShader from '../shaders/NormalShader.js';
import RoughnessShader from '../shaders/RoughnessShader.js';
import InhabitedShader from '../shaders/InhabitedShader.js';
import MoistureShader from '../shaders/MoistureShader.js';
import IceShader from '../shaders/IceShader.js';
import GasPlanetTextureShader from '../shaders/GasPlanetTextureShader.js';
import RockyPlanetHeightShader from '../shaders/RockyPlanetHeightShader.js';
import RockyPlanetTextureShader from '../shaders/RockyPlanetTextureShader.js';
import RingShader from '../shaders/RingShader.js';
import ModifiedAtmosphereMaterialShader from '../shaders/ModifiedAtmosphereMaterialShader.js';
import ModifiedPlanetMaterialShader from '../shaders/ModifiedPlanetMaterialShader.js';

const exaggeratedDistanceFromSunModifier = 1.25;
// To do: timeModifier shouldn't be locked away in Planet but set by the scene
const timeModifier = 0.0003125;
export default class Planet {
  constructor(planetNumber, minimumDistance, maximumDistance, direction, minimumDistanceFromSuns, sunHeat, sunMass) {
    this.application = new Application();
    this.seed = this.application.seed;
    this.scene = this.application.scene;
    this.time = this.application.time;
    this.solarSystem = this.application.solarSystem;
    this.debug = this.application.debug;
    this.queue = this.application.queue;

    this.heightMap = new ShaderMap();
    this.displacementMap = new ShaderMap();
    this.normalMap = new ShaderMap();
    this.biomeMap = new GradientMap();
    this.moistureMap = new ShaderMap();
    this.iceMap = new ShaderMap();
    this.inhabitedMap = new ShaderMap();
    this.roughnessMap = new ShaderMap();
    this.planetTextureMap = new ShaderMap();
    this.ringTextureMap = new ShaderMap(256, 1);
    this.customUniforms = {
      uAtmosphere: { value: 0.0 },
      uColour: { value: new THREE.Color(0x000000) },
      uInhabitedMap: { value: null },
      uTime: { value: 0.0 }
    };

    this.planetNumber = planetNumber;
    this.minimumDistance = minimumDistance;
    this.maximumDistance = maximumDistance;
    this.direction = direction;
    this.minimumDistanceFromSuns = minimumDistanceFromSuns;
    this.sunHeat = sunHeat;
    this.sunMass = sunMass;

    this.generateProperties();
    this.addTouchPoint();
    this.addDebug();
  }

  generateProperties() {  
    // Set size based off rocky or gaseous based off of distance from sun

    // Basing this off minimum leads to some not great results though, but
    // we don't have final orbit because final orbit is produced from size
    // so not sure what to do yet — we may have to regenerate everything
    this.rocky = Math.round(this.seed.fakeGaussianRandom((8*(this.maximumDistance-this.minimumDistance)/this.maximumDistance)-3));
    if (this.rocky) {
      this.size = this.seed.fakeGaussianRandom(-3)*3.5+1;
      this.sphereOfInfluenceCoefficient = 1.7;
    }
    else {
      this.size = this.seed.fakeGaussianRandom(1)*4.5+1.5;
      this.sphereOfInfluenceCoefficient = 2.0;
    }

    // Set rings
    this.hasRings = Math.round(this.seed.fakeGaussianRandom(this.size-4));
    this.ringSize = Math.abs(this.seed.fakeGaussianRandom(0,2)-0.5)*2*3.85+0.15;
    this.ringDistance = this.seed.fakeGaussianRandom(0,2)*2+0.5;
    this.ringTilt = (this.seed.fakeGaussianRandom()*180-90) * Math.PI/180;
    this.ringDensity = this.seed.getRandom();
    this.ringDefinition = this.seed.getRandom();
    this.ringThickness = this.seed.fakeGaussianRandom(1,3);
    this.ringColourVariability = this.seed.getRandom();
  
    // With complete size and rings defined, set occupied area
    this.planetOccupiedArea = this.size;
    if (this.hasRings) {
      this.planetOccupiedArea += this.ringSize + this.ringDistance;
    }
    this.planetSphereOfInfluence = this.planetOccupiedArea * this.sphereOfInfluenceCoefficient;

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
  
    // Set placeholder planet surface material
    this.planetMaterial = new THREE.MeshStandardMaterial({
      visible: false,
      normalScale: new THREE.Vector2(0.5, 0.5),
    });

    // Hooks into planet material shader to add inhabited map
    this.planetMaterial.onBeforeCompile = (shader) =>
    {
      ModifiedPlanetMaterialShader.forEach((hook) => {
        shader.fragmentShader = shader.fragmentShader.replace(hook.hook, hook.replacement);
      });

      shader.uniforms.uInhabitedMap = this.customUniforms.uInhabitedMap;
    }

    // Set placeholder atmosphere material
    this.atmosphereMaterial = new THREE.MeshStandardMaterial({
      visible: false,
      transparent: true,
      defines: {
        USE_UV: true
      }
    });

    // Hooks into atmosphere material shader to add clouds
    this.atmosphereMaterial.onBeforeCompile = (shader) =>
    {
      ModifiedAtmosphereMaterialShader.forEach((hook) => {
        shader.fragmentShader = shader.fragmentShader.replace(hook.hook, hook.replacement);
      });

      shader.uniforms.uAtmosphere = this.customUniforms.uAtmosphere;
      shader.uniforms.uColour = this.customUniforms.uColour;
      shader.uniforms.uTime = this.customUniforms.uTime;
    }

    // Set placeholder ring surface material
    this.ringMaterial = new THREE.MeshPhongMaterial({ 
      visible: false,
      transparent: true,
      side: THREE.DoubleSide,
    });

    // Set atmosphere
    // I can't help but think I want to refine this a bit more
    let heatFromSun = Math.pow((this.sunHeat*0.5+0.75)*(1.0-((this.actualDistanceFromSun-this.minimumDistanceFromSuns*0.5)/(this.maximumDistance*1.6))), 2.5-(this.sunMass/16));

    if (this.rocky) {
      // Atmosphere probability based off of heat and planet size
      let atmosphereProbabilityBias = -Math.pow(Math.abs(0.5-heatFromSun), 0.5)*10;
      atmosphereProbabilityBias += Math.pow(this.size/4.5, 1.5)*10;
      atmosphereProbabilityBias = Math.max(-5, Math.min(5, atmosphereProbabilityBias));
      this.atmosphere = this.seed.fakeGaussianRandom(atmosphereProbabilityBias, 6);
    }
    else {
      this.atmosphere = 1;
    }

    // Set heat
    this.heat = 0.85*heatFromSun+0.15*this.atmosphere;
    // Set water level
    let waterBias = -2;
    // Make water level higher on hotter planets
    let heat = 0.6-this.heat;
    if (heat < 0.05) {
      waterBias += 2;
    }
    else if (heat < 0.15) {
      waterBias += 1;
    }
    // Make water level higher on high atmosphere planets
    let atmosphere = 0.6-this.atmosphere;
    if (atmosphere < 0.05) {
      waterBias += 2;
    }
    else if (atmosphere < 0.15) {
      waterBias += 1;
    }

    this.waterLevel = this.seed.fakeGaussianRandom(waterBias, 4);

    // Determine habitability
    if (this.rocky) {
      if (this.heat > 0.4 && this.heat < 0.6) {
        if (this.atmosphere >= 0.4 && this.atmosphere <= 0.6) {
          this.habitable = 1;
          this.inhabited = Math.round(this.seed.fakeGaussianRandom(-2));
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
          if (this.atmosphere > 0.6) {
            console.log('Planet ' + this.planetNumber + ' has a runaway greenhouse effect');
          }
          else {
            console.log('Planet ' + this.planetNumber + ' lacks atmosphere');
          }
        }
      }
      else {
        this.habitable = 0;
        this.inhabited = 0;
        if (this.heat < 0.4) {
          console.log('Planet ' + this.planetNumber + ' is too cold');
        }
        else {
          console.log('Planet ' + this.planetNumber + ' is too hot');
        }
      }
    }
    else {
      this.atmosphere = 0;
      this.habitable = 0;
      this.inhabited = 0;
      console.log('Planet ' + this.planetNumber + ' is a gas giant');
    }

    // Set terrain
    if (this.habitable) {
      this.cratering = this.seed.fakeGaussianRandom(-1, 4);
      this.craterErosion = this.seed.fakeGaussianRandom(2, 4);
      this.craterProminence = this.seed.fakeGaussianRandom(-2, 4);
    }
    else {
      this.cratering = this.seed.getRandom();
      this.craterErosion = this.seed.getRandom();
      this.craterProminence = this.seed.getRandom();
    }
    this.terrainSeed = this.seed.getRandom();
    this.biomeColourVariability = this.seed.getRandom();
    this.moistureScale = this.seed.getRandom();
    this.moistureDefinition = this.seed.getRandom();
    this.terrainScale = this.seed.fakeGaussianRandom(0,2);
    this.terrainRidgeScale = this.seed.fakeGaussianRandom(0,2);
    this.terrainHeight = this.seed.fakeGaussianRandom(0,2);
    this.terrainRidgeHeight = this.seed.fakeGaussianRandom(0,3)*2-1;
    this.terrainRidgeDistribution = this.seed.fakeGaussianRandom(0,2);
    this.terrainBandLength = this.seed.fakeGaussianRandom(0,2);
    this.terrainSmoothness = this.seed.fakeGaussianRandom(0,2);

    // Earthy tones for rocky planets
    if (this.rocky) {
      this.colour = new THREE.Color().setHSL(
        this.seed.getRandom()/7,
        this.seed.fakeGaussianRandom(-1,3),
        this.seed.fakeGaussianRandom(-1,3)*0.7+0.2
      );
    }
    else {
      this.colour = new THREE.Color().setHSL(
        this.seed.getRandom(),
        this.seed.fakeGaussianRandom(0,4)*0.6+0.4,
        this.seed.fakeGaussianRandom(0,4)*0.6+0.3
      );
    }
    this.colourMid1 = new THREE.Color().copy(this.colour);
    this.colourMid2 = new THREE.Color().copy(this.colour);
    if (this.rocky) {
      this.colourMid1.offsetHSL(this.seed.getRandom()*0.35-0.175, 0, Math.abs(this.seed.getRandom()-0.5));
      this.colourMid2.offsetHSL(this.seed.getRandom()*0.35-0.175, 0, -Math.abs(this.seed.getRandom()-0.5));
    }
    else {
      this.colourMid1.offsetHSL(this.seed.getRandom()-0.5, this.seed.getRandom()-0.5, Math.abs(this.seed.getRandom()-0.5));
      this.colourMid2.offsetHSL(this.seed.getRandom()-0.5, this.seed.getRandom()-0.5, -Math.abs(this.seed.getRandom()-0.5));
    }
  }

  generateOrbit() {
    // Rocky planets are closer to the sun
    if (this.rocky) {
      this.projectedDistanceFromSun = this.seed.fakeGaussianRandom(-12,13)*this.maximumDistance*0.4 + this.minimumDistance;
    }
    else {
      this.projectedDistanceFromSun = this.seed.fakeGaussianRandom(-12,13)*this.maximumDistance + this.minimumDistance;
    }
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
    let tilt = (this.tilt / (Math.PI*0.5));
    let waterLevel = this.waterLevel * 0.2 + 0.4;
    let heat = Math.min(Math.max(this.heat-0.4, 0.0)*5, 1.0);
    let biomeVariability = heat;
    if (!this.habitable) {
      waterLevel = 0;
      heat = this.heat;
      biomeVariability = this.biomeColourVariability;
    }
    if (this.rocky) {
      this.queue.add(() => {this.heightMap.generate(
        RockyPlanetHeightShader,
        {
          uColour: {value: new THREE.Vector3(1,1,1)},
          uSeed: {value: this.terrainSeed},
          uScale: {value: this.terrainScale},
          uCratering: {value: this.cratering},
          uCraterErosion: {value: this.craterErosion},
          uCraterProminence: {value: this.craterProminence},
          uRidgeScale: {value: this.terrainRidgeScale},
          uHeight: {value: this.terrainHeight},
          uRidgeHeight: {value: this.terrainRidgeHeight},
          uRidgeDistribution: {value: this.terrainRidgeDistribution}
        }
      )});
      this.queue.add(() => {this.displacementMap.generate(
        DisplacementShader,
        {
          uHeightMap: {value: this.heightMap.map},
          uWaterLevel: {value: waterLevel}
        }
      )});
      this.queue.add(() => {this.normalMap.generate(
        NormalShader,
        {
          uHeightMap: {value: this.heightMap.map},
          uWaterLevel: {value: waterLevel}
        }
      )});
      this.queue.add(() => {this.moistureMap.generate(
        MoistureShader,
        {
          uSeed: {value: this.terrainSeed},
          uScale: {value: this.terrainScale},
          uDefinition: {value: this.moistureDefinition},
          uScale: {value: this.moistureScale},
          uVariability: {value: biomeVariability}
        }
      )});
      if (this.habitable) {
        this.queue.add(() => {this.iceMap.generate(
          IceShader,
          {
            uHeat: {value: heat},
            uHeightMap: {value: this.heightMap.map},
            uTilt: {value: tilt},
            uWaterLevel: {value: waterLevel},
            uSeed: {value: this.terrainSeed}
          }
        )});
        this.queue.add(() => {this.roughnessMap.generate(
          RoughnessShader,
          {
            uHeightMap: {value: this.heightMap.map},
            uWaterLevel: {value: waterLevel},
            uIceMap: {value: this.iceMap.map},
          }
        )});
        this.queue.add(() => {this.biomeMap.generate([
          [
            {stop: waterLevel*0.4, colour: new THREE.Color('#000044')},
            {stop: waterLevel*0.8, colour: new THREE.Color('#000066')},
            {stop: waterLevel*0.96, colour: new THREE.Color('#0000ff')},
            {stop: waterLevel*0.98, colour: new THREE.Color('#0047fe')},
            {stop: waterLevel*1.0, colour: new THREE.Color('#75C5C2')},
            {stop: waterLevel*1.0, colour: new THREE.Color('#dcd39f')}, //.offsetHSL(this.biomeColourVariability*-0.24, 0, 0)},
            {stop: waterLevel*1.04, colour: new THREE.Color('#749909')}, //.offsetHSL(this.biomeColourVariability*-0.24, 0, 0)},
            {stop: waterLevel*1.08, colour: new THREE.Color('#215322')}, //.offsetHSL(this.biomeColourVariability*-0.24, 0, 0)},
            {stop: waterLevel*1.17, colour: new THREE.Color('#152A15')}, //.offsetHSL(this.biomeColourVariability*-0.24, 0, 0)},
            {stop: waterLevel*1.29, colour: new THREE.Color('#746354')}, //.offsetHSL(this.biomeColourVariability*-0.24, 0, 0)},
            {stop: waterLevel*1.4, colour: new THREE.Color('#FFFFFF')}, //.offsetHSL(this.biomeColourVariability*-0.24, 0, 0)},
          ],
          [
            {stop: waterLevel*0.4, colour: new THREE.Color('#000044')},
            {stop: waterLevel*0.8, colour: new THREE.Color('#000066')},
            {stop: waterLevel*0.96, colour: new THREE.Color('#0000ff')},
            {stop: waterLevel*0.98, colour: new THREE.Color('#0047fe')},
            {stop: waterLevel*1.0, colour: new THREE.Color('#29d67a')},
            {stop: waterLevel*1.0, colour: new THREE.Color('#F2DEB9')}, //.offsetHSL(this.biomeColourVariability*-0.24, 0, 0)},
            {stop: waterLevel*1.02, colour: new THREE.Color('#E5C9B6')}, //.offsetHSL(this.biomeColourVariability*-0.24, 0, 0)},
            {stop: waterLevel*1.07, colour: new THREE.Color('#DAA46D')}, //.offsetHSL(this.biomeColourVariability*-0.24, 0, 0)},
            {stop: waterLevel*1.14, colour: new THREE.Color('#9C4F20')}, //.offsetHSL(this.biomeColourVariability*-0.24, 0, 0)},
            {stop: waterLevel*1.29, colour: new THREE.Color('#746354')}, //.offsetHSL(this.biomeColourVariability*-0.24, 0, 0)},
          ],
        ])});
        if (this.inhabited) {
          this.queue.add(() => {this.inhabitedMap.generate(
            InhabitedShader,
            {
              uHeightMap: {value: this.heightMap.map},
              uIceMap: {value: this.iceMap.map},
              uMoistureMap: {value: this.moistureMap.map},
              uWaterLevel: {value: waterLevel}
            }
          )});
        }
      }
      else {
        this.queue.add(() => {this.biomeMap.generate([
          [
            {stop: 0, colour: new THREE.Color('#000000')},
            {stop: 0.5, colour: this.colour},
            {stop: 1, colour: new THREE.Color('#FFFFFF')},
          ],
          [
            {stop: 0, colour: this.colourMid1},
            {stop: 1, colour: this.colourMid2}
          ]
        ])});
      }
      this.queue.add(() => {this.planetTextureMap.generate(
        RockyPlanetTextureShader,
        {
          uHeightMap: {value: this.heightMap.map},
          uBiomeMap: {value: this.biomeMap.map},
          uMoistureMap: {value: this.moistureMap.map},
          uIceMap: {value: this.iceMap.map},
          uSeed: {value: this.terrainSeed},
        }
      )});
    }
    else {
      this.queue.add(() => {this.planetTextureMap.generate(
        GasPlanetTextureShader,
        {
          uColour: {value: this.colour},
          uColourMid1: {value: this.colourMid1},
          uColourMid2: {value: this.colourMid2},
          uScale: {value: this.terrainScale},
          uSeed: {value: this.terrainSeed},
          uBandLength: {value: this.terrainBandLength},
          uSmoothness: {value: this.terrainSmoothness},
          uColourVariability: {value: this.biomeColourVariability}
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
    // Add planet
    let sphereGeometry = new THREE.SphereGeometry(this.size, 128, 64);
    this.planetSphere = new THREE.Mesh(sphereGeometry, this.planetMaterial);
    this.planetSphere.name = "planetCore";
    this.planetSphere.receiveShadow = true;
    this.planetSphere.castShadow = true;
    this.planetSphere.geometry.scale(1, 1, (1-this.oblateness+7)/8);
    const flatness = Math.pow((1-((Math.min(this.size, 4.5)-1)/3.5))*0.8, 7); 
    this.planetMaterial.displacementScale = flatness;
    this.planetPivotPoint.add(this.planetSphere);

    // Add atmosphere
    let atmosphereGeometry = new THREE.SphereGeometry(this.size*1.002, 128, 64);
    this.planetAtmosphere = new THREE.Mesh(atmosphereGeometry, this.atmosphereMaterial);
    this.planetAtmosphere.name = "planetAtmosphere";
    this.planetAtmosphere.receiveShadow = true;
    this.planetAtmosphere.castShadow = false;
    this.planetAtmosphere.geometry.scale(1, 1, (1-this.oblateness+7)/8);
    this.atmosphereMaterial.displacementScale = flatness;
    this.planetPivotPoint.add(this.planetAtmosphere);

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

    // Set position in orbit
    this.planetPivotPoint.position.copy(this.determinePointInOrbit(this.orbitalPosition));

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
      this.planetSphere.material.dispose();
      this.planetSphere.geometry.dispose();
      this.planetSphere.removeFromParent();
    }

    if (this.planetAtmosphere) {
      this.atmosphereMaterial.dispose();
      this.planetAtmosphere.material.dispose();
      this.planetAtmosphere.geometry.dispose();
      this.planetAtmosphere.removeFromParent();
    }

    if (this.axisLine) {
      this.toggleDebugAxisLine();
    }
    
    if (this.planetRing) {
      this.ringMaterial.dispose();
      this.planetRing.material.dispose();
      this.planetRing.geometry.dispose();
      this.planetRing.removeFromParent();
    }

    this.hideOrbit();
  }

  removeTextures() {
    this.biomeMap.destroy();
    this.heightMap.destroy();
    this.displacementMap.destroy();
    this.normalMap.destroy();
    this.roughnessMap.destroy();
    this.moistureMap.destroy();
    this.iceMap.destroy();
    this.inhabitedMap.destroy();
    this.planetTextureMap.destroy();
    this.ringTextureMap.destroy();
  }

  nextNeighbourMinimumDistance() {
    return this.actualDistanceFromSun + this.planetSphereOfInfluence;
  }

  update() {
    // Rotate the planet on its axis (day)
    this.planetSphere.rotation.z += this.rotationSpeed * 3 * this.time.delta * timeModifier;
    this.planetAtmosphere.rotation.z += this.rotationSpeed * 3 * this.time.delta * timeModifier;

    // Orbit the planet (year)
    this.orbitalPosition += this.determineSpeed() * this.direction * this.time.delta * timeModifier;
    let position = this.determinePointInOrbit(this.orbitalPosition);
    this.planetPivotPoint.position.copy(position);

    // Update clouds
    this.customUniforms.uTime.value = this.time.elapsed * timeModifier;
  }

  updateMaterial() {
    this.planetMaterial.normalMap = this.normalMap.map;
    this.planetMaterial.roughnessMap = this.roughnessMap.map;
    this.planetMaterial.displacementMap = this.displacementMap.map;
    this.planetMaterial.map = this.planetTextureMap.map;
    this.planetMaterial.visible = true;
    this.customUniforms.uAtmosphere.value = this.atmosphere;
    this.customUniforms.uInhabitedMap.value = this.inhabitedMap.map;
    this.planetMaterial.needsUpdate = true;

    if (this.habitable) {
      this.customUniforms.uColour.value = new THREE.Color('#ddeeff');
    }
    else {
      this.customUniforms.uColour.value = this.colour;
    }

    this.atmosphereMaterial.visible = true;
    this.atmosphereMaterial.displacementMap = this.displacementMap.map;
    this.atmosphereMaterial.needsUpdate = true;

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
        })
        .onFinishChange(() => {
          this.removeTextures();
          this.generateTextures();
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
        .add(this, 'inhabited')
        .name('inhabited')
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
        .add(this, 'heat')
        .name('heat')
        .min(0)
        .max(1)
        .step(0.01)
        .onFinishChange(() => {
          this.removeTextures();
          this.generateTextures();
        });

      this.debugFolder
        .add(this, 'biomeColourVariability')
        .name('biomeColourVar')
        .min(0)
        .max(1)
        .step(0.01)
        .onFinishChange(() => {
          this.removeTextures();
          this.generateTextures();
        });

      this.debugFolder
        .add(this, 'moistureDefinition')
        .name('moistureDefinition')
        .min(0)
        .max(1)
        .step(0.01)
        .onFinishChange(() => {
          this.removeTextures();
          this.generateTextures();
        });

      this.debugFolder
        .add(this, 'moistureScale')
        .name('moistureScale')
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
        .add(this, 'cratering')
        .name('cratering')
        .min(0)
        .max(1)
        .step(0.01)
        .onFinishChange(() => {
          this.removeTextures();
          this.generateTextures();
        });

      this.debugFolder
        .add(this, 'craterErosion')
        .name('craterErosion')
        .min(0)
        .max(1)
        .step(0.01)
        .onFinishChange(() => {
          this.removeTextures();
          this.generateTextures();
        });

      this.debugFolder
        .add(this, 'craterProminence')
        .name('craterProminence')
        .min(0)
        .max(1)
        .step(0.01)
        .onFinishChange(() => {
          this.removeTextures();
          this.generateTextures();
        });

      this.debugFolder
        .addColor(this, 'colour')
        .name('colour')
        .onChange(() => {
          this.removeTextures();
          this.generateTextures();
        });

      this.debugFolder
        .addColor(this, 'colourMid1')
        .name('colourMid1')
        .onChange(() => {
          this.removeTextures();
          this.generateTextures();
        });

      this.debugFolder
        .addColor(this, 'colourMid2')
        .name('colourMid2')
        .onChange(() => {
          this.removeTextures();
          this.generateTextures();
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
        .min(0.5)
        .max(2.5)
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
