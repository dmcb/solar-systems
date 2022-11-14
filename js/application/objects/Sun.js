import * as THREE from 'three';
import Application from '../Application.js';

export default class Sun {
  constructor() {
    this.application = new Application();
    this.scene = this.application.scene;

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
  }

  destroy() {
    this.sunGeometry.dispose();
    this.sun.removeFromParent();
    this.sunLight.removeFromParent();
    this.ambientLight.removeFromParent();
  }
}