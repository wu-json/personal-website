import { useCallback, useEffect, useState } from 'react';
import { Sidebar } from 'src/components/Sidebar';

const PETAL_ANGLES = [0, 72, 144, 216, 288];

const OPEN_TRANSFORMS: { transform: string; opacity: number; delay: number }[] =
  [
    {
      transform: 'rotate(45deg) scaleX(0.4) scaleY(1.27)',
      opacity: 0.9,
      delay: 0,
    },
    {
      transform: 'rotate(135deg) scaleX(0.4) scaleY(1.27)',
      opacity: 0.9,
      delay: 40,
    },
    {
      transform: 'rotate(225deg) scaleX(0.4) scaleY(1.27)',
      opacity: 0.9,
      delay: 80,
    },
    { transform: 'scale(0)', opacity: 0, delay: 0 },
    {
      transform: 'rotate(315deg) scaleX(0.4) scaleY(1.27)',
      opacity: 0.9,
      delay: 40,
    },
  ];

const MenuToggle = ({
  open,
  onClick,
}: {
  open: boolean;
  onClick: () => void;
}) => (
  <button
    type='button'
    onClick={onClick}
    aria-label={open ? 'Close menu' : 'Open menu'}
    className='fixed top-4 right-4 z-[60] flex justify-center items-center w-8 h-8 md:hidden'
  >
    <svg
      width='22'
      height='22'
      viewBox='0 0 100 100'
      fill='none'
      className={`menu-flower ${open ? '' : 'menu-flower-glow'}`}
    >
      {PETAL_ANGLES.map((angle, i) => {
        const o = OPEN_TRANSFORMS[i];
        return (
          <ellipse
            key={angle}
            cx='50'
            cy='22'
            rx='10'
            ry='22'
            fill='white'
            className='menu-petal'
            style={{
              transform: open ? o.transform : `rotate(${angle}deg)`,
              opacity: open ? o.opacity : 0.85,
              transitionDelay: open ? `${o.delay}ms` : '0ms',
            }}
          />
        );
      })}
      <circle
        cx='50'
        cy='50'
        r='8'
        fill='white'
        className='menu-center'
        style={{
          transform: open ? 'scale(0)' : 'scale(1)',
          opacity: open ? 0 : 1,
        }}
      />
    </svg>
  </button>
);

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);
  const toggleMobileMenu = useCallback(
    () => setIsMobileMenuOpen(prev => !prev),
    [],
  );

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  return (
    <div className='flex h-full w-full overflow-hidden'>
      <Sidebar isMobileOpen={isMobileMenuOpen} onClose={closeMobileMenu} />
      <MenuToggle open={isMobileMenuOpen} onClick={toggleMobileMenu} />
      <main className='flex-1 min-w-0 overflow-y-auto'>{children}</main>
    </div>
  );
};

export { RootLayout };
