import { describe, it, expect } from 'bun:test';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

import { Markdown } from '../components/Markdown';
import {
  compileMarkdown,
  type MarkdownOptions,
  splitFrontmatter,
  transformMarkdownModule,
} from './markdown';

function renderReference(source: string, { gfm, raw }: MarkdownOptions) {
  return renderToStaticMarkup(
    createElement(
      ReactMarkdown,
      {
        remarkPlugins: gfm ? [remarkGfm] : [],
        rehypePlugins: raw ? [rehypeRaw] : [],
      },
      source,
    ),
  );
}

function renderCompiled(source: string, options: MarkdownOptions) {
  return renderToStaticMarkup(
    createElement(Markdown, { tree: compileMarkdown(source, options) }),
  );
}

const collections: [string, MarkdownOptions][] = [
  ['src/screens/Signals/entries', { gfm: true, raw: true }],
  ['src/screens/Heroes/entries', { raw: true }],
  ['src/screens/Constructs/entries', { raw: true }],
  ['src/screens/Memories/fragments', {}],
];

describe('compileMarkdown', () => {
  for (const [dir, options] of collections) {
    for (const file of readdirSync(dir)) {
      it(`matches react-markdown for ${file}`, () => {
        const { body } = splitFrontmatter(
          readFileSync(join(dir, file), 'utf8'),
        );
        expect(renderCompiled(body, options)).toBe(
          renderReference(body, options),
        );
      });
    }
  }

  it('escapes raw html when raw is off', () => {
    const source = 'hi <b>there</b>';
    expect(renderCompiled(source, {})).toBe(renderReference(source, {}));
    expect(renderCompiled(source, {})).toContain('&lt;b&gt;');
  });

  it('strips unsafe link protocols', () => {
    const source = '[x](javascript:alert(1)) [y](https://example.com)';
    expect(renderCompiled(source, {})).toBe(renderReference(source, {}));
    expect(renderCompiled(source, {})).not.toContain('javascript:');
  });

  it('drops source positions from the tree', () => {
    expect(JSON.stringify(compileMarkdown('# hi'))).not.toContain('position');
  });
});

describe('transformMarkdownModule', () => {
  const raw = `---
id: kaws
photos:
  - file: a
    caption: '[link](https://example.com)'
groupings:
  g1:
    layout: row
    caption: '*group*'
---

Body text.
`;

  it('parses yaml frontmatter and compiles the body', () => {
    const m = transformMarkdownModule(raw, new URLSearchParams('markdown'));
    expect(m.data.id).toBe('kaws');
    expect(m.body).toBe('Body text.');
    expect(m.tree.type).toBe('root');
    expect(m.captions).toBeUndefined();
  });

  it('compiles photo and grouping captions when requested', () => {
    const m = transformMarkdownModule(
      raw,
      new URLSearchParams('markdown&captions'),
    );
    expect(Object.keys(m.captions ?? {}).sort()).toEqual([
      '*group*',
      '[link](https://example.com)',
    ]);
  });

  it('uses the line parser for frontmatter=lines', () => {
    const m = transformMarkdownModule(
      '---\ntitle: a: b # c\n---\nbody',
      new URLSearchParams('markdown&frontmatter=lines'),
    );
    expect(m.data.title).toBe('a: b # c');
  });
});
