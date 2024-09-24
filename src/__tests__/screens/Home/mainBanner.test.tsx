import { render, screen } from '@testing-library/react';

import { MainBanner } from '../../../screens/Home/sections/MainBanner/index';

describe('Main Banner Tests', () => {
  it('should link to correct socials', () => {
    const testCases = [
      {
        alt: 'linkedin',
        expectedLink: 'https://linkedin.com/in/wu-json',
      },
      {
        alt: 'github',
        expectedLink: 'https://github.com/wu-json',
      },
      {
        alt: 'email',
        expectedLink: 'mailto:thedarkpear@proton.me',
      },
    ];
    render(<MainBanner />);
    testCases.map(testCase => {
      expect(screen.getByAltText(testCase.alt).closest('a')).toHaveAttribute(
        'href',
        testCase.expectedLink,
      );
    });
  });
  it('should link to resume', () => {
    render(<MainBanner />);
    expect(screen.getByText('resume').closest('a')).toHaveAttribute(
      'href',
      '/jasonwu-resume.pdf',
    );
  });
});
