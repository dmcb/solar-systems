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

  generate(colorStops) {
    this.destroy();
    const ctx = this.canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, this.canvas.width, 0);
    
    for (let i = 0; i < colorStops.length; i++) {
      gradient.addColorStop(colorStops[i].stop, '#'+colorStops[i].colour.getHexString());
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
