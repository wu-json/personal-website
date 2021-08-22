import AmazonLogo from 'src/assets/logos/amazon.jpeg';
import AtomFinanceLogo from 'src/assets/logos/atomFinance.png';
import SnackpassLogo from 'src/assets/logos/snackpass.png';

import { Job } from './types';

const JOBS: Job[] = [
    {
        logo: {
            src: AtomFinanceLogo,
            alt: 'atom-finance-logo'
        },
        companyName: 'atom finance',
        title: 'software engineer',
        duration: 'fall 2021 - present',
        href: 'https://atom.finance/'
    },
    {
        logo: {
            src: AmazonLogo,
            alt: 'amazon-logo'
        },
        companyName: 'amazon',
        title: 'software engineer',
        duration: 'summer 2021',
        href: 'https://aws.amazon.com/'
    },
    {
        logo: {
            src: SnackpassLogo,
            alt: 'snackpass-logo'
        },
        companyName: 'snackpass',
        title: 'software engineer',
        duration: 'may 2020 - may 2021',
        href: 'https://partners.snackpass.co/'
    }
];

export { JOBS };
