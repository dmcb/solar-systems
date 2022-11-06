import * as THREE from 'three';

export function getCameraBounds(range) {
  const windowAspectRatio = window.innerWidth / window.innerHeight;
  let camWidth = range;
  let camHeight = range;

  if (window.innerWidth > window.innerHeight)  {
    camWidth = range * windowAspectRatio;
  }
  else {
    camHeight = range / windowAspectRatio;
  }

  return { left: -camWidth, right: camWidth, top: camHeight, bottom: -camHeight }
}

export function setCameraBounds(camera, range) {
  const bounds = getCameraBounds(range);
  camera.left = bounds.left;
  camera.right = bounds.right;
  camera.top = bounds.top;
  camera.bottom = bounds.bottom;
  camera.updateProjectionMatrix();
}

export function setCameraPosition(camera, solarSystemRadius, x, y, z) {
  if (x === undefined) x = 0;
  if (y === undefined) y = 0;
  if (z === undefined) z = solarSystemRadius;
  camera.position.x = x;
  camera.position.y = y;
  camera.position.z = z;
  camera.updateProjectionMatrix();
}

export function setCameraTarget(camera, x, y, z) {
  if (x === undefined) x = 0;
  if (y === undefined) y = 0;
  if (z === undefined) z = 0;
  camera.up = new THREE.Vector3(0,1,0);
  camera.lookAt(new THREE.Vector3(x,y,z));
  camera.updateProjectionMatrix();
}

export function resetCamera(camera, solarSystemRadius) {
  setCameraBounds(camera, solarSystemRadius);
  setCameraPosition(camera, solarSystemRadius);
  setCameraTarget(camera);
  camera.updateProjectionMatrix();
}