import AmazonLogo from 'src/assets/logos/amazon.jpeg';
import AtomFinanceLogo from 'src/assets/logos/atomFinance.png';
import FizzLogo from 'src/assets/logos/fizz.jpg';
import RutterLogo from 'src/assets/logos/rutter.jpeg';
import SnackpassLogo from 'src/assets/logos/snackpass.jpeg';

import { Job } from './types';

const JOBS: Job[] = [
  {
    logo: {
      src: FizzLogo,
      alt: 'fizz-logo',
    },
    companyName: 'fizz',
    title: 'software engineer',
    duration: 'feb 2024 - present',
    href: 'https://joinfizz.com/',
  },
  {
    logo: {
      src: SnackpassLogo,
      alt: 'snackpass-logo',
    },
    companyName: 'snackpass',
    title: 'software engineer',
    duration: 'may 2022 - feb 2024',
    href: 'https://partners.snackpass.co/',
  },
  {
    logo: {
      src: AtomFinanceLogo,
      alt: 'atom-finance-logo',
    },
    companyName: 'atom finance',
    title: 'software engineer',
    duration: 'aug 2021 - may 2022',
    href: 'https://atom.finance/',
  },
  {
    logo: {
      src: RutterLogo,
      alt: 'rutter-logo',
    },
    companyName: 'rutter',
    title: 'software engineer',
    duration: 'nov 2021 - april 2022',
    href: 'https://www.rutterapi.com/',
  },
  {
    logo: {
      src: AmazonLogo,
      alt: 'amazon-logo',
    },
    companyName: 'amazon',
    title: 'software engineer',
    duration: 'summer 2021',
    href: 'https://aws.amazon.com/',
  },
];

export { JOBS };
