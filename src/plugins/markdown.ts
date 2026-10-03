import { readFileSync } from 'fs';

import type { Root } from 'hast';
import { urlAttributes } from 'html-url-attributes';
import { defaultUrlTransform } from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import type { Plugin } from 'vite';
import { parse as parseYaml } from 'yaml';

import { parseFrontmatter as parseLineFrontmatter } from './rss';

export type MarkdownOptions = { gfm?: boolean; raw?: boolean };

export function compileMarkdown(
  source: string,
  { gfm = false, raw = false }: MarkdownOptions = {},
): Root {
  const processor = unified()
    .use(remarkParse)
    .use(gfm ? [remarkGfm] : [])
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(raw ? [rehypeRaw] : []);
  const tree = processor.runSync(processor.parse(source)) as Root;

  visit(tree, (node, index, parent) => {
    delete node.position;
    if (node.type === 'raw' && parent && typeof index === 'number') {
      parent.children[index] = { type: 'text', value: node.value };
      return;
    }
    if (node.type !== 'element') return;
    for (const [key, tags] of Object.entries(urlAttributes)) {
      if (!Object.hasOwn(node.properties, key)) continue;
      if (tags !== null && !tags.includes(node.tagName)) continue;
      node.properties[key] = defaultUrlTransform(
        String(node.properties[key] || ''),
      );
    }
  });

  return tree;
}

export function splitFrontmatter(raw: string): {
  frontmatter: string;
  body: string;
} {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { frontmatter: '', body: raw.trim() };
  return { frontmatter: match[1], body: match[2].trim() };
}

function collectCaptions(data: Record<string, unknown>): string[] {
  const photos = (data.photos ?? []) as { caption?: unknown }[];
  const groupings = Object.values(
    (data.groupings ?? {}) as Record<string, { caption?: unknown }>,
  );
  return [...photos, ...groupings]
    .map(item => item.caption)
    .filter((c): c is string => typeof c === 'string' && c.length > 0);
}

export function transformMarkdownModule(raw: string, query: URLSearchParams) {
  const options: MarkdownOptions = {
    gfm: query.has('gfm'),
    raw: query.has('raw'),
  };
  const { frontmatter, body } = splitFrontmatter(raw);
  const data: Record<string, unknown> =
    query.get('frontmatter') === 'lines'
      ? parseLineFrontmatter(raw).attrs
      : ((parseYaml(frontmatter) ?? {}) as Record<string, unknown>);
  const captions = query.has('captions')
    ? Object.fromEntries(
        collectCaptions(data).map(c => [c, compileMarkdown(c, options)]),
      )
    : undefined;
  return { data, body, tree: compileMarkdown(body, options), captions };
}

export function markdownPlugin(): Plugin {
  return {
    name: 'markdown-content',
    enforce: 'pre',
    load(id) {
      const [file, search = ''] = id.split('?');
      const query = new URLSearchParams(search);
      if (!file.endsWith('.md') || !query.has('markdown')) return null;
      const module = transformMarkdownModule(readFileSync(file, 'utf8'), query);
      return `export default ${JSON.stringify(module)};`;
    },
  };
}
