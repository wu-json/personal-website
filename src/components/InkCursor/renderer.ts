// WebGL2 pipeline for the ink-brush cursor trail.
//
// Each segment of the cursor polyline renders as its own bounding quad
// (no shared vertices between segments), with the fragment shader
// computing signed distance to the segment centerline and outputting an
// alpha gradient from dense body to soft halo. The quad extends past
// each segment endpoint by halfW + margin so adjacent segments overlap
// in the joint region — combined with `gl.MAX` blending, this gives a
// continuous stroke through arbitrarily sharp corners (the overlap
// fills outer joints with a round cap, inner joints are covered by
// both quads' body regions, and the MAX combine prevents the double-
// blend darkening that alpha-blend overlap would produce).
//
// Sumi texture (kasure bristle noise + ink-load wet/dry contrast) lives
// in the fragment shader. Rendering targets the default framebuffer
// directly with `antialias: true` on the context for MSAA on the soft
// edges (the smoothstep falloff already AAs most pixels; MSAA cleans
// up the cap silhouettes).

const VERTEX_SHADER = /* glsl */ `#version 300 es

// Per-vertex (static unit quad: (along ∈ {0,1}) × (side ∈ {-1,+1}))
in vec2 a_quadCoord;

// Per-instance (one segment of the cursor polyline)
in vec2 a_pStart;
in vec2 a_pEnd;
in vec2 a_halfW;   // (start, end) — already includes lifeFactor decay
in vec2 a_alpha;   // (start, end) — age-derived, 0..1
in vec2 a_arc;     // (start, end) — cumulative arc length in CSS px
in vec2 a_load;    // (start, end) — 0..1 ink-load (1=wet, 0=dry)

uniform vec2 u_resolution;  // CSS pixel size of the canvas
uniform float u_margin;     // extra padding around the stroke for AA + round joins

out vec2 v_fragPos;
flat out vec2 v_segStart;
flat out vec2 v_segEnd;
flat out vec2 v_halfWPair;
flat out vec2 v_alphaPair;
flat out vec2 v_arcPair;
flat out vec2 v_loadPair;

void main() {
  float along = a_quadCoord.x;  // 0 = start, 1 = end
  float side = a_quadCoord.y;   // -1 or +1 — which perpendicular rail

  vec2 segDir = a_pEnd - a_pStart;
  float segLen = max(length(segDir), 0.001);
  vec2 tangent = segDir / segLen;
  vec2 perp = vec2(-tangent.y, tangent.x);

  // Lateral extension at this end's halfW + margin.
  float halfWThis = mix(a_halfW.x, a_halfW.y, along);
  float lateralExt = halfWThis + u_margin;
  // Longitudinal extension past each segment endpoint by the larger
  // halfW + margin, so adjacent segments overlap in the joint region —
  // MAX blending fills the joint without seams.
  float longExt = max(a_halfW.x, a_halfW.y) + u_margin;

  vec2 center = mix(a_pStart, a_pEnd, along);
  vec2 longOffset = tangent * longExt * (along * 2.0 - 1.0);
  vec2 pos = center + perp * lateralExt * side + longOffset;

  vec2 ndc = pos / u_resolution * 2.0 - 1.0;
  // Mouse coords are y-down; clip space is y-up — flip.
  gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);

  v_fragPos = pos;
  v_segStart = a_pStart;
  v_segEnd = a_pEnd;
  v_halfWPair = a_halfW;
  v_alphaPair = a_alpha;
  v_arcPair = a_arc;
  v_loadPair = a_load;
}
`;

