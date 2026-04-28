import type { Plugin } from 'vite';

import { readFileSync, mkdirSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

const BASE_URL = 'https://jasonwu.ink';
const ENTRIES_DIR = 'src/screens/Signals/entries';
const OUT_FILE = 'build/signals/feed.xml';

function parseFrontmatter(raw: string): {
  attrs: Record<string, string>;
  body: string;
} {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { attrs: {}, body: raw };

  const attrs: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line
      .slice(idx + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
    attrs[key] = val;
  }

  return { attrs, body: match[2].trim() };
}

function parseRssTimestamp(ts: string): string {
  const d = new Date(ts.replace(/\./g, '-').replace(' // ', 'T'));
  return isNaN(d.getTime()) ? '' : d.toUTCString();
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function plainExcerpt(body: string, maxLen = 300): string {
  const noImg = body.replace(/<img\s[^>]*\/?>/gi, ' ').trim();
  const plain = noImg
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[`#>*_-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (plain.length <= maxLen) return plain;
  const cut = plain.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > maxLen * 0.55 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export function rssPlugin(): Plugin {
  return {
    name: 'rss-feed',
    async writeBundle() {
      const entriesDir = join(process.cwd(), ENTRIES_DIR);
      const files = readdirSync(entriesDir).filter(f => f.endsWith('.md'));

      const signals = files
        .map(f => {
          const raw = readFileSync(join(entriesDir, f), 'utf-8');
          const { attrs, body } = parseFrontmatter(raw);
          return {
            id: attrs.id ?? '',
            timestamp: attrs.timestamp ?? '',
            title: attrs.title || null,
            location: attrs.location ?? '',
            body,
          };
        })
        .sort((a, b) => b.id.localeCompare(a.id))
        .slice(0, 20);

      const items = await Promise.all(
        signals.map(async s => {
          const result = await unified()
            .use(remarkParse)
            .use(remarkGfm)
            .use(remarkRehype, { allowDangerousHtml: true })
            .use(rehypeRaw)
            .use(rehypeStringify)
            .process(s.body);

          const html = String(result).replace(
            / src="\//g,
            ` src="${BASE_URL}/`,
          );
          const pubDate = parseRssTimestamp(s.timestamp);
          const pubDateTag = pubDate
            ? `\n      <pubDate>${pubDate}</pubDate>`
            : '';
          const title = escapeXml(s.title ?? `[${s.id}]`);
          const desc = escapeXml(plainExcerpt(s.body));

          return `    <item>
      <title>${title}</title>
      <link>${BASE_URL}/signals/${s.id}</link>
      <guid isPermaLink="true">${BASE_URL}/signals/${s.id}</guid>${pubDateTag}
      <description>${desc}</description>
      <content:encoded><![CDATA[${html}]]></content:encoded>
    </item>`;
        }),
      );

      const lastBuildDate = new Date().toUTCString();

      const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Jason Wu — Signals</title>
    <link>${BASE_URL}/signals</link>
    <description>Jason's psychotic mind dump.</description>
    <language>en</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
${items.join('\n')}
  </channel>
</rss>
`;

      const outFile = join(process.cwd(), OUT_FILE);
      mkdirSync(join(process.cwd(), 'build', 'signals'), { recursive: true });
      writeFileSync(outFile, rss, 'utf-8');

      console.log(`[rss-feed] wrote ${outFile}`);
    },
  };
}
