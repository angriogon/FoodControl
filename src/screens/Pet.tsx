import { useState } from 'react';
import { Mascot } from '../components/Mascot';
import { Gem, IconLock, IconPencil } from '../components/Icons';
import { toast } from '../components/Toast';
import { actions, useAppState } from '../store/store';
import { useGameStatus } from '../lib/hooks';
import { PET_COLORS, PET_ITEMS, SLOT_LABELS, achievementForItem, isItemOwned, type PetItem, type Slot } from '../lib/pet';
import { fmt } from '../lib/nutrition';

const MOOD_TEXT: Record<string, string> = {
  dormido: 'Está dormido. Registra tu primera comida del día para despertarle.',
  contento: 'Está tranquilo, esperando a ver qué comes hoy.',
  feliz: '¡Está feliz! Sigue registrando para llenarle de energía.',
  eufórico: '¡Está pletórico! Hoy lo estás bordando.'
};

export function Pet() {
  const state = useAppState();
  const game = useGameStatus();
  const [slot, setSlot] = useState<Slot>('hat');
  const { pet, achievements } = state;

  const items = PET_ITEMS.filter((i) => i.slot === slot);

  const onItem = (item: PetItem) => {
    const value = item.id.split(':')[1];
    if (isItemOwned(item.id, achievements, pet.purchased)) {
      actions.equip(item.slot, value);
      return;
    }
    if (item.price) {
      if (game.balance < item.price) {
        toast(`Te faltan ${item.price - game.balance} gemas`, '💎');
        return;
      }
      if (confirm(`¿Comprar “${item.name}” por ${item.price} gemas?`)) {
        actions.purchase(item.id, item.price);
        actions.equip(item.slot, value);
        toast(`¡${item.name} desbloqueado!`, '🎉');
      }
      return;
    }
    const ach = achievementForItem(item.id);
    if (ach) toast(`Se desbloquea con el logro “${ach.title}”`, ach.emoji, 3200);
  };

  return (
    <div className="screen">
      <div className="row between">
        <h1 className="screen-title" style={{ margin: '8px 0' }}>{pet.name}</h1>
        <span className="pill num"><Gem /> {fmt(game.balance)}</span>
      </div>

      <div className="pet-stage card" style={{ padding: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Mascot equipped={pet.equipped} level={game.level} mood={game.mood} size={Math.min(window.innerWidth - 40, 360)} />
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="row between">
          <b>Nivel {game.level}</b>
          <span className="small muted num">{fmt(game.toNext)} gemas para el nivel {game.level + 1}</span>
        </div>
        <div className="bar" style={{ marginTop: 10, height: 10 }}>
          <span style={{ width: `${Math.round(game.progress * 100)}%`, background: 'var(--gem)' }} />
        </div>
        <p className="muted small" style={{ marginBottom: 0 }}>{MOOD_TEXT[game.mood]}{game.level < 5 ? ' Cada nivel le crece una hoja nueva 🌱' : ''}</p>
        <button
          className="link small"
          style={{ marginTop: 12 }}
          onClick={() => {
            const n = prompt('¿Cómo quieres llamar a tu mascota?', pet.name);
            if (n && n.trim()) actions.renamePet(n.trim().slice(0, 20));
          }}
        >
          <IconPencil size={16} /> Cambiar nombre
        </button>
      </div>

      <h2 className="section-title">Armario</h2>
      <div className="chips" style={{ marginBottom: 14 }}>
        {(Object.keys(SLOT_LABELS) as Slot[]).map((s) => (
          <button key={s} className={`chip${slot === s ? ' active' : ''}`} onClick={() => setSlot(s)}>{SLOT_LABELS[s]}</button>
        ))}
      </div>
      <div className="item-grid">
        {items.map((item) => {
          const value = item.id.split(':')[1];
          const owned = isItemOwned(item.id, achievements, pet.purchased);
          const equipped = pet.equipped[item.slot] === value;
          const ach = achievementForItem(item.id);
          return (
            <button key={item.id} className={`item${equipped ? ' equipped' : ''}${owned ? '' : ' locked'}`} onClick={() => onItem(item)}>
              {!owned && <span className="lock"><IconLock size={14} /></span>}
              {item.slot === 'color' ? (
                <span style={{ width: 34, height: 34, borderRadius: 99, background: PET_COLORS[value].body, border: '3px solid #2A3344' }} />
              ) : item.slot === 'scene' ? (
                <span className="item-emoji">{{ prado: '🌳', playa: '🏖️', montana: '⛰️', cocina: '🍳', noche: '🌙' }[value] ?? '🏞️'}</span>
              ) : (
                <span className="item-emoji">{item.emoji}</span>
              )}
              <span>{item.name}</span>
              {!owned && (
                <span className="tiny muted">
                  {item.price ? <span className="row" style={{ gap: 3, justifyContent: 'center' }}><Gem size={12} />{item.price}</span> : ach ? `🏆 ${ach.title}` : ''}
                </span>
              )}
              {equipped && <span className="tiny" style={{ fontWeight: 700 }}>Puesto</span>}
            </button>
          );
        })}
      </div>

      <h2 className="section-title">Cómo ganar gemas</h2>
      <div className="card">
        {[
          ['🍽️', 'Cada comida registrada (máx. 4/día)', '+10'],
          ['💧', 'Cumplir el objetivo de agua', '+15'],
          ['🎯', 'Día dentro de tu objetivo (±10%, 3+ comidas)', '+25'],
          ['🥦', 'Día con alimentación de calidad', '+20'],
          ['👟', 'Registrar actividad', '+10'],
          ['✏️', 'Escribir una nota del día', '+5'],
          ['🏆', 'Cada logro desbloqueado', '+50']
        ].map(([e, t, g]) => (
          <div key={t} className="row" style={{ padding: '8px 0' }}>
            <span style={{ fontSize: 22 }}>{e}</span>
            <span className="grow small">{t}</span>
            <b className="num" style={{ color: 'var(--gem)' }}>{g}</b>
          </div>
        ))}
        <div className="card-feedback small muted">
          Hoy llevas <b className="num" style={{ color: 'var(--text)' }}>{game.todayReward.total}</b> gemas ganadas.
        </div>
      </div>
    </div>
  );
}