const FRAGMENT_SHADER = /* glsl */ `#version 300 es
precision mediump float;

uniform vec3 u_color;  // straight RGB; alpha is multiplied in for premul out

in vec2 v_fragPos;
flat in vec2 v_segStart;
flat in vec2 v_segEnd;
flat in vec2 v_halfWPair;
flat in vec2 v_alphaPair;
flat in vec2 v_arcPair;
flat in vec2 v_loadPair;

out vec4 fragColor;

// Hash-based 2D value noise. Stable across drivers — sin(x)*large isn't.
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

void main() {
  vec2 segDir = v_segEnd - v_segStart;
  float segLen2 = max(dot(segDir, segDir), 0.0001);
  float segLen = sqrt(segLen2);

  // Closest point on the segment + clamped parameter t along it. Past
  // the endpoints, t clamps and the distance becomes radial from the
  // endpoint — that's the round cap that fills outer joints.
  float t = clamp(dot(v_fragPos - v_segStart, segDir) / segLen2, 0.0, 1.0);
  vec2 closest = mix(v_segStart, v_segEnd, t);
  float dist = length(v_fragPos - closest);

  float halfWAt = mix(v_halfWPair.x, v_halfWPair.y, t);
  if (halfWAt < 0.05) discard;
  if (dist > halfWAt * 1.6 + 1.0) discard;

  float alphaAt = mix(v_alphaPair.x, v_alphaPair.y, t);
  float arcAt = mix(v_arcPair.x, v_arcPair.y, t);
  float loadAt = clamp(mix(v_loadPair.x, v_loadPair.y, t), 0.0, 1.0);

  // Ink load (drier on fast strokes) scales the base alpha.
  alphaAt *= loadAt;

  // Signed perpendicular offset for the bristle noise's lateral axis.
  vec2 perp = vec2(-segDir.y, segDir.x) / segLen;
  float side = dot(v_fragPos - closest, perp) / max(halfWAt, 0.001);

  // Distance-based alpha: dense body that softens to a feathered edge,
  // plus a faint outer halo for the wet-ink glow.
  float r = dist / max(halfWAt, 0.001);
  float body = (1.0 - smoothstep(0.82, 1.0, r)) * 0.82;
  float halo = (1.0 - smoothstep(1.0, 1.6, r)) * 0.10;
  float a = max(body, halo) * alphaAt;

  // Kasure (掠れ): bristle striations strengthen as the brush dries.
  float dryness = 1.0 - loadAt;
  float bristleStrength = mix(0.18, 0.85, dryness);
  float n = valueNoise(vec2(side * 6.0, arcAt * 0.015));
  a *= 1.0 - bristleStrength * (1.0 - n);

  fragColor = vec4(u_color * a, a);
}
`;

export const SEGMENT_STRIDE = 12; // floats per per-segment instance

// Unit quad coords: (along, side) for the 4 corners of every segment.
const UNIT_QUAD = new Float32Array([0, -1, 0, 1, 1, -1, 1, 1]);

const SOFT_MARGIN = 2; // CSS px of padding past halfW for AA + round joins

