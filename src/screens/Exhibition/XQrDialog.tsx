import { type MouseEvent, useEffect, useRef } from 'react';

const X_HANDLE = '@jasonwuink';
const X_URL = 'https://x.com/jasonwuink';
const X_LOGO_PATH =
  'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z';

const QR_SIZE = 25;
const QR_QUIET_ZONE = 2;
const QR_PATH =
  'M0 0h7v1h-7zM9 0h1v1h-1zM11 0h1v1h-1zM13 0h1v1h-1zM16 0h1v1h-1zM18 0h7v1h-7zM0 1h1v1h-1zM6 1h1v1h-1zM10 1h1v1h-1zM13 1h4v1h-4zM18 1h1v1h-1zM24 1h1v1h-1zM0 2h1v1h-1zM2 2h3v1h-3zM6 2h1v1h-1zM8 2h2v1h-2zM12 2h1v1h-1zM14 2h1v1h-1zM18 2h1v1h-1zM20 2h3v1h-3zM24 2h1v1h-1zM0 3h1v1h-1zM2 3h3v1h-3zM6 3h1v1h-1zM8 3h1v1h-1zM10 3h1v1h-1zM12 3h5v1h-5zM18 3h1v1h-1zM20 3h3v1h-3zM24 3h1v1h-1zM0 4h1v1h-1zM2 4h3v1h-3zM6 4h1v1h-1zM8 4h1v1h-1zM13 4h1v1h-1zM16 4h1v1h-1zM18 4h1v1h-1zM20 4h3v1h-3zM24 4h1v1h-1zM0 5h1v1h-1zM6 5h1v1h-1zM8 5h3v1h-3zM12 5h5v1h-5zM18 5h1v1h-1zM24 5h1v1h-1zM0 6h7v1h-7zM8 6h1v1h-1zM10 6h1v1h-1zM12 6h1v1h-1zM14 6h1v1h-1zM16 6h1v1h-1zM18 6h7v1h-7zM8 7h2v1h-2zM11 7h1v1h-1zM15 7h1v1h-1zM0 8h1v1h-1zM2 8h5v1h-5zM9 8h2v1h-2zM13 8h3v1h-3zM18 8h5v1h-5zM0 9h3v1h-3zM7 9h3v1h-3zM11 9h1v1h-1zM14 9h1v1h-1zM16 9h1v1h-1zM23 9h1v1h-1zM0 10h2v1h-2zM3 10h2v1h-2zM6 10h2v1h-2zM9 10h2v1h-2zM12 10h4v1h-4zM17 10h1v1h-1zM21 10h1v1h-1zM23 10h2v1h-2zM2 11h3v1h-3zM9 11h3v1h-3zM14 11h1v1h-1zM20 11h1v1h-1zM24 11h1v1h-1zM0 12h1v1h-1zM5 12h4v1h-4zM10 12h1v1h-1zM13 12h2v1h-2zM17 12h4v1h-4zM22 12h3v1h-3zM0 13h1v1h-1zM2 13h2v1h-2zM5 13h1v1h-1zM7 13h1v1h-1zM12 13h1v1h-1zM14 13h1v1h-1zM16 13h1v1h-1zM19 13h1v1h-1zM21 13h1v1h-1zM23 13h1v1h-1zM0 14h1v1h-1zM2 14h1v1h-1zM6 14h5v1h-5zM14 14h3v1h-3zM18 14h4v1h-4zM23 14h2v1h-2zM0 15h1v1h-1zM2 15h1v1h-1zM7 15h4v1h-4zM12 15h1v1h-1zM14 15h1v1h-1zM16 15h2v1h-2zM19 15h2v1h-2zM24 15h1v1h-1zM0 16h1v1h-1zM2 16h1v1h-1zM4 16h6v1h-6zM12 16h3v1h-3zM16 16h5v1h-5zM22 16h1v1h-1zM8 17h3v1h-3zM13 17h1v1h-1zM15 17h2v1h-2zM20 17h2v1h-2zM0 18h7v1h-7zM11 18h2v1h-2zM16 18h1v1h-1zM18 18h1v1h-1zM20 18h1v1h-1zM22 18h3v1h-3zM0 19h1v1h-1zM6 19h1v1h-1zM8 19h2v1h-2zM11 19h1v1h-1zM14 19h3v1h-3zM20 19h2v1h-2zM24 19h1v1h-1zM0 20h1v1h-1zM2 20h3v1h-3zM6 20h1v1h-1zM8 20h1v1h-1zM11 20h10v1h-10zM22 20h1v1h-1zM0 21h1v1h-1zM2 21h3v1h-3zM6 21h1v1h-1zM8 21h3v1h-3zM12 21h2v1h-2zM17 21h2v1h-2zM20 21h5v1h-5zM0 22h1v1h-1zM2 22h3v1h-3zM6 22h1v1h-1zM8 22h2v1h-2zM13 22h2v1h-2zM16 22h1v1h-1zM21 22h2v1h-2zM24 22h1v1h-1zM0 23h1v1h-1zM6 23h1v1h-1zM9 23h1v1h-1zM11 23h2v1h-2zM15 23h3v1h-3zM19 23h3v1h-3zM24 23h1v1h-1zM0 24h7v1h-7zM8 24h2v1h-2zM11 24h4v1h-4zM17 24h1v1h-1zM19 24h6v1h-6z';

const XLogo = ({ className }: { className?: string }) => (
  <svg
    viewBox='0 0 24 24'
    fill='currentColor'
    aria-hidden='true'
    className={className}
  >
    <path d={X_LOGO_PATH} />
  </svg>
);

const XQrDialog = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const onBackdropClick = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const viewBox = QR_SIZE + QR_QUIET_ZONE * 2;

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      aria-label={`${X_HANDLE} on X`}
      onClose={onClose}
      onClick={onBackdropClick}
      className='exhibition-dialog'
    >
      <div className='relative flex flex-col items-center gap-6 px-10 pt-14 pb-10 sm:px-12'>
        <button
          type='button'
          onClick={onClose}
          aria-label='Close'
          className='absolute top-3 right-3 flex h-8 w-8 cursor-pointer items-center justify-center text-[var(--color-ink-faint)] outline-none transition-colors duration-300 hover:text-[var(--color-ink)] focus-visible:text-[var(--color-ink)]'
        >
          <svg
            viewBox='0 0 12 12'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.25'
            aria-hidden='true'
            className='h-3 w-3'
          >
            <path d='M1 1l10 10M11 1L1 11' />
          </svg>
        </button>
        <svg
          viewBox={`0 0 ${viewBox} ${viewBox}`}
          role='img'
          aria-label={`QR code for ${X_URL}`}
          shapeRendering='crispEdges'
          className='h-56 w-56 bg-white sm:h-64 sm:w-64'
        >
          <path
            d={QR_PATH}
            fill='#000'
            transform={`translate(${QR_QUIET_ZONE} ${QR_QUIET_ZONE})`}
          />
        </svg>
        <p className='flex items-center gap-2.5 font-mono text-xl font-bold text-[var(--color-ink)]'>
          <XLogo className='h-[0.8em] w-[0.8em]' />
          <span>{X_HANDLE}</span>
        </p>
      </div>
    </dialog>
  );
};

export { X_HANDLE, XLogo, XQrDialog };
