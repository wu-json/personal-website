import type { Metadata, Viewport } from 'next';

import { AppProviders } from 'src/app-providers';

import './globals.css';

const themeBootstrap = `(function () {
  try {
    var q = new URLSearchParams(window.location.search).get('theme');
    var t = q === 'light' || q === 'dark' ? q : localStorage.getItem('theme');
    if (t !== 'light' && t !== 'dark') t = 'light';
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('theme', t); } catch (_) {}
  } catch (_) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();`;

export const metadata: Metadata = {
  metadataBase: new URL('https://jasonwu.ink'),
  title: 'Jason Cui Wu',
  description: 'Paint the world in ink.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    siteName: 'Jason Cui Wu',
    title: 'Jason Cui Wu',
    description: 'Paint the world in ink.',
    url: 'https://jasonwu.ink/',
    images: [
      {
        url: 'https://jasonwu.ink/images/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Jason Cui Wu — Paint the world in ink.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Jason Cui Wu',
    description: 'Paint the world in ink.',
    images: [
      {
        url: 'https://jasonwu.ink/images/og-image.png',
        alt: 'Jason Cui Wu — Paint the world in ink.',
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang='en' suppressHydrationWarning>
    <head>
      <link
        rel='preload'
        href='/fonts/geist-latin-wght-normal.woff2'
        as='font'
        type='font/woff2'
        crossOrigin=''
      />
      <link
        rel='preload'
        href='/fonts/geist-mono-latin-wght-normal.woff2'
        as='font'
        type='font/woff2'
        crossOrigin=''
      />
      <link
        rel='preload'
        href='/fonts/GeistPixel-Circle.woff2'
        as='font'
        type='font/woff2'
        crossOrigin=''
      />
      <link
        rel='preload'
        href='/images/mirror.webp'
        as='image'
        type='image/webp'
      />
      <link
        rel='alternate'
        type='application/rss+xml'
        title='Jason Wu — Signals'
        href='/signals/feed.xml'
      />
      <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
    </head>
    <body>
      <noscript>You need to enable JavaScript to run this app.</noscript>
      <AppProviders>{children}</AppProviders>
    </body>
  </html>
);

export default RootLayout;
