import * as THREE from 'three';
import Application from './Application.js';

export default class Camera {
  constructor() {
    this.application = new Application();
    this.solarSystemRadius = this.application.solarSystemRadius;
    this.viewport = this.application.viewport;

    this.bounds = {};
    this.getBounds();
    this.instance = new THREE.OrthographicCamera(this.bounds.left, this.bounds.right, this.bounds.top, this.bounds.bottom, 1, 1000 );
    this.setPosition();
  }

  getBounds(range) {
    if (range === undefined) {
      range = this.solarSystemRadius;
    }
    let camWidth = range;
    let camHeight = range;

    if (this.viewport.width > this.viewport.height)  {
      camWidth = range * this.viewport.aspectRatio;
    }
    else {
      camHeight = range / this.viewport.aspectRatio;
    }

    this.bounds.left = -camWidth;
    this.bounds.right = camWidth;
    this.bounds.top = camHeight;
    this.bounds.bottom = -camHeight;
  }

  setBounds(range) {
    this.getBounds(range);
    this.instance.left = this.bounds.left;
    this.instance.right = this.bounds.right;
    this.instance.top = this.bounds.top;
    this.instance.bottom = this.bounds.bottom;
    this.instance.updateProjectionMatrix();
  }

  setPosition(x, y, z) {
    if (x === undefined) x = 0;
    if (y === undefined) y = 0;
    if (z === undefined) z = this.solarSystemRadius;
    this.instance.position.x = x;
    this.instance.position.y = y;
    this.instance.position.z = z;
    this.instance.updateProjectionMatrix();
  }

  setTarget(x, y, z) {
    if (x === undefined) x = 0;
    if (y === undefined) y = 0;
    if (z === undefined) z = 0;
    this.instance.up = new THREE.Vector3(0,1,0);
    this.instance.lookAt(new THREE.Vector3(x,y,z));
    this.instance.updateProjectionMatrix();
  }

  reset() {
    this.setBounds();
    this.setPosition();
    this.setTarget();
    this.instance.updateProjectionMatrix();
  }
}