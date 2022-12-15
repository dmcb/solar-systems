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
    this.canvas.addEventListener('dblclick', (event) => this.dblClick(event));
    this.canvas.addEventListener('pointermove', (event) => this.pointerMove(event));
    this.canvas.addEventListener('pointerdown', (event) => this.pointerDown(event));
    this.canvas.addEventListener('pointerup', (event) => this.pointerEnd(event));
    this.canvas.addEventListener('pointerout', (event) => this.pointerEnd(event));
    this.canvas.addEventListener('pointercancel', (event) => this.pointerEnd(event));
  }

  dblClick(event) {
    const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
    if(!fullscreenElement)
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
    if (this.cameraDrag == event.pointerId && !this.camera.focus) {
      const currentPointerPosition = {x: this.normalizePointX(event.clientX), y: this.normalizePointY(event.clientY)};
      let screenMovement = {x: currentPointerPosition.x - this.pointerPosition.x, y: currentPointerPosition.y - this.pointerPosition.y};
      this.pointerPosition = currentPointerPosition;

      let newZ, newY;
      let rads = Math.atan2(
        this.camera.instance.position.z+(this.solarSystemRadius*screenMovement.y), 
        this.camera.instance.position.y+(this.solarSystemRadius*screenMovement.y)
      );

      newZ = Math.sin(rads)*this.solarSystemRadius;
      newY = Math.cos(rads)*this.solarSystemRadius;
      
      if (newZ > this.solarSystemRadius) { newZ = this.solarSystemRadius }
      if (newZ < 0) { newZ = 0 }
      if (newY < -this.solarSystemRadius) { newY = -this.solarSystemRadius }
      if (newY > 0) { newY = 0 }

      this.camera.setPosition(0, newY, newZ);
      this.camera.setTarget();
      this.scene.rotation.z += Math.PI * screenMovement.x;
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
      else if (!this.cameraDrag) {
        this.cameraDrag = event.pointerId;
        this.pointerPosition = {
          x: pointer.x,
          y: pointer.y
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