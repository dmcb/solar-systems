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
    uniform float uWaterLevel;
  
    varying vec2 vUv;

    float getHeight(vec2 uv) {
      return texture(uHeightMap, uv).r;
    }

    void main()
    {
      vec3 colour = uColour;
      float height = getHeight(vUv);

      if (height < uWaterLevel) {
        colour = vec3(0.0, 0.0, 1.0);
      }

      gl_FragColor = vec4(colour, 1.0);
  }
  `,
};