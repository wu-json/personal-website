import { render, screen } from '@testing-library/react';

import { Projects } from '../../../screens/Home/sections/Projects';

describe('Project Tests', () => {
  it('should link to correct project sites', () => {
    const testCases = [
      {
        alt: 'vailable',
        expectedLink: 'https://vailable.io',
      },
      {
        alt: 'pathogen',
        expectedLink: 'https://pathogen.jasonwu.io',
      },
    ];
    render(<Projects />);
    testCases.map(testCase => {
      expect(
        screen.getByAltText(testCase.alt, { exact: false }).closest('a'),
      ).toHaveAttribute('href', testCase.expectedLink);
    });
  });
});
