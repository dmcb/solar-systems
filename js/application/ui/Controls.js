import * as THREE from 'three';
import Application from '../Application.js';
import EventEmitter from '../utils/EventEmitter.js';

export default class Controls extends EventEmitter {
  constructor() {
    super();

    this.application = new Application();
    this.solarSystemRadius = this.application.solarSystemRadius;
    this.scene = this.application.scene;
    this.camera = this.application.camera;
    this.viewport = this.application.viewport;
    this.canvas = this.application.canvas;

    this.cameraDrag = false;
    this.cameraVerticalRotation = 0;
    this.cameraHorizonalRotation = 0;
    this.controlsEnabled = true;

    this.canvas.addEventListener('dblclick', (event) => this.dblClick(event));
    this.canvas.addEventListener('pointermove', (event) => this.pointerMove(event));
    this.canvas.addEventListener('pointerdown', (event) => this.pointerDown(event));
    this.canvas.addEventListener('pointerup', (event) => this.pointerEnd(event));
    this.canvas.addEventListener('pointerout', (event) => this.pointerEnd(event));
    this.canvas.addEventListener('pointercancel', (event) => this.pointerEnd(event));
  }

  dblClick(event) {
    if (this.controlsEnabled) {
      const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
      if (!fullscreenElement)
      {
        if (this.canvas.requestFullscreen) {
          this.canvas.requestFullscreen();
        }
        else if (this.canvas.webkitRequestFullscreen) {
          this.canvas.webkitRequestFullscreen();
        }
      }
      else
      {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
        else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }
    }
  }

  pointerMove(event) {
    if (this.controlsEnabled) {
      if (this.cameraDrag == event.pointerId && !this.camera.focus) {
        const newPointerPosition = {x: this.normalizePointX(event.clientX), y: this.normalizePointY(event.clientY)};
        const screenMovement = {x: newPointerPosition.x - this.currentPointerPosition.x, y: newPointerPosition.y - this.currentPointerPosition.y};
        this.currentPointerPosition = newPointerPosition;

        this.cameraVerticalRotation -= Math.PI * screenMovement.y;
        this.cameraHorizonalRotation -= Math.PI * screenMovement.x;

        // Cap vertical rotation ranges
        if (this.cameraVerticalRotation > Math.PI * 0.5 ) this.cameraVerticalRotation = Math.PI * 0.5;
        if (this.cameraVerticalRotation < 0 ) this.cameraVerticalRotation = 0;

        // Start from base camera position
        let cameraInitialPosition = new THREE.Vector3(0, 0, this.application.solarSystemRadius);
        let cameraUp = new THREE.Vector3(0, 1, 0);

        // Apply camera position rotations
        cameraInitialPosition.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.cameraVerticalRotation);
        cameraInitialPosition.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.cameraHorizonalRotation);
        this.camera.instance.position.set(cameraInitialPosition.x, cameraInitialPosition.y, cameraInitialPosition.z);

        // Apply camera up rotations
        cameraUp.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.cameraVerticalRotation);
        cameraUp.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.cameraHorizonalRotation);
        this.camera.instance.up.set(cameraUp.x, cameraUp.y, cameraUp.z);
        
        this.camera.setTarget();
      }
    }
  }

  pointerDown(event) {
    if (this.controlsEnabled) {
      // If camera is focused on a planet, a tap will undo it
      if (this.camera.focus) {
        this.trigger('focus');
      }
      else {
        // Check if a sun or planet is tapped on
        let pointer = new THREE.Vector2();
        let raycaster = new THREE.Raycaster();
        pointer.x = this.normalizePointX(event.clientX);
        pointer.y = this.normalizePointY(event.clientY);

        raycaster.setFromCamera(pointer, this.camera.instance);
        
        const intersects = raycaster.intersectObjects( this.scene.children );
        let match;
        intersects.forEach((item, index, object) => {
          if (!match && (item.object.name == "sun" || item.object.name == "planet")) {
            match = item.object.id;
          }
        });

        // If there's a match, let the app know, otherwise initiate drag
        if (match) {
          this.trigger('focus', [match]);
        }
        else if (!this.cameraDrag) {
          this.cameraDrag = event.pointerId;
          this.currentPointerPosition = {
            x: pointer.x,
            y: pointer.y
          }
        }
      }
    }
  }

  pointerEnd(event) {
    if (this.cameraDrag == event.pointerId) {
      this.cameraDrag = false;
    }
  }

  normalizePointX(x) {
    return (x / this.viewport.width) * 2 - 1;
  }

  normalizePointY(y) {
    return - (y / this.viewport.height) * 2 + 1;
  }
}