export default {
  vertexShader: /* glsl */`
    varying vec2 vUv;

    void main()
    {
      gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
      vUv = uv;
    }
  `,

  fragmentShader: /* glsl */`
    uniform sampler2D uHeightMap;
    uniform vec3 uColour;
    uniform int uIndex;
    uniform float uAmplitude;
    uniform float uCratering;
    uniform float uFrequency;
    uniform float uResolution;
    uniform float uSeed;
  
    varying vec2 vUv;

    float getHeight(vec2 uv) {
      return texture(uHeightMap, uv).r;
    }

    void main()
    {
      gl_FragColor = vec4(getHeight(vUv)*uColour.r, getHeight(vUv)*uColour.g, getHeight(vUv)*uColour.b, 1.0);
  }
  `,
};