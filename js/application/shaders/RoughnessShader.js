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
    uniform float uResolution;
    uniform float uWaterLevel;

    varying vec2 vUv;

    float getHeight(vec2 uv) {
      return max(uWaterLevel, texture(uHeightMap, uv).r);
    }
    
    void main()
    {
      vec2 uv = vUv;
      float strength = 0.35;

      if (getHeight(uv) > uWaterLevel) {
        strength = 1.0;
      }

      gl_FragColor = vec4(0.0, strength, 0.0, 1.0);
    }
  `,
};