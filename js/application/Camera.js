import * as THREE from 'three';
import Application from './Application.js';
import { easeInOutQuad } from './utils/Easings.js';

const animationDuration = 600;

export default class Camera {
  constructor() {
    this.application = new Application();
    this.solarSystem = this.application.solarSystem;
    this.solarSystemRadius = this.application.solarSystemRadius;
    this.controls = this.application.controls;
    this.scene = this.application.scene;
    this.time = this.application.time;
    this.viewport = this.application.viewport;

    this.cameraDistance = this.solarSystemRadius*2;

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
      // Save current position of camera before focus
      this.preFocusCameraPosition = new THREE.Vector3(this.instance.position.x, this.instance.position.y, this.instance.position.z);

      // Get focused celestial body
      this.focus = this.scene.getObjectById(objectId);

      // Get new camera size and position based on celestial body
      let futurePosition = new THREE.Vector3();
      if (this.focus.name == "sun") {
        const sun = this.solarSystem.suns[this.focus.sunNumber-1];
        this.cameraSizeTarget = sun.size*2.5;
        futurePosition.copy(this.focus.position);
        if (this.solarSystem.suns.length > 1) {
          futurePosition.applyAxisAngle(new THREE.Vector3( 0, 0, 1 ), this.solarSystem.determineFutureSunsOrbit(animationDuration));
        }
      }
      else if (this.focus.name == "planet") {
        const planet = this.solarSystem.planets[this.focus.planetNumber-1];
        this.cameraSizeTarget = planet.size*2.5;
        futurePosition = planet.determineFuturePosition(animationDuration);
      }
      this.cameraSizeStart = this.cameraSize;
      this.cameraPositionStart.copy(this.preFocusCameraPosition);
      this.cameraPositionTarget.addVectors(futurePosition, this.preFocusCameraPosition);
    }
    else {
      this.focus = false;

      // Set original camera bounds and camera position and look at target
      this.cameraSizeStart = this.cameraSize;
      this.cameraSizeTarget = this.solarSystemRadius;
      this.cameraPositionStart.copy(this.instance.position);
      this.cameraPositionTarget.copy(this.preFocusCameraPosition);
    }

    // Begin animation
    this.cameraAnimationTime = this.time.elapsed;
    this.cameraAnimating = true;
  }

  reset() {
    this.cameraAnimating = false;
    this.cameraAnimationTime = 0;
    this.cameraPositionTarget = new THREE.Vector3(0,0,this.cameraDistance);
    this.cameraPositionStart = new THREE.Vector3(0,0,this.cameraDistance);
    this.cameraUpTarget = new THREE.Vector3(0,1,0);
    this.cameraUpStart = new THREE.Vector3(0,1,0);
    this.cameraSizeTarget = this.solarSystemRadius;
    this.cameraSizeStart = this.solarSystemRadius;
    this.cameraSize = this.solarSystemRadius;
    this.cameraVerticalRotation = 0;
    this.cameraHorizonalRotation = 0;
    
    this.focus = false;

    this.resize();
    this.instance.position.copy(this.cameraPositionTarget);
  }

  rotate() {
    // Cap vertical rotation ranges
    if (this.cameraVerticalRotation > Math.PI * 0.5 ) this.cameraVerticalRotation = Math.PI * 0.5;
    if (this.cameraVerticalRotation < 0 ) this.cameraVerticalRotation = 0;

    // Start from base camera position
    let cameraInitialPosition = new THREE.Vector3(0, 0, this.cameraDistance);
    let cameraUp = new THREE.Vector3(0, 1, 0);

    // Apply camera position rotations
    cameraInitialPosition.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.cameraVerticalRotation);
    cameraInitialPosition.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.cameraHorizonalRotation);
    this.cameraPositionTarget.copy(cameraInitialPosition);

    // Apply camera up rotations
    cameraUp.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.cameraVerticalRotation);
    cameraUp.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.cameraHorizonalRotation);
    this.cameraUpTarget.copy(cameraUp);
  }

  update() {
    // Smooth camera
    let percentageOfAnimation = Math.abs(this.cameraAnimationTime - this.time.elapsed) / animationDuration;
    if (percentageOfAnimation > 1) {
      percentageOfAnimation = 1;
    }
    if (this.cameraAnimating && percentageOfAnimation <= 1) {
      // Interpolate camera position
      this.instance.position.lerpVectors(this.cameraPositionStart, this.cameraPositionTarget, easeInOutQuad(percentageOfAnimation));

      // Interpolate camera size
      this.cameraSize = (this.cameraSizeStart * (1 - (easeInOutQuad(percentageOfAnimation))) + (this.cameraSizeTarget * easeInOutQuad(percentageOfAnimation)));
      this.resize();

      if (percentageOfAnimation == 1) {
        this.cameraAnimating = false;
      }
    }
    else {
      // If the camera has a focus, keep position locked on focused body
      if (this.focus) {
        // Get focus target position
        let targetPosition = new THREE.Vector3(this.focus.position.x, this.focus.position.y, this.focus.position.z)
        
        // Reverse binary sun rotation to focus on correct sun position
        if (this.focus.name == "sun") {
          targetPosition.applyAxisAngle(new THREE.Vector3( 0, 0, 1 ), this.focus.parent.rotation.z);
        }

        // Calculate new camera position
        let alteredCameraPosition = new THREE.Vector3();
        alteredCameraPosition.addVectors(targetPosition, this.preFocusCameraPosition);
        this.instance.position.copy(alteredCameraPosition);
      }
      else {
        // Dampen rotation
        // Ensure lerped value is always on a point on a sphere at length cameraDistance and not closer to the center
        if (this.cameraPositionTarget.distanceTo(this.instance.position) > 0.1) {
          this.instance.position.lerp(this.cameraPositionTarget, 0.01 * this.time.delta).normalize().multiplyScalar(this.cameraDistance);
          this.instance.up.lerp(this.cameraUpTarget, 0.01 * this.time.delta);
          this.instance.lookAt(new THREE.Vector3(0,0,0));
          console.log(this.instance.position);
        }
      }
    }
  }
}