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
    this.element.appendChild(this.bar);
    this.canvas.before(this.element);
  }

  updateProgress(percent) {
    this.bar.style.width = percent;

    if (percent == "100%") {
      this.element.remove();
    }
  }
}
