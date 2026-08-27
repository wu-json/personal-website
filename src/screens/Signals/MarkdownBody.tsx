/**
 * Single markdown pipeline for every signal body (detail + full list rows).
 *
 * Extend here only — do not fork another Markdown + remark stack for Signals.
 * - remark-gfm: tables, footnotes [^id], etc.
 * - rehype-raw: <img> with dimensions for ProgressiveImage; <iframe> for
 *   responsive 16:9 video embeds (use youtube-nocookie.com embed URLs)
 * - Footnote block styling: `.signal-prose section[data-footnotes]` in index.css
 *
 * @see AGENTS.md → "Signals markdown reference"
 */
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import Markdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

import { ProgressiveImage } from '../../components/ProgressiveImage';

const MarkdownBody = ({ children }: { children: string }) => (
  <Markdown
    remarkPlugins={[remarkGfm]}
    rehypePlugins={[rehypeRaw]}
    components={{
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
        const placeholderSrc = src.replace(/-full\.webp$/, '-placeholder.webp');
        const smallSrc = src.replace(/-full\.webp$/, '-small.webp');
        const thumbSrc = src.replace(/-full\.webp$/, '-thumb.webp');
        return (
          <ProgressiveImage
            placeholderSrc={placeholderSrc}
            src={thumbSrc}
            srcSet={`${smallSrc} 480w, ${thumbSrc} 800w, ${src} 1600w`}
            sizes='(min-width: 768px) 672px, 100vw'
            alt={alt ?? ''}
            width={Number(width)}
            height={Number(height)}
            className='construct-body-img'
          />
        );
      },
      iframe: ({ src, title }: { src?: string; title?: string }) => (
        <iframe
          src={src}
          title={title}
          className='aspect-video w-full rounded-sm border border-white/5 !my-3'
          allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
          referrerPolicy='strict-origin-when-cross-origin'
          allowFullScreen
          loading='lazy'
        />
      ),
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
