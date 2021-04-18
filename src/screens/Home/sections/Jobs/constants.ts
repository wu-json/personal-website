import AmazonIcon from 'src/assets/logos/amazon.jpeg';
import SnackpassIcon from 'src/assets/logos/snackpass.png';

import { Job } from './types';

const JOBS: Job[] = [
    {
        logo: {
            src: AmazonIcon,
            alt: 'amazon-logo'
        },
        companyName: 'amazon',
        title: 'software engineer',
        duration: 'summer 2021',
        href: 'https://aws.amazon.com/'
    },
    {
        logo: {
            src: SnackpassIcon,
            alt: 'snackpass-logo'
        },
        companyName: 'snackpass',
        title: 'software engineer',
        duration: 'may 2020 - may 2021',
        href: 'https://partners.snackpass.co/'
    }
];

export { JOBS };
