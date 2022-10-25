import 'https://cdnjs.cloudflare.com/ajax/libs/seedrandom/3.0.5/seedrandom.min.js';

var seed = prompt("Enter seed");
let randomSeed = new Math.seedrandom(seed);

export function fakeGaussianRandom(howSkewed, howNormalized) {
  if (!howSkewed) howSkewed = 0;
  if (!howNormalized) howNormalized = 6;

  if (howNormalized < 1) howNormalized = 1;
  if (Math.abs(howSkewed) > howNormalized) howSkewed = howNormalized - 1;

  let randomNumbers = [];
  let randomTotal = 0;

  for (var i = 0; i < howNormalized; i += 1) {
    randomNumbers.push(randomFromSeed());
  }

  if (howSkewed != 0) {
    randomNumbers.sort(function(a, b){return a - b});

    if (howSkewed > 0) {
      randomNumbers.splice(0, howSkewed);
    }
    else {
      randomNumbers.splice(howSkewed, Math.abs(howSkewed));
    }
  }

  randomTotal = randomNumbers.reduce((total, current) => {
    return total + current;
  }, 0);

  return randomTotal / randomNumbers.length;
}

export function randomFromSeed() {
  return randomSeed();
}