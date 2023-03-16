import * as THREE from 'three';
import Application from '../Application.js';
import SunShader from '../shaders/SunShader.js';

export default class Sun {
  constructor(sunNumber, direction) {
    this.application = new Application();
    this.scene = this.application.scene;
    this.solarSystem = this.application.solarSystem;
    this.solarSystemRadius = this.application.solarSystemRadius;
    this.seed = this.application.seed;
    this.time = this.application.time;
    this.debug = this.application.debug;

    this.sunNumber = sunNumber;
    this.direction = direction;

    this.generateProperties();
    this.addTouchPoint();
    this.addDebug();
  }

  generateProperties() {
    this.kelvin = this.seed.fakeGaussianRandom(-1,3)*13000;
    this.size = this.seed.fakeGaussianRandom(0,3)*15+1;
    this.volatility = this.seed.getRandom()*0.8+0.2;
    this.surfaceBrightness = this.seed.getRandom();
    this.intensity = this.seed.getRandom()*2+0.5;
    this.scale = this.seed.getRandom();
    this.smoothness = this.seed.getRandom()*0.2;
    this.rotationSpeed = this.seed.fakeGaussianRandom(-5,6)*0.005;
  }

  addTouchPoint() {
    const tappableSphereGeometry = new THREE.SphereGeometry(16);
    const tappableSphereMaterial = new THREE.MeshBasicMaterial({visible: false});
    this.sunPivotPoint = new THREE.Mesh(tappableSphereGeometry, tappableSphereMaterial);
    this.sunPivotPoint.name = "sun";
    this.sunPivotPoint.sunNumber = this.sunNumber;
    this.scene.add(this.sunPivotPoint);
  }

  addToScene() {
    this.temperedKelvin = this.kelvin*0.9 + 13000*0.05;
    this.mass = Math.pow(this.size/2,3)*Math.PI*4/3;
    this.brightness = ((1 + (0.5 * this.surfaceBrightness)) / Math.pow(18 / this.size, 0.5));
    this.surfaceColour = this.kelvinToRGB(this.kelvin);
    this.illuminationColour = this.kelvinToRGB(this.temperedKelvin);

    // Create geometry
    this.sunGeometry = new THREE.BoxGeometry(1, 1, 1, 32, 32, 32);
    for (let i=0; i < this.sunGeometry.attributes.position.count; i++) {
      var x = this.sunGeometry.attributes.position.getX(i);
      var y = this.sunGeometry.attributes.position.getY(i);
      var z = this.sunGeometry.attributes.position.getZ(i);
      let vertex = new THREE.Vector3(x,y,z);
      vertex.normalize().multiplyScalar(this.size);
      this.sunGeometry.attributes.position.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    this.sunGeometry.computeVertexNormals();
    this.sunMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uBrightness: { value: this.surfaceBrightness },
        uIntensity: { value: this.intensity },
        uScale: { value: this.scale },
        uSmoothness: { value: this.smoothness },
        uSurfaceColour: { value: this.surfaceColour },
        uTime: { value: this.time.elapsed },
        uVolatility: { value: this.volatility }
      },
      vertexShader: SunShader.vertexShader,
      fragmentShader: SunShader.fragmentShader
    });
    this.sun = new THREE.Mesh(this.sunGeometry, this.sunMaterial);
    this.sun.name = "sunCore";
    this.sun.position.set( 0, 0, 0);
    this.sunPivotPoint.add(this.sun);
    const sunsPivotPoint = this.scene.getObjectByName('sunsPivotPoint');
    sunsPivotPoint.add(this.sunPivotPoint);

    this.sunLight = new THREE.PointLight(this.illuminationColour, this.brightness, this.solarSystemRadius*1.5);
    this.sunLight.position.set( 0, 0, 0 );
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 4096;
    this.sunLight.shadow.mapSize.height = 4096;
    this.sunLight.shadow.radius = this.size * 4;
    this.sun.add( this.sunLight );
  }

  removeFromScene() {
    if (this.sun) {
      this.sun.geometry.dispose();
      this.sun.material.dispose();
      this.sun.removeFromParent();
    }
    if (this.sunLight) {
      this.sunLight.removeFromParent();
    }
  }

  update() {
    // Rotate the sun on its axis (day)
    this.sun.rotation.z += this.rotationSpeed * this.direction * this.time.delta * 0.0625;

    // Animate surface
    this.sunMaterial.uniforms.uTime.value = this.time.elapsed;
  }

  destroy() {
    if (this.debug.active) {
      this.debugFolder.destroy();
    }

    this.removeFromScene();

    this.sunPivotPoint.geometry.dispose();
    this.sunPivotPoint.material.dispose();
    this.sunPivotPoint.removeFromParent();
  }

  addDebug() {
    if(this.debug.active) {
      this.debugFolder = this.debug.ui.addFolder('Sun ' + this.sunNumber).close();

      this.debugFolder
        .add(this, 'kelvin')
        .name('kelvin')
        .min(0)
        .max(13000)
        .step(1)
        .onChange(() => {
          this.removeFromScene();
          this.addToScene();
          this.solarSystem.placeSuns();
        });

      this.debugFolder
        .add(this, 'size')
        .name('size')
        .min(1)
        .max(16)
        .step(0.001)
        .onChange(() => {
          this.removeFromScene();
          this.addToScene();
          this.solarSystem.placeSuns();
        });

      this.debugFolder
        .add(this, 'volatility')
        .name('volatility')
        .min(0.2)
        .max(1)
        .step(0.01)
        .onChange(() => {
          this.removeFromScene();
          this.addToScene();
          this.solarSystem.placeSuns();
        });

      this.debugFolder
        .add(this, 'surfaceBrightness')
        .name('surfaceBrightness')
        .min(0)
        .max(1)
        .step(0.01)
        .onChange(() => {
          this.removeFromScene();
          this.addToScene();
          this.solarSystem.placeSuns();
        });

      this.debugFolder
        .add(this, 'intensity')
        .name('intensity')
        .min(0.5)
        .max(2.5)
        .step(0.1)
        .onChange(() => {
          this.removeFromScene();
          this.addToScene();
          this.solarSystem.placeSuns();
        });

      this.debugFolder
        .add(this, 'scale')
        .name('scale')
        .min(0)
        .max(1)
        .step(0.01)
        .onChange(() => {
          this.removeFromScene();
          this.addToScene();
          this.solarSystem.placeSuns();
        });

      this.debugFolder
        .add(this, 'smoothness')
        .name('smoothness')
        .min(0)
        .max(0.2)
        .step(0.01)
        .onChange(() => {
          this.removeFromScene();
          this.addToScene();
          this.solarSystem.placeSuns();
        });

      this.debugFolder
        .add(this, 'rotationSpeed')
        .name('rotationSpeed')
        .min(0)
        .max(0.005)
        .step(0.0001)
        .onChange(() => {
          this.removeFromScene();
          this.addToScene();
          this.solarSystem.placeSuns();
        });
    }
  }

  kelvinToRGB(kelvin){
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