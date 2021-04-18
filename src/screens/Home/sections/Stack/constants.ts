import ApolloLogo from 'src/assets/logos/apollo.png';
import GraphQLLogo from 'src/assets/logos/graphql.png';
import NodeLogo from 'src/assets/logos/node.png';
import PostgresLogo from 'src/assets/logos/postgres.png';
import ReactLogo from 'src/assets/logos/react.png';
import TypeScriptLogo from 'src/assets/logos/typescript.png';

import { StackTool } from './types';

const STACK: StackTool[] = [
    {
        logo: {
            src: TypeScriptLogo,
            alt: 'typescript-logo'
        },
        href: 'https://www.typescriptlang.org/'
    },
    {
        logo: {
            src: ReactLogo,
            alt: 'react-logo'
        },
        href: 'https://reactjs.org'
    },
    {
        logo: {
            src: GraphQLLogo,
            alt: 'graphql-logo'
        },
        href: 'https://graphql.org'
    },
    {
        logo: {
            src: ApolloLogo,
            alt: 'apollo-logo'
        },
        href: 'https://apollographql.com'
    },
    {
        logo: {
            src: PostgresLogo,
            alt: 'postgres-logo'
        },
        href: 'https://postgresql.org'
    },
    {
        logo: {
            src: NodeLogo,
            alt: 'node-logo'
        },
        href: 'https://nodejs.org'
    }
];

export { STACK };
