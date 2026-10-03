import type { MarkdownModule } from 'src/components/Markdown';

import type { Hero } from './types';

const modules = import.meta.glob('./entries/*.md', {
  query: '?markdown&raw',
  import: 'default',
  eager: true,
}) as Record<string, MarkdownModule>;

export const heroes: Hero[] = Object.entries(modules)
  .sort(([pathA], [pathB]) => pathA.localeCompare(pathB))
  .map(([, { data, tree }]) => ({
    id: String(data.id ?? ''),
    title: String(data.title ?? ''),
    subtitle: String(data.subtitle ?? ''),
    cover: String(data.cover ?? ''),
    coverWidth: Number(data.coverWidth ?? 0),
    coverHeight: Number(data.coverHeight ?? 0),
    body: tree,
    location: data.location ? String(data.location) : undefined,
    coverPosition: data.coverPosition ? String(data.coverPosition) : undefined,
    linkLabel: data.linkLabel ? String(data.linkLabel) : undefined,
    link: data.link ? String(data.link) : undefined,
  }));

export function heroImageUrl(
  id: string,
  file: string,
  size: 'placeholder' | 'thumb' | 'full',
): string {
  return `/images/heroes/${id}/${file}-${size}.webp`;
}
