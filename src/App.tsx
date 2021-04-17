import { ChakraProvider } from '@chakra-ui/react';
import '@fontsource/poppins/200.css';
import { theme } from 'src/styles/theme';

const App = () => <ChakraProvider theme={theme}></ChakraProvider>;

export { App };
