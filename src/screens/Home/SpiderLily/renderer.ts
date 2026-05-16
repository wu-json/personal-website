import {
  ANTHER_MESHES,
  buildStamenMeshes,
  CENTER_MESH,
  type Mesh,
  PETAL_MESHES,
  STAMEN_HALF_WIDTH,
  STEM_BOTTOM_Y,
  STEM_MESH,
  STEM_TOP_Y,
} from './geometry';
import { CX, CY, FLOWER_PIVOT_Y, VIEWBOX } from './motion';
import {
  BLUR_FS,
  COMPOSITE_FS,
  GEOMETRY_FS,
  GEOMETRY_VS,
  QUAD_VS,
} from './shaders';

// 13-tap separable Gaussian weights (offsets 0..6, symmetric).
// stdDev = 2.5 → tight blur (full-res).
const WEIGHTS_TIGHT = new Float32Array([
  0.16099, 0.14859, 0.11691, 0.07838, 0.04476, 0.02178, 0.00903,
]);
// stdDev = 3.0 in half-res ≈ stdDev = 6.0 in source pixels → wide blur.
const WEIGHTS_WIDE = new Float32Array([
  0.13701, 0.12961, 0.1097, 0.08311, 0.05634, 0.03418, 0.01853,
]);

const DISPLACE_SCALE = 1.2; // matches feDisplacementMap scale='1.2'
const HEAD_ROTATION_RAD = (-4 * Math.PI) / 180; // matches <g transform='rotate(-4 CX CY)'>

export type ColorVec = [number, number, number, number];

export type Colors = {
  ink: ColorVec;
  inkMuted: ColorVec;
  inkSoft: ColorVec;
};

export type RenderState = {
  flowerRotation: number; // radians
  petalOffsets: Float32Array; // length PETAL_MESHES.length * 2
  stamenOffsets: Float32Array; // length STAMEN_MESHES.length * 2
  petalBloomScale: Float32Array; // [0,1]
  petalBloomRotation: Float32Array; // radians
  petalOpacity: Float32Array; // [0, 0.92]
  stamenReveal: Float32Array; // [0,1]
  stamenOpacity: Float32Array; // [0, 0.7]
  antherOpacity: Float32Array; // [0, 0.75]
  stemOpacity: number; // [0, 1]
  stemRevealY: number; // world-y threshold; fragments below are discarded
  centerScale: number; // [0,1]
  centerOpacity: number; // [0, 0.85]
};

type GeoProgram = {
  program: WebGLProgram;
  attribs: { position: number; arcLength: number };
  uniforms: {
    projection: WebGLUniformLocation;
    offset: WebGLUniformLocation;
    flowerRotation: WebGLUniformLocation;
    flowerPivot: WebGLUniformLocation;
    bloomScale: WebGLUniformLocation;
    bloomRotation: WebGLUniformLocation;
    bloomPivot: WebGLUniformLocation;
    headRotation: WebGLUniformLocation;
    headPivot: WebGLUniformLocation;
    color: WebGLUniformLocation;
    opacity: WebGLUniformLocation;
    reveal: WebGLUniformLocation;
    revealY: WebGLUniformLocation;
  };
};

type BlurProgram = {
  program: WebGLProgram;
  uniforms: {
    src: WebGLUniformLocation;
    texelDir: WebGLUniformLocation;
    weights: WebGLUniformLocation;
  };
};

type CompositeProgram = {
  program: WebGLProgram;
  uniforms: {
    scene: WebGLUniformLocation;
    tight: WebGLUniformLocation;
    wide: WebGLUniformLocation;
    resolution: WebGLUniformLocation;
    displaceScale: WebGLUniformLocation;
  };
};

type MeshHandle = {
  vao: WebGLVertexArrayObject;
  indexCount: number;
};

type Framebuffer = {
  fb: WebGLFramebuffer;
  tex: WebGLTexture;
  width: number;
  height: number;
};

type MSAAFramebuffer = {
  fb: WebGLFramebuffer;
  rb: WebGLRenderbuffer;
  width: number;
  height: number;
};

