import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';

import { buildPixelFont, collectNonAscii, pixelFontTags } from './pixelFont';

const font = readFileSync(
  join(import.meta.dir, 'fonts', 'DotGothic16-Regular.ttf'),
);

describe('collectNonAscii', () => {
  it('keeps unique non-ascii characters in sorted order', () => {
    expect(collectNonAscii(['アトラス', 'ATLAS ア 日本'])).toBe(
      [...'アトラス日本'].sort().join(''),
    );
  });

  it('ignores ascii', () => {
    expect(collectNonAscii(['hello, world {}'])).toBe('');
  });
});

describe('buildPixelFont', () => {
  it('emits a woff2 subset with a content-hashed name', async () => {
    const { source, fileName } = await buildPixelFont('アトラス', font);
    expect(new TextDecoder().decode(source.slice(0, 4))).toBe('wOF2');
    expect(source.length).toBeLessThan(10_000);
    expect(fileName).toMatch(/^assets\/DotGothic16-[0-9a-f]{8}\.woff2$/);
  });

  it('changes the file name when the characters change', async () => {
    const a = await buildPixelFont('アトラス', font);
    const b = await buildPixelFont('アトラス日本', font);
    expect(a.fileName).not.toBe(b.fileName);
  });
});

describe('pixelFontTags', () => {
  it('preloads the font and declares it with font-display block', () => {
    const [preload, style] = pixelFontTags('/assets/DotGothic16-abc.woff2');
    expect(preload.attrs).toMatchObject({
      rel: 'preload',
      href: '/assets/DotGothic16-abc.woff2',
      as: 'font',
      crossorigin: true,
    });
    expect(style.children).toContain("url('/assets/DotGothic16-abc.woff2')");
    expect(style.children).toContain('font-display:block');
  });
});
