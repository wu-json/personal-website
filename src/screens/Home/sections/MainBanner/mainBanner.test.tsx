import { render, screen } from '@testing-library/react';

import { MainBanner } from './index';

describe('Main Banner Tests', () => {
    it('should link to Twitter', () => {
        render(<MainBanner />);
        expect(screen.getByAltText('twitter').closest('a')).toHaveAttribute(
            'href',
            'https://twitter.com/wu_json'
        );
    });
});
