import { layoutWithLines, prepareWithSegments } from '@chenglou/pretext';
import {
  Children,
  createElement,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react';

type PretextTag = 'p' | 'div' | 'li';

type PretextLineBlockProps = {
  text: string;
  as?: PretextTag;
} & Omit<HTMLAttributes<HTMLElement>, 'children'>;

/**
 * Renders plain text with line breaks computed by @chenglou/pretext so wrapping
 * matches canvas measurement (no DOM reflow for layout decisions). Font and
 * line-height are read from computed styles on this element.
 */
function PretextLineBlock({
  text,
  className,
  as = 'p',
  ...rest
}: PretextLineBlockProps) {
  const ref = useRef<HTMLElement>(null);
  const [lines, setLines] = useState<string[] | null>(null);
  const [layoutKey, setLayoutKey] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const bump = () => setLayoutKey(k => k + 1);
    const ro = new ResizeObserver(bump);
    ro.observe(el);
    const mq = window.matchMedia('(min-width: 640px)');
    mq.addEventListener('change', bump);
    return () => {
      ro.disconnect();
      mq.removeEventListener('change', bump);
    };
  }, []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.clientWidth;
    const cs = getComputedStyle(el);
    const font = cs.font;
    const fontSize = parseFloat(cs.fontSize);
    let lineHeightPx = parseFloat(cs.lineHeight);
    if (!Number.isFinite(lineHeightPx)) {
      lineHeightPx = fontSize * 1.5;
    }
    if (w <= 0) {
      setLines(null);
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) {
      setLines(['']);
      return;
    }
    const prepared = prepareWithSegments(text, font);
    const { lines: laid } = layoutWithLines(prepared, w, lineHeightPx);
    setLines(laid.map(l => l.text));
  }, [text, layoutKey]);

  return createElement(
    as,
    {
      ref,
      className,
      ...rest,
    },
    lines === null
      ? text
      : lines.map((line, i) => (
          <span key={i} className='block'>
            {line.length > 0 ? line : '\u00a0'}
          </span>
        )),
  );
}

function isPlainTextOnly(children: ReactNode): boolean {
  return Children.toArray(children).every(
    c =>
      c === null ||
      c === undefined ||
      c === false ||
      typeof c === 'string' ||
      typeof c === 'number',
  );
}

function flattenPlainText(children: ReactNode): string {
  return Children.toArray(children)
    .map(c => {
      if (typeof c === 'string' || typeof c === 'number') return String(c);
      return '';
    })
    .join('');
}

export { PretextLineBlock, flattenPlainText, isPlainTextOnly };
