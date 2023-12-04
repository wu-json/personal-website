import ReactLogo from 'src/assets/logos/react.png';
import TypeScriptLogo from 'src/assets/logos/typescript.png';
import RustLogo from 'src/assets/logos/rust.png';
import FlyIoLogo from 'src/assets/logos/flyio.png';

import { StackTool } from './types';

const STACK: StackTool[] = [
  {
    logo: {
      src: RustLogo,
      alt: 'rust-logo',
    },
    href: 'https://www.rust-lang.org/',
  },
  {
    logo: {
      src: FlyIoLogo,
      alt: 'flyio-logo',
    },
    href: 'https://fly.io/',
  },
  {
    logo: {
      src: TypeScriptLogo,
      alt: 'typescript-logo',
    },
    href: 'https://www.typescriptlang.org/',
  },
  {
    logo: {
      src: ReactLogo,
      alt: 'react-logo',
    },
    href: 'https://reactjs.org',
  },
];

export { STACK };
