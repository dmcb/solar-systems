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
      return texture(uHeightMap, uv).r;
    }
    
    float isWater(vec2 uv) {
      return step(getHeight(uv), uWaterLevel);
    }

    vec4 bumpFromDepth(vec2 uv, float resolution, float scale) {
      float step = 1.0 / resolution;
        
      float height = getHeight(uv);
        
      vec2 dxy = height - vec2(
          getHeight(uv + vec2(step, 0.0)), 
          getHeight(uv + vec2(0.0, step))
      );
        
      return vec4(normalize(vec3(dxy * scale / step, 1.0)), height);
    }

    vec4 oceanBump(vec2 uv) {
      // Need to put in some kind of wave pattern here
      return vec4(0.0, 0.0, 1.0, 0.0);
    }
    
    void main()
    {
      vec2 uv = vUv;
      vec4 bump = mix(bumpFromDepth(uv, uResolution, 0.1), oceanBump(uv), isWater(uv));

      gl_FragColor = vec4(bump.rgb * 0.5 + 0.5, 1.0);
    }
  `,
};