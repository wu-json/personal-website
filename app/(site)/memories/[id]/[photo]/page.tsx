import { notFound } from 'next/navigation';
import { getFragments } from 'src/lib/content/fragments';
import { FragmentDetail } from 'src/screens/Memories/FragmentDetail';

type Params = { id: string; photo: string };

const Page = async ({ params }: { params: Promise<Params> }) => {
  const { id, photo } = await params;
  const fragment = getFragments().find(f => f.id === id);
  if (!fragment) notFound();
  return <FragmentDetail fragment={fragment} photo={photo} />;
};

export default Page;
