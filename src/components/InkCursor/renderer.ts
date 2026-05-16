// Minimal WebGL2 pipeline for the ink-brush cursor trail.
//
// Per frame, the component uploads one packed vertex buffer describing the
// trail's centerline (position + perpendicular + base half-width + base
// alpha + side); the renderer then issues one draw per visual layer
// (halo / body / core), scaling width and alpha via uniforms so the
// upload happens only once. Rendering targets the default framebuffer
// directly — `antialias: true` on the context gives MSAA on the strip
// edges for free, which is the whole reason we left Canvas2D behind.

const VERTEX_SHADER = /* glsl */ `#version 300 es
in vec2 a_position;     // centerline (CSS px)
in vec2 a_perp;         // unit perpendicular (averaged from neighbors)
in float a_halfWidth;   // base brush half-width (CSS px)
in float a_alpha;       // base alpha (age-derived, 0..1)
in float a_side;        // +1 or -1 — which rail of the strip

uniform vec2 u_resolution;  // CSS pixel size of the canvas
uniform float u_widthScale; // per-layer multiplier on width
uniform float u_alphaScale; // per-layer multiplier on alpha

out float v_alpha;

void main() {
  vec2 pos = a_position + a_perp * (a_halfWidth * u_widthScale) * a_side;
  vec2 ndc = pos / u_resolution * 2.0 - 1.0;
  // Mouse coords are y-down; clip space is y-up — flip.
  gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);
  v_alpha = a_alpha * u_alphaScale;
}
`;

const FRAGMENT_SHADER = /* glsl */ `#version 300 es
precision mediump float;

uniform vec3 u_color;  // straight RGB; alpha is multiplied in for premul out

in float v_alpha;
out vec4 fragColor;

void main() {
  float a = clamp(v_alpha, 0.0, 1.0);
  fragColor = vec4(u_color * a, a);
}
`;

export const VERTEX_STRIDE = 7; // floats per vertex (vec2 + vec2 + 3 floats)

export type Layer = { widthScale: number; alphaScale: number };

export class InkCursorRenderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private vbo: WebGLBuffer;
  private uResolution: WebGLUniformLocation;
  private uColor: WebGLUniformLocation;
  private uWidthScale: WebGLUniformLocation;
  private uAlphaScale: WebGLUniformLocation;
  private color: [number, number, number] = [1, 1, 1];
  private widthCss = 0;
  private heightCss = 0;
  private widthPx = 0;
  private heightPx = 0;

  disposed = false;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.program = this.link(VERTEX_SHADER, FRAGMENT_SHADER);

    const aPosition = gl.getAttribLocation(this.program, 'a_position');
    const aPerp = gl.getAttribLocation(this.program, 'a_perp');
    const aHalfWidth = gl.getAttribLocation(this.program, 'a_halfWidth');
    const aAlpha = gl.getAttribLocation(this.program, 'a_alpha');
    const aSide = gl.getAttribLocation(this.program, 'a_side');

    this.uResolution = gl.getUniformLocation(this.program, 'u_resolution')!;
    this.uColor = gl.getUniformLocation(this.program, 'u_color')!;
    this.uWidthScale = gl.getUniformLocation(this.program, 'u_widthScale')!;
    this.uAlphaScale = gl.getUniformLocation(this.program, 'u_alphaScale')!;

    this.vao = gl.createVertexArray()!;
    this.vbo = gl.createBuffer()!;
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    const stride = VERTEX_STRIDE * 4;
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(aPerp);
    gl.vertexAttribPointer(aPerp, 2, gl.FLOAT, false, stride, 8);
    gl.enableVertexAttribArray(aHalfWidth);
    gl.vertexAttribPointer(aHalfWidth, 1, gl.FLOAT, false, stride, 16);
    gl.enableVertexAttribArray(aAlpha);
    gl.vertexAttribPointer(aAlpha, 1, gl.FLOAT, false, stride, 20);
    gl.enableVertexAttribArray(aSide);
    gl.vertexAttribPointer(aSide, 1, gl.FLOAT, false, stride, 24);
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

  uploadAndDraw(buffer: Float32Array, vertexCount: number, layers: Layer[]) {
    if (vertexCount < 2) return;
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);
    gl.viewport(0, 0, this.widthPx, this.heightPx);
    gl.uniform2f(this.uResolution, this.widthCss, this.heightCss);
    gl.uniform3f(this.uColor, this.color[0], this.color[1], this.color[2]);
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      buffer.subarray(0, vertexCount * VERTEX_STRIDE),
      gl.STREAM_DRAW,
    );
    for (const layer of layers) {
      gl.uniform1f(this.uWidthScale, layer.widthScale);
      gl.uniform1f(this.uAlphaScale, layer.alphaScale);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertexCount);
    }
    gl.bindVertexArray(null);
  }

  dispose() {
    this.disposed = true;
    const gl = this.gl;
    gl.deleteProgram(this.program);
    gl.deleteVertexArray(this.vao);
    gl.deleteBuffer(this.vbo);
  }
}
