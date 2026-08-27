import { describe, it, expect } from 'bun:test';

import {
  applySignalMeta,
  buildCardSvg,
  cardTitle,
  layoutTitle,
  ogImagePath,
  setMetaTag,
  wrapText,
} from './og';

// ---------------------------------------------------------------------------
// wrapText
// ---------------------------------------------------------------------------
describe('wrapText', () => {
  it('keeps a short title on one line', () => {
    expect(wrapText('TROJAN COWS', 24)).toEqual(['TROJAN COWS']);
  });

  it('wraps on word boundaries', () => {
    expect(wrapText('MY TASTE IS BETTER THAN YOUR TASTE', 24)).toEqual([
      'MY TASTE IS BETTER THAN',
      'YOUR TASTE',
    ]);
  });

  it('hard-splits tokens longer than the budget', () => {
    const lines = wrapText(
      '[2026-06-19-MY-TASTE-IS-BETTER-THAN-YOUR-TASTE]',
      24,
    );
    expect(lines.length).toBeGreaterThan(1);
    for (const ln of lines) expect(ln.length).toBeLessThanOrEqual(24);
  });
});

// ---------------------------------------------------------------------------
// layoutTitle
// ---------------------------------------------------------------------------
describe('layoutTitle', () => {
  it('uppercases and uses the largest size for short titles', () => {
    expect(layoutTitle('Trojan Cows')).toEqual({
      lines: ['TROJAN COWS'],
      fontSize: 72,
    });
  });

  it('steps down the font size when two lines are not enough', () => {
    const { lines, fontSize } = layoutTitle(
      'A Very Long Signal Title That Needs Rather A Lot Of Space To Fit',
    );
    expect(fontSize).toBeLessThan(72);
    expect(lines.length).toBeLessThanOrEqual(4);
  });

  it('truncates with an ellipsis instead of overflowing the card', () => {
    const { lines } = layoutTitle('word '.repeat(60));
    expect(lines.length).toBe(4);
    expect(lines[3].endsWith('…')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// cardTitle
// ---------------------------------------------------------------------------
describe('cardTitle', () => {
  it('uses the title when present', () => {
    expect(cardTitle({ id: '2026-04-12-david', title: 'David' })).toBe('David');
  });

  it('falls back to [id] for untitled signals, like the RSS feed', () => {
    expect(cardTitle({ id: '2026-04-12-david', title: null })).toBe(
      '[2026-04-12-david]',
    );
  });
});

// ---------------------------------------------------------------------------
// buildCardSvg
// ---------------------------------------------------------------------------
describe('buildCardSvg', () => {
  const signal = {
    id: '2026-08-26-breaking-my-career',
    timestamp: '2026.08.26 // 18:52:47',
    title: 'Breaking My Career',
    location: 'San Francisco, US',
  };

  it('renders header text mirroring the signal detail page', () => {
    const svg = buildCardSvg(signal, 'data:image/png;base64,x');
    expect(svg).toContain('BREAKING MY CAREER');
    expect(svg).toContain('2026.08.26 18:52:47');
    expect(svg).toContain('— San Francisco, US');
    expect(svg).toContain('JASONWU.INK/SIGNALS');
  });

  it('escapes markup-sensitive characters in titles', () => {
    const svg = buildCardSvg(
      { ...signal, title: 'OSS & Photography <3' },
      'data:image/png;base64,x',
    );
    expect(svg).toContain('OSS &amp; PHOTOGRAPHY &lt;3');
    expect(svg).not.toContain('& PHOTOGRAPHY');
  });

  it('omits the location tspan when location is empty', () => {
    const svg = buildCardSvg({ ...signal, location: '' }, 'data:x');
    expect(svg).not.toContain('<tspan');
  });
});

// ---------------------------------------------------------------------------
// setMetaTag
// ---------------------------------------------------------------------------
describe('setMetaTag', () => {
  it('replaces the content of a matching tag regardless of attribute order', () => {
    const html = '<meta content="old" property="og:title" />';
    expect(setMetaTag(html, 'property', 'og:title', 'new')).toBe(
      '<meta property="og:title" content="new" />',
    );
  });

  it('does not touch tags whose key merely shares a prefix', () => {
    const html =
      '<meta property="og:image" content="a.png" /><meta property="og:image:width" content="1200" />';
    const out = setMetaTag(html, 'property', 'og:image', 'b.png');
    expect(out).toContain('<meta property="og:image" content="b.png" />');
    expect(out).toContain('<meta property="og:image:width" content="1200" />');
  });

  it('escapes the injected content', () => {
    const html = '<meta name="description" content="old" />';
    expect(setMetaTag(html, 'name', 'description', 'a "b" & c')).toContain(
      'content="a &quot;b&quot; &amp; c"',
    );
  });
});

// ---------------------------------------------------------------------------
// applySignalMeta
// ---------------------------------------------------------------------------
describe('applySignalMeta', () => {
  const indexHtml = `<!doctype html><html><head>
    <title>Jason Cui Wu</title>
    <meta name="description" content="Paint the world in ink." />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="Jason Cui Wu" />
    <meta property="og:description" content="Paint the world in ink." />
    <meta property="og:url" content="https://jasonwu.ink/" />
    <meta property="og:image" content="https://jasonwu.ink/images/og-image.png?v=2" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:alt" content="A white spider lily on a black background." />
    <meta name="twitter:title" content="Jason Cui Wu" />
    <meta name="twitter:description" content="Paint the world in ink." />
    <meta name="twitter:image" content="https://jasonwu.ink/images/og-image.png?v=2" />
    <meta name="twitter:image:alt" content="A white spider lily on a black background." />
  </head><body></body></html>`;

  const signal = {
    id: '2026-08-26-breaking-my-career',
    timestamp: '2026.08.26 // 18:52:47',
    title: 'Breaking My Career',
    location: 'San Francisco, US',
    body: 'Today marks month four of the first and only break in my career.',
  };

  it('specializes title, url, image, and type for the signal', () => {
    const html = applySignalMeta(indexHtml, signal);
    expect(html).toContain('<title>Breaking My Career — Jason Cui Wu</title>');
    expect(html).toContain('<meta property="og:type" content="article" />');
    expect(html).toContain(
      '<meta property="og:url" content="https://jasonwu.ink/signals/2026-08-26-breaking-my-career" />',
    );
    expect(html).toContain(
      '<meta property="og:image" content="https://jasonwu.ink/images/og/signals/2026-08-26-breaking-my-career.png" />',
    );
    expect(html).toContain(
      '<meta name="twitter:image" content="https://jasonwu.ink/images/og/signals/2026-08-26-breaking-my-career.png" />',
    );
    expect(html).toContain('article:published_time');
    // Dimensions are unchanged: cards are still 1200x630.
    expect(html).toContain('<meta property="og:image:width" content="1200" />');
  });

  it('uses a body excerpt as the description', () => {
    const html = applySignalMeta(indexHtml, signal);
    expect(html).toContain(
      '<meta property="og:description" content="Today marks month four of the first and only break in my career." />',
    );
    expect(html).not.toContain('Paint the world in ink.');
  });

  it('falls back to [id] in the title for untitled signals', () => {
    const html = applySignalMeta(indexHtml, { ...signal, title: null });
    expect(html).toContain(
      '<title>[2026-08-26-breaking-my-career] — Jason Cui Wu</title>',
    );
  });
});

// ---------------------------------------------------------------------------
// ogImagePath
// ---------------------------------------------------------------------------
describe('ogImagePath', () => {
  it('builds the public path for a signal card', () => {
    expect(ogImagePath('2026-04-12-david')).toBe(
      '/images/og/signals/2026-04-12-david.png',
    );
  });
});
