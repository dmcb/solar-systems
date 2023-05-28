export default [
  {
    hook: '#include <common>',
    replacement: /* glsl */`
      #include <common>
      uniform float uAtmosphere;
    `
  },
  {
    hook: '#include <map_fragment>',
    replacement: /* glsl */`
      diffuseColor *= vec4(1.0, 1.0, 1.0, pow(uAtmosphere, 3.0));
    `
  }
];
