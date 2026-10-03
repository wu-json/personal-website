import type { Root } from 'hast';
import type { MarkdownModule } from 'src/components/Markdown';

import type { Fragment, Grouping, PhotoMeta } from './types';

const modules = import.meta.glob('./fragments/*.md', {
  query: '?markdown&captions',
  import: 'default',
  eager: true,
}) as Record<string, MarkdownModule>;

export const fragments: Fragment[] = Object.entries(modules)
  .sort(([pathA], [pathB]) => pathB.localeCompare(pathA))
  .map(([, { data, body, tree }]) => ({
    id: String(data.id ?? ''),
    title: String(data.title ?? ''),
    date: String(data.date ?? ''),
    location: String(data.location ?? ''),
    cover: String(data.cover ?? ''),
    coverClassName: data.coverClassName as string | undefined,
    description: body,
    descriptionTree: tree,
    photos: (data.photos ?? []) as PhotoMeta[],
    groupings: data.groupings as Record<string, Grouping> | undefined,
  }));

const captionTrees = new Map<string, Root>(
  Object.values(modules).flatMap(m => Object.entries(m.captions ?? {})),
);

export function captionTree(caption: string): Root | undefined {
  return captionTrees.get(caption);
}

export function photoUrl(
  fragmentId: string,
  file: string,
  size: 'placeholder' | 'small' | 'thumb' | 'full',
): string {
  return `/images/fragments/${fragmentId}/${file}-${size}.webp`;
}
