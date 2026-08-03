/** First <img> in signal markdown (hero), if any. */
export function parseFirstImgFromSignalBody(body: string): {
  src: string;
  alt: string;
  width: number;
  height: number;
} | null {
  const match = body.match(/<img\s[^>]*>/i);
  if (!match) return null;
  const tag = match[0];
  const src = tag.match(/\bsrc="([^"]+)"/)?.[1];
  const alt = tag.match(/\salt="([^"]*)"/)?.[1] ?? '';
  const w = tag.match(/\bwidth="(\d+)"/)?.[1];
  const h = tag.match(/\bheight="(\d+)"/)?.[1];
  if (!src || !w || !h) return null;
  return { src, alt, width: Number(w), height: Number(h) };
}

/**
 * Hero media never counts as list text — that includes the <figure> wrapper and
 * its <figcaption>, whose words would otherwise open the collapsed excerpt.
 */
function stripMedia(body: string): string {
  return body
    .replace(/<figcaption[^>]*>[\s\S]*?<\/figcaption>/gi, ' ')
    .replace(/<\/?figure[^>]*>/gi, ' ')
    .replace(/<img\s[^>]*\/?>/gi, ' ')
    .trim();
}

function bodyPlainTextLength(body: string): number {
  return stripMedia(body).replace(/\s+/g, ' ').length;
}

/**
 * Index list: show a teaser instead of full body when not expanded and body is long.
 */
export function shouldCollapseSignalList(
  expanded: boolean,
  body: string,
): boolean {
  if (expanded) return false;
  return bodyPlainTextLength(body) > 520;
}

/** Plain excerpt for collapsed list rows (after stripping hero images). */
export function signalPlainExcerpt(body: string, maxLen = 300): string {
  const plain = stripMedia(body)
    .replace(/^\[\^[^\]]+\]:.*$\n?/gm, '') // strip footnote definition lines
    .replace(/\[\^[^\]]+\]/g, '') // strip footnote reference markers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // inline links → link text
    .replace(/[`#>*_-]/g, '') // formatting chars
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim();
  if (plain.length <= maxLen) return plain;
  const cut = plain.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > maxLen * 0.55 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
