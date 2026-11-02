import { useMemo, useState } from 'react';
import { Flame, Gem } from '../components/Icons';
import { ProgressBar, Segmented } from '../components/common';
import { useAppState, useTargets } from '../store/store';
import { ACHIEVEMENTS, SERIES, computeStats, type Achievement, type SeriesId } from '../lib/gamification';
import { useGameStatus } from '../lib/hooks';
import { itemName } from '../lib/pet';
import { fmt } from '../lib/nutrition';

const fmtDate = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

/** Muestra minutos como horas cuando corresponde */
function fmtValue(a: Achievement, v: number): string {
  if (a.series === 'minutos') return `${fmt(v / 60, v < 600 ? 1 : 0)} h`;
  if (a.series === 'kilos') return `${fmt(v, 1)} kg`;
  return fmt(v);
}

export function Achievements() {
  const state = useAppState();
  const targets = useTargets();
  const game = useGameStatus();
  const [view, setView] = useState<'progreso' | 'conseguidos'>('progreso');
  const stats = useMemo(() => computeStats(state, targets), [state, targets]);
  const unlocked = ACHIEVEMENTS.filter((a) => state.achievements[a.id]).sort((a, b) =>
    state.achievements[b.id].localeCompare(state.achievements[a.id])
  );

  // Por cada serie, el siguiente nivel pendiente (o la serie completa)
  const seriesRows = useMemo(() => {
    const ids = Object.keys(SERIES) as SeriesId[];
    return ids
      .map((id) => {
        const tiers = ACHIEVEMENTS.filter((a) => a.series === id);
        const done = tiers.filter((a) => state.achievements[a.id]).length;
        const next = tiers.find((a) => !state.achievements[a.id]);
        return { id, tiers, done, next };
      })
      .sort((a, b) => {
        // Primero lo más cercano a conseguirse; las series completas al final
        if (!a.next) return 1;
        if (!b.next) return -1;
        const pa = a.next.value(stats) / a.next.goal;
        const pb = b.next.value(stats) / b.next.goal;
        return pb - pa;
      });
  }, [state.achievements, stats]);

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
          <span className="muted">{stats.daysLogged} {stats.daysLogged === 1 ? 'día' : 'días'} · {stats.weeksActive} {stats.weeksActive === 1 ? 'semana constante' : 'semanas constantes'}</span>
        </div>
        <ProgressBar value={unlocked.length} max={ACHIEVEMENTS.length} color="var(--kcal)" className="lg mt-s"
          label={`${unlocked.length} de ${ACHIEVEMENTS.length} logros`} />
        <p className="tiny muted mt-s">Los logros están pensados para meses y años de uso: los últimos niveles son todo un reto.</p>
      </div>

      <div className="mt">
        <Segmented label="Vista" value={view} onChange={setView}
          options={[{ value: 'progreso', label: 'En progreso' }, { value: 'conseguidos', label: `Conseguidos (${unlocked.length})` }]} />
      </div>

      {view === 'progreso' ? (
        <div className="group inset-icons mt">
          {seriesRows.map(({ id, tiers, done, next }) => {
            const info = SERIES[id];
            if (!next) {
              return (
                <div key={id} className="cell">
                  <span className="ach-icon" style={{ background: 'var(--fat-bg)' }} aria-hidden="true">{info.emoji}</span>
                  <div className="grow">
                    <span className="cell-title bold">{info.name}</span>
                    <span className="cell-sub">¡Serie completada! {tiers.length} de {tiers.length} niveles 🏆</span>
                  </div>
                </div>
              );
            }
            const v = next.value(stats);
            return (
              <div key={id} className="cell locked" style={{ alignItems: 'flex-start', paddingTop: '0.8rem', paddingBottom: '0.8rem' }}>
                <span className="ach-icon" aria-hidden="true">{next.emoji}</span>
                <div className="grow">
                  <div className="row between" style={{ gap: '0.5rem', alignItems: 'baseline' }}>
                    <span className="cell-title bold">{next.title}</span>
                    <span className="tiny muted" style={{ whiteSpace: 'nowrap' }}>{info.name} · {done + 1}/{tiers.length}</span>
                  </div>
                  <span className="cell-sub">{next.description}</span>
                  <div className="row" style={{ gap: '0.5rem', marginTop: '0.45rem' }}>
                    <ProgressBar value={v} max={next.goal} color="var(--kcal)" className="grow"
                      label={`${next.title}: ${fmtValue(next, v)} de ${fmtValue(next, next.goal)}`} />
                    <span className="tiny num muted" aria-hidden="true">{fmtValue(next, Math.min(v, next.goal))}/{fmtValue(next, next.goal)}</span>
                  </div>
                  <div className="tiny muted" style={{ marginTop: '0.3rem' }}>
                    Premio: {next.reward ? `${itemName(next.reward)} + ` : ''}{fmt(next.gems)} 💎
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : unlocked.length ? (
        <div className="group inset-icons mt">
          {unlocked.map((a) => (
            <div key={a.id} className="cell">
              <span className="ach-icon" style={{ background: 'var(--fat-bg)' }} aria-hidden="true">{a.emoji}</span>
              <div className="grow">
                <span className="cell-title bold">{a.title}</span>
                <span className="cell-sub">{a.description}</span>
                <span className="cell-sub">
                  {fmtDate.format(new Date(state.achievements[a.id]))} · {a.reward ? `${itemName(a.reward)} · ` : ''}+{fmt(a.gems)} 💎
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="center muted mt" style={{ padding: '2rem 1rem' }}>Aún no has conseguido ningún logro de esta temporada. ¡El primero está más cerca de lo que crees!</p>
      )}
    </div>
  );
}
