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

    this.dragPointer = false;

    // I don't think I like this
    // this.canvas.addEventListener('dblclick', (event) => this.dblClick(event));
    this.canvas.addEventListener('pointermove', (event) => this.pointerMove(event));
    this.canvas.addEventListener('pointerdown', (event) => this.pointerDown(event));
    this.canvas.addEventListener('pointerup', (event) => this.pointerEnd(event));
    this.canvas.addEventListener('pointerout', (event) => this.pointerEnd(event));
    this.canvas.addEventListener('pointercancel', (event) => this.pointerEnd(event));
  }

  dblClick(event) {
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

  pointerMove(event) {
    if (this.dragPointer === event.pointerId && !this.camera.focus) {
      const newPointerPosition = {x: this.normalizePointX(event.clientX), y: this.normalizePointY(event.clientY)};
      const screenMovement = {x: newPointerPosition.x - this.currentPointerPosition.x, y: newPointerPosition.y - this.currentPointerPosition.y};
      this.currentPointerPosition = newPointerPosition;

      this.camera.adjustRotation(screenMovement.x, screenMovement.y);
    }
  }

  pointerDown(event) {
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
      else if (!this.dragPointer) {
        this.dragPointer = event.pointerId;
        this.currentPointerPosition = {
          x: pointer.x,
          y: pointer.y
        }
      }
    }
  }

  pointerEnd(event) {
    if (this.dragPointer == event.pointerId) {
      this.dragPointer = false;
    }
  }

  normalizePointX(x) {
    return (x / this.viewport.width) * 2 - 1;
  }

  normalizePointY(y) {
    return - (y / this.viewport.height) * 2 + 1;
  }
}