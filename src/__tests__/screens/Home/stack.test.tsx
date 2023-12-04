import { render, screen } from '@testing-library/react';

import { Stack } from '../../../screens/Home/sections/Stack';

describe('Stack Tests', () => {
  it('shoudl link to correct lib/framework/language sites', () => {
    const testCases = [
      {
        alt: 'typescript',
        expectedLink: 'https://www.typescriptlang.org/',
      },
      {
        alt: 'react',
        expectedLink: 'https://reactjs.org',
      },
    ];
    render(<Stack />);
    testCases.map(testCase => {
      expect(
        screen.getByAltText(testCase.alt, { exact: false }).closest('a'),
      ).toHaveAttribute('href', testCase.expectedLink);
    });
  });
});
