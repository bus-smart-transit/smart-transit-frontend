import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NotificationBellButton from '../NotificationBellButton';
import TripFocusNotice from '../TripFocusNotice';

const note = (over) => ({
  notification_id: 1,
  type: 'trip_assigned',
  title: 'New Trip Assignment',
  body: "You've been assigned to Route A on 2026-10-04.",
  read_at: null,
  data: { type: 'trip_assigned', trip_id: 42, role: 'driver', link: '/employee/driver/dashboard?tab=dashboard&trip=42' },
  ...over,
});

function makeService(notifications) {
  return {
    getNotifications: vi.fn().mockResolvedValue({ data: { notifications, unread_count: notifications.filter((n) => !n.read_at).length } }),
    markNotificationRead: vi.fn().mockResolvedValue({}),
    markAllNotificationsRead: vi.fn().mockResolvedValue({}),
  };
}

async function openBell() {
  fireEvent.click(await screen.findByRole('button', { name: 'Notifications' }));
}

describe('NotificationBellButton (Batch 27, Task 1)', () => {
  test('clicking a New Trip Assignment opens that trip and marks it read', async () => {
    const service = makeService([note()]);
    const onOpen = vi.fn();
    render(<NotificationBellButton service={service} role="driver" onOpenNotification={onOpen} />);
    await openBell();

    const item = await screen.findByTestId('notification-item');
    expect(item.getAttribute('data-clickable')).toBe('true');
    fireEvent.click(item);

    expect(onOpen).toHaveBeenCalledWith({ path: '/employee/driver/dashboard?tab=dashboard&trip=42', tab: 'dashboard', tripId: 42 });
    await waitFor(() => expect(service.markNotificationRead).toHaveBeenCalledWith('driver', 1));
  });

  test('works from the keyboard', async () => {
    const service = makeService([note()]);
    const onOpen = vi.fn();
    render(<NotificationBellButton service={service} role="driver" onOpenNotification={onOpen} />);
    await openBell();
    fireEvent.keyDown(await screen.findByTestId('notification-item'), { key: 'Enter' });
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  test('a Chauffeur resolves the same notification to the conductor portal', async () => {
    const service = makeService([note({ data: { type: 'trip_assigned', trip_id: 7, role: 'conductor' } })]);
    const onOpen = vi.fn();
    render(<NotificationBellButton service={service} role="conductor" onOpenNotification={onOpen} />);
    await openBell();
    fireEvent.click(await screen.findByTestId('notification-item'));
    expect(onOpen.mock.calls[0][0].path).toBe('/employee/conductor/dashboard?tab=dashboard&trip=7');
  });

  test('other notification types are not clickable', async () => {
    const service = makeService([note({ type: 'trip_cancelled', title: 'Trip cancelled', data: { type: 'trip_cancelled', trip_id: 42 } })]);
    const onOpen = vi.fn();
    render(<NotificationBellButton service={service} role="driver" onOpenNotification={onOpen} />);
    await openBell();
    const item = await screen.findByTestId('notification-item');
    expect(item.getAttribute('data-clickable')).toBe('false');
    fireEvent.click(item);
    expect(onOpen).not.toHaveBeenCalled();
  });

  test('"Mark read" does not open the trip', async () => {
    const service = makeService([note()]);
    const onOpen = vi.fn();
    render(<NotificationBellButton service={service} role="driver" onOpenNotification={onOpen} />);
    await openBell();
    fireEvent.click(await screen.findByText('Mark read'));
    expect(onOpen).not.toHaveBeenCalled();
  });
});

describe('TripFocusNotice', () => {
  test('shows a clear message for a trip that is gone, with no error page', () => {
    const onDismiss = vi.fn();
    render(
      <TripFocusNotice
        tripId={42}
        notice={{ state: 'unavailable', tone: 'warning', title: 'Trip #42 is no longer on your list', message: 'It was declined, reassigned to someone else, or removed.' }}
        onDismiss={onDismiss}
      />,
    );
    expect(screen.getByTestId('trip-focus-notice').getAttribute('data-state')).toBe('unavailable');
    expect(screen.getByText(/no longer on your list/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalled();
  });

  test('renders nothing without a notice', () => {
    const { container } = render(<TripFocusNotice tripId={null} notice={null} onDismiss={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});
