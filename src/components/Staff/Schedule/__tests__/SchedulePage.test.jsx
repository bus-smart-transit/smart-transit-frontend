import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SchedulePage from '../SchedulePage';
import { viewsForRole } from '../../../../utils/operatorNav';

const views = viewsForRole('schedule', 'operator');

describe('SchedulePage', () => {
  it('has the heading, the three views, and exactly one "+ Schedule" button', () => {
    render(<SchedulePage views={views} view="calendar" onViewChange={vi.fn()} onCreate={vi.fn()}>{(v) => <p>content: {v}</p>}</SchedulePage>);

    expect(screen.getByRole('heading', { name: 'Schedule' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Calendar', 'Blocks', 'Trips']);
    expect(screen.getAllByRole('button', { name: '+ Schedule' })).toHaveLength(1);
    expect(screen.getByText('content: calendar')).toBeInTheDocument();
  });

  it('marks the active view and switches view on click', () => {
    const onViewChange = vi.fn();
    render(<SchedulePage views={views} view="blocks" onViewChange={onViewChange} onCreate={vi.fn()}>{(v) => <p>content: {v}</p>}</SchedulePage>);

    expect(screen.getByRole('tab', { name: 'Blocks' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Calendar' })).toHaveAttribute('aria-selected', 'false');
    fireEvent.click(screen.getByRole('tab', { name: 'Trips' }));
    expect(onViewChange).toHaveBeenCalledWith('trips');
  });

  it('opens the create form from any view with the one button', () => {
    const onCreate = vi.fn();
    render(<SchedulePage views={views} view="trips" onViewChange={vi.fn()} onCreate={onCreate}>{() => null}</SchedulePage>);
    fireEvent.click(screen.getByRole('button', { name: '+ Schedule' }));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('shows only the views the role may see, and nothing when there are none', () => {
    const { container, rerender } = render(<SchedulePage views={views.slice(0, 1)} view="trips" onViewChange={vi.fn()} onCreate={vi.fn()}>{(v) => <p>content: {v}</p>}</SchedulePage>);
    expect(screen.getAllByRole('tab')).toHaveLength(1);
    expect(screen.getByText('content: calendar')).toBeInTheDocument(); // an unavailable view falls back to the first

    rerender(<SchedulePage views={viewsForRole('schedule', 'driver')} view="calendar" onViewChange={vi.fn()} onCreate={vi.fn()}>{() => <p>secret</p>}</SchedulePage>);
    expect(container).toBeEmptyDOMElement();
  });

  it('moves between views with the arrow keys', () => {
    const onViewChange = vi.fn();
    render(<SchedulePage views={views} view="calendar" onViewChange={onViewChange} onCreate={vi.fn()}>{() => null}</SchedulePage>);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Calendar' }), { key: 'ArrowRight' });
    expect(onViewChange).toHaveBeenCalledWith('blocks');
  });
});
