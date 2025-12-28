import EmailIcon from 'src/assets/icons/socials/email.png';
import GitHubIcon from 'src/assets/icons/socials/github.png';
import LinkedInIcon from 'src/assets/icons/socials/linkedin.png';

import type { Image } from 'src/lib/types';

export type Social = {
  icon: Image;
  href: string;
};

const SOCIALS: Social[] = [
  {
    icon: {
      src: LinkedInIcon,
      alt: 'linkedin',
    },
    href: 'https://linkedin.com/in/wu-json',
  },
  {
    icon: {
      src: GitHubIcon,
      alt: 'github',
    },
    href: 'https://github.com/wu-json',
  },
  {
    icon: {
      src: EmailIcon,
      alt: 'email',
    },
    href: 'mailto:thedarkpear@proton.me',
  },
];

export { SOCIALS };
