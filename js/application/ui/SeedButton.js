import Application from '../Application.js';

export default class SeedButton {
  constructor() {
    this.application = new Application();
    this.canvas = this.application.canvas;
    this.seed = this.application.seed;

    this.element = document.createElement('button');
    this.element.id = "seed";
    this.element.innerHTML = 'Seed: ' + this.seed.value;
    this.element.addEventListener('click', () => this.click());
    this.canvas.before(this.element);
  }

  click() {
    let newSeed = prompt("Enter seed");
    if (newSeed) {
      this.seed.resetSeed(newSeed)
      this.element.innerHTML = 'Seed: ' + newSeed;
    }
  }
}
