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
      // Get focused celestial body
      this.focus = this.scene.getObjectById(objectId);

      // Get new camera size and position based on celestial body
      let futurePosition = new THREE.Vector3();
      if (this.focus.name == "sun") {
        const sun = this.solarSystem.suns[this.focus.sunNumber-1];
        this.cameraSizeTarget = sun.size*1.5;
        futurePosition.copy(this.focus.position);
        if (this.solarSystem.suns.length > 1) {
          futurePosition.applyAxisAngle(new THREE.Vector3( 0, 0, 1 ), this.solarSystem.determineFutureSunsOrbit(animationDuration));
        }
      }
      else if (this.focus.name == "planet") {
        const planet = this.solarSystem.planets[this.focus.planetNumber-1];
        this.cameraSizeTarget = planet.size*2;
        futurePosition = planet.determineFuturePosition(animationDuration);
      }
      this.cameraSizeStart = this.cameraSize;
      this.cameraPositionStart.copy(this.instance.position);
      this.cameraPositionTarget.addVectors(futurePosition, this.instance.position);
      this.lastFocusPosition.copy(futurePosition);
    }
    else {
      // Set original camera bounds and camera position and look at target
      this.cameraSizeStart = this.cameraSize;
      this.cameraSizeTarget = this.solarSystemRadius;
      this.cameraPositionStart.copy(this.instance.position);

      const focusPosition = new THREE.Vector3(0,0,0);
      focusPosition.copy(this.focus.position);
      // If focus is sun, reverse binary sun rotation to focus on correct sun position
      // This is gross for now
      if (this.focus.name == "sun") {
        focusPosition.applyAxisAngle(new THREE.Vector3( 0, 0, 1 ), this.focus.parent.rotation.z);
      }

      this.cameraPositionTarget.subVectors(this.instance.position, focusPosition);
      this.lastFocusPosition = new THREE.Vector3(0,0,0);

      this.focus = false;
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
    this.lastFocusPosition = new THREE.Vector3(0,0,0);

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
    // Smooth camera animations if animating
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
      // Apply dampened rotation
      if (this.cameraPositionTarget.distanceTo(this.instance.position) > 0.5) {
        // Ensure lerped value is always on a point on a sphere at length cameraDistance and not closer to the center
        this.instance.position.lerp(this.cameraPositionTarget, 0.01 * this.time.delta).normalize().multiplyScalar(this.cameraDistance);
        this.instance.up.lerp(this.cameraUpTarget, 0.01 * this.time.delta);
      }

      // Get position of camera's focus
      const focusPosition = new THREE.Vector3(0,0,0);
      if (this.focus) {
        focusPosition.copy(this.focus.position);

        // If focus is sun, reverse binary sun rotation to focus on correct sun position
        // This is gross for now
        if (this.focus.name == "sun") {
          focusPosition.applyAxisAngle(new THREE.Vector3( 0, 0, 1 ), this.focus.parent.rotation.z);
        }

        // Set camera position to stay locked with object in focus
        let focusDelta = new THREE.Vector3();
        focusDelta.subVectors(this.lastFocusPosition, focusPosition);
        this.instance.position.add(focusDelta);
        this.cameraPositionTarget.add(focusDelta);
        this.lastFocusPosition.copy(focusPosition);
      }
    
      // Look at focus target
      this.instance.lookAt(focusPosition);
    }
  }
}