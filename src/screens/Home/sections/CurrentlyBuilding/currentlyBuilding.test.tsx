import { render, screen } from '@testing-library/react';

import { CurrentlyBuilding } from './index';

describe('Currently Building Tests', () => {
    it('should link to correct project sites', () => {
        const testCases = [
            {
                alt: 'poke-eth',
                expectedLink: 'https://github.com/poke-eth'
            }
        ];
        render(<CurrentlyBuilding />);
        testCases.map(testCase => {
            expect(
                screen.getByAltText(testCase.alt, { exact: false }).closest('a')
            ).toHaveAttribute('href', testCase.expectedLink);
        });
    });
});
