import ApolloLogo from 'src/assets/logos/apollo.png';
import GraphQLLogo from 'src/assets/logos/graphql.png';
import NodeLogo from 'src/assets/logos/node.png';
import PostgresLogo from 'src/assets/logos/postgres.png';
import ReactLogo from 'src/assets/logos/react.png';
import TypeScriptLogo from 'src/assets/logos/typescript.png';
import { Image } from 'src/lib/types';

const STACK_LOGOS: Image[] = [
    {
        src: TypeScriptLogo,
        alt: 'typescript-logo'
    },
    {
        src: ReactLogo,
        alt: 'react-logo'
    },
    {
        src: GraphQLLogo,
        alt: 'graphql-logo'
    },
    {
        src: ApolloLogo,
        alt: 'apollo-logo'
    },
    {
        src: PostgresLogo,
        alt: 'postgres-logo'
    },
    {
        src: NodeLogo,
        alt: 'node-logo'
    }
];

export { STACK_LOGOS };
