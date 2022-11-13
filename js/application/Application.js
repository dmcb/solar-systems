import * as THREE from 'three';

import Seed from './utils/Seed.js';
import Time from './utils/Time.js';
import Viewport from './utils/Viewport.js';
import SeedButton from './ui/SeedButton.js';
import SolarSystem from './objects/SolarSystem.js';
import Renderer from './Renderer.js';
import Camera from './Camera.js';

let instance = null;

export default class Application {
  constructor(canvas) {
    if (instance) {
      return instance;
    }
    instance = this;
    window.application = this;

    this.canvas = canvas;
    this.solarSystemRadius = 160;
    this.seed = new Seed();
    this.time = new Time();
    this.viewport = new Viewport();
    this.scene = new THREE.Scene();
    this.camera = new Camera();
    this.renderer = new Renderer();

    this.raycaster = new THREE.Raycaster();
    this.seedButton = new SeedButton();

    // Lights
    this.sunLight = new THREE.PointLight( 0xffffff, 1, 0, 0 );
    this.sunLight.position.set( 0, 0, 0 );
    this.sunLight.castShadow = true;
    this.scene.add( this.sunLight );
    this.ambientLight = new THREE.AmbientLight( 0xffffff, 0.2 );
    this.scene.add( this.ambientLight );

    // Sun
    this.sunGeometry = new THREE.SphereGeometry( 7 );
    this.sunMaterial = new THREE.MeshBasicMaterial( { color: 0xffffcc } );
    this.sun = new THREE.Mesh( this.sunGeometry, this.sunMaterial );
    this.sun.name = "sun";
    this.sun.position.set( 0, 0, 0);
    this.scene.add(this.sun);
    this.solarSystem = new SolarSystem();

    // Add touch controls
    this.cameraDrag = false;
    window.addEventListener('pointermove', (event) => this.pointerMove(event));
    window.addEventListener('pointerdown', (event) => this.pointerDown(event));
    window.addEventListener('pointerup', (event) => this.pointerEnd(event));
    window.addEventListener('pointerout', (event) => this.pointerEnd(event));
    window.addEventListener('pointercancel', (event) => this.pointerEnd(event));

    this.seed.on('set', () => {
      this.reset();
    });

    this.viewport.on('resize', () => {
      this.resize();
    });

    this.time.on('tick', () => {
      this.update();
    });
  }

  pointerMove(event) {
    if (this.cameraDrag == event.pointerId && !this.cameraFocus) {
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
    if (this.cameraFocus) {
      this.cameraFocus = false;
      this.camera.reset();
    }
    else {
      let pointer = new THREE.Vector2();
      pointer.x = ( event.clientX / this.viewport.width ) * 2 - 1;
      pointer.y = - ( event.clientY / this.viewport.height ) * 2 + 1;

      this.raycaster.setFromCamera( pointer, this.camera.instance );
      
      const intersects = this.raycaster.intersectObjects( this.scene.children );
      intersects.forEach((item, index, object) => {
        if (!this.cameraFocus && (item.object.name == "sun" || item.object.name == "planet")) {
          this.cameraFocus = item.object.id;
        }
      });

      if (!this.cameraFocus && !this.cameraDrag) {
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

  reset() {
    this.solarSystem.destroy();
    this.solarSystem = new SolarSystem();
  }

  resize() {
    this.camera.setBounds();
    this.renderer.resize();
  }

  update() {
    this.solarSystem.update();
    if (this.cameraFocus) {
      let focusObject = this.scene.getObjectById(this.cameraFocus);
      let cameraPosition = new THREE.Vector3(focusObject.parent.position.x, focusObject.parent.position.y, focusObject.parent.position.z);
      cameraPosition.applyAxisAngle(new THREE.Vector3( 0, 0, 1 ), this.scene.rotation.z);
      this.camera.setBounds(focusObject.geometry.parameters.radius*2.5);
      this.camera.setPosition(cameraPosition.x, cameraPosition.y, focusObject.geometry.parameters.radius*5);
      this.camera.setTarget(cameraPosition.x, cameraPosition.y, cameraPosition.z);
    }
    this.renderer.update();
  }
}