import 'https://cdnjs.cloudflare.com/ajax/libs/seedrandom/3.0.5/seedrandom.min.js';
import EventEmitter from './EventEmitter.js';

export default class Seed extends EventEmitter {
  constructor (seed) {
    super();
  
    this.updateSeed(seed);
  }

  resetSeed(value) {
    this.updateSeed(value);
    this.trigger('reset');
  }

  updateSeed(value) {
    this.value = value;
    this.seedRandom = new Math.seedrandom(value); 
  }

  fakeGaussianRandom(howSkewed, howNormalized) {
    if (!howSkewed) howSkewed = 0;
    if (!howNormalized) howNormalized = 6;
  
    if (howNormalized < 1) howNormalized = 1;
    if (Math.abs(howSkewed) > howNormalized) howSkewed = howNormalized - 1;
  
    let randomNumbers = [];
    let randomTotal = 0;
  
    for (var i = 0; i < howNormalized; i += 1) {
      randomNumbers.push(this.getRandom());
    }
  
    if (howSkewed != 0) {
      randomNumbers.sort(function(a, b){return a - b});
  
      if (howSkewed > 0) randomNumbers.splice(0, Math.floor(howSkewed));
      else randomNumbers.splice(Math.floor(howSkewed), Math.abs(Math.floor(howSkewed)));
    }
  
    randomTotal = randomNumbers.reduce((total, current) => {
      return total + current;
    }, 0);
  
    return randomTotal / randomNumbers.length;
  }

  getRandom() {
    return this.seedRandom();
  }
}
