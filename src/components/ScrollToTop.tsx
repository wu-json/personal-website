import { type RefObject, useEffect, useRef, useState } from 'react';

const ScrollToTop = ({
  scrollRef,
}: {
  scrollRef: RefObject<HTMLElement | null>;
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isScrollable, setIsScrollable] = useState(false);
  const [scrollingDown, setScrollingDown] = useState(false);
  const lastScrollTop = useRef(0);
  const stopTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const checkScrollable = () => {
      setIsScrollable(el.scrollHeight > el.clientHeight);
    };

    const onScroll = () => {
      clearTimeout(stopTimer.current);

      const st = el.scrollTop;

      if (st > lastScrollTop.current + 3) {
        setScrollingDown(true);
      } else if (st < lastScrollTop.current - 3) {
        setScrollingDown(false);
      }

      stopTimer.current = setTimeout(() => {
        setScrollingDown(false);
      }, 400);

      setIsScrolled(st > 100);
      checkScrollable();
      lastScrollTop.current = st;
    };

    el.addEventListener('scroll', onScroll, { passive: true });

    const ro = new ResizeObserver(checkScrollable);
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
      clearTimeout(stopTimer.current);
    };
  }, [scrollRef]);

  const visible = isScrolled && isScrollable && !scrollingDown;

  return (
    <button
      type='button'
      aria-label='Scroll to top'
      className={`scroll-to-top fixed bottom-4 right-4 z-50 w-10 h-10 flex items-center justify-center rounded-full cursor-pointer transition-all duration-300 ${
        visible
          ? 'opacity-60 pointer-events-auto hover:opacity-100'
          : 'opacity-0 pointer-events-none'
      }`}
      onClick={() => {
        scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }}
    >
      <span className='font-pixel text-white text-2xl leading-none select-none'>
        ^
      </span>
    </button>
  );
};

export { ScrollToTop };
