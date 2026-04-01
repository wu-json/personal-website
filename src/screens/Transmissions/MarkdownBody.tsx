/**
 * Single markdown pipeline for every transmission body (detail + full list rows).
 *
 * Extend here only — do not fork another Markdown + remark stack for Transmissions.
 * - remark-gfm: tables, footnotes [^id], etc.
 * - rehype-raw: <img> with dimensions for ProgressiveImage
 * - Plain `p` / `li` nodes use @chenglou/pretext line layout (`PretextLineBlock`)
 * - Footnote block styling: `.transmission-prose section[data-footnotes]` in index.css
 *
 * @see CLAUDE.md → "Transmissions markdown reference"
 */
import type { AnchorHTMLAttributes, ComponentProps, ReactNode } from 'react';

import Markdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

import { ProgressiveImage } from '../../components/ProgressiveImage';
import {
  flattenPlainText,
  isPlainTextOnly,
  PretextLineBlock,
} from './PretextLineBlock';

type PProps = ComponentProps<'p'> & { node?: unknown };
type LiProps = ComponentProps<'li'> & { node?: unknown };

const MarkdownBody = ({ children }: { children: string }) => (
  <Markdown
    remarkPlugins={[remarkGfm]}
    rehypePlugins={[rehypeRaw]}
    components={{
      p: ({ children: pChildren, className, node: _pNode, ...rest }: PProps) =>
        isPlainTextOnly(pChildren) ? (
          <PretextLineBlock
            as='p'
            text={flattenPlainText(pChildren)}
            className={className}
            {...rest}
          />
        ) : (
          <p className={className} {...rest}>
            {pChildren}
          </p>
        ),
      li: ({
        children: liChildren,
        className,
        node: _liNode,
        ...rest
      }: LiProps) =>
        isPlainTextOnly(liChildren) ? (
          <PretextLineBlock
            as='li'
            text={flattenPlainText(liChildren)}
            className={className}
            {...rest}
          />
        ) : (
          <li className={className} {...rest}>
            {liChildren}
          </li>
        ),
      img: ({
        src,
        alt,
        width,
        height,
      }: {
        src?: string;
        alt?: string;
        width?: string | number;
        height?: string | number;
      }) => {
        if (!src || !width || !height) return <img src={src} alt={alt} />;
        return (
          <ProgressiveImage
            placeholderSrc={src.replace(/-full\.webp$/, '-placeholder.webp')}
            src={src}
            alt={alt ?? ''}
            width={Number(width)}
            height={Number(height)}
            className='construct-body-img'
          />
        );
      },
      a: ({
        href,
        children: linkChildren,
        ...rest
      }: AnchorHTMLAttributes<HTMLAnchorElement> & {
        children?: ReactNode;
      }) => {
        const external = href?.startsWith('http');
        if (external) {
          return (
            <a href={href} target='_blank' rel='noopener noreferrer' {...rest}>
              {linkChildren}
            </a>
          );
        }
        return (
          <a href={href} {...rest}>
            {linkChildren}
          </a>
        );
      },
    }}
  >
    {children}
  </Markdown>
);

export { MarkdownBody };
