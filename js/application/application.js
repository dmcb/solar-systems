import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import SolarSystem from './SolarSystem.js';
import Seed from './utils/Seed.js';
import Camera from './Camera.js';

let instance = null;

export default class Application 
{
  constructor(canvas)
  {
    if (instance) 
    {
      return instance;
    }
    instance = this;

    this.solarSystemRadius = 160;
    this.seed = new Seed();
    this.scene = new THREE.Scene();
    this.raycaster = new THREE.Raycaster();
    this.canvas = canvas;
    this.camera = new Camera();

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
    this.solarSystem = new SolarSystem(this.scene, this.solarSystemRadius);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap;
    this.renderer.setPixelRatio( window.devicePixelRatio );
    this.renderer.setSize( window.innerWidth, window.innerHeight );
    this.renderScene = new RenderPass( this.scene, this.camera.instance );

    // Bloom
    this.bloomPass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 1.5, 0.4, 0.85 );
    this.bloomPass.threshold = 0.95;
    this.bloomPass.strength = 1.5;
    this.bloomPass.radius = 0.5;

    // Compose render and bloom
    this.composer = new EffectComposer( this.renderer );
    this.composer.addPass( this.renderScene );
    this.composer.addPass( this.bloomPass );

    // UI
    // Update camera on window resize
    window.addEventListener('resize', () => {
      this.camera.setCameraBounds();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.composer.setSize(window.innerWidth, window.innerHeight);
    });

    // Add seed label and button
    this.seedButton = document.getElementById('seed');
    this.seedButton.innerHTML = 'Seed: ' + this.seed.value;
    this.seedButton.addEventListener('click', event => {
      let newSeed = prompt("Enter seed");
      if (newSeed) {
        this.seed.updateSeed(newSeed)
        this.seedButton.innerHTML = 'Seed: ' + newSeed;
        this.solarSystem.destroy();
        this.solarSystem = new SolarSystem(this.scene, this.solarSystemRadius);
      }
    });

    // Add touch controls
    this.cameraDrag = false;
    window.addEventListener('pointermove', (event) => this.pointerMove(event));
    window.addEventListener('pointerdown', (event) => this.pointerDown(event));
    window.addEventListener('pointerup', (event) => this.pointerEnd(event));
    window.addEventListener('pointerout', (event) => this.pointerEnd(event));
    window.addEventListener('pointercancel', (event) => this.pointerEnd(event));

    this.animate();
  }

  animate() {
    requestAnimationFrame(() => this.animate() );

    this.solarSystem.travel();
    if (this.cameraFocus) {
      let focusObject = this.scene.getObjectById(this.cameraFocus);
      let cameraPosition = new THREE.Vector3(focusObject.parent.position.x, focusObject.parent.position.y, focusObject.parent.position.z);
      cameraPosition.applyAxisAngle(new THREE.Vector3( 0, 0, 1 ), this.scene.rotation.z);
      this.camera.setCameraBounds(focusObject.geometry.parameters.radius*2.5);
      this.camera.setCameraPosition(cameraPosition.x, cameraPosition.y, focusObject.geometry.parameters.radius*5);
      this.camera.setCameraTarget(cameraPosition.x, cameraPosition.y, cameraPosition.z);
    }
    this.composer.render();
  }

  pointerMove(event) {
    if (this.cameraDrag == event.pointerId && !this.cameraFocus) {
      let currentPointerPosition = {x: event.pageX, y: event.pageY};
      let screenMovement = {x: currentPointerPosition.x - this.pointerPosition.x, y: currentPointerPosition.y - this.pointerPosition.y};
      this.pointerPosition = currentPointerPosition;

      let newZ, newY;
      let rads = Math.atan2(
        this.camera.instance.position.z-(this.solarSystemRadius*3*screenMovement.y/window.innerHeight), 
        this.camera.instance.position.y-(this.solarSystemRadius*3*screenMovement.y/window.innerHeight)
      );

      newZ = Math.sin(rads)*this.solarSystemRadius;
      newY = Math.cos(rads)*this.solarSystemRadius;
      
      if (newZ > this.solarSystemRadius) { newZ = this.solarSystemRadius }
      if (newZ < 0) { newZ = 0 }
      if (newY < -this.solarSystemRadius) { newY = -this.solarSystemRadius }
      if (newY > 0) { newY = 0 }

      this.camera.setCameraPosition(0, newY, newZ);
      this.camera.setCameraTarget();
      this.scene.rotation.z += 0.5 * Math.PI * 4 * screenMovement.x / window.innerWidth;
    }
  }

  pointerDown(event) {
    // If camera is focused on a planet, a tap will undo it
    if (this.cameraFocus) {
      this.cameraFocus = false;
      this.camera.resetCamera();
    }
    else {
      let pointer = new THREE.Vector2();
      pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
      pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

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
}