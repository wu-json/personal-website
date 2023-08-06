import ArimaLogo from 'src/assets/logos/arima.gif';
import M1Logo from 'src/assets/logos/m1.png';
import PathogenLogo from 'src/assets/logos/pathogen.png';
import VailableLogo from 'src/assets/logos/vailable.png';

import { Project } from './types';

const PROJECTS: Project[] = [
  {
    logo: {
      src: ArimaLogo,
      alt: 'oshi-chan-logo',
    },
    projectName: 'oshi-chan',
    desc: 'discord bot for new aniwave release notifications with rust',
    href: 'https://github.com/wu-json/oshi-chan',
  },
  {
    logo: {
      src: M1Logo,
      alt: 'm1-finance-data-viz-logo',
    },
    projectName: 'm1 finance data viz',
    desc: 'm1 finance data visualizer with grafana + go',
    href: 'https://github.com/wu-json/m1-finance-grafana',
  },
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
