import * as THREE from 'three';

export default class GradientMap {
  constructor(resolutionX, resolutionY) {
    this.canvas = document.createElement("canvas");
    this.resolutionX = resolutionX;
    this.resolutionY = resolutionY;
    this.map = null;

    if (!this.resolutionX) {
      this.resolutionX = 256;
    }
    if (!this.resolutionY) {
      this.resolutionY = 1;
    }

    this.canvas.width = this.resolutionX;
    this.canvas.height = this.resolutionY;
  }

  generate(waterLevel, colour) {
    this.destroy();
    const ctx = this.canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, this.canvas.width, 0);
    
    if (waterLevel) {
      gradient.addColorStop(waterLevel*0.8, "#000066");
      gradient.addColorStop(waterLevel*0.95, "blue");
      gradient.addColorStop(waterLevel*0.99, "#33ffbb");
      gradient.addColorStop(waterLevel, "#DDCDB5");
      gradient.addColorStop(waterLevel*1.02, "#669900");
      gradient.addColorStop(waterLevel*1.11, "#006600");
      gradient.addColorStop(waterLevel*1.23, "#b4a190");
      gradient.addColorStop(waterLevel*1.3, "white");
    }
    else {
      console.log(colour.getHexString());
      gradient.addColorStop(0, "black");
      gradient.addColorStop(1, "#"+colour.getHexString());
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.map = new THREE.CanvasTexture(this.canvas);
  }

  destroy() {
    if (this.map) {
      this.map.dispose();
      this.map = null;
    }
  }
}
