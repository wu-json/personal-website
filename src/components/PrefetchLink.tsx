import type { ComponentProps, FC } from 'react';

import { type RouteKey, prefetchRoute } from 'src/lib/prefetchRoute';
import { Link } from 'wouter';

/**
 * Wouter's `LinkProps` type doesn't surface DOM event handlers, but
 * the component implementation spreads `restProps` onto the rendered
 * `<a>` (verified in wouter source) — so `onMouseEnter` / `onFocus` /
 * `onTouchStart` pass through at runtime. Retype `Link` here to accept
 * those handlers explicitly without losing the rest of its props.
 */
type LinkProps = ComponentProps<typeof Link> & {
  onMouseEnter?: React.MouseEventHandler;
  onFocus?: React.FocusEventHandler;
  onTouchStart?: React.TouchEventHandler;
};
const TypedLink = Link as FC<LinkProps>;

type Props = LinkProps & { prefetch?: RouteKey };

/**
 * Drop-in replacement for wouter's `<Link>` that warms the target
 * route's chunk on hover / focus / touchstart.
 *
 * `onTouchStart` is the mobile equivalent of hover: it fires at
 * touch-down, ~100–200 ms before `click` resolves — enough to cover
 * one 4G roundtrip for a small detail chunk. Together with the idle
 * warmup in `<RoutePrefetcher />`, this eliminates the cold-chunk
 * flash that route-level `lazy()` splitting otherwise introduces.
 *
 * Behavior is identical to `<Link>` when `prefetch` is omitted.
 */
const PrefetchLink = ({ prefetch, ...rest }: Props) => {
  const onIntent = prefetch ? () => prefetchRoute(prefetch) : undefined;
  return (
    <TypedLink
      {...rest}
      onMouseEnter={onIntent}
      onFocus={onIntent}
      onTouchStart={onIntent}
    />
  );
};

export { PrefetchLink };
