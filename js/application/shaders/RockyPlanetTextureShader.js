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
    uniform sampler2D uBiomeMap;
  
    varying vec2 vUv;

    float getHeight(vec2 uv) {
      return texture(uHeightMap, uv).r;
    }

    void main()
    {
      float height = getHeight(vUv);
      vec3 colour = texture(uBiomeMap, vec2(height, 0.0)).rgb;

      gl_FragColor = vec4(colour, 1.0);
  }
  `,
};