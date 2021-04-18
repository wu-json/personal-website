import { render, screen } from '@testing-library/react';

import { Jobs } from './index';

describe('Jobs Tests', () => {
    it('should link to correct company sites', () => {
        const testCases = [
            {
                alt: 'amazon',
                expectedLink: 'https://aws.amazon.com/'
            },
            {
                alt: 'snackpass',
                expectedLink: 'https://partners.snackpass.co/'
            }
        ];
        render(<Jobs />);
        testCases.map(testCase => {
            expect(
                screen.getByAltText(testCase.alt, { exact: false }).closest('a')
            ).toHaveAttribute('href', testCase.expectedLink);
        });
    });
});