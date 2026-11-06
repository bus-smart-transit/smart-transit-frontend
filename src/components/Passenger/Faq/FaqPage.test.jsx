import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FaqPage from './FaqPage';
import { FAQ_ITEMS, FAQ_TOPICS } from '../../../utils/faqItems';

vi.mock('../../Layout/Navbar', () => ({ default: () => null }));
vi.mock('../../Layout/Footer', () => ({ default: () => null }));

// 2026-11-07: the FAQ page shows the shared questions by topic.
describe('FaqPage', () => {
  it('lists every topic with its questions, and opens an answer', () => {
    render(<MemoryRouter><FaqPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1, name: 'Frequently Asked Questions' })).toBeInTheDocument();
    for (const { topic } of FAQ_TOPICS) {
      expect(screen.getByRole('heading', { level: 2, name: topic })).toBeInTheDocument();
    }
    const topics = screen.getByRole('navigation', { name: 'FAQ topics' });
    expect(within(topics).getAllByRole('link')).toHaveLength(FAQ_TOPICS.length);

    fireEvent.click(screen.getByText('Can I choose my seat?'));
    expect(screen.getByText(/Every online ticket reserves a seat/)).toBeInTheDocument();
    expect(FAQ_ITEMS.length).toBe(FAQ_TOPICS.reduce((n, t) => n + t.items.length, 0));
  });
});
