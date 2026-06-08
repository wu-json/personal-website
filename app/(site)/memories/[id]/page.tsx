import { notFound } from 'next/navigation';
import { getFragments } from 'src/lib/content/fragments';
import { FragmentDetail } from 'src/screens/Memories/FragmentDetail';

type Params = { id: string };

const Page = async ({ params }: { params: Promise<Params> }) => {
  const { id } = await params;
  const fragment = getFragments().find(f => f.id === id);
  if (!fragment) notFound();
  return <FragmentDetail fragment={fragment} />;
};

export default Page;
