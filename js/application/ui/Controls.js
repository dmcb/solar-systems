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

    this.cameraDrag = false;
    window.addEventListener('pointermove', (event) => this.pointerMove(event));
    window.addEventListener('pointerdown', (event) => this.pointerDown(event));
    window.addEventListener('pointerup', (event) => this.pointerEnd(event));
    window.addEventListener('pointerout', (event) => this.pointerEnd(event));
    window.addEventListener('pointercancel', (event) => this.pointerEnd(event));
  }

  pointerMove(event) {
    if (this.cameraDrag == event.pointerId && !this.camera.focus) {
      let currentPointerPosition = {x: event.pageX, y: event.pageY};
      let screenMovement = {x: currentPointerPosition.x - this.pointerPosition.x, y: currentPointerPosition.y - this.pointerPosition.y};
      this.pointerPosition = currentPointerPosition;

      let newZ, newY;
      let rads = Math.atan2(
        this.camera.instance.position.z-(this.solarSystemRadius*3*screenMovement.y/this.viewport.height), 
        this.camera.instance.position.y-(this.solarSystemRadius*3*screenMovement.y/this.viewport.height)
      );

      newZ = Math.sin(rads)*this.solarSystemRadius;
      newY = Math.cos(rads)*this.solarSystemRadius;
      
      if (newZ > this.solarSystemRadius) { newZ = this.solarSystemRadius }
      if (newZ < 0) { newZ = 0 }
      if (newY < -this.solarSystemRadius) { newY = -this.solarSystemRadius }
      if (newY > 0) { newY = 0 }

      this.camera.setPosition(0, newY, newZ);
      this.camera.setTarget();
      this.scene.rotation.z += 0.5 * Math.PI * 4 * screenMovement.x / this.viewport.width;
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
      pointer.x = ( event.clientX / this.viewport.width ) * 2 - 1;
      pointer.y = - ( event.clientY / this.viewport.height ) * 2 + 1;

      raycaster.setFromCamera( pointer, this.camera.instance );
      
      const intersects = raycaster.intersectObjects( this.scene.children );
      let match;
      intersects.forEach((item, index, object) => {
        if (item.object.name == "sun" || item.object.name == "planet") {
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
          x: event.pageX,
          y: event.pageY
        }
      }
    }
  }

  pointerEnd(event) {
    if (this.cameraDrag == event.pointerId) {
      this.cameraDrag = false;
    }
  }
}