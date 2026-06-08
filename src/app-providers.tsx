'use client';

import { ThemeProvider } from 'src/theme/ThemeContext';

const AppProviders = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

export { AppProviders };
