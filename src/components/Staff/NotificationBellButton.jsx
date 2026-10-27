import { Bell } from 'lucide-react';
import Modal from '../ui/Modal/Modal';
import { useNotificationBell } from '../../api/hooks/Staff/useNotificationBell';
import { resolveNotificationTarget } from '../../utils/notificationTarget';
import { groupNotifications } from '../../utils/notificationGroups';
import NotificationGroupList from './NotificationGroupList';

const FIELDS = { id: (n) => n.notification_id, text: (n) => n.body };

/**
 * S1 (Batch 17): persistent, always-accessible bell icon for Driver/
 * Conductor portals — distinct from the Driver dashboard's existing
 * "Quick Notifications" panel (that panel is synthetic live route/traffic
 * status, not a real event feed) and from FCM push (alerts even when the
 * app isn't open). This is the in-app history/status counterpart, backed
 * by the same events that trigger FCM pushes (see FcmService::sendToUser()
 * on the backend — one call site writes both).
 *
 * Mount this once in each dashboard's persistent header/sidebar (not
 * inside a specific tab) so it's reachable from anywhere in the portal.
 *
 * Batch 27, Task 1: a notification that has a target (trip assignment or
 * operator dispatch contact) is clickable: it is marked read and `onOpenNotification`
 * receives { path, tab, tripId } so the dashboard can open that trip. The
 * other types stay plain text.
 */
export default function NotificationBellButton({ service, role, onOpenNotification }) {
  const {
    open, setOpen,
    notifications,
    unreadCount,
    loadingNotifications,
    handleMarkRead,
    handleMarkGroupRead,
    handleMarkAllRead,
  } = useNotificationBell(service, role);

  const openNotification = (n, target) => {
    if (!n.read_at) handleMarkRead(n.notification_id);
    setOpen(false);
    onOpenNotification?.(target);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
        aria-label="Notifications"
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Notifications">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs text-slate-500">{unreadCount} unread</span>
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="text-xs font-semibold text-teal-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline"
            disabled={unreadCount === 0}
          >
            Mark all as read
          </button>
        </div>
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {loadingNotifications && notifications.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Loading…</p>
          ) : notifications.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No notifications yet.</p>
          ) : (
            // 2026-10-27: notifications of the same kind are one group (utils/notificationGroups).
            <NotificationGroupList
              groups={groupNotifications(notifications, FIELDS)}
              fields={FIELDS}
              onMarkRead={(ids) => (ids.length === 1 ? handleMarkRead(ids[0]) : handleMarkGroupRead(ids))}
              itemProps={(n) => {
                const target = onOpenNotification ? resolveNotificationTarget(n, role) : null;
                if (!target) return {};
                return {
                  role: 'button',
                  tabIndex: 0,
                  onClick: () => openNotification(n, target),
                  onKeyDown: (e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openNotification(n, target); }
                  },
                };
              }}
              renderItemExtra={(n) => (onOpenNotification && resolveNotificationTarget(n, role)
                ? <p className="mt-0.5 text-xs font-semibold text-teal-700">Open trip →</p>
                : null)}
            />
          )}
        </div>
      </Modal>
    </>
  );
}
