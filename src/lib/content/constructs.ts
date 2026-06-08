import 'server-only';
import type { Construct } from 'src/screens/Constructs/types';

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';

const ENTRIES_DIR = 'src/screens/Constructs/entries';

function parseFrontmatter(raw: string) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {} as Record<string, unknown>, content: raw };
  return {
    data: (parseYaml(match[1]) ?? {}) as Record<string, unknown>,
    content: match[2],
  };
}

let cache: Construct[] | null = null;

export function getConstructs(): Construct[] {
  if (cache) return cache;
  const dir = join(process.cwd(), ENTRIES_DIR);
  const files = readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .sort((a, b) => b.localeCompare(a));
  cache = files.map(f => {
    const raw = readFileSync(join(dir, f), 'utf-8');
    const { data, content } = parseFrontmatter(raw);
    return {
      id: String(data.id ?? ''),
      title: String(data.title ?? ''),
      subtitle: String(data.subtitle ?? ''),
      date: String(data.date ?? ''),
      cover: String(data.cover ?? ''),
      coverWidth: Number(data.coverWidth ?? 0),
      coverHeight: Number(data.coverHeight ?? 0),
      body: content.trim(),
      coverPosition: data.coverPosition
        ? String(data.coverPosition)
        : undefined,
      linkLabel: data.linkLabel ? String(data.linkLabel) : undefined,
      link: data.link ? String(data.link) : undefined,
    };
  });
  return cache;
}
