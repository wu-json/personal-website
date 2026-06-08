import { RootLayout } from 'src/layouts/RootLayout';

const SiteLayout = ({ children }: { children: React.ReactNode }) => (
  <RootLayout>{children}</RootLayout>
);

export default SiteLayout;
