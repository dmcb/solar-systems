import * as THREE from 'three';
import Application from './Application.js';

export default class Camera {
  constructor() {
    this.application = new Application();
    this.solarSystem = this.application.solarSystem;
    this.solarSystemRadius = this.application.solarSystemRadius;
    this.controls = this.application.controls;
    this.scene = this.application.scene;
    this.time = this.application.time;
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

  resize() {
    const [camWidth, camHeight] = this.getCameraDimensions(this.cameraSizeSmoothed);

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
      // Save current position of camera before focus
      this.preFocusPosition = new THREE.Vector3(this.instance.position.x, this.instance.position.y, this.instance.position.z);

      // Get focused body
      this.focus = this.scene.getObjectById(objectId);

      // Get new camera size based on celestial body
      if (this.focus.name == "sun") {
        const sun = this.focus.getObjectByName("sunCore");
        this.cameraSizeTarget = sun.geometry.parameters.radius*2.5;
      }
      else if (this.focus.name == "planet") {
        const planet = this.solarSystem.planets[this.focus.planetNumber-1];
        this.cameraSizeTarget = planet.planetOccupiedArea*2.5;
      }
    }
    else {
      this.focus = false;

      // Set original camera bounds and camera position and look at target
      this.cameraSizeTarget = this.solarSystemRadius;
      this.cameraPositionTarget.copy(this.preFocusPosition);
      this.cameraLookAtTarget = new THREE.Vector3(0,0,0);
    }
  }

  reset() {
    this.cameraLookAtTarget = new THREE.Vector3(0,0,0);
    this.cameraLookAtSmoothed = new THREE.Vector3(0,0,0);
    this.cameraPositionTarget = new THREE.Vector3(0,0,this.solarSystemRadius);
    this.cameraPositionSmoothed = new THREE.Vector3(0,0,this.solarSystemRadius);
    this.cameraUpTarget = new THREE.Vector3(0,1,0);
    this.cameraUpSmoothed = new THREE.Vector3(0,1,0);
    this.cameraSizeTarget = this.solarSystemRadius;
    this.cameraSizeSmoothed = this.solarSystemRadius;
    this.cameraVerticalRotation = 0;
    this.cameraHorizonalRotation = 0;
    
    this.focus = false;

    this.resize();
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
    this.cameraPositionTarget.set(cameraInitialPosition.x, cameraInitialPosition.y, cameraInitialPosition.z);

    // Apply camera up rotations
    cameraUp.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.cameraVerticalRotation);
    cameraUp.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.cameraHorizonalRotation);
    this.cameraUpTarget.set(cameraUp.x, cameraUp.y, cameraUp.z);
  }

  update() {
    // If the camera has a focus, keep position locked on focused body
    if (this.focus) {
      // Get focus target position
      let targetPosition = new THREE.Vector3(this.focus.position.x, this.focus.position.y, this.focus.position.z)
      
      // Reverse binary sun rotation to focus on correct sun position
      if (this.focus.name == "sun") {
        targetPosition.applyAxisAngle(new THREE.Vector3( 0, 0, 1 ), this.focus.parent.rotation.z);
      }

      // Set camera look at target to celestial body position
      this.cameraLookAtTarget.copy(targetPosition);

      // Calculate new camera position
      let alteredCameraPosition = new THREE.Vector3();
      alteredCameraPosition.addVectors(targetPosition, this.preFocusPosition);
      this.cameraPositionTarget.set(alteredCameraPosition.x, alteredCameraPosition.y, alteredCameraPosition.z);
    }

    // Smooth camera
    this.cameraLookAtSmoothed.lerp(this.cameraLookAtTarget, 0.1);
    this.instance.lookAt(this.cameraLookAtSmoothed);

    this.cameraPositionSmoothed.lerp(this.cameraPositionTarget, 0.1);
    this.instance.position.copy(this.cameraPositionSmoothed);

    this.cameraUpSmoothed.lerp(this.cameraUpTarget, 0.1);
    this.instance.up.copy(this.cameraUpSmoothed);

    this.cameraSizeSmoothed = (this.cameraSizeSmoothed * (1 - (0.1)) + (this.cameraSizeTarget * 0.1));
    this.resize();
  }
}