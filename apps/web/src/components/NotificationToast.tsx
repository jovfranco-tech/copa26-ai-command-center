import { useNotifications, type AppNotification } from '@/store/notifications';

const TYPE_STYLES: Record<AppNotification['type'], { bg: string; border: string; icon: string }> = {
  success: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.35)', icon: '✓' },
  info:    { bg: 'rgba(94,163,184,0.08)', border: 'rgba(94,163,184,0.35)', icon: 'ℹ' },
  warning: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.35)', icon: '⚠' },
  error:   { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.35)',  icon: '✕' },
  ai:      { bg: 'rgba(201,162,75,0.08)', border: 'rgba(201,162,75,0.35)', icon: '◈' },
};

function Toast({ notif }: { notif: AppNotification }) {
  const dismiss = useNotifications((s) => s.dismiss);
  const style = TYPE_STYLES[notif.type];

  return (
    <div
      className="notif-toast"
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
      }}
      role="alert"
      aria-live="polite"
    >
      <span className="notif-toast-icon">{style.icon}</span>
      <div className="notif-toast-body">
        <strong className="notif-toast-title">{notif.title}</strong>
        <p className="notif-toast-msg">{notif.message}</p>
        {notif.action && (
          <a href={notif.action.href} className="notif-toast-action">
            {notif.action.label} →
          </a>
        )}
      </div>
      <button
        type="button"
        className="notif-toast-close"
        onClick={() => dismiss(notif.id)}
        aria-label="Cerrar notificación"
      >
        ×
      </button>
    </div>
  );
}

export function NotificationToastStack() {
  const notifications = useNotifications((s) => s.notifications);
  // Show only the 4 most recent unread toasts
  const visible = notifications.filter((n) => !n.read).slice(0, 4);

  if (!visible.length) return null;

  return (
    <div className="notif-toast-stack" aria-label="Notificaciones">
      {visible.map((n) => (
        <Toast key={n.id} notif={n} />
      ))}
    </div>
  );
}
