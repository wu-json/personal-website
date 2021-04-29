import PokeEthLogo from 'src/assets/logos/poke-eth.png';

import { Project } from './types';

const PROJECTS: Project[] = [
    {
        logo: {
            src: PokeEthLogo,
            alt: 'poke-eth-logo'
        },
        projectName: 'poké-eth',
        desc: 'pokemon on the ethereum blockchain',
        href: 'https://github.com/poke-eth'
    }
];

export { PROJECTS };
