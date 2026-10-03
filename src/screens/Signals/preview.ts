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

function stripMedia(body: string): string {
  return body
    .replace(/```chart\b[\s\S]*?```/g, ' ')
    .replace(/<figcaption[^>]*>[\s\S]*?<\/figcaption>/gi, ' ')
    .replace(/<\/?figure[^>]*>/gi, ' ')
    .replace(/<img\s[^>]*\/?>/gi, ' ')
    .replace(/<video\s[^>]*>[\s\S]*?<\/video>/gi, ' ')
    .trim();
}

function bodyPlainTextLength(body: string): number {
  return stripMedia(body).replace(/\s+/g, ' ').length;
}

export function shouldCollapseSignalList(
  expanded: boolean,
  body: string,
): boolean {
  if (expanded) return false;
  return bodyPlainTextLength(body) > 520;
}

export function signalPlainExcerpt(body: string, maxLen = 300): string {
  const plain = stripMedia(body)
    .replace(/^\[\^[^\]]+\]:.*$\n?/gm, '')
    .replace(/\[\^[^\]]+\]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, '')
    .replace(/[`#>*_]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (plain.length <= maxLen) return plain;
  const cut = plain.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > maxLen * 0.55 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
