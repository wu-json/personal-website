import { getSignals } from 'src/lib/content/signals';
import { SignalsScreen } from 'src/screens/Signals';

const Page = () => <SignalsScreen signals={getSignals()} />;

export default Page;
