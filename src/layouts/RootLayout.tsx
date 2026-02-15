import { Sidebar } from 'src/components/Sidebar';

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <div className='flex h-full w-full'>
    <Sidebar />
    <main className='flex-1 min-w-0'>{children}</main>
  </div>
);

export { RootLayout };
