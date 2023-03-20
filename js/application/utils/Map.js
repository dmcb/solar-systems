import * as THREE from 'three';
import Application from '../Application.js';
import EventEmitter from './EventEmitter.js';

export default class Map extends EventEmitter {
  constructor(resolutionX, resolutionY) {
    super();

    this.application = new Application();
    this.renderer = this.application.renderer;
    this.resolutionX = resolutionX;
    this.resolutionY = resolutionY;
    this.map = null;

    if (!this.resolutionX) {
      this.resolutionX = 1536;
    }
    if (!this.resolutionY) {
      this.resolutionY = 768;
    }
  }

  generate(shader, uniforms) {
    this.destroy();

    uniforms.uResolution = {value: this.resolutionX};

    let renderTarget = new THREE.WebGLRenderTarget(this.resolutionX, this.resolutionY, {minFilter: THREE.NearestMipMapLinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: true, format: THREE.RGBAFormat});
    let camera = new THREE.OrthographicCamera(-this.resolutionX/2, this.resolutionX/2, this.resolutionY/2, -this.resolutionY/2, -100, 100);
    camera.position.z = 10;
    camera.updateProjectionMatrix();

    let textureScene = new THREE.Scene();
    let geometry = new THREE.PlaneGeometry(this.resolutionX, this.resolutionY);
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
    this.map = renderTarget.texture;
    geometry.dispose();
    material.dispose();
    planeMesh.removeFromParent();

    this.trigger('generation');
  }

  destroy() {
    if (this.map) {
      this.map.dispose();
      this.map = null;
    }
  }
}
