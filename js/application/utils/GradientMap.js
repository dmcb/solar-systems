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
      this.resolutionY = 2;
    }

    this.canvas.width = this.resolutionX;
    this.canvas.height = this.resolutionY;
  }

  generate(colorRanges) {
    this.destroy();

    const ctx = this.canvas.getContext("2d");
    
    for (let i = 0; i < colorRanges.length; i++) {
      let colorStops = colorRanges[i];
      let gradient = ctx.createLinearGradient(0, 0, this.canvas.width, 0);

      for (let j = 0; j < colorStops.length; j++) {
        let colorStop = colorStops[j];
        gradient.addColorStop(colorStop.stop, '#'+colorStop.colour.getHexString());
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(0, i, this.canvas.width, i+1);
    }

    this.map = new THREE.CanvasTexture(this.canvas);
    this.map.magFilter = THREE.NearestFilter;
    this.map.minFilter = THREE.NearestFilter;
  }

  destroy() {
    if (this.map) {
      this.map.dispose();
      this.map = null;
    }
  }
}
