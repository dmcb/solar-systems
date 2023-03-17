import Application from '../Application.js';

export default class ProgressBar {
  constructor() {
    this.application = new Application();
    this.canvas = this.application.canvas;

    this.thingsToLoad = false;
    this.element = document.createElement('div');
    this.element.id = "loader";
    this.element.innerHTML = 'Loading';
    this.bar = document.createElement('div');
    this.bar.className = "bar";
    this.bar.style.width = 0;
    this.element.appendChild(this.bar);
    this.canvas.before(this.element);
  }

  start() {
    this.element.classList.add('loading');
    this.thingsToLoad = true;
  }

  finish() {
    this.element.classList.remove('loading');
    this.thingsToLoad = false;
  }

  update(percent) {
    if (!this.thingsToLoad) {
      this.start();
    }

    this.bar.style.width = (percent*100)+"%";

    if (percent == 1) {
      this.finish();
    }
  }
}
