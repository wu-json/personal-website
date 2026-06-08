import { describe, it, expect } from 'bun:test';

import {
  parseFrontmatter,
  parseRssTimestamp,
  escapeXml,
  plainExcerpt,
  styleImages,
  stripFirstImage,
} from './rss';

// ---------------------------------------------------------------------------
// parseFrontmatter
// ---------------------------------------------------------------------------
describe('parseFrontmatter', () => {
  it('parses YAML frontmatter with multiple fields', () => {
    const raw = `---
id: 001
title: Hello World
timestamp: 2026.04.28 // 12:00
---
This is the body.`;
    const { attrs, body } = parseFrontmatter(raw);
    expect(attrs).toEqual({
      id: '001',
      title: 'Hello World',
      timestamp: '2026.04.28 // 12:00',
    });
    expect(body).toBe('This is the body.');
  });

  it('strips surrounding quotes from values', () => {
    const raw = `---
title: "Quoted Title"
---
Body.`;
    const { attrs } = parseFrontmatter(raw);
    expect(attrs.title).toBe('Quoted Title');
  });

  it('returns empty attrs and full raw when no frontmatter', () => {
    const raw = 'Just a body with no frontmatter.';
    const { attrs, body } = parseFrontmatter(raw);
    expect(attrs).toEqual({});
    expect(body).toBe(raw);
  });

  it('handles empty body after frontmatter', () => {
    const raw = `---
id: 002
---
`;
    const { attrs, body } = parseFrontmatter(raw);
    expect(attrs.id).toBe('002');
    expect(body).toBe('');
  });

  it('handles Windows-style CRLF line endings', () => {
    const raw = '---\r\nid: 003\r\n---\r\nBody text.';
    const { attrs, body } = parseFrontmatter(raw);
    expect(attrs.id).toBe('003');
    expect(body).toBe('Body text.');
  });

  it('skips lines without a colon separator', () => {
    const raw = `---
id: 004
just a random comment
---
Body.`;
    const { attrs } = parseFrontmatter(raw);
    expect(attrs).toEqual({ id: '004' });
  });
});

