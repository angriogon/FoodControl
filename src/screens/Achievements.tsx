import { useMemo } from 'react';
import { Flame, Gem } from '../components/Icons';
import { useAppState, useTargets } from '../store/store';
import { ACHIEVEMENTS, computeStats } from '../lib/gamification';
import { useGameStatus } from '../lib/hooks';
import { PET_ITEMS } from '../lib/pet';
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
      <h1 className="screen-title">Logros</h1>

      <div className="grid-3">
        <div className="card center" style={{ padding: 14 }}>
          <Flame size={26} />
          <div className="num" style={{ fontSize: 24, fontWeight: 700 }}>{game.streak}</div>
          <div className="tiny muted">Racha actual</div>
        </div>
        <div className="card center" style={{ padding: 14, marginTop: 0 }}>
          <span style={{ fontSize: 22 }}>🏅</span>
          <div className="num" style={{ fontSize: 24, fontWeight: 700 }}>{stats.bestStreak}</div>
          <div className="tiny muted">Mejor racha</div>
        </div>
        <div className="card center" style={{ padding: 14, marginTop: 0 }}>
          <Gem size={26} />
          <div className="num" style={{ fontSize: 24, fontWeight: 700 }}>{fmt(game.earned)}</div>
          <div className="tiny muted">Gemas ganadas</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="row between">
          <b>{unlocked.length} de {ACHIEVEMENTS.length} logros</b>
          <span className="small muted">{stats.daysLogged} días registrados</span>
        </div>
        <div className="bar" style={{ marginTop: 10, height: 10 }}>
          <span style={{ width: `${(unlocked.length / ACHIEVEMENTS.length) * 100}%`, background: 'var(--good)' }} />
        </div>
      </div>

      {locked.length > 0 && (
        <>
          <h2 className="section-title">En progreso</h2>
          <div className="card list" style={{ paddingTop: 4, paddingBottom: 4 }}>
            {locked.map((a) => {
              const [v, g] = a.progress(stats);
              const reward = PET_ITEMS.find((i) => i.id === a.reward);
              return (
                <div key={a.id} className="ach locked">
                  <span className="ach-icon">{a.emoji}</span>
                  <div className="grow">
                    <b>{a.title}</b>
                    <div className="small muted">{a.description}</div>
                    <div className="row" style={{ gap: 8, marginTop: 6 }}>
                      <div className="bar grow"><span style={{ width: `${(v / g) * 100}%`, background: 'var(--accent-strong)' }} /></div>
                      <span className="tiny num muted">{fmt(v, 1)}/{g}</span>
                    </div>
                    {reward && <div className="tiny faint" style={{ marginTop: 4 }}>Premio: {reward.emoji} {reward.name} + 50 💎</div>}
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
          <div className="card list" style={{ paddingTop: 4, paddingBottom: 4 }}>
            {unlocked.map((a) => {
              const reward = PET_ITEMS.find((i) => i.id === a.reward);
              return (
                <div key={a.id} className="ach">
                  <span className="ach-icon" style={{ background: 'var(--fat-bg)' }}>{a.emoji}</span>
                  <div className="grow">
                    <b>{a.title}</b>
                    <div className="small muted">{a.description}</div>
                    <div className="tiny faint" style={{ marginTop: 2 }}>
                      {fmtDate.format(new Date(state.achievements[a.id]))}{reward ? ` · ${reward.emoji} ${reward.name}` : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
