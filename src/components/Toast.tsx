import { useSyncExternalStore } from 'react';
import { haptic } from '../lib/haptics';

interface ToastAction {
  label: string;
  run: () => void;
}

interface ToastItem {
  id: number;
  text: string;
  icon?: string;
  action?: ToastAction;
}

let toasts: ToastItem[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

/**
 * Aviso breve. Con `action` se muestra un botón (p. ej. “Deshacer”) y el
 * aviso dura más para que dé tiempo a pulsarlo.
 */
export function toast(text: string, icon?: string, ms?: number, action?: ToastAction) {
  const id = ++seq;
  // Máximo 2 a la vez: en móvil una pila de avisos tapa el contenido
  toasts = [...toasts.slice(-1), { id, text, icon, action }];
  emit();
  haptic();
  setTimeout(() => dismiss(id), ms ?? (action ? 5000 : 2400));
}

export function Toasts() {
  const list = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => toasts
  );
  return (
    <div className="toast-wrap" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className="toast" role="status">
          {t.icon && <span style={{ fontSize: '1.15rem' }} aria-hidden="true">{t.icon}</span>}
          <span>{t.text}</span>
          {t.action && (
            <button
              className="toast-action"
              onClick={() => {
                t.action!.run();
                dismiss(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
