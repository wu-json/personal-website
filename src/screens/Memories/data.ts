import { parse as parseYaml } from 'yaml';

import type { Fragment, Grouping, PhotoMeta } from './types';

function parseFrontmatter(raw: string) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {} as Record<string, unknown>, content: raw };
  return {
    data: (parseYaml(match[1]) ?? {}) as Record<string, unknown>,
    content: match[2],
  };
}

const modules = import.meta.glob('./fragments/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export const fragments: Fragment[] = Object.entries(modules)
  .sort(([pathA], [pathB]) => pathB.localeCompare(pathA))
  .map(([, raw]) => {
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

export function photoUrl(
  fragmentId: string,
  file: string,
  size: 'placeholder' | 'thumb' | 'full',
): string {
  return `/images/fragments/${fragmentId}/${file}-${size}.webp`;
}
