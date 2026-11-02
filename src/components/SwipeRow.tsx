import { useEffect, useRef, type ReactNode } from 'react';
import { haptic } from '../lib/haptics';

// ───────────────────────── Fila deslizable (estilo iOS) ─────────────────────────
// Deslizar a la izquierda muestra “Eliminar”; deslizar hasta el final borra
// directamente. Tocar la fila abierta la cierra. Solo una fila abierta a la vez.
// Para VoiceOver y teclado, el borrado sigue disponible dentro de la fila
// (al editarla), así que el gesto es un atajo, no la única vía.

const ACTION_REM = 5.5;
let closeOpen: (() => void) | null = null;

export function SwipeRow({ children, onDelete, deleteLabel = 'Eliminar' }: {
  children: ReactNode;
  onDelete: () => void;
  deleteLabel?: string;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const g = useRef<{ x: number; y: number; dx: number; base: number; dir: 'h' | 'v' | null } | null>(null);
  const openRef = useRef(false);

  const actionPx = () => ACTION_REM * parseFloat(getComputedStyle(document.documentElement).fontSize || '16');

  const setX = (x: number, animate: boolean) => {
    const el = contentRef.current;
    if (!el) return;
    el.style.transition = animate ? 'transform 0.22s ease' : 'none';
    el.style.transform = x ? `translateX(${x}px)` : '';
    rowRef.current?.style.setProperty('--swipe', String(Math.min(1, -x / actionPx())));
  };

  const close = () => {
    openRef.current = false;
    setX(0, true);
    if (closeOpen === close) closeOpen = null;
  };

  useEffect(() => () => { if (closeOpen === close) closeOpen = null; });

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    g.current = { x: t.clientX, y: t.clientY, dx: 0, base: openRef.current ? -actionPx() : 0, dir: null };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const s = g.current;
    if (!s) return;
    const t = e.touches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (!s.dir) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      s.dir = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      if (s.dir === 'h' && closeOpen && closeOpen !== close) closeOpen();
    }
    if (s.dir !== 'h') return;
    s.dx = dx;
    setX(Math.min(0, s.base + dx), false);
  };

  const onTouchEnd = () => {
    const s = g.current;
    g.current = null;
    if (!s || s.dir !== 'h') return;
    const x = s.base + s.dx;
    const width = rowRef.current?.offsetWidth ?? 400;
    if (x < -width * 0.6) {
      // Deslizado hasta el final: borrar
      haptic();
      setX(-width, true);
      setTimeout(() => { onDelete(); }, 180);
      openRef.current = false;
      return;
    }
    if (x < -actionPx() / 2) {
      openRef.current = true;
      setX(-actionPx(), true);
      closeOpen = close;
    } else close();
  };

  return (
    <div className="swipe-row" ref={rowRef}>
      <button className="swipe-action" tabIndex={-1} aria-hidden="true" onClick={() => { close(); onDelete(); }}>
        {deleteLabel}
      </button>
      <div
        className="swipe-content"
        ref={contentRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        onClickCapture={(e) => {
          // Con la fila abierta, el primer toque solo la cierra
          if (openRef.current) {
            e.stopPropagation();
            e.preventDefault();
            close();
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
