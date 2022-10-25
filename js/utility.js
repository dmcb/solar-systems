export function cheapGaussianRandom(howNormalized) {
  if (!howNormalized) howNormalized = 6;
  if (howNormalized < 1) howNormalized = 1;

  var rand = 0;

  for (var i = 0; i < howNormalized; i += 1) {
    rand += Math.random();
  }

  return rand / howNormalized;
}