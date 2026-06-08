import { notFound } from 'next/navigation';
import { getConstructs } from 'src/lib/content/constructs';
import { ConstructDetail } from 'src/screens/Constructs/ConstructDetail';

type Params = { id: string };

const Page = async ({ params }: { params: Promise<Params> }) => {
  const { id } = await params;
  const construct = getConstructs().find(c => c.id === id);
  if (!construct) notFound();
  return <ConstructDetail construct={construct} />;
};

export default Page;
