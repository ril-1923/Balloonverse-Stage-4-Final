import { useEffect } from 'react';
import { Trophy, Target } from 'lucide-react';
import { useNotificationStore, type Notice } from '../../store/useNotificationStore';

function Toast({ n }: { n: Notice }) {
  const dismiss = useNotificationStore((s) => s.dismiss);
  useEffect(() => {
    const t = window.setTimeout(() => dismiss(n.id), 5200);
    return () => window.clearTimeout(t);
  }, [n.id, dismiss]);
  const Icon = n.kind === 'achievement' ? Trophy : Target;
  return (
    <li className={`toast-item toast-item--${n.kind}`}>
      <Icon size={20} aria-hidden />
      <div>
        <strong>{n.title}</strong>
        <span>{n.body}</span>
      </div>
      <button type="button" aria-label="Dismiss notification" onClick={() => dismiss(n.id)}>×</button>
    </li>
  );
}

/** Mission and achievement notifications. Polite live region, auto-dismissing. */
export function Toasts() {
  const items = useNotificationStore((s) => s.items);
  return (
    <ul className="toasts" role="status" aria-live="polite" aria-label="Notifications">
      {items.map((n) => <Toast key={n.id} n={n} />)}
    </ul>
  );
}
