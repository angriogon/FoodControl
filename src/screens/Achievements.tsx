import { useMemo } from 'react';
import { Flame, Gem } from '../components/Icons';
import { ProgressBar } from '../components/common';
import { useAppState, useTargets } from '../store/store';
import { ACHIEVEMENTS, computeStats } from '../lib/gamification';
import { useGameStatus } from '../lib/hooks';
import { itemName } from '../lib/pet';
import { fmt } from '../lib/nutrition';

const fmtDate = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

export function Achievements() {
  const state = useAppState();
  const targets = useTargets();
  const game = useGameStatus();
  const stats = useMemo(() => computeStats(state, targets), [state, targets]);
  const unlocked = ACHIEVEMENTS.filter((a) => state.achievements[a.id]);
  const locked = ACHIEVEMENTS.filter((a) => !state.achievements[a.id]).sort((a, b) => {
    const [va, ga] = a.progress(stats);
    const [vb, gb] = b.progress(stats);
    return vb / gb - va / ga;
  });

  return (
    <div className="screen">
      <header className="header">
        <div>
          <div className="eyebrow">{unlocked.length} de {ACHIEVEMENTS.length} conseguidos</div>
          <h1 className="large-title">Logros</h1>
        </div>
      </header>

      <div className="grid-3">
        <div className="card center" aria-label={`Racha actual: ${game.streak} días`}>
          <Flame size={24} />
          <div className="stat-value" style={{ fontSize: '1.5rem' }}>{game.streak}</div>
          <div className="tiny muted">Racha actual</div>
        </div>
        <div className="card center" style={{ marginTop: 0 }} aria-label={`Mejor racha: ${stats.bestStreak} días`}>
          <span style={{ fontSize: '1.3rem' }} aria-hidden="true">🏅</span>
          <div className="stat-value" style={{ fontSize: '1.5rem' }}>{stats.bestStreak}</div>
          <div className="tiny muted">Mejor racha</div>
        </div>
        <div className="card center" style={{ marginTop: 0 }} aria-label={`${game.earned} gemas ganadas en total`}>
          <Gem size={24} />
          <div className="stat-value" style={{ fontSize: '1.5rem' }}>{fmt(game.earned)}</div>
          <div className="tiny muted">Gemas</div>
        </div>
      </div>

      <div className="card mt">
        <div className="row between small">
          <b>Progreso total</b>
          <span className="muted">{stats.daysLogged} días registrados</span>
        </div>
        <ProgressBar value={unlocked.length} max={ACHIEVEMENTS.length} color="var(--kcal)" className="lg mt-s" label={`${unlocked.length} de ${ACHIEVEMENTS.length} logros`} />
      </div>

      {locked.length > 0 && (
        <>
          <h2 className="section-title">En progreso</h2>
          <div className="group inset-icons">
            {locked.map((a) => {
              const [v, g] = a.progress(stats);
              return (
                <div key={a.id} className="cell locked" style={{ alignItems: 'flex-start', paddingTop: '0.8rem', paddingBottom: '0.8rem' }}>
                  <span className="ach-icon" aria-hidden="true">{a.emoji}</span>
                  <div className="grow">
                    <span className="cell-title bold">{a.title}</span>
                    <span className="cell-sub">{a.description}</span>
                    <div className="row" style={{ gap: '0.5rem', marginTop: '0.45rem' }}>
                      <ProgressBar value={v} max={g} color="var(--kcal)" className="grow" label={`${a.title}: ${fmt(v, 1)} de ${g}`} />
                      <span className="tiny num muted" aria-hidden="true">{fmt(v, 1)}/{g}</span>
                    </div>
                    <div className="tiny muted" style={{ marginTop: '0.3rem' }}>Premio: {itemName(a.reward)} + 50 💎</div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {unlocked.length > 0 && (
        <>
          <h2 className="section-title">Conseguidos</h2>
          <div className="group inset-icons">
            {unlocked.map((a) => (
              <div key={a.id} className="cell">
                <span className="ach-icon" style={{ background: 'var(--fat-bg)' }} aria-hidden="true">{a.emoji}</span>
                <div className="grow">
                  <span className="cell-title bold">{a.title}</span>
                  <span className="cell-sub">{a.description}</span>
                  <span className="cell-sub">{fmtDate.format(new Date(state.achievements[a.id]))} · {itemName(a.reward)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
