import { notFound } from 'next/navigation';

import GalleryClient from './GalleryClient';

const Page = () => {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <GalleryClient />;
};

export default Page;
