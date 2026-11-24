import { useState, useEffect, useCallback, useRef } from 'react';
import { useLiveChannels, useLiveEvent } from '../useLive';
import { newItemsSince } from '../../../utils/toastStore';

/**
 * S1 (Batch 17): shared in-app notification-bell hook for Driver/Conductor
 * dashboards — a persistent, always-accessible counterpart to FCM push
 * notifications (see FcmService::sendToUser() on the backend, which writes
 * both). Deliberately generic (parameterized by `service`/`role`) so both
 * dashboards share one implementation instead of duplicating it, mirroring
 * useOperatorDashboard.js's useNotificationBell() for the Operator's own
 * (differently-scoped) decline feed.
 *
 * @param {object} service - DriverService or ConductorService instance
 *   (must implement getNotifications/markNotificationRead/
 *   markAllNotificationsRead, all parameterized by role — see
 *   StaffBaseService.js).
 * @param {'driver'|'conductor'} role
 * @param {{ onNew?: (notifications: object[]) => void }} options 2026-11-24 (user): called with the unread
 *   notifications that arrived since the last read (not on the first read, which is the page loading); the bell shows
 *   them as toasts.
 */
export function useNotificationBell(service, role, { onNew } = {}) {
  const onNewRef = useRef(onNew);
  useEffect(() => { onNewRef.current = onNew; }, [onNew]);
  const seenIds = useRef(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const loadNotifications = useCallback(async () => {
    setLoadingNotifications(true);
    try {
      const res = await service.getNotifications(role);
      const list = Array.isArray(res?.data?.notifications) ? res.data.notifications : [];
      const arrived = newItemsSince(seenIds.current, list.filter((n) => !n.read_at), (n) => n.notification_id);
      seenIds.current = new Set(list.map((n) => n.notification_id));
      if (arrived.length > 0) onNewRef.current?.(arrived);
      setNotifications(list);
      setUnreadCount(Number(res?.data?.unread_count ?? 0));
    } catch {
      // Keep last-known state on transient poll errors.
    } finally {
      setLoadingNotifications(false);
    }
  }, [service, role]);

  // Batch 58: a new notification for this person (an Operator's message, an assignment change, an alert handled)
  // shows at once instead of at the next 45 s refresh.
  const liveChannels = useLiveChannels();
  useLiveEvent(liveChannels?.user, 'notification', () => { void loadNotifications(); }, { isPrivate: true });

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadNotifications();
    }, 0);
    const intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      void loadNotifications();
    }, 45000);
    return () => {
      clearTimeout(timer);
      clearInterval(intervalId);
    };
  }, [loadNotifications]);

  const handleMarkRead = async (notificationId) => {
    try {
      await service.markNotificationRead(role, notificationId);
      void loadNotifications();
    } catch {
      // no-op — bell state simply won't update this cycle
    }
  };

  // 2026-10-27: a group of the same kind, marked read in one request.
  const handleMarkGroupRead = async (ids) => {
    try {
      await service.markNotificationsRead(role, ids);
      void loadNotifications();
    } catch {
      // no-op
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await service.markAllNotificationsRead(role);
      void loadNotifications();
    } catch {
      // no-op
    }
  };

  return {
    open,
    setOpen,
    notifications,
    unreadCount,
    loadingNotifications,
    handleMarkRead,
    handleMarkGroupRead,
    handleMarkAllRead,
  };
}
