import * as THREE from 'three';
import { gsap } from "gsap";
import Application from './Application.js';

export default class Camera {
  constructor() {
    this.application = new Application();
    this.solarSystemRadius = this.application.solarSystemRadius;
    this.controls = this.application.controls;
    this.scene = this.application.scene;
    this.viewport = this.application.viewport;

    this.reset();
  }

  adjustRotation(x, y) {
    this.cameraVerticalRotation -= Math.PI * y;
    this.cameraHorizonalRotation -= Math.PI * x;

    this.rotate();
  }

  getCameraDimensions(size) {
    let camWidth = size;
    let camHeight = size;

    if (this.viewport.width > this.viewport.height)  {
      camWidth = size * this.viewport.aspectRatio;
    }
    else {
      camHeight = size / this.viewport.aspectRatio;
    }

    return [camWidth, camHeight];
  }

  resize(size) {
    if (size !== undefined) {
      this.cameraSize = size;
    }

    const [camWidth, camHeight] = this.getCameraDimensions(this.cameraSize);

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

  setFocus(objectId) {
    if (!this.focus) {
      // Get focused body
      this.focus = this.scene.getObjectById(objectId);

      // Set camera bounds based on focused body
      let coreObject = this.focus.getObjectByName("planetCore");
      if (!coreObject) {
        coreObject = this.focus.getObjectByName("sunCore");
      }

      const newCameraSize = coreObject.geometry.parameters.radius*2;
      const [camWidth, camHeight] = this.getCameraDimensions(newCameraSize);

      gsap.to(this.instance, {
        left: -camWidth,
        right: camWidth,
        top: camHeight,
        bottom: -camHeight,
        duration: 1,
        ease: "power4.out",
        onStart: () => {
          this.cameraTransitioning = true;
        },
        onComplete: () => {
          this.cameraTransitioning = false;
          this.cameraSize = newCameraSize;
        },
        onUpdate: () => {
          this.instance.updateProjectionMatrix();
        }
      });
    }
    else {
      const newCameraSize = this.solarSystemRadius;
      const [camWidth, camHeight] = this.getCameraDimensions(newCameraSize);

      gsap.to(this.instance, {
        left: -camWidth,
        right: camWidth,
        top: camHeight,
        bottom: -camHeight,
        duration: 1,
        ease: "power4.out",
        onStart: () => {
          this.cameraTransitioning = true;
        },
        onComplete: () => {
          this.cameraTransitioning = false;
          this.cameraSize = this.solarSystemRadius;
          this.focus = false;
          this.resize();
          this.rotate();
          this.setTarget();
        },
        onUpdate: () => {
          this.instance.updateProjectionMatrix();
        }
      });
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
    this.cameraVerticalRotation = 0;
    this.cameraHorizonalRotation = 0;
    this.cameraSize = this.solarSystemRadius;
    this.focus = false;
    this.cameraTransitioning = false;

    this.resize();
    this.rotate();
    this.setPosition();
    this.setTarget();
  }

  rotate() {
    // Cap vertical rotation ranges
    if (this.cameraVerticalRotation > Math.PI * 0.5 ) this.cameraVerticalRotation = Math.PI * 0.5;
    if (this.cameraVerticalRotation < 0 ) this.cameraVerticalRotation = 0;

    // Start from base camera position
    let cameraInitialPosition = new THREE.Vector3(0, 0, this.application.solarSystemRadius);
    let cameraUp = new THREE.Vector3(0, 1, 0);

    // Apply camera position rotations
    cameraInitialPosition.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.cameraVerticalRotation);
    cameraInitialPosition.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.cameraHorizonalRotation);
    this.instance.position.set(cameraInitialPosition.x, cameraInitialPosition.y, cameraInitialPosition.z);

    // Apply camera up rotations
    cameraUp.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.cameraVerticalRotation);
    cameraUp.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.cameraHorizonalRotation);
    this.instance.up.set(cameraUp.x, cameraUp.y, cameraUp.z);
    
    this.setTarget();
  }

  update() {
    if (!this.cameraTransitioning) {
      if (this.focus) {
        // Focus on target position
        let targetPosition = new THREE.Vector3(this.focus.position.x, this.focus.position.y, this.focus.position.z)
        
        // Reverse binary sun rotation to focus on correct sun position
        if (this.focus.name == "sun") {
          targetPosition.applyAxisAngle(new THREE.Vector3( 0, 0, 1 ), this.focus.parent.rotation.z);
        }

        this.setTarget(targetPosition.x, targetPosition.y, targetPosition.z);
      }
    }
  }
}