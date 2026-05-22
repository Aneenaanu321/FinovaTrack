import { useState, useEffect, useCallback } from 'react';
import { notificationsApi } from '../services/api';

const POLL_MS = 60000;

export default function useNotifications(enabled = true) {
  const [summary, setSummary] = useState({ overdueCount: 0, unreadCount: 0, badgeCount: 0 });
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadSummary = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await notificationsApi.summary();
      setSummary(res.data);
    } catch {
      /* ignore when logged out */
    }
  }, [enabled]);

  const loadFull = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const res = await notificationsApi.list();
      setNotifications(res.data.notifications || []);
      setSummary({
        overdueCount: res.data.overdueCount,
        unreadCount: res.data.unreadCount,
        badgeCount: res.data.overdueCount,
      });
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  const dismiss = async (key) => {
    const res = await notificationsApi.dismiss(key);
    setNotifications(res.data.notifications || []);
    setSummary({
      overdueCount: res.data.overdueCount,
      unreadCount: res.data.unreadCount,
      badgeCount: res.data.overdueCount,
    });
  };

  const dismissAll = async () => {
    const res = await notificationsApi.dismissAll();
    setNotifications(res.data.notifications || []);
    setSummary({
      overdueCount: res.data.overdueCount,
      unreadCount: res.data.unreadCount,
      badgeCount: res.data.overdueCount,
    });
  };

  useEffect(() => {
    loadSummary();
    const id = setInterval(loadSummary, POLL_MS);
    return () => clearInterval(id);
  }, [loadSummary]);

  return {
    summary,
    notifications,
    loading,
    loadFull,
    dismiss,
    dismissAll,
    refresh: loadSummary,
  };
}
