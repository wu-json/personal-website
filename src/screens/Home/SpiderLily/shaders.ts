// WebGL2 / GLSL ES 3.00 shaders for the spider lily renderer.
// All color buffers are premultiplied RGBA throughout the pipeline.

export const GEOMETRY_VS = /* glsl */ `#version 300 es
in vec2 a_position;
in float a_arcLength;

uniform mat3 u_projection;
uniform vec2 u_offset;
uniform float u_flowerRotation;
uniform vec2 u_flowerPivot;
uniform float u_bloomScale;
uniform float u_bloomRotation;
uniform vec2 u_bloomPivot;
uniform float u_headRotation;  // static -4° tilt of petals/stamens; 0 for stem
uniform vec2 u_headPivot;

out float v_arcLength;
out float v_worldY;

void main() {
  vec2 p = a_position;
  // 1) per-element bloom scale + rotation around pivot (flower center for
  //    petals; identity for stem/stamens which have bloomScale=1, rot=0)
  {
    vec2 r = p - u_bloomPivot;
    float bc = cos(u_bloomRotation);
    float bs = sin(u_bloomRotation);
    r = vec2(r.x * bc - r.y * bs, r.x * bs + r.y * bc) * u_bloomScale;
    p = r + u_bloomPivot;
  }
  // 2) head tilt around (CX, CY) — matches <g transform='rotate(-4 CX CY)'>
  //    on the SVG flower head. Stem passes headRotation=0.
  {
    vec2 r = p - u_headPivot;
    float hc = cos(u_headRotation);
    float hs = sin(u_headRotation);
    p = vec2(r.x * hc - r.y * hs, r.x * hs + r.y * hc) + u_headPivot;
  }
  // 3) per-element wind/hover offset
  p += u_offset;
  // 4) whole-flower sway around (CX, FLOWER_PIVOT_Y)
  {
    vec2 r = p - u_flowerPivot;
    float c = cos(u_flowerRotation);
    float s = sin(u_flowerRotation);
    p = vec2(r.x * c - r.y * s, r.x * s + r.y * c) + u_flowerPivot;
  }
  // 5) ortho projection
  vec3 q = u_projection * vec3(p, 1.0);
  gl_Position = vec4(q.xy, 0.0, 1.0);
  v_arcLength = a_arcLength;
  v_worldY = a_position.y;
}
`;

export const GEOMETRY_FS = /* glsl */ `#version 300 es
precision mediump float;

uniform vec4 u_color;       // straight (not premultiplied) RGBA
uniform float u_opacity;    // [0, 1] entrance/class-driven alpha
uniform float u_reveal;     // stamens: alpha = step(arcLength, reveal); else 1.0
uniform float u_revealY;    // stem: discard fragments with worldY < revealY

in float v_arcLength;
in float v_worldY;
out vec4 fragColor;

void main() {
  if (v_worldY < u_revealY) discard;
  float a = u_color.a * u_opacity * step(v_arcLength, u_reveal);
  fragColor = vec4(u_color.rgb * a, a);
}
`;

// Full-screen triangle for post-process passes (no VBO needed; positions
// generated from gl_VertexID).
export const QUAD_VS = /* glsl */ `#version 300 es
out vec2 v_uv;
void main() {
  // Single oversized triangle covering the screen.
  vec2 pos = vec2((gl_VertexID == 1) ? 3.0 : -1.0,
                  (gl_VertexID == 2) ? 3.0 : -1.0);
  v_uv = pos * 0.5 + 0.5;
  gl_Position = vec4(pos, 0.0, 1.0);
}
`;

// 13-tap separable Gaussian, sampled as 7 fetches via hardware bilinear
// filtering: each symmetric pair of integer-offset taps (1,2), (3,4), (5,6)
// collapses into one fetch at a fractional offset weighted so LINEAR
// filtering reproduces the exact pair sum. Same kernel as the naive 13-tap
// version, ~half the texture fetches. One shader handles both radii — the
// renderer uploads precombined offsets/weights per pass.
export const BLUR_FS = /* glsl */ `#version 300 es
precision mediump float;

uniform sampler2D u_src;
uniform vec2 u_texelDir;    // (1/width, 0) or (0, 1/height)
uniform float u_offsets[3]; // fractional texel offsets for the 3 paired taps
uniform float u_weights[4]; // [center, pair1, pair2, pair3]

in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec4 acc = texture(u_src, v_uv) * u_weights[0];
  for (int i = 0; i < 3; i++) {
    vec2 o = u_texelDir * u_offsets[i];
    acc += texture(u_src, v_uv + o) * u_weights[i + 1];
    acc += texture(u_src, v_uv - o) * u_weights[i + 1];
  }
  fragColor = acc;
}
`;

// Displacement-noise bake: 3-octave value noise (matches feTurbulence
// baseFrequency=0.04, numOctaves=3) rendered ONCE per resize into an RG
// texture. The noise is static per-pixel, so recomputing ~24 hashes per
// fragment every frame in the composite pass was pure waste — the composite
// now does a single texture fetch instead.
export const NOISE_FS = /* glsl */ `#version 300 es
precision mediump float;

uniform vec2 u_resolution;

in vec2 v_uv;
out vec4 fragColor;

// Hash-based 2D value noise (no textures, no extensions).
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 3; i++) {
    v += amp * valueNoise(p);
    p *= 2.0;
    amp *= 0.5;
  }
  return v;
}

void main() {
  // feTurbulence baseFrequency=0.04 → noise period ≈ 25 px.
  vec2 px = v_uv * u_resolution;
  float nx = fbm(px * 0.04);
  float ny = fbm(px * 0.04 + vec2(17.3, 41.7));
  // Stored as [0,1]; composite maps back to [-1,1].
  fragColor = vec4(nx, ny, 0.0, 1.0);
}
`;

// Composite: scene + tight blur + wide blur, with the pre-baked displacement
// noise texture perturbing the sample position (matches feDisplacementMap
// scale=1.2).
export const COMPOSITE_FS = /* glsl */ `#version 300 es
precision mediump float;

uniform sampler2D u_scene;
uniform sampler2D u_tight;
uniform sampler2D u_wide;
uniform sampler2D u_noise;
uniform vec2 u_resolution;
uniform float u_displaceScale; // 1.2 px, scaled to UV in shader

in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec2 n = texture(u_noise, v_uv).rg * 2.0 - 1.0;
  vec2 duv = (n * u_displaceScale) / u_resolution;
  vec2 uv = v_uv + duv;

  vec4 scene = texture(u_scene, uv);
  vec4 tight = texture(u_tight, uv);
  vec4 wide = texture(u_wide, uv);

  // feMerge is back-to-front *source-over*, not additive. wide is the
  // bottom layer, tight blends on top, then scene (opaque petals) covers
  // both. With premultiplied alpha: out = src + dst * (1 - src.a).
  vec4 result = wide;
  result = tight + result * (1.0 - tight.a);
  result = scene + result * (1.0 - scene.a);
  fragColor = result;
}
`;
