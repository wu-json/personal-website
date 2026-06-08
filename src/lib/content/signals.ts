import 'server-only';
import type { Signal } from 'src/screens/Signals/types';

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

export type { Signal };

const ENTRIES_DIR = 'src/screens/Signals/entries';

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

let cache: Signal[] | null = null;

export function getSignals(): Signal[] {
  if (cache) return cache;
  const dir = join(process.cwd(), ENTRIES_DIR);
  const files = readdirSync(dir).filter(f => f.endsWith('.md'));
  cache = files
    .map(f => {
      const raw = readFileSync(join(dir, f), 'utf-8');
      const { attrs, body } = parseFrontmatter(raw);
      return {
        id: attrs.id ?? '',
        timestamp: attrs.timestamp ?? '',
        title: attrs.title || undefined,
        body,
        expanded: attrs.expanded === 'true',
        location: attrs.location ?? '',
      };
    })
    .sort((a, b) => b.id.localeCompare(a.id));
  return cache;
}
