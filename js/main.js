import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SolarSystem } from './solarSystem.js';
import { seed, updateSeed } from './utility.js';
import { getCameraBounds, setCameraBounds, setCameraPosition, setCameraTarget, resetCamera } from './camera.js';

let scene, camera, raycaster, composer, renderer, solarSystem, solarSystemRadius, cameraDrag, cameraFocus, pointerPosition;

init();
animate();

function init() {
  scene = new THREE.Scene();
  raycaster = new THREE.Raycaster();

  // Lights
  const sunLight = new THREE.PointLight( 0xffffff, 1, 0, 0 );
  sunLight.position.set( 0, 0, 0 );
  sunLight.castShadow = true;
  scene.add( sunLight );
  const ambientLight = new THREE.AmbientLight( 0xffffff, 0.2 );
  scene.add( ambientLight );

  // Camera
  solarSystemRadius = 160;
  const bounds = getCameraBounds(solarSystemRadius);
  camera = new THREE.OrthographicCamera(bounds.left, bounds.right, bounds.top, bounds.bottom, 1, 1000 );
  setCameraPosition(camera, solarSystemRadius);

  // Sun
  const sunGeometry = new THREE.SphereGeometry( 7 );
  const sunMaterial = new THREE.MeshBasicMaterial( { color: 0xffffcc } );
  let sun = new THREE.Mesh( sunGeometry, sunMaterial );
  sun.name = "sun";
  sun.position.set( 0, 0, 0);
  scene.add(sun);
  solarSystem = new SolarSystem(scene, solarSystemRadius);

  // Renderer
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.BasicShadowMap;
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  const renderScene = new RenderPass( scene, camera );

  // Bloom
  const bloomPass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 1.5, 0.4, 0.85 );
  bloomPass.threshold = 0.95;
  bloomPass.strength = 1.5;
  bloomPass.radius = 0.5;

  // Compose render and bloom
  composer = new EffectComposer( renderer );
  composer.addPass( renderScene );
  composer.addPass( bloomPass );

  document.body.appendChild( renderer.domElement );


  // UI
  // Update camera on window resize
  window.addEventListener('resize', () => {
    setCameraBounds(camera, solarSystemRadius);
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  });

  // Add seed label and button
  let seedButton = document.getElementById('seed');
  seedButton.innerHTML = 'Seed: ' + seed;
  seedButton.addEventListener('click', event => {
    let newSeed = prompt("Enter seed");
    if (newSeed) {
      updateSeed(newSeed)
      seedButton.innerHTML = 'Seed: ' + newSeed;
      solarSystem.destroy();
      solarSystem = new SolarSystem(scene, solarSystemRadius);
    }
  });

  // Add touch controls
  cameraDrag = false;
  window.addEventListener('pointermove', pointerMove);
  window.addEventListener('pointerdown', pointerDown);
  window.addEventListener('pointerup', pointerEnd);
  window.addEventListener('pointerout', pointerEnd);
  window.addEventListener('pointercancel', pointerEnd);
}

function animate() {
  requestAnimationFrame( animate );
  solarSystem.travel();
  if (cameraFocus) {
    let focusObject = scene.getObjectById(cameraFocus);
    let cameraPosition = new THREE.Vector3(focusObject.parent.position.x, focusObject.parent.position.y, focusObject.parent.position.z);
    cameraPosition.applyAxisAngle(new THREE.Vector3( 0, 0, 1 ), scene.rotation.z);
    setCameraBounds(camera, focusObject.geometry.parameters.radius*2.5);
    setCameraPosition(camera, solarSystemRadius, cameraPosition.x, cameraPosition.y, focusObject.geometry.parameters.radius*5);
    camera.lookAt(cameraPosition);
    camera.updateProjectionMatrix();
  }
  composer.render();
}

function pointerMove(event) {
  if (cameraDrag == event.pointerId && !cameraFocus) {
    let currentPointerPosition = {x: event.pageX, y: event.pageY};
    let screenMovement = {x: currentPointerPosition.x - pointerPosition.x, y: currentPointerPosition.y - pointerPosition.y};
    pointerPosition = currentPointerPosition;

    let newZ, newY;
    let rads = Math.atan2(
      camera.position.z-(solarSystemRadius*3*screenMovement.y/window.innerHeight), 
      camera.position.y-(solarSystemRadius*3*screenMovement.y/window.innerHeight)
    );

    newZ = Math.sin(rads)*solarSystemRadius;
    newY = Math.cos(rads)*solarSystemRadius;
    
    if (newZ > solarSystemRadius) { newZ = solarSystemRadius }
    if (newZ < 0) { newZ = 0 }
    if (newY < -solarSystemRadius) { newY = -solarSystemRadius }
    if (newY > 0) { newY = 0 }

    setCameraPosition(camera, solarSystemRadius, 0, newY, newZ);
    setCameraTarget(camera);
    scene.rotation.z += 0.5 * Math.PI * 4 * screenMovement.x / window.innerWidth;
  }
}

function pointerDown(event) {
  // If camera is focused on a planet, a tap will undo it
  if (cameraFocus) {
    cameraFocus = false;
    resetCamera(camera, solarSystemRadius);
  }
  else {
    let pointer = new THREE.Vector2();
    pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

    raycaster.setFromCamera( pointer, camera );
    
    const intersects = raycaster.intersectObjects( scene.children );
    intersects.forEach((item, index, object) => {
      if (!cameraFocus && (item.object.name == "sun" || item.object.name == "planet")) {
        cameraFocus = item.object.id;
      }
    });

    if (!cameraFocus && !cameraDrag) {
      cameraDrag = event.pointerId;
      pointerPosition = {
        x: event.pageX,
        y: event.pageY
      }
    }
  }
}

function pointerEnd(event) {
  if (cameraDrag == event.pointerId) {
    cameraDrag = false;
  }
}