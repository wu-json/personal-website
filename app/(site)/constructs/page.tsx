import { getConstructs } from 'src/lib/content/constructs';
import { ConstructsScreen } from 'src/screens/Constructs';

const Page = () => <ConstructsScreen constructs={getConstructs()} />;

export default Page;
