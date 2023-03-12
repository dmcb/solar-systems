import * as THREE from 'three';
import Application from '../Application.js';
import EventEmitter from './EventEmitter.js';

export default class Map extends EventEmitter {
  constructor(sides, resolution) {
    super();

    this.application = new Application();
    this.renderer = this.application.renderer;
    this.maps = [];
    this.resolution = resolution;
    this.sides = sides;

    if (!this.sides) {
      this.sides = 6;
    }
    if (!this.resolution) {
      this.resolution = 1024;
    }
  }

  generate(shader, uniforms, mapDependencies) {
    this.destroy();
    uniforms.uResolution = {value: this.resolution};

    for (let i=0; i<this.sides; i++) {
      uniforms.uIndex = {value: i};

      // Add any map dependencies to the uniforms
      if (mapDependencies) {
        for (let key in mapDependencies) {
          uniforms[key] = {value: mapDependencies[key][i]};
        }
      }

      let renderTarget = new THREE.WebGLRenderTarget(this.resolution, this.resolution, {minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat});
  		let camera = new THREE.OrthographicCamera(-this.resolution/2, this.resolution/2, this.resolution/2, -this.resolution/2, -100, 100);
  		camera.position.z = 10;
      camera.updateProjectionMatrix();

  		let textureScene = new THREE.Scene();
      let geometry = new THREE.PlaneGeometry(this.resolution, this.resolution);
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
      planeMesh.removeFromParent();
    }
    this.trigger('generation');
  }

  destroy() {
    while (this.maps.length > 0) {
      let map = this.maps.pop();
      map.dispose();
    }
  }
}
