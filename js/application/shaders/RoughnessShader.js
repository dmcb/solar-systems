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
    uniform sampler2D uIceMap;
    uniform float uResolution;
    uniform float uWaterLevel;

    varying vec2 vUv;

    float getHeight(vec2 uv) {
      return max(uWaterLevel, texture2D(uHeightMap, uv).r);
    }

    float getIce(vec2 uv) {
      return texture2D(uIceMap, uv).r;
    }
    
    void main()
    {
      vec2 uv = vUv;
      float strength = 0.45;
      float ice = getIce(uv);

      if (ice > 0.0) {
        if (getHeight(uv) > uWaterLevel) {
          strength = max(0.0, 1.0 - ice);
        }
        else {
          strength = max(0.0, 0.45 - ice);
        }
      }
      else if (getHeight(uv) > uWaterLevel) {
        strength = 1.0;
      }

      gl_FragColor = vec4(0.0, strength, 0.0, 1.0);
    }
  `,
};