import { getFragments } from 'src/lib/content/fragments';

import GalleryClient from '../GalleryClient';

type Params = { fragmentId: string };

const Page = async ({ params }: { params: Promise<Params> }) => {
  const { fragmentId } = await params;
  const fragment = getFragments().find(f => f.id === fragmentId) ?? null;
  return <GalleryClient fragment={fragment} />;
};

export default Page;
