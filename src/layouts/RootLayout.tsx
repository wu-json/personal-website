import { useCallback, useEffect, useState } from 'react';
import { Sidebar } from 'src/components/Sidebar';

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
    className='fixed top-4 right-4 z-[60] flex flex-col justify-center items-center w-8 h-8 gap-1.5 md:hidden'
  >
    <span
      className={`block h-px w-5 bg-white transition-transform duration-300 ${open ? 'translate-y-[3.5px] rotate-45' : ''}`}
    />
    <span
      className={`block h-px w-5 bg-white transition-transform duration-300 ${open ? '-translate-y-[3.5px] -rotate-45' : ''}`}
    />
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
    <div className='flex h-full w-full'>
      <Sidebar isMobileOpen={isMobileMenuOpen} onClose={closeMobileMenu} />
      <MenuToggle open={isMobileMenuOpen} onClick={toggleMobileMenu} />
      <main className='flex-1 min-w-0'>{children}</main>
    </div>
  );
};

export { RootLayout };
