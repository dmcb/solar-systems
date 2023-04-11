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
    uniform sampler2D uMoistureMap;
    uniform sampler2D uIceMap;
    uniform float uSeed;
  
    varying vec2 vUv;

    // Simplex 2D noise

    vec3 permute(vec3 x) 
    { 
      return mod(((x*34.0)+1.0)*x, 289.0);
    }

    float snoise(vec2 v)
    {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439,
              -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy) );
      vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1;
      i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod(i, 289.0);
      vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
      + i.x + vec3(0.0, i1.x, 1.0 ));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
        dot(x12.zw,x12.zw)), 0.0);
      m = m*m ;
      m = m*m ;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    float baseNoise(float coordinate, float seed)
    {
      int octaves = 3;

      float strength = 0.0;
      float frequency = 1.0;
      float gain = 1.0;

      for (int i=0; i<octaves; i++) {
        strength += snoise(vec2(coordinate*frequency, seed*frequency))*gain;
        frequency *= 2.0;
        gain *= 0.75;
      }

      return strength;
    }

    float getHeight(vec2 uv)
    {
      return texture(uHeightMap, uv).r;
    }

    void main()
    {
      float height = getHeight(vUv);
      vec3 heightColour = texture(uBiomeMap, vec2(height, 1.0)).rgb;
      vec3 moistureColour = texture(uBiomeMap, vec2(height, 0.0)).rgb;
      vec3 colour = mix(heightColour, moistureColour, texture(uMoistureMap, vUv).r);
      colour = mix(colour, vec3(3.0), pow(texture(uIceMap, vUv).r, 0.8));

      gl_FragColor = vec4(colour, 1.0);
  }
  `,
};