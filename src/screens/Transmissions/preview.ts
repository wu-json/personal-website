/** First <img> in transmission markdown (hero), if any. */
export function parseFirstImgFromTransmissionBody(body: string): {
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

function bodyPlainTextLength(body: string): number {
  const withoutImg = body.replace(/<img\s[^>]*\/?>/gi, ' ').trim();
  return withoutImg.replace(/\s+/g, ' ').length;
}

/**
 * Index list: show a teaser instead of full body when not expanded and body is long.
 */
export function shouldCollapseTransmissionList(
  expanded: boolean,
  body: string,
): boolean {
  if (expanded) return false;
  return bodyPlainTextLength(body) > 520;
}

/** Plain excerpt for collapsed list rows (after stripping hero images). */
export function transmissionPlainExcerpt(body: string, maxLen = 300): string {
  const noImg = body.replace(/<img\s[^>]*\/?>/gi, ' ').trim();
  const plain = noImg
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[`#>*_-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (plain.length <= maxLen) return plain;
  const cut = plain.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > maxLen * 0.55 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
