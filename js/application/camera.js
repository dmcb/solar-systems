import * as THREE from 'three';
import Application from './Application.js';

export default class Camera {
  constructor() {
    this.application = new Application();
    this.solarSystemRadius = this.application.solarSystemRadius;

    this.bounds = this.getCameraBounds();
    this.instance = new THREE.OrthographicCamera(this.bounds.left, this.bounds.right, this.bounds.top, this.bounds.bottom, 1, 1000 );
    this.setCameraPosition();
  }

  getCameraBounds(range) {
    if (range === undefined) {
      range = this.solarSystemRadius;
    }
    const windowAspectRatio = window.innerWidth / window.innerHeight;
    let camWidth = range;
    let camHeight = range;

    if (window.innerWidth > window.innerHeight)  {
      camWidth = range * windowAspectRatio;
    }
    else {
      camHeight = range / windowAspectRatio;
    }

    return { left: -camWidth, right: camWidth, top: camHeight, bottom: -camHeight }
  }

  setCameraBounds(range) {
    const bounds = this.getCameraBounds(range);
    this.instance.left = bounds.left;
    this.instance.right = bounds.right;
    this.instance.top = bounds.top;
    this.instance.bottom = bounds.bottom;
    this.instance.updateProjectionMatrix();
  }

  setCameraPosition(x, y, z) {
    if (x === undefined) x = 0;
    if (y === undefined) y = 0;
    if (z === undefined) z = this.solarSystemRadius;
    this.instance.position.x = x;
    this.instance.position.y = y;
    this.instance.position.z = z;
    this.instance.updateProjectionMatrix();
  }

  setCameraTarget(x, y, z) {
    if (x === undefined) x = 0;
    if (y === undefined) y = 0;
    if (z === undefined) z = 0;
    this.instance.up = new THREE.Vector3(0,1,0);
    this.instance.lookAt(new THREE.Vector3(x,y,z));
    this.instance.updateProjectionMatrix();
  }

  resetCamera() {
    this.setCameraBounds();
    this.setCameraPosition();
    this.setCameraTarget();
    this.instance.updateProjectionMatrix();
  }
}