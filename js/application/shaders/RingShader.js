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
    uniform vec3 uColour;
    uniform float uColourVariability;
    uniform float uDensity;
    uniform float uThickness;
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

    float baseNoise(float coordinate, float density, float thickness, float seed)
    {
      int octaves = 12;
      float amp2 = 2.0;
      float frq2 = 5.0;

      float strength = 0.0;
      float gain = 1.0;
      for (int i=0; i<octaves; i++) {
        strength += (snoise(vec2(coordinate*15.0*float(i)*(density+0.5), seed*float(i)))+(thickness*0.35))*gain;
        gain *= 0.85;
      }

      return strength;
    }

    void main()
    {
      float coordinate = vUv.x;

      float strength = max(0.0, baseNoise(coordinate, uDensity, uThickness, uSeed));
      float colourRedStrength = max(0.0, baseNoise(coordinate, uDensity, uThickness, uSeed*36.2));
      float colourGreenStrength = max(0.0, baseNoise(coordinate, uDensity, uThickness, uSeed*26.8));
      float colourBlueStrength = max(0.0, baseNoise(coordinate, uDensity, uThickness, uSeed*4.7));

      gl_FragColor = vec4(
        uColour.r*(1.0-uColourVariability*0.8)+colourRedStrength*uColourVariability*0.8,
        uColour.g*(1.0-uColourVariability*0.8)+colourGreenStrength*uColourVariability*0.8, 
        uColour.b*(1.0-uColourVariability*0.8)+colourBlueStrength*uColourVariability*0.8, 
        strength
      \);
    }
  `,
};