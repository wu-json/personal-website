import { parse as parseYaml } from 'yaml';

import type { Hero } from './types';

function parseFrontmatter(raw: string) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {} as Record<string, unknown>, content: raw };
  return {
    data: (parseYaml(match[1]) ?? {}) as Record<string, unknown>,
    content: match[2],
  };
}

const modules = import.meta.glob('./entries/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export const heroes: Hero[] = Object.entries(modules)
  .sort(([pathA], [pathB]) => pathB.localeCompare(pathA))
  .map(([, raw]) => {
    const { data, content } = parseFrontmatter(raw);
    return {
      id: String(data.id ?? ''),
      title: String(data.title ?? ''),
      subtitle: String(data.subtitle ?? ''),
      cover: String(data.cover ?? ''),
      coverWidth: Number(data.coverWidth ?? 0),
      coverHeight: Number(data.coverHeight ?? 0),
      body: content.trim(),
      location: data.location ? String(data.location) : undefined,
      coverPosition: data.coverPosition
        ? String(data.coverPosition)
        : undefined,
      linkLabel: data.linkLabel ? String(data.linkLabel) : undefined,
      link: data.link ? String(data.link) : undefined,
    };
  });

export function heroImageUrl(
  id: string,
  file: string,
  size: 'placeholder' | 'thumb' | 'full',
): string {
  return `/images/heroes/${id}/${file}-${size}.webp`;
}
