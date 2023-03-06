import * as THREE from 'three';
import Application from '../Application.js';
import PlanetNoiseShader from '../shaders/PlanetNoiseShader.js';
import EventEmitter from '../utils/EventEmitter.js';
export default class HeightMap extends EventEmitter {
  constructor() {
    super();

    this.application = new Application();
    this.renderer = this.application.renderer;
    this.maps = [];
  }

  generate(seed, rocky) {
    this.maps = [];

    for (let i=0; i<6; i++) {
      const resolution = 1024;
      let renderTarget = new THREE.WebGLRenderTarget(resolution, resolution, {minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat});
  		let camera = new THREE.OrthographicCamera(-resolution/2, resolution/2, resolution/2, -resolution/2, -100, 100);
  		camera.position.z = 10;
      camera.updateProjectionMatrix();

  		let textureScene = new THREE.Scene();
      let geometry = new THREE.PlaneGeometry(resolution, resolution);
      let material = new THREE.ShaderMaterial({
        uniforms: {
          uIndex: {value: i},
          uResolution: {value: resolution},
          uColour: {value: new THREE.Vector3(1,1,1)},
          uRocky: {value: rocky},
          uSeed: {value: seed}
        },
        vertexShader: PlanetNoiseShader.vertexShader,
        fragmentShader: PlanetNoiseShader.fragmentShader,
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
