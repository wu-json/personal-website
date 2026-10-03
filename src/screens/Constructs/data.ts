import type { MarkdownModule } from 'src/components/Markdown';

import type { Construct } from './types';

const modules = import.meta.glob('./entries/*.md', {
  query: '?markdown&raw',
  import: 'default',
  eager: true,
}) as Record<string, MarkdownModule>;

export const constructs: Construct[] = Object.entries(modules)
  .sort(([pathA], [pathB]) => pathB.localeCompare(pathA))
  .map(([, { data, tree }]) => ({
    id: String(data.id ?? ''),
    title: String(data.title ?? ''),
    subtitle: String(data.subtitle ?? ''),
    date: String(data.date ?? ''),
    cover: String(data.cover ?? ''),
    coverWidth: Number(data.coverWidth ?? 0),
    coverHeight: Number(data.coverHeight ?? 0),
    body: tree,
    coverPosition: data.coverPosition ? String(data.coverPosition) : undefined,
    linkLabel: data.linkLabel ? String(data.linkLabel) : undefined,
    link: data.link ? String(data.link) : undefined,
  }));

export function constructImageUrl(
  id: string,
  file: string,
  size: 'placeholder' | 'thumb' | 'full',
): string {
  return `/images/constructs/${id}/${file}-${size}.webp`;
}
