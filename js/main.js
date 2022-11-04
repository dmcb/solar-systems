import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SolarSystem } from './solarSystem.js';
import { seed, updateSeed } from './utility.js';

let scene, camera, raycaster, composer, renderer, solarSystem, solarSystemRadius, screenTouches, screenDrag, screenPosition;

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
  let camWidth = solarSystemRadius;
  let camHeight = solarSystemRadius;
  let windowAspectRatio = window.innerWidth / window.innerHeight;
  if (window.innerWidth > window.innerHeight)  {
    camWidth = camHeight * windowAspectRatio;
  }
  else {
    camHeight = camWidth / windowAspectRatio;
  }
  camera = new THREE.OrthographicCamera( camWidth*-1, camWidth, camHeight, camHeight*-1, 1, 1000 );
  camera.position.z = solarSystemRadius;
  camera.lookAt(new THREE.Vector3( 0, 0, 0 ));

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
    windowAspectRatio = window.innerWidth / window.innerHeight;
    if (window.innerWidth > window.innerHeight)  {
      camera.left = solarSystemRadius * -windowAspectRatio;
      camera.right =  solarSystemRadius * windowAspectRatio;
    }
    else {
      camera.top = solarSystemRadius / windowAspectRatio;
      camera.bottom = solarSystemRadius / -windowAspectRatio;
    }
    camera.updateProjectionMatrix();
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
  screenDrag = false;
  screenTouches = [];
  window.addEventListener('pointermove', pointerMove);
  window.addEventListener('pointerdown', pointerDown);
  window.addEventListener('pointerup', pointerEnd);
  window.addEventListener('pointerout', pointerEnd);
  window.addEventListener('pointercancel', pointerEnd);
}

function animate() {
  requestAnimationFrame( animate );
  solarSystem.travel();
  composer.render();
}

function pointerMove(event) {
  if (screenDrag == event.pointerId) {
    let currentScreenPosition = {x: event.pageX, y: event.pageY};
    let screenMovement = {x: currentScreenPosition.x - screenPosition.x, y: currentScreenPosition.y - screenPosition.y};
    screenPosition = currentScreenPosition;

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

    camera.position.z = newZ;
    camera.position.y = newY;

    scene.rotation.z += 0.5 * Math.PI * 4 * screenMovement.x / window.innerWidth;

    camera.up = new THREE.Vector3(0,1,0);
    camera.lookAt(new THREE.Vector3( 0, 0, 0 ));
  }
}

function pointerDown(event) {
  let pointer = new THREE.Vector2();
  pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
  pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

  raycaster.setFromCamera( pointer, camera );
  let selection = false;
  const intersects = raycaster.intersectObjects( scene.children );
  intersects.forEach((item, index, object) => {
    if (item.object.name == "sun" || item.object.name == "planet") {
      selection = true;
      console.log(item);
      // camera.lookAt(item.point);
    }
  });

  if (!selection && !screenDrag) {
    screenDrag = event.pointerId;
    screenPosition = {
      x: event.pageX,
      y: event.pageY
    }
  }
}

function pointerEnd(event) {
  if (screenDrag = event.pointerId) {
    screenDrag = false;
  }
}