import { useState, useEffect, useCallback } from 'react';

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
 */
export function useNotificationBell(service, role) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const loadNotifications = useCallback(async () => {
    setLoadingNotifications(true);
    try {
      const res = await service.getNotifications(role);
      setNotifications(Array.isArray(res?.data?.notifications) ? res.data.notifications : []);
      setUnreadCount(Number(res?.data?.unread_count ?? 0));
    } catch {
      // Keep last-known state on transient poll errors.
    } finally {
      setLoadingNotifications(false);
    }
  }, [service, role]);

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
    handleMarkAllRead,
  };
}
