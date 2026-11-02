import { Component, type ReactNode } from 'react';
import { actions, getState } from '../store/store';
import { exportBackup } from '../lib/storage';

// Red de seguridad: si cualquier pantalla falla al dibujarse, en vez de
// quedarse en blanco se muestra esta pantalla para recuperar los datos.
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('FoodControl: error de interfaz', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="screen" style={{ paddingBottom: '2rem' }}>
        <div className="center" style={{ fontSize: '3rem', marginTop: '2rem' }} aria-hidden="true">🩹</div>
        <h1 className="large-title center" style={{ marginTop: '0.5rem' }}>Algo ha fallado</h1>
        <p className="muted center mt">
          Tus datos siguen guardados en el iPhone. Primero guarda una copia por si acaso y después intenta volver a abrir la app.
        </p>
        <div className="stack mt">
          <button className="btn block" onClick={() => void exportBackup(getState())}>Guardar copia de mis datos</button>
          <button className="btn block gray" onClick={() => location.reload()}>Reintentar</button>
          <button
            className="btn block danger"
            onClick={() => {
              if (confirm('¿Borrar todos los datos de FoodControl de este iPhone? Haz antes una copia.')) {
                actions.reset();
                setTimeout(() => location.reload(), 300);
              }
            }}
          >
            Empezar de cero
          </button>
        </div>
        <p className="tiny faint center mt">Detalle técnico: {this.state.error.message.slice(0, 160)}</p>
      </main>
    );
  }
}
