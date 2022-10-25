export function cheapGaussianRandom(howSkewed, howNormalized) {
  if (!howSkewed) howSkewed = 0;
  if (!howNormalized) howNormalized = 6;

  if (howNormalized < 1) howNormalized = 1;
  if (Math.abs(howSkewed) > howNormalized) howSkewed = howNormalized - 1;

  let randomNumbers = [];
  let randomTotal = 0;

  for (var i = 0; i < howNormalized; i += 1) {
    randomNumbers.push(Math.random());
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