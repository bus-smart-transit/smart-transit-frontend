import { Bell } from 'lucide-react';
import Modal from '../ui/Modal/Modal';
import { useNotificationBell } from '../../api/hooks/Staff/useNotificationBell';

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
 */
export default function NotificationBellButton({ service, role }) {
  const {
    open, setOpen,
    notifications,
    unreadCount,
    loadingNotifications,
    handleMarkRead,
    handleMarkAllRead,
  } = useNotificationBell(service, role);

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
            notifications.map((n) => (
              <div
                key={n.notification_id}
                className={`rounded-lg border px-3 py-2.5 text-sm ${n.read_at ? 'border-slate-100 bg-slate-50 text-slate-500' : 'border-amber-200 bg-amber-50 text-slate-800'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{n.title}</p>
                  {!n.read_at && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(n.notification_id)}
                      className="shrink-0 text-xs font-semibold text-teal-600 hover:underline"
                    >
                      Mark read
                    </button>
                  )}
                </div>
                <p className="mt-1 text-xs">{n.body}</p>
              </div>
            ))
          )}
        </div>
      </Modal>
    </>
  );
}
