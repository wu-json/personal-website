export type Transmission = {
  id: string;
  timestamp: string;
  title: string;
  body: string;
  expanded: boolean;
  location: string;
};

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

const modules = import.meta.glob('./entries/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export const transmissions: Transmission[] = Object.values(modules)
  .map(raw => {
    const { attrs, body } = parseFrontmatter(raw);
    return {
      id: attrs.id ?? '',
      timestamp: attrs.timestamp ?? '',
      title: attrs.title ?? '',
      body,
      expanded: attrs.expanded === 'true',
      location: attrs.location ?? '',
    };
  })
  .sort((a, b) => b.id.localeCompare(a.id));
