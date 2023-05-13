import PathogenLogo from 'src/assets/logos/pathogen.png';
import VailableLogo from 'src/assets/logos/vailable.png';

import { Project } from './types';

const PROJECTS: Project[] = [
  {
    logo: {
      src: VailableLogo,
      alt: 'vailable-logo',
    },
    projectName: 'vailable',
    desc: 'fast scheduling tool for meetings',
    href: 'https://vailable.io',
  },
  {
    logo: {
      src: PathogenLogo,
      alt: 'pathogen-logo',
    },
    projectName: 'pathogen',
    desc: 'solana dApp for public health',
    href: 'https://pathogen.jasonwu.io',
  },
];

export { PROJECTS };
