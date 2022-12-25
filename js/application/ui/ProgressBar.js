import Application from '../Application.js';

export default class ProgressBar {
  constructor() {
    this.application = new Application();
    this.canvas = this.application.canvas;

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
  }

  update(percent) {
    this.bar.style.width = percent;

    if (percent == "100%") {
      this.element.classList.remove('loading');
    }
  }
}
