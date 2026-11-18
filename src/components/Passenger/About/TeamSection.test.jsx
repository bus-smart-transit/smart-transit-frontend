import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import TeamSection from './TeamSection';

// 2026-11-18 (user): the team cards take turns on their own, one every 2 seconds.
const activeName = () => {
  const lifted = [...document.querySelectorAll('li:not([aria-hidden]) > div')].find((card) => card.className.includes('scale-105'));
  return lifted?.querySelector('h3')?.textContent;
};

describe('TeamSection', () => {
  afterEach(() => vi.useRealTimers());

  it('starts on the middle card and moves to the next one every 2 seconds', () => {
    vi.useFakeTimers();
    render(<TeamSection />);
    expect(activeName()).toBe('Everest T. Ang');
    act(() => { vi.advanceTimersByTime(2000); });
    expect(activeName()).toBe('Joshua P. Galo');
    act(() => { vi.advanceTimersByTime(2000); });
    expect(activeName()).toBe('Hasannal Guiabar');
    act(() => { vi.advanceTimersByTime(2000); });
    expect(activeName()).toBe('Jan Blair De Vila');
  });

  it('keeps going forward past the end, round after round', () => {
    vi.useFakeTimers();
    render(<TeamSection />);
    // 12 turns from Everest (3rd of 5) lands on the 5th person, two full rounds later.
    for (let turn = 0; turn < 12; turn += 1) act(() => { vi.advanceTimersByTime(2000); });
    expect(activeName()).toBe('Hasannal Guiabar');
    act(() => { vi.advanceTimersByTime(2000); });
    expect(activeName()).toBe('Jan Blair De Vila');
    // Only the real cards are announced; the loop copies are hidden from screen readers.
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });

  it('stops taking turns while the cards are pointed at', () => {
    vi.useFakeTimers();
    render(<TeamSection />);
    fireEvent.mouseEnter(screen.getByRole('list'));
    act(() => { vi.advanceTimersByTime(6000); });
    expect(activeName()).toBe('Everest T. Ang');
  });
});
