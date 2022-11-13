import Planet from './Planet.js';
import Seed from './utils/Seed.js';

export default class SolarSystem {
  constructor(scene, solarSystemRadius) {
    this.seed = new Seed();
    this.planets = [];
    this.minimumDistance = 16;
    this.maximumDistance = solarSystemRadius;
    this.direction = this.seed.getRandom();
    if (this.direction >= 0.5) this.direction = 1;
    else this.direction = -1;
  
    while (this.minimumDistance < this.maximumDistance) {
      let planet = new Planet(this.minimumDistance, this.maximumDistance, this.direction);
      this.minimumDistance = planet.nextNeighbourMinimumDistance();
      if (this.minimumDistance < this.maximumDistance) {
        planet.addToScene(scene);
        this.planets.push(planet);
      }
    }
  }

  travel() {
    this.planets.forEach(planet => {
      planet.travel();
    });
  }

  destroy() {
    this.planets.forEach((item, index, object) => {
      item.destroy();
    });
    this.planets = [];
  }
}