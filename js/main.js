import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.145.0/three.module.js';
import { Planet } from './planet.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const sunLight = new THREE.PointLight( 0xffffff, 1, 0, 0 );
sunLight.position.set( 0, 0, 0 );
scene.add( sunLight );

const ambientLight = new THREE.AmbientLight( 0xffffff, 0.3 );
scene.add( ambientLight );

camera.position.z = 100;

let planets = [];
let minimumDistance = 16;
while (minimumDistance < 80) {
  let planet = new Planet(minimumDistance);
  planet.addToScene(scene);
  planets.push(planet);
  minimumDistance = planet.nextNeighbourMinimumDistance();
}

console.log(planets.length);

const geometry = new THREE.SphereGeometry( 8 );
const material = new THREE.MeshBasicMaterial( { color: 0xffffcc } );
let sun = new THREE.Mesh( geometry, material );
sun.position.set( 0, 0, 0);
scene.add(sun);

function animate() {
  requestAnimationFrame( animate );
  planets.forEach(planet => {
    planet.travel();
  });
  renderer.render( scene, camera );
}
animate();

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});