export class SpiderLilyRenderer {
  private gl: WebGL2RenderingContext;
  private geo!: GeoProgram;
  private blur!: BlurProgram;
  private composite!: CompositeProgram;
  private quadVao!: WebGLVertexArrayObject;
  private petalMeshes: (MeshHandle & { pivotX: number; pivotY: number })[] = [];
  private stamenMeshes: MeshHandle[] = [];
  private antherMeshes: MeshHandle[] = [];
  private stemMesh!: MeshHandle;
  private centerMesh!: MeshHandle;

  private sceneMS!: MSAAFramebuffer;
  private scene!: Framebuffer;
  private tightTmp!: Framebuffer;
  private tight!: Framebuffer;
  private wideTmp!: Framebuffer;
  private wide!: Framebuffer;

  private width = 0;
  private height = 0;
  private projection = new Float32Array(9);
  private stamenHalfWidth = STAMEN_HALF_WIDTH;

  colors: Colors = {
    ink: [1, 1, 1, 1],
    inkMuted: [1, 1, 1, 0.5],
    inkSoft: [1, 1, 1, 0.7],
  };

  disposed = false;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.buildPrograms();
    this.buildMeshes();
    this.buildQuad();
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

  private buildPrograms() {
    const gl = this.gl;
    const geoProgram = this.link(GEOMETRY_VS, GEOMETRY_FS);
    this.geo = {
      program: geoProgram,
      attribs: {
        position: gl.getAttribLocation(geoProgram, 'a_position'),
        arcLength: gl.getAttribLocation(geoProgram, 'a_arcLength'),
      },
      uniforms: {
        projection: gl.getUniformLocation(geoProgram, 'u_projection')!,
        offset: gl.getUniformLocation(geoProgram, 'u_offset')!,
        flowerRotation: gl.getUniformLocation(geoProgram, 'u_flowerRotation')!,
        flowerPivot: gl.getUniformLocation(geoProgram, 'u_flowerPivot')!,
        bloomScale: gl.getUniformLocation(geoProgram, 'u_bloomScale')!,
        bloomRotation: gl.getUniformLocation(geoProgram, 'u_bloomRotation')!,
        bloomPivot: gl.getUniformLocation(geoProgram, 'u_bloomPivot')!,
        headRotation: gl.getUniformLocation(geoProgram, 'u_headRotation')!,
        headPivot: gl.getUniformLocation(geoProgram, 'u_headPivot')!,
        color: gl.getUniformLocation(geoProgram, 'u_color')!,
        opacity: gl.getUniformLocation(geoProgram, 'u_opacity')!,
        reveal: gl.getUniformLocation(geoProgram, 'u_reveal')!,
        revealY: gl.getUniformLocation(geoProgram, 'u_revealY')!,
      },
    };
    const blurProgram = this.link(QUAD_VS, BLUR_FS);
    this.blur = {
      program: blurProgram,
      uniforms: {
        src: gl.getUniformLocation(blurProgram, 'u_src')!,
        texelDir: gl.getUniformLocation(blurProgram, 'u_texelDir')!,
        weights: gl.getUniformLocation(blurProgram, 'u_weights[0]')!,
      },
    };
    const compProgram = this.link(QUAD_VS, COMPOSITE_FS);
    this.composite = {
      program: compProgram,
      uniforms: {
        scene: gl.getUniformLocation(compProgram, 'u_scene')!,
        tight: gl.getUniformLocation(compProgram, 'u_tight')!,
        wide: gl.getUniformLocation(compProgram, 'u_wide')!,
        resolution: gl.getUniformLocation(compProgram, 'u_resolution')!,
        displaceScale: gl.getUniformLocation(compProgram, 'u_displaceScale')!,
      },
    };
  }