// ---------------------------------------------------------------------------
// parseRssTimestamp
// ---------------------------------------------------------------------------
describe('parseRssTimestamp', () => {
  it('converts dot-separated date with "//" separator', () => {
    const result = parseRssTimestamp('2026.04.28 // 12:00');
    expect(result).toContain('Tue, 28 Apr 2026');
    expect(result).toContain('12:00:00');
    expect(result).toMatch(/GMT$/);
  });

  it('returns empty string for invalid input', () => {
    expect(parseRssTimestamp('')).toBe('');
    expect(parseRssTimestamp('not-a-date')).toBe('');
    expect(parseRssTimestamp('////')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// escapeXml
// ---------------------------------------------------------------------------
describe('escapeXml', () => {
  it('escapes &, <, >, and "', () => {
    expect(escapeXml('AT&T "value" <tag>')).toBe(
      'AT&amp;T &quot;value&quot; &lt;tag&gt;',
    );
  });

  it('passes through text without special characters', () => {
    expect(escapeXml('plain text')).toBe('plain text');
  });

  it('handles empty string', () => {
    expect(escapeXml('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// plainExcerpt
// ---------------------------------------------------------------------------
describe('plainExcerpt', () => {
  it('strips <img> tags', () => {
    const body = 'Some text <img src="x.jpg" /> and more.';
    const result = plainExcerpt(body);
    expect(result).not.toContain('<img');
    expect(result).toContain('Some text');
    expect(result).toContain('and more.');
  });

  it('strips markdown link syntax leaving link text', () => {
    const body = 'Click [here](https://example.com) for info.';
    expect(plainExcerpt(body)).toBe('Click here for info.');
  });

  it('removes special characters ` # > * _ -', () => {
    const body = '**bold** and #hash and `code`';
    const result = plainExcerpt(body);
    expect(result).not.toContain('**');
    expect(result).not.toContain('#');
    expect(result).not.toContain('`');
  });

  it('collapses whitespace', () => {
    const body = 'a    b   c';
    expect(plainExcerpt(body)).toBe('a b c');
  });

  it('truncates long text at word boundary', () => {
    const body = 'word '.repeat(100);
    const result = plainExcerpt(body, 50);
    expect(result.length).toBeLessThanOrEqual(55); // 50 + ellipsis wiggle
    expect(result.endsWith('…')).toBe(true);
  });

  it('returns full text when shorter than maxLen', () => {
    const body = 'Short text.';
    expect(plainExcerpt(body, 300)).toBe('Short text.');
  });

  it('returns empty string for empty input', () => {
    expect(plainExcerpt('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// styleImages
// ---------------------------------------------------------------------------
describe('styleImages', () => {
  it('adds style to an <img> tag without an existing style', () => {
    const input = '<img src="/photo.jpg">';
    const result = styleImages(input);
    expect(result).toBe(
      '<img src="/photo.jpg" style="max-width:100%;height:auto">',
    );
  });

  it('adds style to self-closing <img /> tag', () => {
    const input = '<img src="/photo.jpg" />';
    const result = styleImages(input);
    expect(result).toBe(
      '<img src="/photo.jpg" style="max-width:100%;height:auto" />',
    );
  });

  it('leaves <img> with existing style unchanged', () => {
    const input = '<img src="/photo.jpg" style="width:50%">';
    expect(styleImages(input)).toBe(input);
  });

  it('handles multiple <img> tags independently', () => {
    const input =
      '<img src="a.jpg"><p>text</p><img src="b.jpg" style="width:100%">';
    const result = styleImages(input);
    // First img gets style
    expect(result).toContain(
      '<img src="a.jpg" style="max-width:100%;height:auto">',
    );
    // Second img with existing style is unchanged
    expect(result).toContain('<img src="b.jpg" style="width:100%">');
  });

  it('handles img with other attributes', () => {
    const input = '<img src="x.jpg" width="800" height="600" alt="test">';
    const result = styleImages(input);
    expect(result).toBe(
      '<img src="x.jpg" width="800" height="600" alt="test" style="max-width:100%;height:auto">',
    );
  });

  it('returns empty string for empty input', () => {
    expect(styleImages('')).toBe('');
  });

  it('returns input unchanged when no <img> tags', () => {
    const input = '<p>No images here.</p>';
    expect(styleImages(input)).toBe(input);
  });
});

// ---------------------------------------------------------------------------
// stripFirstImage
// ---------------------------------------------------------------------------
describe('stripFirstImage', () => {
  it('strips the only <img> tag', () => {
    const input = '<img src="hero.jpg">';
    expect(stripFirstImage(input)).toBe('');
  });

  it('strips only the first <img> when multiple exist', () => {
    const input = '<img src="first.jpg"><p>text</p><img src="second.jpg">';
    const result = stripFirstImage(input);
    expect(result).toBe('<p>text</p><img src="second.jpg">');
  });

  it('strips self-closing first img', () => {
    const input = '<img src="hero.jpg" /><p>body</p>';
    const result = stripFirstImage(input);
    expect(result).toBe('<p>body</p>');
  });

  it('strips first img with many attributes', () => {
    const input =
      '<img src="hero.jpg" width="1200" height="800" style="max-width:100%;height:auto" alt="hero"><p>content</p>';
    const result = stripFirstImage(input);
    expect(result).toBe('<p>content</p>');
  });

  it('returns empty string for a single img tag with no surrounding content', () => {
    expect(stripFirstImage('<img src="x.jpg" />')).toBe('');
  });

  it('returns input unchanged when no <img> tags', () => {
    const input = '<p>No images here.</p>';
    expect(stripFirstImage(input)).toBe(input);
  });

  it('returns empty string for empty input', () => {
    expect(stripFirstImage('')).toBe('');
  });
});
