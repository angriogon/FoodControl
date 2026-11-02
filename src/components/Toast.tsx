import { useSyncExternalStore } from 'react';

interface ToastItem {
  id: number;
  text: string;
  icon?: string;
}

let toasts: ToastItem[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(text: string, icon?: string, ms = 2400) {
  const id = ++seq;
  // Máximo 2 a la vez: en móvil una pila de avisos tapa el contenido
  toasts = [...toasts.slice(-1), { id, text, icon }];
  emit();
  // Vibración corta en Android; iOS Safari la ignora sin error
  navigator.vibrate?.(15);
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, ms);
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
        <div key={t.id} className="toast">
          {t.icon && <span style={{ fontSize: 20 }}>{t.icon}</span>}
          {t.text}
        </div>
      ))}
    </div>
  );
}