  private buildMesh(mesh: Mesh): MeshHandle {
    const gl = this.gl;
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const vbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);
    const ibo = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
    const stride = 3 * 4;
    gl.enableVertexAttribArray(this.geo.attribs.position);
    gl.vertexAttribPointer(
      this.geo.attribs.position,
      2,
      gl.FLOAT,
      false,
      stride,
      0,
    );
    if (this.geo.attribs.arcLength >= 0) {
      gl.enableVertexAttribArray(this.geo.attribs.arcLength);
      gl.vertexAttribPointer(
        this.geo.attribs.arcLength,
        1,
        gl.FLOAT,
        false,
        stride,
        8,
      );
    }
    gl.bindVertexArray(null);
    return { vao, indexCount: mesh.indices.length };
  }

  private buildMeshes() {
    this.petalMeshes = PETAL_MESHES.map(m => ({
      ...this.buildMesh(m),
      pivotX: m.pivot[0],
      pivotY: m.pivot[1],
    }));
    this.stamenMeshes = buildStamenMeshes(this.stamenHalfWidth).map(m =>
      this.buildMesh(m),
    );
    this.antherMeshes = ANTHER_MESHES.map(m => this.buildMesh(m));
    this.stemMesh = this.buildMesh(STEM_MESH);
    this.centerMesh = this.buildMesh(CENTER_MESH);
  }

  private rebuildStamenMeshes() {
    const gl = this.gl;
    for (const m of this.stamenMeshes) {
      gl.deleteVertexArray(m.vao);
    }
    this.stamenMeshes = buildStamenMeshes(this.stamenHalfWidth).map(m =>
      this.buildMesh(m),
    );
  }

  private buildQuad() {
    // VAO with no attributes; vertex shader generates positions from gl_VertexID.
    this.quadVao = this.gl.createVertexArray()!;
  }

  private makeFBO(width: number, height: number): Framebuffer {
    const gl = this.gl;
    const fb = gl.createFramebuffer()!;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      tex,
      0,
    );
    return { fb, tex, width, height };
  }

  private makeMSAA(
    width: number,
    height: number,
    samples: number,
  ): MSAAFramebuffer {
    const gl = this.gl;
    const fb = gl.createFramebuffer()!;
    const rb = gl.createRenderbuffer()!;
    gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
    const maxSamples = gl.getParameter(gl.MAX_SAMPLES) as number;
    const useSamples = Math.min(samples, maxSamples);
    gl.renderbufferStorageMultisample(
      gl.RENDERBUFFER,
      useSamples,
      gl.RGBA8,
      width,
      height,
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferRenderbuffer(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.RENDERBUFFER,
      rb,
    );
    return { fb, rb, width, height };
  }

  private disposeFBO(fbo: Framebuffer | null) {
    if (!fbo) return;
    const gl = this.gl;
    gl.deleteFramebuffer(fbo.fb);
    gl.deleteTexture(fbo.tex);
  }

  private disposeMSAA(fbo: MSAAFramebuffer | null) {
    if (!fbo) return;
    const gl = this.gl;
    gl.deleteFramebuffer(fbo.fb);
    gl.deleteRenderbuffer(fbo.rb);
  }

  setSize(width: number, height: number) {
    if (width === this.width && height === this.height) return;
    this.width = width;
    this.height = height;

    // Inflate the stamen stroke half-width on small canvases so the line is
    // at least ~1 device pixel wide. At the baked 0.4 viewBox units the
    // stamens go sub-pixel on mobile (≤640 device px wide), which under
    // MSAA-4x resolves to such low alpha that the line nearly vanishes —
    // imperceptible against the dark-mode black surface but rendering as
    // white-on-white in light mode. The viewBox is 800 units wide, so
    // halfWidth_view = 0.5 * 800 / width gives ~1 device px of total width.
    const requiredHalfWidth = Math.max(
      STAMEN_HALF_WIDTH,
      (0.5 * VIEWBOX.w) / width,
    );
    if (requiredHalfWidth !== this.stamenHalfWidth) {
      this.stamenHalfWidth = requiredHalfWidth;
      this.rebuildStamenMeshes();
    }

    this.disposeMSAA(this.sceneMS as MSAAFramebuffer | null);
    this.disposeFBO(this.scene as Framebuffer | null);
    this.disposeFBO(this.tightTmp as Framebuffer | null);
    this.disposeFBO(this.tight as Framebuffer | null);
    this.disposeFBO(this.wideTmp as Framebuffer | null);
    this.disposeFBO(this.wide as Framebuffer | null);

    this.sceneMS = this.makeMSAA(width, height, 4);
    this.scene = this.makeFBO(width, height);
    this.tightTmp = this.makeFBO(width, height);
    this.tight = this.makeFBO(width, height);
    const hw = Math.max(1, width >> 1);
    const hh = Math.max(1, height >> 1);
    this.wideTmp = this.makeFBO(hw, hh);
    this.wide = this.makeFBO(hw, hh);

    // Orthographic projection: viewBox (-180, 10, 800, 470) → clip space (-1..1)
    // y axis is preserved (SVG y-down, but we render with the same convention
    // — fragment shader doesn't care). For WebGL clip-space y is up, so we
    // flip y in the projection to match SVG's y-down so geometry coordinates
    // are unchanged.
    const left = VIEWBOX.x;
    const right = VIEWBOX.x + VIEWBOX.w;
    const top = VIEWBOX.y;
    const bottom = VIEWBOX.y + VIEWBOX.h;
    const sx = 2 / (right - left);
    const sy = -2 / (bottom - top);
    const tx = -(right + left) / (right - left);
    const ty = (bottom + top) / (bottom - top);
    // column-major 3x3
    this.projection[0] = sx;
    this.projection[1] = 0;
    this.projection[2] = 0;
    this.projection[3] = 0;
    this.projection[4] = sy;
    this.projection[5] = 0;
    this.projection[6] = tx;
    this.projection[7] = ty;
    this.projection[8] = 1;
  }

  setColors(colors: Colors) {
    this.colors = colors;
  }

  private bindFramebuffer(fb: WebGLFramebuffer | null, w: number, h: number) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.viewport(0, 0, w, h);
  }

  private drawScene(state: RenderState) {
    const gl = this.gl;
    const geo = this.geo;
    gl.useProgram(geo.program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // premultiplied
    gl.disable(gl.DEPTH_TEST);
    gl.uniformMatrix3fv(geo.uniforms.projection, false, this.projection);
    gl.uniform2f(geo.uniforms.flowerPivot, CX, FLOWER_PIVOT_Y);
    gl.uniform1f(geo.uniforms.flowerRotation, state.flowerRotation);
    gl.uniform2f(geo.uniforms.headPivot, CX, CY);

    // Stem — no head tilt (stem is in the outer SVG <g>, outside the
    // rotate(-4 CX CY) wrapper that holds the flower head)
    gl.uniform1f(geo.uniforms.headRotation, 0);
    gl.uniform2f(geo.uniforms.offset, 0, 0);
    gl.uniform2f(geo.uniforms.bloomPivot, 0, 0);
    gl.uniform1f(geo.uniforms.bloomScale, 1);
    gl.uniform1f(geo.uniforms.bloomRotation, 0);
    gl.uniform4f(
      geo.uniforms.color,
      this.colors.ink[0],
      this.colors.ink[1],
      this.colors.ink[2],
      this.colors.ink[3],
    );
    gl.uniform1f(geo.uniforms.opacity, state.stemOpacity);
    gl.uniform1f(geo.uniforms.reveal, 1);
    gl.uniform1f(geo.uniforms.revealY, state.stemRevealY);
    gl.bindVertexArray(this.stemMesh.vao);
    gl.drawElements(
      gl.TRIANGLES,
      this.stemMesh.indexCount,
      gl.UNSIGNED_SHORT,
      0,
    );

    // Reset revealY for everything else (no discard); enable head tilt
    // for petals/stamens/anthers/center.
    gl.uniform1f(geo.uniforms.revealY, -1e9);
    gl.uniform1f(geo.uniforms.headRotation, HEAD_ROTATION_RAD);

    // Petals
    // Bloom pivot is the flower center for all petals (matches CSS
    // transform-origin: 220px 230px on .spider-lily-petal).
    gl.uniform2f(geo.uniforms.bloomPivot, CX, CY);
    for (let i = 0; i < this.petalMeshes.length; i++) {
      const m = this.petalMeshes[i];
      gl.uniform2f(
        geo.uniforms.offset,
        state.petalOffsets[i * 2],
        state.petalOffsets[i * 2 + 1],
      );
      gl.uniform1f(geo.uniforms.bloomScale, state.petalBloomScale[i]);
      gl.uniform1f(geo.uniforms.bloomRotation, state.petalBloomRotation[i]);
      gl.uniform4f(
        geo.uniforms.color,
        this.colors.ink[0],
        this.colors.ink[1],
        this.colors.ink[2],
        this.colors.ink[3],
      );
      gl.uniform1f(geo.uniforms.opacity, state.petalOpacity[i]);
      gl.bindVertexArray(m.vao);
      gl.drawElements(gl.TRIANGLES, m.indexCount, gl.UNSIGNED_SHORT, 0);
    }

    // Stamens — no per-element bloom; reveal via arcLength
    gl.uniform1f(geo.uniforms.bloomScale, 1);
    gl.uniform1f(geo.uniforms.bloomRotation, 0);
    gl.uniform2f(geo.uniforms.bloomPivot, 0, 0);
    for (let i = 0; i < this.stamenMeshes.length; i++) {
      const m = this.stamenMeshes[i];
      gl.uniform2f(
        geo.uniforms.offset,
        state.stamenOffsets[i * 2],
        state.stamenOffsets[i * 2 + 1],
      );
      gl.uniform4f(
        geo.uniforms.color,
        this.colors.inkMuted[0],
        this.colors.inkMuted[1],
        this.colors.inkMuted[2],
        this.colors.inkMuted[3],
      );
      gl.uniform1f(geo.uniforms.opacity, state.stamenOpacity[i]);
      gl.uniform1f(geo.uniforms.reveal, state.stamenReveal[i]);
      gl.bindVertexArray(m.vao);
      gl.drawElements(gl.TRIANGLES, m.indexCount, gl.UNSIGNED_SHORT, 0);
    }

    // Anthers — share stamen offset, ink-soft color
    gl.uniform1f(geo.uniforms.reveal, 1);
    for (let i = 0; i < this.antherMeshes.length; i++) {
      const m = this.antherMeshes[i];
      gl.uniform2f(
        geo.uniforms.offset,
        state.stamenOffsets[i * 2],
        state.stamenOffsets[i * 2 + 1],
      );
      gl.uniform4f(
        geo.uniforms.color,
        this.colors.inkSoft[0],
        this.colors.inkSoft[1],
        this.colors.inkSoft[2],
        this.colors.inkSoft[3],
      );
      gl.uniform1f(geo.uniforms.opacity, state.antherOpacity[i]);
      gl.bindVertexArray(m.vao);
      gl.drawElements(gl.TRIANGLES, m.indexCount, gl.UNSIGNED_SHORT, 0);
    }

    // Center — scale-from-pivot at (CX, CY)
    gl.uniform2f(geo.uniforms.offset, 0, 0);
    gl.uniform2f(geo.uniforms.bloomPivot, CX, CY);
    gl.uniform1f(geo.uniforms.bloomScale, state.centerScale);
    gl.uniform4f(
      geo.uniforms.color,
      this.colors.ink[0],
      this.colors.ink[1],
      this.colors.ink[2],
      this.colors.ink[3],
    );
    gl.uniform1f(geo.uniforms.opacity, state.centerOpacity);
    gl.bindVertexArray(this.centerMesh.vao);
    gl.drawElements(
      gl.TRIANGLES,
      this.centerMesh.indexCount,
      gl.UNSIGNED_SHORT,
      0,
    );

    gl.bindVertexArray(null);
  }

  private blurPass(
    src: Framebuffer,
    dst: Framebuffer,
    direction: 'h' | 'v',
    weights: Float32Array,
  ) {
    const gl = this.gl;
    this.bindFramebuffer(dst.fb, dst.width, dst.height);
    gl.useProgram(this.blur.program);
    gl.disable(gl.BLEND);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src.tex);
    gl.uniform1i(this.blur.uniforms.src, 0);
    if (direction === 'h') {
      gl.uniform2f(this.blur.uniforms.texelDir, 1 / src.width, 0);
    } else {
      gl.uniform2f(this.blur.uniforms.texelDir, 0, 1 / src.height);
    }
    gl.uniform1fv(this.blur.uniforms.weights, weights);
    gl.bindVertexArray(this.quadVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private copyPass(src: Framebuffer, dst: Framebuffer) {
    // Identity blur (weights = [1, 0, 0, ...]) used as a downsample copy.
    const gl = this.gl;
    this.bindFramebuffer(dst.fb, dst.width, dst.height);
    gl.useProgram(this.blur.program);
    gl.disable(gl.BLEND);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src.tex);
    gl.uniform1i(this.blur.uniforms.src, 0);
    gl.uniform2f(this.blur.uniforms.texelDir, 0, 0);
    const identity = new Float32Array(7);
    identity[0] = 1;
    gl.uniform1fv(this.blur.uniforms.weights, identity);
    gl.bindVertexArray(this.quadVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  render(state: RenderState) {
    const gl = this.gl;
    if (this.width === 0 || this.height === 0) return;

    // 1) Draw scene into multisample renderbuffer
    this.bindFramebuffer(this.sceneMS.fb, this.width, this.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.drawScene(state);

    // 2) Resolve MSAA → scene texture
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.sceneMS.fb);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.scene.fb);
    gl.blitFramebuffer(
      0,
      0,
      this.width,
      this.height,
      0,
      0,
      this.width,
      this.height,
      gl.COLOR_BUFFER_BIT,
      gl.LINEAR,
    );
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);

    // 3) Tight blur (full-res): scene → tightTmp (H) → tight (V)
    this.blurPass(this.scene, this.tightTmp, 'h', WEIGHTS_TIGHT);
    this.blurPass(this.tightTmp, this.tight, 'v', WEIGHTS_TIGHT);

    // 4) Wide blur (half-res): scene → wideTmp (downsample copy) → wide (H) → wideTmp (V) → wide
    this.copyPass(this.scene, this.wideTmp);
    this.blurPass(this.wideTmp, this.wide, 'h', WEIGHTS_WIDE);
    this.blurPass(this.wide, this.wideTmp, 'v', WEIGHTS_WIDE);
    // Final wide result is in wideTmp; alias it
    const wideResult = this.wideTmp;

    // 5) Composite to default framebuffer
    this.bindFramebuffer(null, this.width, this.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.composite.program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.scene.tex);
    gl.uniform1i(this.composite.uniforms.scene, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.tight.tex);
    gl.uniform1i(this.composite.uniforms.tight, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, wideResult.tex);
    gl.uniform1i(this.composite.uniforms.wide, 2);
    gl.uniform2f(this.composite.uniforms.resolution, this.width, this.height);
    gl.uniform1f(this.composite.uniforms.displaceScale, DISPLACE_SCALE);
    gl.bindVertexArray(this.quadVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }

  dispose() {
    this.disposed = true;
    const gl = this.gl;
    this.disposeMSAA(this.sceneMS as MSAAFramebuffer | null);
    this.disposeFBO(this.scene as Framebuffer | null);
    this.disposeFBO(this.tightTmp as Framebuffer | null);
    this.disposeFBO(this.tight as Framebuffer | null);
    this.disposeFBO(this.wideTmp as Framebuffer | null);
    this.disposeFBO(this.wide as Framebuffer | null);
    gl.deleteProgram(this.geo.program);
    gl.deleteProgram(this.blur.program);
    gl.deleteProgram(this.composite.program);
    // VAOs/VBOs leak intentionally on dispose — context teardown reclaims them.
  }
}

// Map stem rise progress (0..1) to a worldY threshold. progress=0 → entire
// stem clipped (threshold above the top); progress=1 → no clipping. Matches
// CSS `clip-path: inset(100% 0 0 0) → inset(0)`.
export function stemRevealYFromProgress(progress: number): number {
  return STEM_TOP_Y + (STEM_BOTTOM_Y - STEM_TOP_Y) * (1 - progress);
}
