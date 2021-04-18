import EmailIcon from 'src/assets/icons/socials/email.png';
import GitHubIcon from 'src/assets/icons/socials/github.png';
import LinkedInIcon from 'src/assets/icons/socials/linkedin.png';
import TwitterIcon from 'src/assets/icons/socials/twitter.png';

import { Social } from './types';

const SOCIALS: Social[] = [
    {
        icon: {
            src: TwitterIcon,
            alt: 'twitter'
        },
        href: 'https://twitter.com/wu_json'
    },
    {
        icon: {
            src: LinkedInIcon,
            alt: 'linkedin'
        },
        href: 'https://www.linkedin.com/in/jwu215/'
    },
    {
        icon: {
            src: GitHubIcon,
            alt: 'github'
        },
        href: 'https://github.com/jasonwu2153'
    },
    {
        icon: {
            src: EmailIcon,
            alt: 'email'
        },
        href: 'mailto:jason.c.wu@yale.edu'
    }
];

export { SOCIALS };
