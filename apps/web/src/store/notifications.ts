import { create } from 'zustand';

export type NotifType = 'info' | 'success' | 'warning' | 'error' | 'ai';

export interface AppNotification {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  createdAt: number;
  read: boolean;
  action?: {
    label: string;
    href: string;
  };
  autoClose?: number; // ms, if set the notification auto-dismisses
}

interface NotificationsState {
  notifications: AppNotification[];
  unreadCount: number;
  push: (notif: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => string;
  dismiss: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

function genId() {
  return `notif-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export const useNotifications = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  push(notif) {
    const id = genId();
    const item: AppNotification = {
      ...notif,
      id,
      createdAt: Date.now(),
      read: false,
    };
    set((s) => ({
      notifications: [item, ...s.notifications].slice(0, 30),
      unreadCount: s.unreadCount + 1,
    }));

    // Auto-close if requested
    if (notif.autoClose && notif.autoClose > 0) {
      setTimeout(() => get().dismiss(id), notif.autoClose);
    }

    return id;
  },

  dismiss(id) {
    set((s) => {
      const notifications = s.notifications.filter((n) => n.id !== id);
      const unreadCount = notifications.filter((n) => !n.read).length;
      return { notifications, unreadCount };
    });
  },

  markAllRead() {
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  clearAll() {
    set({ notifications: [], unreadCount: 0 });
  },
}));

// ── Convenience helpers ──────────────────────────────────────────────────────

/** Push a quick success toast that auto-closes in 4s */
export function notifySuccess(title: string, message: string) {
  return useNotifications.getState().push({ type: 'success', title, message, autoClose: 4000 });
}

/** Push an info toast that auto-closes in 5s */
export function notifyInfo(title: string, message: string) {
  return useNotifications.getState().push({ type: 'info', title, message, autoClose: 5000 });
}

/** Push a warning that stays until dismissed */
export function notifyWarning(title: string, message: string, action?: AppNotification['action']) {
  return useNotifications.getState().push({ type: 'warning', title, message, action });
}

/** Push an error that stays until dismissed */
export function notifyError(title: string, message: string) {
  return useNotifications.getState().push({ type: 'error', title, message });
}

/** Push an AI insight that auto-closes in 6s */
export function notifyAI(title: string, message: string, action?: AppNotification['action']) {
  return useNotifications.getState().push({ type: 'ai', title, message, autoClose: 6000, action });
}
