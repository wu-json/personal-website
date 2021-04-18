import { render, screen } from '@testing-library/react';

import { MainBanner } from './index';

describe('Main Banner Tests', () => {
    it('should link to correct socials', () => {
        const testCases = [
            {
                alt: 'twitter',
                expectedLink: 'https://twitter.com/wu_json'
            },
            {
                alt: 'linkedin',
                expectedLink: 'https://www.linkedin.com/in/jwu215/'
            },
            {
                alt: 'github',
                expectedLink: 'https://github.com/wu-json'
            },
            {
                alt: 'email',
                expectedLink: 'mailto:jason.c.wu@yale.edu'
            }
        ];
        render(<MainBanner />);
        testCases.map(testCase => {
            expect(
                screen.getByAltText(testCase.alt).closest('a')
            ).toHaveAttribute('href', testCase.expectedLink);
        });
    });
    it('should link to resume', () => {
        render(<MainBanner />);
        expect(screen.getByText('resume').closest('a')).toHaveAttribute(
            'href',
            '/jasonwu-resume.pdf'
        );
    });
});
