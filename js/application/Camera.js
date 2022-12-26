import * as THREE from 'three';
import Application from './Application.js';

export default class Camera {
  constructor() {
    this.application = new Application();
    this.solarSystemRadius = this.application.solarSystemRadius;
    this.scene = this.application.scene;
    this.viewport = this.application.viewport;

    this.setBounds();
    this.setPosition();
  }

  setBounds(range) {
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

    if (!this.instance) {
      this.instance = new THREE.OrthographicCamera(-camWidth, camWidth, camHeight, -camHeight, 1, 1000 );
    }
    else {
      this.instance.left = -camWidth;
      this.instance.right = camWidth;
      this.instance.top = camHeight;
      this.instance.bottom = -camHeight;
      this.instance.updateProjectionMatrix();
    }
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
    this.instance.lookAt(new THREE.Vector3(x,y,z));
    this.instance.updateProjectionMatrix();
  }

  reset() {
    this.setBounds();
    this.setTarget();
  }

  update() {
    if (this.focus) {
      const targetPosition = new THREE.Vector3(this.focus.position.x, this.focus.position.y, this.focus.position.z)
      let cameraBounds;
      if (this.focus.name == "planet") {
        const planetCore = this.focus.getObjectByName("planetCore");
        cameraBounds = planetCore.geometry.parameters.radius*2;
      }
      else if (this.focus.name == "sun") {
        const sunCore = this.focus.getObjectByName("sunCore");
        cameraBounds = sunCore.geometry.parameters.radius*2;
        // Reverse binary sun rotation to focus on correct sun position;
        targetPosition.applyAxisAngle(new THREE.Vector3( 0, 0, 1 ), this.focus.parent.rotation.z);
      }
      this.setBounds(cameraBounds);
      this.setTarget(targetPosition.x, targetPosition.y, targetPosition.z);
    }
  }

  changeFocus(objectId) {
    this.focus = this.scene.getObjectById(objectId);
    if (!this.focus) {
      this.reset();
    }
  }
}