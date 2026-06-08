import { notFound } from 'next/navigation';
import { getHeroes } from 'src/lib/content/heroes';
import { HeroDetail } from 'src/screens/Heroes/HeroDetail';

type Params = { id: string };

const Page = async ({ params }: { params: Promise<Params> }) => {
  const { id } = await params;
  const hero = getHeroes().find(h => h.id === id);
  if (!hero) notFound();
  return <HeroDetail hero={hero} />;
};

export default Page;
