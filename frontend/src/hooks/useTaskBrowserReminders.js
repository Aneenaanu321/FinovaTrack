import { useEffect } from 'react';

const STORAGE_KEY = 'finovatrack_browser_reminded';
const MINUTES_BEFORE = 15;
const CHECK_MS = 60_000;

function getRemindedSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function markReminded(taskId, dueMs) {
  const key = `${taskId}:${dueMs}`;
  const set = getRemindedSet();
  set.add(key);
  const arr = [...set].slice(-500);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

function shouldNotify(task) {
  if (!task.browserReminderEnabled || task.status !== 'Pending' || !task.dueDate) return false;
  const due = new Date(task.dueDate).getTime();
  const key = `${task._id}:${due}`;
  if (getRemindedSet().has(key)) return false;
  const now = Date.now();
  const windowStart = due - MINUTES_BEFORE * 60 * 1000;
  return now >= windowStart && now <= due;
}

export function requestNotificationPermission() {
  if (typeof Notification === 'undefined') return Promise.resolve('unsupported');
  if (Notification.permission === 'granted') return Promise.resolve('granted');
  if (Notification.permission === 'denied') return Promise.resolve('denied');
  return Notification.requestPermission();
}

export default function useTaskBrowserReminders(tasks) {
  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const pending = (tasks || []).filter(shouldNotify);
    pending.forEach((task) => {
      const due = new Date(task.dueDate).getTime();
      const body = task.client?.name
        ? `Due soon · Client: ${task.client.name}`
        : 'Due soon';
      try {
        new Notification(`Task: ${task.title}`, { body, tag: `task-${task._id}` });
        markReminded(task._id, due);
      } catch {
        /* ignore */
      }
    });
  }, [tasks]);

  useEffect(() => {
    const id = setInterval(() => {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
      (tasks || []).filter(shouldNotify).forEach((task) => {
        const due = new Date(task.dueDate).getTime();
        try {
          new Notification(`Task: ${task.title}`, {
            body: task.client?.name ? `Due soon · ${task.client.name}` : 'Due soon',
            tag: `task-${task._id}`,
          });
          markReminded(task._id, due);
        } catch {
          /* ignore */
        }
      });
    }, CHECK_MS);
    return () => clearInterval(id);
  }, [tasks]);
}
