import * as THREE from 'three';
import Application from './Application.js';

export default class Camera {
  constructor() {
    this.application = new Application();
    this.solarSystemRadius = this.application.solarSystemRadius;
    this.scene = this.application.scene;
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

  update() {
    if (this.focus) {
      let cameraPosition;
      let focusObject = this.scene.getObjectById(this.focus);
      if (focusObject.name == "planet") {
        cameraPosition = new THREE.Vector3(focusObject.parent.position.x, focusObject.parent.position.y, focusObject.parent.position.z);
      }
      else {
        cameraPosition = new THREE.Vector3(focusObject.position.x, focusObject.position.y, focusObject.position.z)
        cameraPosition.applyAxisAngle(new THREE.Vector3( 0, 0, 1 ), focusObject.parent.rotation.z);
      }
      cameraPosition.applyAxisAngle(new THREE.Vector3( 0, 0, 1 ), this.scene.rotation.z);
      this.setBounds(focusObject.geometry.parameters.radius*2.5);
      this.setPosition(cameraPosition.x, cameraPosition.y, this.solarSystemRadius);
      this.setTarget(cameraPosition.x, cameraPosition.y, cameraPosition.z);
    }
  }

  changeFocus(objectId) {
    this.focus = objectId;
    if (!this.focus) {
      this.reset();
    }
  }
}