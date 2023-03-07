import * as THREE from 'three';
import Application from '../Application.js';
import GasPlanetShader from '../shaders/GasPlanetShader.js';
import RockyPlanetShader from '../shaders/RockyPlanetShader.js';
import EventEmitter from '../utils/EventEmitter.js';
export default class HeightMap extends EventEmitter {
  constructor(planet) {
    super();

    this.application = new Application();
    this.renderer = this.application.renderer;
    this.maps = [];
    this.planet = planet;
  }

  generate() {
    const resolution = 1024;
    this.maps = [];
    let shader;
    let uniforms = {};

    if (this.planet.rocky) {
      shader = RockyPlanetShader;
      uniforms = {
        uResolution: {value: resolution},
        uColour: {value: new THREE.Vector3(1,1,1)},
        uSeed: {value: this.planet.terrainSeed},
        uAmplitude: {value: this.planet.terrainAmplitude},
        uFrequency: {value: this.planet.terrainFrequency}
      }
    }
    else {
      shader = GasPlanetShader;
      uniforms = {
        uResolution: {value: resolution},
        uColour: {value: new THREE.Vector3(1,1,1)},
        uSeed: {value: this.planet.terrainSeed}
      }
    }

    for (let i=0; i<6; i++) {
      uniforms.uIndex = {value: i};
      let renderTarget = new THREE.WebGLRenderTarget(resolution, resolution, {minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat});
  		let camera = new THREE.OrthographicCamera(-resolution/2, resolution/2, resolution/2, -resolution/2, -100, 100);
  		camera.position.z = 10;
      camera.updateProjectionMatrix();

  		let textureScene = new THREE.Scene();
      let geometry = new THREE.PlaneGeometry(resolution, resolution);
      let material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: shader.vertexShader,
        fragmentShader: shader.fragmentShader,
      });
  		let planeMesh = new THREE.Mesh(geometry, material);
  		planeMesh.position.z = -10;
  		textureScene.add(planeMesh);
      this.renderer.instance.setRenderTarget(renderTarget);
  		this.renderer.instance.render(textureScene, camera);
      this.renderer.instance.setRenderTarget(null);
  		this.maps.push(renderTarget.texture);
      geometry.dispose();
      material.dispose();
    }
    this.trigger('generation');
  }
}
