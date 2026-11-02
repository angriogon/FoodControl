import { useEffect, useRef, useState } from 'react';
// El motor de lectura (.wasm) se sirve desde la propia app: funciona sin
// conexión y no carga nada de terceros (compatible con la CSP).
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';

type Detector = { detect: (src: HTMLVideoElement) => Promise<{ rawValue: string }[]> };

let detectorPromise: Promise<Detector> | null = null;

/** Carga perezosa: el lector (~1 MB) solo se descarga la primera vez que se escanea */
function getDetector(): Promise<Detector> {
  detectorPromise ??= import('barcode-detector/ponyfill').then((mod) => {
    mod.prepareZXingModule({
      overrides: { locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path) }
    });
    return new mod.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] }) as Detector;
  });
  return detectorPromise;
}

type Status = 'starting' | 'scanning' | 'denied' | 'unsupported' | 'error';

/**
 * Vista de cámara que lee códigos de barras de productos (EAN/UPC).
 * Llama a `onCode` una sola vez con el primer código válido.
 */
export function BarcodeScanner({ onCode }: { onCode: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<Status>('starting');
  const doneRef = useRef(false);
  const cbRef = useRef(onCode);
  cbRef.current = onCode;

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('unsupported');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
      } catch (err) {
        setStatus((err as DOMException).name === 'NotAllowedError' ? 'denied' : 'error');
        return;
      }
      if (cancelled) return stream.getTracks().forEach((t) => t.stop());
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play().catch(() => undefined);
      let detector: Detector;
      try {
        detector = await getDetector();
      } catch {
        setStatus('error');
        return;
      }
      setStatus('scanning');

      const tick = async () => {
        if (cancelled || doneRef.current) return;
        try {
          if (video.readyState >= 2) {
            const codes = await detector.detect(video);
            const valid = codes.map((c) => c.rawValue.replace(/\D/g, '')).find((c) => c.length >= 8);
            if (valid && !doneRef.current) {
              doneRef.current = true;
              navigator.vibrate?.(40);
              cbRef.current(valid);
              return;
            }
          }
        } catch {
          /* fotograma ilegible: se reintenta */
        }
        timer = setTimeout(tick, 200);
      };
      void tick();
    };

    void start();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div>
      <div className="scanner" aria-label="Vista de la cámara para escanear el código de barras">
        <video ref={videoRef} playsInline muted autoPlay />
        {status === 'scanning' && (
          <>
            <div className="scanner-frame" aria-hidden="true" />
            <div className="scanner-line" aria-hidden="true" />
          </>
        )}
      </div>
      <p className="small muted center mt-s" role="status">
        {status === 'starting' && 'Abriendo la cámara…'}
        {status === 'scanning' && 'Centra el código de barras dentro del recuadro.'}
        {status === 'denied' && 'Sin permiso para usar la cámara. Actívalo en Ajustes › Safari › Cámara, o escribe el código abajo.'}
        {status === 'unsupported' && 'Este dispositivo no permite usar la cámara desde la web. Escribe el código abajo.'}
        {status === 'error' && 'No se pudo iniciar el escáner. Escribe el código abajo.'}
      </p>
    </div>
  );
}
