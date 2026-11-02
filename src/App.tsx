import { Suspense, lazy, useEffect, useState } from 'react';
import { TabBar, type Tab } from './components/TabBar';
import { Toasts, toast } from './components/Toast';
import { whenNoSheet } from './components/Sheet';
import { ConfirmHost } from './components/Confirm';
import { actions, currentWeight, useAppState, useStoreReady, useTargets } from './store/store';
import { evaluateAdaptive, shouldRunAdaptive } from './lib/adaptive';
import { todayKey } from './lib/dates';
import { ACHIEVEMENTS, computeStats } from './lib/gamification';
import { Home } from './screens/Home';
import { Diary } from './screens/Diary';
import { Segmented } from './components/common';

// Inicio y Diario se cargan al abrir; el resto, la primera vez que entras
// (quedan guardadas por el service worker, así que funcionan sin conexión)
const Achievements = lazy(() => import('./screens/Achievements').then((m) => ({ default: m.Achievements })));
const Recipes = lazy(() => import('./screens/Recipes').then((m) => ({ default: m.Recipes })));
const Pet = lazy(() => import('./screens/Pet').then((m) => ({ default: m.Pet })));
const Profile = lazy(() => import('./screens/Profile').then((m) => ({ default: m.Profile })));
const Onboarding = lazy(() => import('./screens/Onboarding').then((m) => ({ default: m.Onboarding })));

const TABS: Tab[] = ['inicio', 'diario', 'recetas', 'mascota', 'logros', 'perfil'];
const SEEN_KEY = 'foodcontrol:seen-achievements';

function tabFromHash(): Tab {
  const h = location.hash.replace('#/', '') as Tab;
  return TABS.includes(h) ? h : 'inicio';
}

export default function App() {
  const ready = useStoreReady();
  const state = useAppState();
  const targets = useTargets();
  const [tab, setTab] = useState<Tab>(tabFromHash);
  const [dataOpen, setDataOpen] = useState(false);
  const [seen, setSeen] = useState(() => {
    try {
      return Number(localStorage.getItem(SEEN_KEY)) || 0;
    } catch {
      return 0;
    }
  });

  // Navegación por hash: permite volver con el gesto atrás y recordar la pestaña
  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = (t: Tab) => {
    if (t !== tab) {
      history.replaceState(null, '', `#/${t}`);
      setTab(t);
      window.scrollTo(0, 0);
    }
  };

  // Accesibilidad y apariencia: tamaño de texto, tema y contraste
  const { textSize, theme, highContrast } = state.ui;
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.text = textSize;
    root.dataset.theme = theme;
    root.dataset.contrast = highContrast ? 'high' : 'normal';
    const dark = theme === 'dark' || (theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#000000' : '#FFFFFF');
  }, [textSize, theme, highContrast]);

  // Objetivo adaptativo: una vez por semana, si hay datos suficientes, se ajusta solo
  useEffect(() => {
    if (!ready) return;
    const today = todayKey();
    if (!shouldRunAdaptive(state, today)) return;
    const r = evaluateAdaptive(state, today, currentWeight(state));
    if (!r.ok) return; // sin datos suficientes: se vuelve a intentar otro día
    actions.recordAdaptive(r.check);
    const diff = r.check.target - r.check.prevTarget;
    if (diff !== 0) {
      setTimeout(() => whenNoSheet(() => toast(`Objetivo ajustado: ${r.check.prevTarget} → ${r.check.target} kcal`, '🎯', 4000)), 600);
    }
  }, [ready, state]);

  // Detecta logros nuevos cada vez que cambian los datos
  useEffect(() => {
    if (!ready || !state.profile.onboarded) return;
    const stats = computeStats(state, targets);
    const fresh = ACHIEVEMENTS.filter((a) => !state.achievements[a.id] && a.check(stats));
    if (fresh.length) {
      actions.unlockAchievements(fresh.map((a) => a.id));
      // Se muestran cuando cierres la hoja que tengas abierta, para no tapar lo que haces
      setTimeout(() => whenNoSheet(() => {
        fresh.forEach((a, i) => setTimeout(() => toast(`¡Logro: ${a.title}! +${a.gems} 💎`, a.emoji, 3500), i * 900));
      }), 400);
    }
  }, [ready, state, targets]);

  const unlockedCount = Object.keys(state.achievements).length;
  useEffect(() => {
    // Si se borran o restauran datos, el contador “visto” puede quedar por encima
    if ((tab === 'logros' && seen !== unlockedCount) || unlockedCount < seen) {
      setSeen(unlockedCount);
      try {
        localStorage.setItem(SEEN_KEY, String(unlockedCount));
      } catch {
        /* modo privado */
      }
    }
  }, [tab, unlockedCount, seen]);

  if (!ready) {
    return <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', fontSize: '3rem' }} aria-label="Cargando">🌱</div>;
  }

  if (!state.profile.onboarded) {
    return (
      <main className="app">
        <div className="statusbar-bg" aria-hidden="true" />
        <Suspense fallback={null}><Onboarding /></Suspense>
        <Toasts />
        <ConfirmHost />
      </main>
    );
  }

  return (
    <>
      <div className="statusbar-bg" aria-hidden="true" />
      <main className="app">
      <Suspense fallback={<div className="screen" aria-busy="true" />}>
      {tab === 'inicio' && <Home go={go} openData={() => { go('perfil'); setDataOpen(true); }} />}
      {tab === 'diario' && <Diary />}
      {tab === 'recetas' && <Recipes />}
      {(tab === 'mascota' || tab === 'logros') && (
        <>
          <div className="pet-switch">
            <Segmented label="Mascota o logros" value={tab} onChange={go}
              options={[{ value: 'mascota', label: 'Mascota' }, { value: 'logros', label: `Logros${unlockedCount - seen > 0 ? ` (${unlockedCount - seen})` : ''}` }]} />
          </div>
          {tab === 'mascota' ? <Pet /> : <Achievements />}
        </>
      )}
      {tab === 'perfil' && <Profile dataOpen={dataOpen} setDataOpen={setDataOpen} />}
      </Suspense>
      </main>
      <TabBar tab={tab} onChange={go} badges={{ mascota: Math.max(0, unlockedCount - seen) }} />
      <Toasts />
      <ConfirmHost />
    </>
  );
}
