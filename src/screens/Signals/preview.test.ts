import { describe, it, expect } from 'bun:test';

import { signalPlainExcerpt, shouldCollapseSignalList } from './preview';

// ---------------------------------------------------------------------------
// signalPlainExcerpt
// ---------------------------------------------------------------------------
describe('signalPlainExcerpt', () => {
  // Footnote references
  it('strips inline footnote reference markers', () => {
    expect(signalPlainExcerpt('The aquarium[^ga] is big.')).toBe(
      'The aquarium is big.',
    );
  });

  it('strips multiple footnote refs in one sentence', () => {
    expect(signalPlainExcerpt('A[^1] and B[^2] and C.')).toBe('A and B and C.');
  });

  it('strips numeric footnote refs', () => {
    expect(signalPlainExcerpt('See note[^42] for details.')).toBe(
      'See note for details.',
    );
  });

  it('strips footnote ref adjacent to punctuation', () => {
    expect(signalPlainExcerpt('The garden[^abg].')).toBe('The garden.');
    expect(signalPlainExcerpt('Hello[^a]!')).toBe('Hello!');
  });

  // Footnote definitions
  it('strips footnote definition lines', () => {
    const input = 'Some body text.\n\n[^ga]: https://georgiaaquarium.org';
    expect(signalPlainExcerpt(input)).toBe('Some body text.');
  });

  it('strips multiple footnote definition lines', () => {
    const input =
      'Body text.\n\n[^a]: First link\n[^b]: Second link\n[^c]: Third';
    expect(signalPlainExcerpt(input)).toBe('Body text.');
  });

  it('strips footnote defs with markdown links inside', () => {
    const input =
      'Body.\n\n[^ga]: [Georgia Aquarium](https://georgiaaquarium.org/)';
    expect(signalPlainExcerpt(input)).toBe('Body.');
  });

  // Combined
  it('strips footnotes refs and defs together', () => {
    const input =
      'Foo[^a] and bar[^b].\n\n[^a]: https://a.com\n[^b]: https://b.com';
    expect(signalPlainExcerpt(input)).toBe('Foo and bar.');
  });

  // Regression guards
  it('does not strip normal bracketed text', () => {
    const input = 'See [the docs] online or [ask for help].';
    expect(signalPlainExcerpt(input)).toBe(
      'See [the docs] online or [ask for help].',
    );
  });

  it('does not break markdown link stripping', () => {
    const input = 'Click [here](https://example.com) for info.';
    expect(signalPlainExcerpt(input)).toBe('Click here for info.');
  });

  it('does not break formatting char stripping', () => {
    const input = '**bold** and `code`';
    const result = signalPlainExcerpt(input);
    expect(result).not.toContain('**');
    expect(result).not.toContain('`');
    expect(result).toContain('bold');
    expect(result).toContain('code');
  });

  // Existing behavior
  it('strips <img> tags', () => {
    const body = 'Some text <img src="x.jpg" /> and more.';
    const result = signalPlainExcerpt(body);
    expect(result).not.toContain('<img');
    expect(result).toContain('Some text');
    expect(result).toContain('and more.');
  });

  it('collapses whitespace', () => {
    expect(signalPlainExcerpt('a    b   c')).toBe('a b c');
  });

  it('truncates long text at word boundary', () => {
    const body = 'word '.repeat(100);
    const result = signalPlainExcerpt(body, 50);
    expect(result.length).toBeLessThanOrEqual(55); // 50 + ellipsis wiggle
    expect(result.endsWith('…')).toBe(true);
  });

  it('returns full text when shorter than maxLen', () => {
    expect(signalPlainExcerpt('Short text.', 300)).toBe('Short text.');
  });

  it('returns empty string for empty input', () => {
    expect(signalPlainExcerpt('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// shouldCollapseSignalList
// ---------------------------------------------------------------------------
describe('shouldCollapseSignalList', () => {
  it('does not collapse expanded signals', () => {
    expect(shouldCollapseSignalList(true, 'long body '.repeat(200))).toBe(
      false,
    );
  });

  it('collapses non-expanded signals with long body', () => {
    expect(shouldCollapseSignalList(false, 'long '.repeat(200))).toBe(true);
  });

  it('does not collapse non-expanded signals with short body', () => {
    expect(shouldCollapseSignalList(false, 'short')).toBe(false);
  });
});
