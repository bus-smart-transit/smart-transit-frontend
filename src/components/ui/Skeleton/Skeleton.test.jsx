import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SkeletonCards, SkeletonPage, SkeletonTable } from './Skeleton';

// Batch 63 (user, 2026-11-13): skeleton loading keeps the page's shape and still says "loading" to screen readers.
describe('Skeleton', () => {
  it('tells screen readers what is loading, and hides the grey shapes from them', () => {
    render(<SkeletonCards label="Finding trips..." count={3} />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).toHaveTextContent('Finding trips...');
    expect(status.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(3);
  });

  it('draws a table with the asked number of rows and columns', () => {
    const { container } = render(<SkeletonTable label="Loading transactions..." rows={4} cols={6} />);
    const rows = container.querySelectorAll('[role="status"] > div');
    expect(rows).toHaveLength(5); // header + 4 rows
    expect(rows[1].children).toHaveLength(6);
  });

  it('has a page, a staff portal and a crew phone layout', () => {
    for (const variant of ['page', 'portal', 'crew']) {
      const { unmount } = render(<SkeletonPage variant={variant} label={`Loading ${variant}`} />);
      expect(screen.getByRole('status')).toHaveTextContent(`Loading ${variant}`);
      unmount();
    }
  });
});
