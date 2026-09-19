(() => {
  const canvas = document.querySelector('[data-ambient-canvas]');
  if (!canvas) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CONFIG = {
    bgColor: '#062334',
    colorA: '#2b7be8',
    colorB: '#2bc8e8',
    colorC: '#4fe0d8',
    colorD: '#7fe8a0',
    scale: 1,
    speed: reduceMotion ? 0 : 0.33,
    tilt: 1.87,
    rock: reduceMotion ? 0 : 0.12,
    horizon: 0.36,
    breathe: reduceMotion ? 0 : 0.29,
    spread: 0.41,
    curve: 3.32,
    direct: 0.97,
    bounce: 0.38,
    bounceCurve: 4.25,
    spillCentre: 0.3,
    spillWidth: 2.18,
    spillFloor: 0.26,
    amount: 0.2,
    warp: 2.58,
    warpScale: 0.78,
    flow: reduceMotion ? 0 : 0.475,
    roughness: 0.29,
    lacunarity: 1.99,
    motes: 0.074,
    moteScale: 7,
    ambient: 0.24,
    contrast: 1.6,
    midpoint: 0.57,
    sink: 0.24,
    glow: 0.38,
    grain: 0,
    grainAnim: 0,
    dither: 0.58,
    vignette: 0.21,
    steer: -0.13,
    lift: 0.11,
    sweep: 0.5,
    cursor: reduceMotion ? 0 : 1,
    parallax: reduceMotion ? 0 : 0.0137,
    maxDpr: 1
  };

  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'high-performance'
  });

  if (!gl) {
    document.documentElement.classList.add('no-webgl');
    return;
  }

  const VERT = `#version 300 es
  void main() {
    vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
  }`;

  const FRAG = `#version 300 es
  precision highp float;
  out vec4 fragColor;

  uniform vec2  iResolution;
  uniform float iTime;
  uniform vec2  iMouse;
  uniform float uScale;

  uniform vec3  uBg, uColorA, uColorB, uColorC, uColorD;
  uniform float uSpeed, uTilt, uRock, uHorizon, uBreathe, uSpread, uCurve, uDirect;
  uniform float uBounce, uBounceCurve;
  uniform float uSpillCentre, uSpillWidth, uSpillFloor;
  uniform float uAmount, uWarp, uWarpScale, uFlow, uRoughness, uLacunarity, uMotes, uMoteScale;
  uniform float uAmbient, uContrast, uMidpoint, uSink, uGlow;
  uniform float uGrain, uGrainAnim, uDither, uVignette;
  uniform float uSteer, uLift, uSweep, uParallax;

  #define OCTAVES 4

  vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }

  float snoise(vec2 p) {
    const float K1 = 0.366025404, K2 = 0.211324865;
    vec2 i = floor(p + (p.x + p.y) * K1);
    vec2 a = p - i + (i.x + i.y) * K2;
    float m = step(a.y, a.x);
    vec2 o = vec2(m, 1.0 - m);
    vec2 b = a - o + K2;
    vec2 c = a - 1.0 + 2.0 * K2;
    vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
    vec3 n = h * h * h * h * vec3(
      dot(a, hash2(i)),
      dot(b, hash2(i + o)),
      dot(c, hash2(i + 1.0))
    );
    return dot(n, vec3(70.0));
  }

  float fbm(vec2 p) {
    float v = 0.0, amp = 0.5;
    for (int i = 0; i < OCTAVES; i++) {
      v += amp * snoise(p);
      p *= uLacunarity;
      amp *= uRoughness;
    }
    return v;
  }

  vec3 ramp4(float t) {
    vec3 c = mix(uColorA, uColorB, smoothstep(0.00, 0.36, t));
    c = mix(c, uColorC, smoothstep(0.32, 0.70, t));
    c = mix(c, uColorD, smoothstep(0.66, 1.00, t));
    return c;
  }

  float triDither(vec2 fc) {
    float a = fract(sin(dot(fc, vec2(12.9898, 78.233))) * 43758.5453);
    float b = fract(sin(dot(fc + 17.0, vec2(12.9898, 78.233))) * 43758.5453);
    return (a + b - 1.0) / 255.0;
  }

  float houseGrain(vec2 fc) {
    uvec2 q = uvec2(fc) * uvec2(1597334677u, 3812015801u)
      + uint(floor(iTime * 24.0 * uGrainAnim)) * 2654435769u;
    uint n = q.x ^ q.y;
    n = n * 1664525u + 1013904223u;
    n ^= n >> 16u;
    n *= 2246822519u;
    n ^= n >> 13u;
    float a = float(n & 0xffffu) / 65535.0;
    n *= 3266489917u;
    n ^= n >> 16u;
    float b = float(n & 0xffffu) / 65535.0;
    return a + b - 1.0;
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution) / iResolution.y;
    uv *= uScale;
    vec2 iM = iMouse * uScale;
    float t = iTime * uSpeed;
    vec2 p = uv - iM * uParallax;

    float tilt = uTilt + sin(t * 0.13) * uRock + iM.x * uSteer;
    vec2 dir = vec2(cos(tilt), sin(tilt));
    float axis = dot(p, dir);
    float across = dot(p, vec2(-dir.y, dir.x));

    vec2 q = vec2(
      fbm(p * uWarpScale + vec2(0.0, t * uFlow)),
      fbm(p * uWarpScale + vec2(5.2, 1.3) - t * uFlow * 0.7)
    );
    float air = fbm(p + uWarp * q + vec2(t * 0.12, -t * 0.09)) * 0.5 + 0.5;

    float horizon = uHorizon + sin(t * 0.09 + 2.1) * uBreathe - iM.y * uLift;
    float alt = clamp(0.5 + (axis - horizon) * uSpread + (air - 0.5) * uAmount, 0.0, 1.0);

    float ac = (across - uSpillCentre - iM.x * uSweep) / max(0.05, uSpillWidth);
    float spill = mix(uSpillFloor, 1.0, exp(-ac * ac));
    float direct = pow(alt, max(0.05, uCurve)) * uDirect * spill;
    float bounce = uBounce * pow(1.0 - alt, max(0.05, uBounceCurve));

    float f = uAmbient + direct + bounce;
    f += uMotes * snoise(p * uMoteScale + vec2(-t * 0.5, t * 0.35)) * 0.5 * alt;
    f = clamp((f - uMidpoint) * uContrast + 0.5, 0.0, 1.0);

    vec3 col = ramp4(f);
    col += uColorD * uGlow * pow(f, 4.0);
    col = mix(uBg, col, smoothstep(0.0, max(0.01, uSink), f) * 0.90 + 0.10);
    col *= 1.0 - uVignette * dot(uv, uv);

    float hgL = clamp(dot(col, vec3(0.299, 0.587, 0.114)), 0.0, 1.0);
    col += houseGrain(gl_FragCoord.xy) * uGrain * mix(1.0, 4.0 * hgL * (1.0 - hgL), 0.6);
    col += triDither(gl_FragCoord.xy) * uDither;
    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }`;

  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader));
    }
    return shader;
  };

  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program));
    }
  } catch (error) {
    console.warn('Ambient field unavailable.', error);
    document.documentElement.classList.add('no-webgl');
    return;
  }

  gl.useProgram(program);
  gl.bindVertexArray(gl.createVertexArray());

  const locations = {};
  const location = (name) => (
    name in locations
      ? locations[name]
      : (locations[name] = gl.getUniformLocation(program, name))
  );
  const uniform1 = (name, value) => gl.uniform1f(location(name), value);
  const uniform2 = (name, x, y) => gl.uniform2f(location(name), x, y);
  const hexToVec3 = (hex) => {
    const value = Number.parseInt(hex.slice(1), 16);
    return [
      ((value >> 16) & 255) / 255,
      ((value >> 8) & 255) / 255,
      (value & 255) / 255
    ];
  };
  const uniformColor = (name, hex) => {
    const [r, g, b] = hexToVec3(hex);
    gl.uniform3f(location(name), r, g, b);
  };

  const applyConfig = () => {
    uniformColor('uBg', CONFIG.bgColor);
    uniformColor('uColorA', CONFIG.colorA);
    uniformColor('uColorB', CONFIG.colorB);
    uniformColor('uColorC', CONFIG.colorC);
    uniformColor('uColorD', CONFIG.colorD);
    uniform1('uScale', CONFIG.scale);
    uniform1('uSpeed', CONFIG.speed);
    uniform1('uTilt', CONFIG.tilt);
    uniform1('uRock', CONFIG.rock);
    uniform1('uHorizon', CONFIG.horizon);
    uniform1('uBreathe', CONFIG.breathe);
    uniform1('uSpread', CONFIG.spread);
    uniform1('uCurve', CONFIG.curve);
    uniform1('uDirect', CONFIG.direct);
    uniform1('uBounce', CONFIG.bounce);
    uniform1('uBounceCurve', CONFIG.bounceCurve);
    uniform1('uSpillCentre', CONFIG.spillCentre);
    uniform1('uSpillWidth', CONFIG.spillWidth);
    uniform1('uSpillFloor', CONFIG.spillFloor);
    uniform1('uAmount', CONFIG.amount);
    uniform1('uWarp', CONFIG.warp);
    uniform1('uWarpScale', CONFIG.warpScale);
    uniform1('uFlow', CONFIG.flow);
    uniform1('uRoughness', CONFIG.roughness);
    uniform1('uLacunarity', CONFIG.lacunarity);
    uniform1('uMotes', CONFIG.motes);
    uniform1('uMoteScale', CONFIG.moteScale);
    uniform1('uAmbient', CONFIG.ambient);
    uniform1('uContrast', CONFIG.contrast);
    uniform1('uMidpoint', CONFIG.midpoint);
    uniform1('uSink', CONFIG.sink);
    uniform1('uGlow', CONFIG.glow);
    uniform1('uGrain', CONFIG.grain);
    uniform1('uGrainAnim', CONFIG.grainAnim);
    uniform1('uDither', CONFIG.dither);
    uniform1('uVignette', CONFIG.vignette);
    uniform1('uSteer', CONFIG.steer);
    uniform1('uLift', CONFIG.lift);
    uniform1('uSweep', CONFIG.sweep);
    uniform1('uParallax', CONFIG.parallax);
  };

  let resizeQueued = false;
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, CONFIG.maxDpr);
    const width = Math.max(1, Math.round(window.innerWidth * dpr));
    const height = Math.max(1, Math.round(window.innerHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    uniform2('iResolution', width, height);
  };

  window.addEventListener('resize', () => {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => {
      resizeQueued = false;
      resize();
    });
  }, { passive: true });

  const mouse = { x: 0, y: 0, ax: 0, ay: 0, tx: 0, ty: 0 };
  const aim = (event) => {
    if (!CONFIG.cursor) return;
    const aspect = window.innerWidth / window.innerHeight;
    mouse.tx = (event.clientX / window.innerWidth - 0.5) * aspect;
    mouse.ty = 0.5 - event.clientY / window.innerHeight;
  };
  window.addEventListener('pointermove', aim, { passive: true });
  window.addEventListener('pointerdown', aim, { passive: true });

  applyConfig();
  resize();

  let previous = performance.now();
  let clock = 0;
  const frame = (now) => {
    if (!reduceMotion) requestAnimationFrame(frame);
    if (document.hidden) {
      previous = now;
      return;
    }
    const raw = now - previous;
    previous = now;
    const milliseconds = raw > 50 ? 50 : raw < 4.167 ? 4.167 : raw;
    const step = milliseconds > 36.7 ? 2.2 : milliseconds * 0.06;
    clock += milliseconds * 0.001;

    const lead = 0.105 * step;
    const body = 0.043 * step;
    mouse.ax += (mouse.tx - mouse.ax) * lead;
    mouse.ay += (mouse.ty - mouse.ay) * lead;
    mouse.x += (mouse.ax - mouse.x) * body;
    mouse.y += (mouse.ay - mouse.y) * body;

    uniform1('iTime', clock);
    uniform2('iMouse', mouse.x, mouse.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

  };

  uniform1('iTime', 0);
  uniform2('iMouse', 0, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  if (!reduceMotion) requestAnimationFrame(frame);
})();
