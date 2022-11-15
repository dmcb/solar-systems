import EventEmitter from './EventEmitter.js';

export default class Viewport extends EventEmitter {
  constructor() {
    super();

    // Setup
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.aspectRatio = this.width/this.height;
    this.pixelRatio = Math.min(window.devicePixelRatio, 2);

    // Resize event
    window.addEventListener('resize', () => {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.aspectRatio = this.width/this.height;
      this.pixelRatio = Math.min(window.devicePixelRatio, 2);

      this.trigger('resize');
    })
  }
}