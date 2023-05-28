export default [
  {
    hook: '#include <common>',
    replacement: /* glsl */`
      #include <common>
      uniform sampler2D uInhabitedMap;
    `
  },
  {
    hook: '#include <output_fragment>',
    replacement: /* glsl */`
      outgoingLight = mix(outgoingLight, mix(outgoingLight, vec3(0.9, 0.9, 0.6), texture2D(uInhabitedMap, vMapUv.xy).r), step(0.0, -reflectedLight.directDiffuse.b));
      #include <output_fragment>
    `
  }
];
