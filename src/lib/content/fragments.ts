import 'server-only';
import type { Fragment, Grouping, PhotoMeta } from 'src/screens/Memories/types';

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';

const FRAGMENTS_DIR = 'src/screens/Memories/fragments';

function parseFrontmatter(raw: string) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {} as Record<string, unknown>, content: raw };
  return {
    data: (parseYaml(match[1]) ?? {}) as Record<string, unknown>,
    content: match[2],
  };
}

let cache: Fragment[] | null = null;

export function getFragments(): Fragment[] {
  if (cache) return cache;
  const dir = join(process.cwd(), FRAGMENTS_DIR);
  const files = readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .sort((a, b) => b.localeCompare(a));
  cache = files.map(f => {
    const raw = readFileSync(join(dir, f), 'utf-8');
    const { data, content } = parseFrontmatter(raw);
    return {
      id: String(data.id ?? ''),
      title: String(data.title ?? ''),
      date: String(data.date ?? ''),
      location: String(data.location ?? ''),
      cover: String(data.cover ?? ''),
      coverClassName: data.coverClassName as string | undefined,
      description: content.trim(),
      photos: (data.photos ?? []) as PhotoMeta[],
      groupings: data.groupings as Record<string, Grouping> | undefined,
    };
  });
  return cache;
}
