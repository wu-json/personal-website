import { Outlet } from 'react-router';
import { Sidebar } from 'src/components/Sidebar';

const RootLayout = () => (
  <div className='flex h-full w-full'>
    <Sidebar />
    <main className='flex-1 min-w-0'>
      <Outlet />
    </main>
  </div>
);

export { RootLayout };
