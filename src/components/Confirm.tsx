import { useSyncExternalStore } from 'react';
import { Sheet } from './Sheet';

// ───────────────────────── Confirmación con diseño propio ─────────────────────────
// Sustituye al `confirm()` del navegador, que en una app instalada se ve poco
// iOS y no se adapta al tamaño de texto. Solo se usa para lo que NO se puede
// deshacer (restaurar una copia, borrar todo); lo demás usa “Deshacer”.

interface Ask {
  title: string;
  message?: string;
  confirmLabel: string;
  destructive?: boolean;
  resolve: (ok: boolean) => void;
}

let current: Ask | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function confirmDialog(opts: Omit<Ask, 'resolve'>): Promise<boolean> {
  current?.resolve(false);
  return new Promise((resolve) => {
    current = { ...opts, resolve };
    emit();
  });
}

function answer(ok: boolean) {
  const c = current;
  current = null;
  emit();
  c?.resolve(ok);
}

export function ConfirmHost() {
  const ask = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current
  );
  return (
    <Sheet
      open={!!ask}
      onClose={() => answer(false)}
      title={ask?.title}
      footer={
        <div className="stack" style={{ gap: '0.5rem' }}>
          <button className={`btn block${ask?.destructive ? ' danger-solid' : ''}`} onClick={() => answer(true)}>{ask?.confirmLabel}</button>
          <button className="btn gray block" onClick={() => answer(false)}>Cancelar</button>
        </div>
      }
    >
      {ask?.message && <p style={{ margin: '0.2rem 0 0.4rem', whiteSpace: 'pre-line', lineHeight: 1.45 }}>{ask.message}</p>}
    </Sheet>
  );
}
