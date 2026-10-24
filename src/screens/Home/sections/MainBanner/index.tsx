import {
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useJitter } from 'src/hooks/useJitter';

import { SpiderLily } from '../../SpiderLily';
import { LinearMark } from './LinearMark';

const linkClass =
  'font-mono text-xs uppercase tracking-widest text-white/50 hover:text-white hover:[text-shadow:0_0_6px_rgba(255,255,255,0.3)] transition-all duration-300';

const bioClass =
  'bio-glitch text-white text-sm font-pixel text-left leading-relaxed';

const HOLD_DELAY = 250;

const isKeyboardFocus = (el: Element) => {
  try {
    return el.matches(':focus-visible');
  } catch {
    return true;
  }
};

const MainBanner = () => {
  const jitter = useJitter();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [held, setHeld] = useState(false);
  const [morphed, setMorphed] = useState(false);
  const holdTimer = useRef<number | undefined>(undefined);
  const touchPressing = useRef(false);
  const holdTriggered = useRef(false);
  const showingLinear = hovered || focused || held;
  const morph = showingLinear ? 'linear' : morphed ? 'lily' : undefined;
  const onPointerEnter = (e: PointerEvent<HTMLAnchorElement>) => {
    if (e.pointerType === 'touch') return;
    setHovered(true);
    setMorphed(true);
  };
  const onPointerDown = (e: PointerEvent<HTMLAnchorElement>) => {
    holdTriggered.current = false;
    if (e.pointerType !== 'touch') return;
    touchPressing.current = true;
    window.clearTimeout(holdTimer.current);
    holdTimer.current = window.setTimeout(() => {
      holdTriggered.current = true;
      setHeld(true);
      setMorphed(true);
    }, HOLD_DELAY);
  };
  const endHold = () => {
    touchPressing.current = false;
    window.clearTimeout(holdTimer.current);
    setHeld(false);
  };
  const cancelHold = () => {
    endHold();
    holdTriggered.current = false;
  };
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    const suppress = holdTriggered.current && e.detail !== 0;
    holdTriggered.current = false;
    if (!suppress) return;
    e.preventDefault();
  };
  const onContextMenu = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!touchPressing.current) return;
    e.preventDefault();
  };
  useEffect(() => () => window.clearTimeout(holdTimer.current), []);
  const onFocus = (e: FocusEvent<HTMLAnchorElement>) => {
    if (!isKeyboardFocus(e.currentTarget)) return;
    setFocused(true);
    setMorphed(true);
  };
  return (
    <div className='w-full h-dvh bg-black flex items-center justify-center md:pr-40'>
      <div className='flex flex-col items-start gap-6 md:gap-8 max-w-md lg:max-w-lg px-6'>
        <div
          className='bio-glitch w-80 sm:w-88 md:w-[26rem] lg:w-[30rem]'
          style={jitter()}
        >
          <div
            className='spider-lily-container lily-morph w-full h-auto'
            data-morph={morph}
          >
            <SpiderLily
              className='lily-morph-flower w-full h-auto'
              paused={showingLinear}
            />
            <LinearMark />
          </div>
        </div>
        <div className='flex flex-col gap-4'>
          <p
            className='bio-glitch text-white text-base font-pixel text-left leading-relaxed [text-shadow:0_0_8px_rgba(255,255,255,0.4)]'
            style={jitter()}
          >
            {'[咲いて、枯れて]'}
          </p>
          <div className='flex flex-col gap-2.5'>
            <p className={bioClass} style={jitter()}>
              Drawing software @
              <a
                href='https://linear.app'
                target='_blank'
                rel='noopener noreferrer'
                onPointerEnter={onPointerEnter}
                onPointerLeave={() => setHovered(false)}
                onPointerDown={onPointerDown}
                onPointerUp={endHold}
                onPointerCancel={cancelHold}
                onClick={onClick}
                onContextMenu={onContextMenu}
                onFocus={onFocus}
                onBlur={() => setFocused(false)}
                className='select-none [-webkit-touch-callout:none] hover:[text-shadow:0_0_6px_rgba(255,255,255,0.5)] transition-all duration-300'
              >
                Linear
              </a>
            </p>
            <p className={bioClass} style={jitter()}>
              Yale 2022. Based in SF & SEA.
            </p>
            <p className={bioClass} style={jitter()}>
              I also dance and capture humans + landscapes in time.
            </p>
          </div>
        </div>
        <div
          className='bio-glitch flex flex-wrap items-center gap-x-3 gap-y-2'
          style={jitter()}
        >
          <a
            href='https://x.com/jasonwuink'
            target='_blank'
            rel='noopener noreferrer'
            className={linkClass}
          >
            X
          </a>
          <span className='text-white/20 text-xs'>/</span>
          <a
            href='https://www.instagram.com/jasoncuiwu/'
            target='_blank'
            rel='noopener noreferrer'
            className={linkClass}
          >
            IG
          </a>
          <span className='text-white/20 text-xs'>/</span>
          <a
            href='https://github.com/wu-json'
            target='_blank'
            rel='noopener noreferrer'
            className={linkClass}
          >
            GitHub
          </a>
        </div>
      </div>
    </div>
  );
};

export { MainBanner };
