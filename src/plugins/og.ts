import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import type { IncomingMessage, ServerResponse } from 'http';
import { join } from 'path';

import { Resvg } from '@resvg/resvg-js';
import type { Plugin } from 'vite';
import wawoff2 from 'wawoff2';

import {
  BASE_URL,
  ENTRIES_DIR,
  escapeXml,
  parseFrontmatter,
  parseRssTimestamp,
  plainExcerpt,
} from './rss';

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;
const MARGIN_X = 96;

// Font sizes are tiered down until the title fits the line budget; the last
// tier truncates so a pathological title can never overflow the card.
const TITLE_TIERS = [
  { fontSize: 72, maxChars: 24, maxLines: 2 },
  { fontSize: 56, maxChars: 31, maxLines: 3 },
  { fontSize: 44, maxChars: 40, maxLines: 4 },
] as const;

export type OgSignal = {
  id: string;
  timestamp: string;
  title: string | null;
  location: string;
  body: string;
};

export function ogImagePath(id: string): string {
  return `/images/og/signals/${id}.png`;
}

/**
 * Wrap text into lines of at most maxChars characters, breaking on spaces.
 * Tokens longer than maxChars (e.g. untitled ids) are hard-split so a single
 * word can never overflow a line.
 */
export function wrapText(text: string, maxChars: number): string[] {
  const words = text
    .split(/\s+/)
    .filter(Boolean)
    .flatMap(w => {
      const chunks: string[] = [];
      for (let i = 0; i < w.length; i += maxChars)
        chunks.push(w.slice(i, i + maxChars));
      return chunks;
    });

  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const cand = cur ? `${cur} ${w}` : w;
    if (cand.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = cand;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export function layoutTitle(title: string): {
  lines: string[];
  fontSize: number;
} {
  const upper = title.toUpperCase();
  for (const tier of TITLE_TIERS) {
    const lines = wrapText(upper, tier.maxChars);
    if (lines.length <= tier.maxLines) {
      return { lines, fontSize: tier.fontSize };
    }
  }
  const last = TITLE_TIERS[TITLE_TIERS.length - 1];
  const lines = wrapText(upper, last.maxChars).slice(0, last.maxLines);
  lines[last.maxLines - 1] =
    `${lines[last.maxLines - 1].slice(0, last.maxChars - 1)}…`;
  return { lines, fontSize: last.fontSize };
}

export function cardTitle(s: Pick<OgSignal, 'id' | 'title'>): string {
  return s.title ?? `[${s.id}]`;
}

/**
 * Build the SVG for a signal's OG card: black background, the spider lily
 * render in the top right, and the signal header (timestamp/location/title)
 * mirroring SignalDetail in the lower left.
 */
export function buildCardSvg(
  s: Pick<OgSignal, 'id' | 'timestamp' | 'title' | 'location'>,
  flowerPngUri: string,
): string {
  const { lines, fontSize } = layoutTitle(cardTitle(s));
  const lineHeight = Math.round(fontSize * 1.25);
  const blockBottom = CARD_HEIGHT - MARGIN_X;

  const titleText = lines
    .map((ln, i) => {
      const y = blockBottom - (lines.length - 1 - i) * lineHeight;
      return `<text x="${MARGIN_X}" y="${y}" font-family="Geist Pixel" font-size="${fontSize}" letter-spacing="2" fill="#ffffff">${escapeXml(ln)}</text>`;
    })
    .join('\n  ');

  const metaY = blockBottom - (lines.length - 1) * lineHeight - fontSize - 28;
  const timestamp = s.timestamp.replace(/ \/\/ /g, ' ');
  const locationTspan = s.location
    ? `  <tspan fill="rgba(255,255,255,0.22)">— ${escapeXml(s.location)}</tspan>`
    : '';

  return `<svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="#000000"/>
  <image xlink:href="${flowerPngUri}" x="330" y="-130" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" opacity="0.9"/>
  <text x="${MARGIN_X}" y="86" font-family="Geist Mono" font-size="22" letter-spacing="4" fill="rgba(255,255,255,0.5)">JASONWU.INK/SIGNALS</text>
  <text x="${MARGIN_X}" y="${metaY}" font-family="Geist Mono" font-size="24" fill="rgba(255,255,255,0.35)">${escapeXml(timestamp)}${locationTspan}</text>
  ${titleText}
</svg>`;
}

/**
 * Replace the content of an existing `<meta property|name="key" …>` tag.
 * The whole tag is rebuilt so attribute order in the built HTML doesn't
 * matter. No-op if the tag isn't present.
 */
export function setMetaTag(
  html: string,
  keyAttr: 'property' | 'name',
  key: string,
  content: string,
): string {
  const re = new RegExp(
    `<meta\\s[^>]*${keyAttr}="${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*/?>`,
  );
  return html.replace(
    re,
    `<meta ${keyAttr}="${key}" content="${escapeXml(content)}" />`,
  );
}

/**
 * Specialize the built index.html's head for one signal so crawlers (which
 * never run the SPA's JS) see per-signal titles, descriptions, and OG cards.
 */
export function applySignalMeta(indexHtml: string, s: OgSignal): string {
  const title = cardTitle(s);
  const description =
    plainExcerpt(s.body, 200) || s.title || `A signal from ${s.timestamp}.`;
  const url = `${BASE_URL}/signals/${s.id}`;
  const image = `${BASE_URL}${ogImagePath(s.id)}`;
  const imageAlt = `${title} — a signal card with a white spider lily on a black background.`;

  let html = indexHtml.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escapeXml(title)} — Jason Cui Wu</title>`,
  );
  html = setMetaTag(html, 'name', 'description', description);
  html = setMetaTag(html, 'property', 'og:type', 'article');
  html = setMetaTag(html, 'property', 'og:title', title);
  html = setMetaTag(html, 'property', 'og:description', description);
  html = setMetaTag(html, 'property', 'og:url', url);
  html = setMetaTag(html, 'property', 'og:image', image);
  html = setMetaTag(html, 'property', 'og:image:alt', imageAlt);
  html = setMetaTag(html, 'name', 'twitter:title', title);
  html = setMetaTag(html, 'name', 'twitter:description', description);
  html = setMetaTag(html, 'name', 'twitter:image', image);
  html = setMetaTag(html, 'name', 'twitter:image:alt', imageAlt);

  const published = parseRssTimestamp(s.timestamp);
  if (published) {
    html = html.replace(
      '</head>',
      `<meta property="article:published_time" content="${new Date(published).toISOString()}" />\n  </head>`,
    );
  }
  return html;
}

export function readSignals(cwd: string): OgSignal[] {
  const entriesDir = join(cwd, ENTRIES_DIR);
  return readdirSync(entriesDir)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const { attrs, body } = parseFrontmatter(
        readFileSync(join(entriesDir, f), 'utf-8'),
      );
      return {
        id: attrs.id ?? f.replace(/\.md$/, ''),
        timestamp: attrs.timestamp ?? '',
        title: attrs.title || null,
        location: attrs.location ?? '',
        body,
      };
    });
}

type CardRenderer = (
  s: Pick<OgSignal, 'id' | 'timestamp' | 'title' | 'location'>,
) => Buffer;

/**
 * Load the fonts and flower artwork once, returning a renderer. GeistPixel
 * only ships as woff2 (which resvg can't read), so it's decompressed to a
 * ttf under node_modules/.cache first.
 */
async function createCardRenderer(cwd: string): Promise<CardRenderer> {
  const cacheDir = join(cwd, 'node_modules', '.cache', 'og-cards');
  mkdirSync(cacheDir, { recursive: true });

  const pixelTtfPath = join(cacheDir, 'GeistPixel-Circle.ttf');
  const pixelWoff2 = readFileSync(
    join(cwd, 'public', 'fonts', 'GeistPixel-Circle.woff2'),
  );
  writeFileSync(
    pixelTtfPath,
    Buffer.from(await wawoff2.decompress(pixelWoff2)),
  );

  const monoTtfPath = join(
    cwd,
    'node_modules',
    'geist',
    'dist',
    'fonts',
    'geist-mono',
    'GeistMono-Regular.ttf',
  );

  const flowerPng = readFileSync(join(cwd, 'public', 'images', 'og-image.png'));
  const flowerPngUri = `data:image/png;base64,${flowerPng.toString('base64')}`;

  return s => {
    const resvg = new Resvg(buildCardSvg(s, flowerPngUri), {
      font: {
        fontFiles: [pixelTtfPath, monoTtfPath],
        loadSystemFonts: false,
        defaultFontFamily: 'Geist Mono',
      },
    });
    return resvg.render().asPng();
  };
}

export function ogPlugin(): Plugin {
  return {
    name: 'og-cards',
    async writeBundle() {
      const cwd = process.cwd();
      const signals = readSignals(cwd);
      const render = await createCardRenderer(cwd);
      const indexHtml = readFileSync(join(cwd, 'build', 'index.html'), 'utf-8');

      const imagesDir = join(cwd, 'build', 'images', 'og', 'signals');
      mkdirSync(imagesDir, { recursive: true });

      for (const s of signals) {
        writeFileSync(join(imagesDir, `${s.id}.png`), render(s));

        // Static files beat the SPA rewrite on Vercel, so this specialized
        // copy of index.html is what crawlers get for /signals/<id>.
        const pageDir = join(cwd, 'build', 'signals', s.id);
        mkdirSync(pageDir, { recursive: true });
        writeFileSync(
          join(pageDir, 'index.html'),
          applySignalMeta(indexHtml, s),
        );
      }
      console.log(`[og-cards] wrote ${signals.length} cards + pages`);
    },
    configureServer(server) {
      // Preview cards in dev at /images/og/signals/<id>.png
      server.middlewares.use(
        '/images/og/signals',
        async (req: IncomingMessage, res: ServerResponse) => {
          try {
            const id = decodeURIComponent(
              (req.url ?? '').replace(/^\//, '').replace(/\.png(\?.*)?$/, ''),
            );
            const s = readSignals(process.cwd()).find(sx => sx.id === id);
            if (!s) {
              res.writeHead(404);
              res.end('Not Found');
              return;
            }
            const render = await createCardRenderer(process.cwd());
            res.writeHead(200, { 'Content-Type': 'image/png' });
            res.end(render(s));
          } catch (err) {
            console.error('[og-cards] dev middleware error:', err);
            res.writeHead(500);
            res.end('Internal Server Error');
          }
        },
      );
    },
  };
}
