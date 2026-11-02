import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconClose } from './Icons';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  full?: boolean;
}

/**
 * Hoja inferior al estilo iOS. Se cierra tocando fuera, con la X o
 * arrastrando la cabecera hacia abajo (como las sheets nativas).
 */
export function Sheet({ open, onClose, title, children, footer, full }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; dy: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    // Bloquea el scroll del fondo mientras la hoja está abierta
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

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
    if (close) setTimeout(onClose, 200);
  };

  return createPortal(
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className={`sheet${full ? ' full' : ''}`} ref={sheetRef} role="dialog" aria-modal="true">
        <div className="sheet-header" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          <div className="sheet-handle" />
          <div className="row between">
            <div className="sheet-title grow">{title}</div>
            <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
              <IconClose size={20} />
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
