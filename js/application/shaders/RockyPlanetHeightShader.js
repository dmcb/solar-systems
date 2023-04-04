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
    #define PI 3.1415926538

    uniform vec3 uColour;
    uniform int uIndex;
    uniform float uScale;
    uniform float uCratering;
    uniform float uCraterErosion;
    uniform float uCraterProminence;
    uniform float uRidgeScale;
    uniform float uHeight;
    uniform float uRidgeHeight;
    uniform float uRidgeDistribution;
    uniform float uResolution;
    uniform float uSeed;
  
    varying vec2 vUv;

    vec3 getSphericalCoord(float x, float y, float width) {
        float lat = y / width * PI - PI / 2.0;
        float lng = x / width * 2.0 * PI - PI;
    
        return vec3(
            cos(lat) * cos(lng),
            sin(lat),
            cos(lat) * sin(lng)
        );
    }

    //	Simplex 4D Noise 
    //	by Ian McEwan, Ashima Arts
    //
    vec4 permute(vec4 x){
      return mod(((x*34.0)+1.0)*x, 289.0);
    }

    float permute(float x){
      return floor(mod(((x*34.0)+1.0)*x, 289.0));
    }
    
    vec4 taylorInvSqrt(vec4 r){
      return 1.79284291400159 - 0.85373472095314 * r;
    }

    float taylorInvSqrt(float r){
      return 1.79284291400159 - 0.85373472095314 * r;
    }

    vec4 grad4(float j, vec4 ip)
    {
      const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
      vec4 p,s;

      p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
      p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
      s = vec4(lessThan(p, vec4(0.0)));
      p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www; 

      return p;
    }

    float snoise(vec4 v)
    {
      const vec2  C = vec2( 0.138196601125010504,  // (5 - sqrt(5))/20  G4
                            0.309016994374947451); // (sqrt(5) - 1)/4   F4
      // First corner
      vec4 i  = floor(v + dot(v, C.yyyy) );
      vec4 x0 = v -   i + dot(i, C.xxxx);

      // Other corners

      // Rank sorting originally contributed by Bill Licea-Kane, AMD (formerly ATI)
      vec4 i0;

      vec3 isX = step( x0.yzw, x0.xxx );
      vec3 isYZ = step( x0.zww, x0.yyz );
      //  i0.x = dot( isX, vec3( 1.0 ) );
      i0.x = isX.x + isX.y + isX.z;
      i0.yzw = 1.0 - isX;

      //  i0.y += dot( isYZ.xy, vec2( 1.0 ) );
      i0.y += isYZ.x + isYZ.y;
      i0.zw += 1.0 - isYZ.xy;

      i0.z += isYZ.z;
      i0.w += 1.0 - isYZ.z;

      // i0 now contains the unique values 0,1,2,3 in each channel
      vec4 i3 = clamp( i0, 0.0, 1.0 );
      vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );
      vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );

      //  x0 = x0 - 0.0 + 0.0 * C 
      vec4 x1 = x0 - i1 + 1.0 * C.xxxx;
      vec4 x2 = x0 - i2 + 2.0 * C.xxxx;
      vec4 x3 = x0 - i3 + 3.0 * C.xxxx;
      vec4 x4 = x0 - 1.0 + 4.0 * C.xxxx;

      // Permutations
      i = mod(i, 289.0); 
      float j0 = permute( permute( permute( permute(i.w) + i.z) + i.y) + i.x);
      vec4 j1 = permute( permute( permute( permute (
                i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))
              + i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))
              + i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))
              + i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));
      // Gradients
      // ( 7*7*6 points uniformly over a cube, mapped onto a 4-octahedron.)
      // 7*7*6 = 294, which is close to the ring size 17*17 = 289.

      vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;

      vec4 p0 = grad4(j0,   ip);
      vec4 p1 = grad4(j1.x, ip);
      vec4 p2 = grad4(j1.y, ip);
      vec4 p3 = grad4(j1.z, ip);
      vec4 p4 = grad4(j1.w, ip);

      // Normalise gradients
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;
      p4 *= taylorInvSqrt(dot(p4,p4));

      // Mix contributions from the five corners
      vec3 m0 = max(0.6 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);
      vec2 m1 = max(0.6 - vec2(dot(x3,x3), dot(x4,x4)            ), 0.0);
      m0 = m0 * m0;
      m1 = m1 * m1;
      return 49.0 * ( dot(m0*m0, vec3( dot( p0, x0 ), dot( p1, x1 ), dot( p2, x2 )))
                  + dot(m1*m1, vec2( dot( p3, x3 ), dot( p4, x4 ) ) ) ) ;

    }

    vec3 hash33(vec3 p)
    {
      p = vec3( dot(p,vec3(127.1,311.7, 74.7)),
        dot(p,vec3(269.5,183.3,246.1)),
        dot(p,vec3(113.5,271.9,124.6)));

      return fract(sin(p)*43758.5453123*uSeed);
    }

    float craters(vec3 x) 
    { 
      vec3 p = floor(x);
      vec3 f = fract(x);
    
      float va = 0.;
      float wt = 0.;
      for (int i = -2; i <= 2; i++) 
        for (int j = -2; j <= 2; j++)
          for (int k = -2; k <= 2; k++) { 
            vec3 g = vec3(i,j,k);
            vec3 o = 0.8 * hash33(p + g);
            float d = distance(f - g, o);
            float w = exp(-4. * d);
            va += w * sin(2.*PI * sqrt(d));
            wt += w;
          }
      return abs(va / wt);
    }

    float baseNoise(vec3 coordinate, float scale, float seed)
    {
      int octaves = 12;

      float strength = 0.0;
      float frequency = 2.0;
      float gain = 0.5;

      for (int i=0; i<octaves; i++) {
        strength += snoise(vec4(coordinate * scale * frequency, seed + 10.0*float(i))) * gain;
        frequency *= 2.0;
        gain *= 0.5;
      }

      return strength*0.5+0.5;
    }

    float ridgeNoise(vec3 coordinate, float scale, float seed)
    {
      int octaves = 12;

      float strength = 0.0;
      float frequency = 2.0;
      float gain = 0.5;

      for (int i=0; i<octaves; i++) {
        strength += abs(snoise(vec4(coordinate * scale * frequency, seed + 10.0*float(i))) * gain);
        frequency *= 2.0;
        gain *= 0.5;
      }

      strength = clamp(strength, 0.0, 1.0);

      return pow(strength, (uRidgeDistribution+0.7)*2.2);
    }

    float craterNoise(vec3 coordinate, float scale, float seed)
    {
      int octaves = 5;
    
      float strength = 0.0;
    
      for (int i=0; i<octaves; i++) {
        float craterNoise = craters(0.4 * pow(2.2, float(i)) * coordinate * scale);
        craterNoise = 0.4 * exp(-3. * craterNoise);
        float w = clamp(3. * pow(0.4, float(i)), 0., 1.);
        strength += w * (craterNoise);
      }
    
      return strength;
    }

    void main()
    {
      float x = vUv.x;
      float y = 1.0 - vUv.y;
      vec3 sphericalCoord = getSphericalCoord(x*uResolution, y*uResolution, uResolution);

      // Base 
      float baseHeight = baseNoise(sphericalCoord, uScale+0.1, uSeed*71.4);
      baseHeight = 0.5 + ((baseHeight-0.5) * 0.2 * (uHeight + 0.4));

      // Ridges
      float ridgeHeight = ridgeNoise(sphericalCoord, uRidgeScale*0.4+0.1, uSeed*12.3);
      ridgeHeight *= uRidgeHeight*1.6;

      // Craters
      float craterArea = clamp(baseNoise(sphericalCoord, 1.0, uSeed*29.8)-uCraterErosion*0.5, 0.0, 1.0);
      float craterHeight = craterNoise(sphericalCoord, 3.8*uCratering+0.1, uSeed*18.3)-0.5;
      craterHeight = craterHeight*craterArea*uCraterProminence*0.5;

      // Add all noise
      float height = baseHeight + ridgeHeight + craterHeight;

      gl_FragColor = vec4(height, height, height, 1.0);
  }
  `,
};
