import { getFragments } from 'src/lib/content/fragments';
import { MemoriesScreen } from 'src/screens/Memories';

const Page = () => <MemoriesScreen fragments={getFragments()} />;

export default Page;
