// ─────────────── Respuesta háptica ───────────────
// Safari en iPhone no implementa `navigator.vibrate`. Desde iOS 18, los
// interruptores nativos (<input type="checkbox" switch>) dan un toque háptico
// al cambiar; activar uno oculto en respuesta a un toque del usuario produce
// ese mismo toque. En Android se usa `vibrate`. Donde no hay soporte, no hace
// nada (ni falla).

let label: HTMLLabelElement | null = null;

function iosSwitch(): HTMLLabelElement {
  if (label?.isConnected) return label;
  label = document.createElement('label');
  label.setAttribute('aria-hidden', 'true');
  label.style.cssText = 'position:fixed;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;left:-9999px;top:0';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  input.tabIndex = -1;
  label.appendChild(input);
  document.body.appendChild(label);
  return label;
}

export function haptic() {
  try {
    // Solo justo después de un toque: fuera de un gesto, iOS y Chrome lo ignoran o avisan
    const ua = (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation;
    if (ua && !ua.isActive) return;
    if (typeof navigator.vibrate === 'function' && !/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      navigator.vibrate(12);
      return;
    }
    iosSwitch().click();
  } catch {
    /* sin soporte: nada */
  }
}
