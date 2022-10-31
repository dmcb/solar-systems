import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.145.0/three.module.js';

import { SolarSystem } from './solarSystem.js';
import { seed, updateSeed } from './utility.js';

let scene, camera, renderer, solarSystem;

init();
animate();

function init() {
  scene = new THREE.Scene();

  // Lights
  const sunLight = new THREE.PointLight( 0xffffff, 1, 0, 0 );
  sunLight.position.set( 0, 0, 0 );
  sunLight.castShadow = true;
  scene.add( sunLight );
  const ambientLight = new THREE.AmbientLight( 0xffffff, 0.2 );
  scene.add( ambientLight );

  // Camera
  const solarSystemRadius = 160;
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

  // Scene
  const sunGeometry = new THREE.SphereGeometry( 8 );
  const sunMaterial = new THREE.MeshBasicMaterial( { color: 0xffffcc } );
  let sun = new THREE.Mesh( sunGeometry, sunMaterial );
  sun.position.set( 0, 0, 0);
  scene.add(sun);
  solarSystem = new SolarSystem(scene, solarSystemRadius);

  // Add renderer
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.BasicShadowMap;
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
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

  // Add camera control
  let screenDrag = false;
  let cameraMovement = 0;
  let cameraMaximum = 100;
  window.addEventListener('mousemove', (event) => {
    if (screenDrag) {
      cameraMovement -= (event.movementY/2);
      if (cameraMovement > 100) {
        cameraMovement = 100;
      }
      if (cameraMovement < 0) {
        cameraMovement = 0;
      }

      camera.position.z = Math.cos(0.5 * Math.PI * -cameraMovement/cameraMaximum)*solarSystemRadius;
      camera.position.y = Math.sin(0.5 * Math.PI * -cameraMovement/cameraMaximum)*solarSystemRadius;

      camera.lookAt(new THREE.Vector3( 0, 0, 0 ));
    }
  });
  window.addEventListener('mousedown', () => {
    screenDrag = true;
  });
  window.addEventListener('mouseup', () => {
    screenDrag = false;
  });
  window.addEventListener('mouseleave', () => {
    screenDrag = false;
  });
}

function animate() {
  requestAnimationFrame( animate );
  solarSystem.travel();
  renderer.render( scene, camera );
}