export class InkCursorRenderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private quadVbo: WebGLBuffer;
  private segVbo: WebGLBuffer;
  private uResolution: WebGLUniformLocation;
  private uColor: WebGLUniformLocation;
  private uMargin: WebGLUniformLocation;
  private color: [number, number, number] = [1, 1, 1];
  private widthCss = 0;
  private heightCss = 0;
  private widthPx = 0;
  private heightPx = 0;

  disposed = false;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.program = this.link(VERTEX_SHADER, FRAGMENT_SHADER);

    const aQuadCoord = gl.getAttribLocation(this.program, 'a_quadCoord');
    const aPStart = gl.getAttribLocation(this.program, 'a_pStart');
    const aPEnd = gl.getAttribLocation(this.program, 'a_pEnd');
    const aHalfW = gl.getAttribLocation(this.program, 'a_halfW');
    const aAlpha = gl.getAttribLocation(this.program, 'a_alpha');
    const aArc = gl.getAttribLocation(this.program, 'a_arc');
    const aLoad = gl.getAttribLocation(this.program, 'a_load');

    this.uResolution = gl.getUniformLocation(this.program, 'u_resolution')!;
    this.uColor = gl.getUniformLocation(this.program, 'u_color')!;
    this.uMargin = gl.getUniformLocation(this.program, 'u_margin')!;

    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);

    // Static per-vertex unit quad.
    this.quadVbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVbo);
    gl.bufferData(gl.ARRAY_BUFFER, UNIT_QUAD, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(aQuadCoord);
    gl.vertexAttribPointer(aQuadCoord, 2, gl.FLOAT, false, 8, 0);
    gl.vertexAttribDivisor(aQuadCoord, 0);

    // Dynamic per-instance segment data.
    this.segVbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.segVbo);
    const stride = SEGMENT_STRIDE * 4;
    gl.enableVertexAttribArray(aPStart);
    gl.vertexAttribPointer(aPStart, 2, gl.FLOAT, false, stride, 0);
    gl.vertexAttribDivisor(aPStart, 1);
    gl.enableVertexAttribArray(aPEnd);
    gl.vertexAttribPointer(aPEnd, 2, gl.FLOAT, false, stride, 8);
    gl.vertexAttribDivisor(aPEnd, 1);
    gl.enableVertexAttribArray(aHalfW);
    gl.vertexAttribPointer(aHalfW, 2, gl.FLOAT, false, stride, 16);
    gl.vertexAttribDivisor(aHalfW, 1);
    gl.enableVertexAttribArray(aAlpha);
    gl.vertexAttribPointer(aAlpha, 2, gl.FLOAT, false, stride, 24);
    gl.vertexAttribDivisor(aAlpha, 1);
    gl.enableVertexAttribArray(aArc);
    gl.vertexAttribPointer(aArc, 2, gl.FLOAT, false, stride, 32);
    gl.vertexAttribDivisor(aArc, 1);
    gl.enableVertexAttribArray(aLoad);
    gl.vertexAttribPointer(aLoad, 2, gl.FLOAT, false, stride, 40);
    gl.vertexAttribDivisor(aLoad, 1);

    gl.bindVertexArray(null);
  }

  private compile(type: number, src: string): WebGLShader {
    const gl = this.gl;
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error(`Shader compile failed: ${log}\n\n${src}`);
    }
    return sh;
  }

  private link(vsSrc: string, fsSrc: string): WebGLProgram {
    const gl = this.gl;
    const vs = this.compile(gl.VERTEX_SHADER, vsSrc);
    const fs = this.compile(gl.FRAGMENT_SHADER, fsSrc);
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Program link failed: ${log}`);
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return program;
  }

  setSize(
    widthCss: number,
    heightCss: number,
    widthPx: number,
    heightPx: number,
  ) {
    this.widthCss = widthCss;
    this.heightCss = heightCss;
    this.widthPx = widthPx;
    this.heightPx = heightPx;
  }

  setColor(rgb: [number, number, number]) {
    this.color = rgb;
  }

  clear() {
    const gl = this.gl;
    gl.viewport(0, 0, this.widthPx, this.heightPx);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  uploadAndDraw(segData: Float32Array, segmentCount: number) {
    if (segmentCount < 1) return;
    const gl = this.gl;
    gl.useProgram(this.program);

    // MAX blending: overlapping fragments take the brighter value
    // rather than additively darkening. This is what makes joint
    // overlap regions render as a single continuous stroke instead of
    // a darker double-pass at the seam.
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.MAX);
    gl.disable(gl.DEPTH_TEST);

    gl.viewport(0, 0, this.widthPx, this.heightPx);
    gl.uniform2f(this.uResolution, this.widthCss, this.heightCss);
    gl.uniform3f(this.uColor, this.color[0], this.color[1], this.color[2]);
    gl.uniform1f(this.uMargin, SOFT_MARGIN);

    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.segVbo);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      segData.subarray(0, segmentCount * SEGMENT_STRIDE),
      gl.STREAM_DRAW,
    );

    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, segmentCount);

    gl.bindVertexArray(null);
    // Restore default add-equation so other callers in the same context
    // aren't surprised. (We own the context here, but be polite.)
    gl.blendEquation(gl.FUNC_ADD);
  }

  dispose() {
    this.disposed = true;
    const gl = this.gl;
    gl.deleteProgram(this.program);
    gl.deleteVertexArray(this.vao);
    gl.deleteBuffer(this.quadVbo);
    gl.deleteBuffer(this.segVbo);
  }
}
