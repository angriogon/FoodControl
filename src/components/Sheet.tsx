import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconClose } from './Icons';

// ───── Bloqueo de scroll del fondo ─────
// Antes cada hoja guardaba y restauraba `body.style.overflow`. Con hojas
// abiertas una encima de otra, si se cerraban en otro orden el fondo se
// quedaba bloqueado hasta reiniciar la app (el fallo de scroll). Ahora un
// contador global garantiza que el bloqueo se quita al cerrar la última.
let openSheets = 0;
function lockScroll() {
  openSheets++;
  document.documentElement.classList.add('sheet-open');
}
function unlockScroll() {
  openSheets = Math.max(0, openSheets - 1);
  if (openSheets === 0) {
    document.documentElement.classList.remove('sheet-open');
    // Lo que esperaba a que no hubiera hojas abiertas (p. ej. avisos de logros)
    const q = waiting.splice(0);
    if (q.length) setTimeout(() => q.forEach((fn) => fn()), 350);
  }
}

const waiting: (() => void)[] = [];
/** Hojas abiertas, de la más antigua a la de arriba */
const stack: symbol[] = [];
/**
 * Ejecuta `fn` cuando no haya ninguna hoja abierta. Así los avisos que no
 * vienen de lo que estás haciendo (un logro, el ajuste semanal) no tapan la
 * pantalla en la que estás trabajando.
 */
export function whenNoSheet(fn: () => void) {
  if (openSheets === 0) fn();
  else waiting.push(fn);
}

interface Props {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  full?: boolean;
  /** Botón opcional a la izquierda (p. ej. “Atrás”) */
  left?: ReactNode;
}

/**
 * Hoja inferior al estilo iOS. Se cierra tocando fuera, con la X o
 * arrastrando la cabecera hacia abajo.
 */
export function Sheet({ open, onClose, title, children, footer, full, left }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; dy: number } | null>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    lockScroll();
    const me = Symbol('sheet');
    stack.push(me);
    const prevFocus = document.activeElement as HTMLElement | null;
    // Escape cierra solo la hoja de arriba, no todas las que haya abiertas
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && stack[stack.length - 1] === me && closeRef.current();
    window.addEventListener('keydown', onKey);
    // Accesibilidad: lleva el foco a la hoja para VoiceOver
    requestAnimationFrame(() => {
      if (!sheetRef.current?.contains(document.activeElement)) sheetRef.current?.focus({ preventScroll: true });
    });
    return () => {
      stack.splice(stack.indexOf(me), 1);
      unlockScroll();
      window.removeEventListener('keydown', onKey);
      prevFocus?.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;

  const onTouchStart = (e: React.TouchEvent) => {
    drag.current = { y: e.touches[0].clientY, dy: 0 };
    if (sheetRef.current) sheetRef.current.style.transition = 'none';
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!drag.current || !sheetRef.current) return;
    const dy = Math.max(0, e.touches[0].clientY - drag.current.y);
    drag.current.dy = dy;
    sheetRef.current.style.transform = `translateY(${dy}px)`;
  };
  const onTouchEnd = () => {
    const el = sheetRef.current;
    if (!drag.current || !el) return;
    const close = drag.current.dy > 110;
    el.style.transition = 'transform 0.25s ease';
    el.style.transform = close ? 'translateY(100%)' : '';
    drag.current = null;
    if (close) setTimeout(() => closeRef.current(), 200);
  };

  return createPortal(
    <>
      <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        className={`sheet${full ? ' full' : ''}`}
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        style={{ outline: 'none' }}
      >
        <div className="sheet-header" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          <div className="sheet-grabber" aria-hidden="true" />
          <div className="sheet-bar">
            <div>{left}</div>
            <h2 className="sheet-title ellipsis" id={titleId}>{title}</h2>
            <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
              <IconClose size={16} />
            </button>
          </div>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-footer">{footer}</div>}
      </div>
    </>,
    document.body
  );
}
