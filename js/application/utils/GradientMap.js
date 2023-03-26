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
      gradient.addColorStop(waterLevel*0.5, "#000044");
      gradient.addColorStop(waterLevel*0.8, "#000066");
      gradient.addColorStop(waterLevel*0.94, "#0000ff");
      gradient.addColorStop(waterLevel*0.97, "#0047fe");
      gradient.addColorStop(waterLevel, "#29d67a");
      gradient.addColorStop(waterLevel, "#dcd39f");
      gradient.addColorStop(waterLevel*1.02, "#749909");
      gradient.addColorStop(waterLevel*1.07, "#215322");
      gradient.addColorStop(waterLevel*1.13, "#214A21");
      gradient.addColorStop(waterLevel*1.19, "#746354");
      gradient.addColorStop(waterLevel*1.28, "#D3D0CD");
      gradient.addColorStop(waterLevel*1.29, "#ffffff");
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
