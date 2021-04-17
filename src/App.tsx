import { ChakraProvider } from '@chakra-ui/react';
import '@fontsource/poppins/200.css';
import { theme } from 'src/styles/theme';

import { Navigation } from './Navigation';
import { history } from './lib/history';

const App = () => (
    <ChakraProvider theme={theme}>
        <Navigation history={history} />
    </ChakraProvider>
);

export { App };
