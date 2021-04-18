import VailableLogo from 'src/assets/logos/vailable.png';

import { Project } from './types';

const PROJECTS: Project[] = [
    {
        logo: {
            src: VailableLogo,
            alt: 'vailable-logo'
        },
        projectName: 'vailable',
        desc: 'fast scheduling tool for meetings',
        href: 'https://vailable.io'
    }
];

export { PROJECTS };
