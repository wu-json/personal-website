import { notFound } from 'next/navigation';
import { getSignals } from 'src/lib/content/signals';
import { SignalDetail } from 'src/screens/Signals/SignalDetail';

type Params = { id: string };

const Page = async ({ params }: { params: Promise<Params> }) => {
  const { id } = await params;
  const signal = getSignals().find(s => s.id === id);
  if (!signal) notFound();
  return <SignalDetail signal={signal} />;
};

export default Page;
