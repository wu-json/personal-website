import { getHeroes } from 'src/lib/content/heroes';
import { HeroesScreen } from 'src/screens/Heroes';

const Page = () => <HeroesScreen heroes={getHeroes()} />;

export default Page;
