// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// https://stackoverflow.com/questions/63219552/jest-import-statement-typeerror-cannot-set-property-fillstyle-of-null
// Need this otherwise threejs is not happy in render tests.
import 'jest-canvas-mock';
import resizeObserverPolyfill from 'resize-observer-polyfill';
global.ResizeObserver = resizeObserverPolyfill;
