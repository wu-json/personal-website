import type { Root } from 'hast';
import type { MarkdownModule } from 'src/components/Markdown';

export type Signal = {
  id: string;
  timestamp: string;
  title?: string;
  body: string;
  tree: Root;
  expanded: boolean;
  location: string;
};

const modules = import.meta.glob('./entries/*.md', {
  query: '?markdown&gfm&raw&frontmatter=lines',
  import: 'default',
  eager: true,
}) as Record<string, MarkdownModule>;

export const signals: Signal[] = Object.values(modules)
  .map(({ data, body, tree }) => {
    const attrs = data as Record<string, string>;
    return {
      id: attrs.id ?? '',
      timestamp: attrs.timestamp ?? '',
      title: attrs.title || undefined,
      body,
      tree,
      expanded: attrs.expanded === 'true',
      location: attrs.location ?? '',
    };
  })
  .sort(
    (a, b) =>
      b.timestamp.localeCompare(a.timestamp) || b.id.localeCompare(a.id),
  );
