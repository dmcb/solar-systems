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
    uniform float uResolutionX;
    uniform float uResolutionY;

    varying vec2 vUv;

    float getHeight(vec2 uv) {
      return texture(uHeightMap, uv).r;
    }
    
    vec4 bumpFromDepth(vec2 uv, float resolution, float scale) {
      float step = 1. / resolution;
        
      float height = getHeight(uv);
        
      vec2 dxy = height - vec2(
          getHeight(uv + vec2(step, 0.)), 
          getHeight(uv + vec2(0., step))
      );
        
      return vec4(normalize(vec3(dxy * scale / step, 1.)), height);
    }
    
    void main()
    {
      vec2 uv = vUv;
      gl_FragColor = vec4(bumpFromDepth(uv, uResolutionX, .1).rgb * .5 + .5, 1.);
    }
  `,
};