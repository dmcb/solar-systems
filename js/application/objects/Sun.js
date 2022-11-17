import * as THREE from 'three';
import Application from '../Application.js';

export default class Sun {
  constructor() {
    this.application = new Application();
    this.scene = this.application.scene;
    this.solarSystemRadius = this.application.solarSystemRadius;
    this.seed = this.application.seed;

    this.kelvin = this.seed.fakeGaussianRandom(-1,3)*13000;
    this.temperedKelvin = this.kelvin*0.9 + 13000*0.05;
    this.size = this.seed.fakeGaussianRandom(-2)*14+2;
    this.mass = Math.pow(this.size/2,3)*Math.PI*4/3;
    this.brightness = (1.5 / Math.pow(16 / this.size, 0.5));
    this.surfaceColour = this.kelvin_to_rgb(this.kelvin);
    this.illuminationColour = this.kelvin_to_rgb(this.temperedKelvin);
  }

  addToScene(pivotPoint, binarySystem) {
    this.addSun(pivotPoint);
    this.addSunlight(binarySystem);
  }

  addSun(pivotPoint) {
    this.sunGeometry = new THREE.SphereGeometry( this.size );
    this.sunMaterial = new THREE.MeshBasicMaterial({color: this.surfaceColour, toneMapped: false });
    this.sun = new THREE.Mesh(this.sunGeometry, this.sunMaterial);
    this.sun.name = "sun";
    this.sun.position.set( 0, 0, 0);
    pivotPoint.add(this.sun);
  }

  addSunlight(binarySystem) {
    if (binarySystem) {
      this.brightness = this.brightness/1.5;
    }
    this.sunLight = new THREE.PointLight(this.illuminationColour, this.brightness, this.solarSystemRadius*1.5);
    this.sunLight.position.set( 0, 0, 0 );
    this.sunLight.castShadow = true;
    this.sun.add( this.sunLight );
  }

  destroy() {
    this.sunLight.removeFromParent();
    this.sunGeometry.dispose();
    this.sun.removeFromParent();
  }

  kelvin_to_rgb(kelvin){
    kelvin = kelvin / 100;
    let r,g,b;
  
    // Red
    if(kelvin <= 66){
      r = 255;
    }else{
      r = kelvin - 60;
      r = 329.698727446 * Math.pow(r, -0.1332047592);
      if(r < 0)    r = 0;
      if(r > 255)  r = 255;
    }
    // Green
    if(kelvin <= 66){
      g = kelvin;
      g = 99.4708025861 * Math.log(g) - 161.1195681661;
    }else{
      g = kelvin - 60;
      g = 288.1221695283 * Math.pow(g, -0.0755148492);
    }
    if(g < 0)    g = 0;
    if(g > 255)  g = 255;
    // Blue
    if(kelvin > 66){
      b = 255;
    }else{
      if(kelvin <= 19){
        b = 0;
      }else{
        b = kelvin - 10;
        b = 138.5177312231 * Math.log(b) - 305.0447927307;
        if(b < 0)    b = 0;
        if(b > 255)  b = 255;
      }
    }
    
   return new THREE.Color(r/255,g/255,b/255);
  }
}