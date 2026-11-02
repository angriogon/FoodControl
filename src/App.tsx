import { useEffect, useState } from 'react';
import { TabBar, type Tab } from './components/TabBar';
import { Toasts, toast } from './components/Toast';
import { actions, useAppState, useStoreReady, useTargets } from './store/store';
import { ACHIEVEMENTS, computeStats } from './lib/gamification';
import { Home } from './screens/Home';
import { Diary } from './screens/Diary';
import { Achievements } from './screens/Achievements';
import { Pet } from './screens/Pet';
import { Profile } from './screens/Profile';
import { Onboarding } from './screens/Onboarding';

const TABS: Tab[] = ['inicio', 'diario', 'logros', 'mascota', 'perfil'];
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

  // Detecta logros nuevos cada vez que cambian los datos
  useEffect(() => {
    if (!ready || !state.profile.onboarded) return;
    const stats = computeStats(state, targets);
    const fresh = ACHIEVEMENTS.filter((a) => !state.achievements[a.id] && a.check(stats));
    if (fresh.length) {
      actions.unlockAchievements(fresh.map((a) => a.id));
      fresh.forEach((a, i) => setTimeout(() => toast(`¡Logro: ${a.title}! +50 💎`, a.emoji, 3500), 400 + i * 900));
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
        <Onboarding />
        <Toasts />
      </main>
    );
  }

  return (
    <>
      <main className="app">
      {tab === 'inicio' && <Home go={go} openData={() => { go('perfil'); setDataOpen(true); }} />}
      {tab === 'diario' && <Diary />}
      {tab === 'logros' && <Achievements />}
      {tab === 'mascota' && <Pet />}
      {tab === 'perfil' && <Profile dataOpen={dataOpen} setDataOpen={setDataOpen} />}
      </main>
      <TabBar tab={tab} onChange={go} badges={{ logros: Math.max(0, unlockedCount - seen) }} />
      <Toasts />
    </>
  );
}
