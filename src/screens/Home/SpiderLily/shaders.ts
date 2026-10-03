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
uniform float u_headRotation;
uniform vec2 u_headPivot;

out float v_arcLength;
out float v_worldY;

void main() {
  vec2 p = a_position;
  {
    vec2 r = p - u_bloomPivot;
    float bc = cos(u_bloomRotation);
    float bs = sin(u_bloomRotation);
    r = vec2(r.x * bc - r.y * bs, r.x * bs + r.y * bc) * u_bloomScale;
    p = r + u_bloomPivot;
  }
  {
    vec2 r = p - u_headPivot;
    float hc = cos(u_headRotation);
    float hs = sin(u_headRotation);
    p = vec2(r.x * hc - r.y * hs, r.x * hs + r.y * hc) + u_headPivot;
  }
  p += u_offset;
  {
    vec2 r = p - u_flowerPivot;
    float c = cos(u_flowerRotation);
    float s = sin(u_flowerRotation);
    p = vec2(r.x * c - r.y * s, r.x * s + r.y * c) + u_flowerPivot;
  }
  vec3 q = u_projection * vec3(p, 1.0);
  gl_Position = vec4(q.xy, 0.0, 1.0);
  v_arcLength = a_arcLength;
  v_worldY = a_position.y;
}
`;

export const GEOMETRY_FS = /* glsl */ `#version 300 es
precision mediump float;

uniform vec4 u_color;
uniform float u_opacity;
uniform float u_reveal;
uniform float u_revealY;

in float v_arcLength;
in float v_worldY;
out vec4 fragColor;

void main() {
  if (v_worldY < u_revealY) discard;
  float a = u_color.a * u_opacity * step(v_arcLength, u_reveal);
  fragColor = vec4(u_color.rgb * a, a);
}
`;

export const QUAD_VS = /* glsl */ `#version 300 es
out vec2 v_uv;
void main() {
  vec2 pos = vec2((gl_VertexID == 1) ? 3.0 : -1.0,
                  (gl_VertexID == 2) ? 3.0 : -1.0);
  v_uv = pos * 0.5 + 0.5;
  gl_Position = vec4(pos, 0.0, 1.0);
}
`;

export const BLUR_FS = /* glsl */ `#version 300 es
precision mediump float;

uniform sampler2D u_src;
uniform vec2 u_texelDir;
uniform float u_offsets[3];
uniform float u_weights[4];

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

export const NOISE_FS = /* glsl */ `#version 300 es
precision mediump float;

uniform vec2 u_resolution;

in vec2 v_uv;
out vec4 fragColor;

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
  vec2 px = v_uv * u_resolution;
  float nx = fbm(px * 0.04);
  float ny = fbm(px * 0.04 + vec2(17.3, 41.7));
  fragColor = vec4(nx, ny, 0.0, 1.0);
}
`;

export const COMPOSITE_FS = /* glsl */ `#version 300 es
precision mediump float;

uniform sampler2D u_scene;
uniform sampler2D u_tight;
uniform sampler2D u_wide;
uniform sampler2D u_noise;
uniform vec2 u_resolution;
uniform float u_displaceScale;

in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec2 n = texture(u_noise, v_uv).rg * 2.0 - 1.0;
  vec2 duv = (n * u_displaceScale) / u_resolution;
  vec2 uv = v_uv + duv;

  vec4 scene = texture(u_scene, uv);
  vec4 tight = texture(u_tight, uv);
  vec4 wide = texture(u_wide, uv);

  vec4 result = wide;
  result = tight + result * (1.0 - tight.a);
  result = scene + result * (1.0 - scene.a);
  fragColor = result;
}
`;
