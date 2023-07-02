import * as THREE from 'three';
import Application from '../Application.js';
import EventEmitter from '../utils/EventEmitter.js';

export default class Controls extends EventEmitter {
  constructor() {
    super();

    this.application = new Application();
    this.scene = this.application.scene;
    this.camera = this.application.camera;
    this.viewport = this.application.viewport;
    this.canvas = this.application.canvas;
    this.time = this.application.time;

    this.dragPointer = false;
    this.lastClickTime = 0;
    this.currentPointerPosition = new THREE.Vector2(0, 0);

    // this.canvas.addEventListener('dblclick', (event) => this.dblClick(event));
    this.canvas.addEventListener('pointermove', (event) => this.pointerMove(event));
    this.canvas.addEventListener('pointerdown', (event) => this.pointerDown(event));
    this.canvas.addEventListener('pointerup', (event) => this.pointerEnd(event));
    this.canvas.addEventListener('pointerout', (event) => this.pointerEnd(event));
    this.canvas.addEventListener('pointercancel', (event) => this.pointerEnd(event));
  }

  dblClick(event) {
    if (!this.camera.cameraAnimating) {
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
    if (!this.camera.cameraAnimating) {
      if (this.dragPointer === event.pointerId) {
        const newPointerPosition = new THREE.Vector2(this.normalizePointX(event.clientX), this.normalizePointY(event.clientY));
        const screenMovement = new THREE.Vector2;
        screenMovement.subVectors(newPointerPosition, this.currentPointerPosition);
        this.currentPointerPosition = newPointerPosition;
        this.camera.adjustRotation(screenMovement.x, screenMovement.y);
      }
    }
  }

  pointerDown(event) {
    this.lastClickTime = this.time.elapsed;
    
    if (!this.camera.cameraAnimating) {
      this.currentPointerPosition.set(this.normalizePointX(event.clientX), this.normalizePointY(event.clientY));
      // Drag on pointer down
      if (!this.dragPointer) {
        this.dragPointer = event.pointerId;
      }
    }
  }

  pointerEnd(event) {
    // End any drag that's occuring
    if (this.dragPointer == event.pointerId) {
      this.dragPointer = false;
    }

    if (!this.camera.cameraAnimating) {
      // Register a click if drag time elapsed is very small
      if ((this.time.elapsed - this.lastClickTime) < 200) {
        // End camera focus if it's focused
        if (this.camera.focus) {
          this.trigger('focus', [false]);
        }
        else {
          // Check if a sun or planet is tapped on
          let raycaster = new THREE.Raycaster();

          raycaster.setFromCamera(this.currentPointerPosition, this.camera.instance);
          
          const intersects = raycaster.intersectObjects( this.scene.children );
          let tappedObject;
          intersects.forEach((item, index, object) => {
            if (!tappedObject && (item.object.name == "sun" || item.object.name == "planet")) {
              tappedObject = item.object.id;
            }
          });

          // If there's a tapped object, let the app know
          if (tappedObject) {
            this.trigger('focus', [tappedObject]);
          }
        }
      }
    }
  }

  normalizePointX(x) {
    return (x / this.viewport.width) * 2 - 1;
  }

  normalizePointY(y) {
    return - (y / this.viewport.height) * 2 + 1;
  }
}