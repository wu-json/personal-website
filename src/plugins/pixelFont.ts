import { createHash } from 'crypto';
import { readdirSync, readFileSync } from 'fs';
import type { IncomingMessage, ServerResponse } from 'http';
import { join } from 'path';

import subsetFont from 'subset-font';
import type { HtmlTagDescriptor, Plugin } from 'vite';

const FONT_FAMILY = 'DotGothic16';
const SOURCE_FONT = join('src', 'plugins', 'fonts', 'DotGothic16-Regular.ttf');
const TEXT_FILE = /\.(md|tsx?)$/;

export type PixelFont = { source: Uint8Array; fileName: string };

export function collectNonAscii(sources: string[]): string {
  const chars = new Set<string>();
  for (const source of sources) {
    for (const ch of source) {
      if (ch.codePointAt(0)! > 0x7f) chars.add(ch);
    }
  }
  return [...chars].sort().join('');
}

function textSources(cwd: string): string[] {
  const src = join(cwd, 'src');
  const files = readdirSync(src, { recursive: true, encoding: 'utf8' })
    .filter(f => TEXT_FILE.test(f) && !f.includes('.test.'))
    .map(f => join(src, f));
  return [join(cwd, 'index.html'), ...files].map(f => readFileSync(f, 'utf8'));
}

export async function buildPixelFont(
  text: string,
  font: Buffer,
): Promise<PixelFont> {
  const source = await subsetFont(font, text, { targetFormat: 'woff2' });
  const hash = createHash('sha256').update(source).digest('hex').slice(0, 8);
  return { source, fileName: `assets/${FONT_FAMILY}-${hash}.woff2` };
}

export function pixelFontTags(url: string): HtmlTagDescriptor[] {
  return [
    {
      tag: 'link',
      attrs: {
        rel: 'preload',
        href: url,
        as: 'font',
        type: 'font/woff2',
        crossorigin: true,
      },
      injectTo: 'head',
    },
    {
      tag: 'style',
      children: `@font-face{font-family:'${FONT_FAMILY}';src:url('${url}') format('woff2');font-display:block;}`,
      injectTo: 'head',
    },
  ];
}

export function pixelFontPlugin(): Plugin {
  let text: string | undefined;
  let font: Promise<PixelFont> | undefined;

  const load = () => {
    const cwd = process.cwd();
    const next = collectNonAscii(textSources(cwd));
    if (!font || next !== text) {
      text = next;
      font = buildPixelFont(next, readFileSync(join(cwd, SOURCE_FONT)));
    }
    return font;
  };

  return {
    name: 'pixel-font',
    async transformIndexHtml() {
      const { fileName } = await load();
      return pixelFontTags(`/${fileName}`);
    },
    async generateBundle() {
      const { source, fileName } = await load();
      this.emitFile({ type: 'asset', fileName, source });
      console.log(
        `[pixel-font] ${FONT_FAMILY} subset: ${[...text!].length} glyphs, ${source.length} bytes`,
      );
    },
    configureServer(server) {
      server.middlewares.use(
        async (req: IncomingMessage, res: ServerResponse, next) => {
          if (!req.url?.startsWith(`/assets/${FONT_FAMILY}-`)) return next();
          const { source, fileName } = await load();
          if (req.url !== `/${fileName}`) return next();
          res.writeHead(200, { 'Content-Type': 'font/woff2' });
          res.end(source);
        },
      );
    },
  };
}
