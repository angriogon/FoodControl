import { useState } from 'react';
import type { Species } from '../types';
import { Mascot } from '../components/Mascot';
import { Cell, ProgressBar } from '../components/common';
import { Gem, IconLock, IconPencil } from '../components/Icons';
import { toast } from '../components/Toast';
import { actions, useAppState } from '../store/store';
import { useGameStatus } from '../lib/hooks';
import {
  PET_ITEMS, SLOT_LABELS, SLOT_ORDER, SPECIES, SPECIES_ORDER, achievementForItem, isItemOwned, type PetItem, type Slot
} from '../lib/pet';
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

  const chooseSpecies = (sp: Species) => {
    if (sp === pet.species) return;
    // Si conservaba el nombre por defecto, adopta el de la nueva especie
    const keepName = pet.name !== SPECIES[pet.species].defaultName;
    actions.setSpecies(sp, keepName ? pet.name : SPECIES[sp].defaultName);
  };

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
    if (ach) toast(`Se consigue con el logro “${ach.title}”`, ach.emoji, 3200);
  };

  return (
    <div className="screen">
      <header className="header">
        <div>
          <div className="eyebrow">Tu mascota</div>
          <h1 className="large-title">{pet.name}</h1>
        </div>
        <span className="pill num" aria-label={`${game.balance} gemas disponibles`}><Gem size={18} /> {fmt(game.balance)}</span>
      </header>

      <div className="pet-stage">
        <Mascot
          species={pet.species}
          equipped={pet.equipped}
          level={game.level}
          mood={game.mood}
          size="100%"
          label={`${pet.name}, ${SPECIES[pet.species].name.toLowerCase()}, nivel ${game.level}`}
        />
      </div>

      <div className="card mt">
        <div className="row between">
          <b>Nivel {game.level}</b>
          <span className="small muted num">{fmt(game.toNext)} gemas para el nivel {game.level + 1}</span>
        </div>
        <ProgressBar value={game.progress} max={1} color="var(--gem)" className="lg mt-s" label={`Progreso del nivel ${game.level}: ${Math.round(game.progress * 100)}%`} />
        <p className="small muted mt-s">
          {MOOD_TEXT[game.mood]}
          {pet.species === 'brote' && game.level < 5 ? ' Cada nivel le crece una hoja nueva 🌱' : ''}
        </p>
        <button
          className="link small"
          onClick={() => {
            const n = prompt('¿Cómo quieres llamar a tu mascota?', pet.name);
            if (n && n.trim()) actions.renamePet(n.trim().slice(0, 20));
          }}
        >
          <IconPencil size={16} /> Cambiar nombre
        </button>
      </div>

      <h2 className="section-title">Elige tu mascota</h2>
      <div className="species-row" role="group" aria-label="Especie">
        {SPECIES_ORDER.map((sp) => (
          <button key={sp} className="species" aria-pressed={pet.species === sp} onClick={() => chooseSpecies(sp)} aria-label={`${SPECIES[sp].name}: ${SPECIES[sp].description}`}>
            <Mascot species={sp} equipped={{ ...pet.equipped, scene: 'prado' }} level={game.level} mood="feliz" size="4.4rem" scene={false} />
            <span aria-hidden="true">{SPECIES[sp].name}</span>
          </button>
        ))}
      </div>

      <div className="row between" style={{ margin: '1.8rem 0 0.7rem' }}>
        <h2 className="section-title" style={{ margin: 0 }}>Personalizar</h2>
        <button className="btn plain small" onClick={() => { actions.resetOutfit(); toast('Accesorios quitados', '🧺'); }}>Quitar todo</button>
      </div>
      <div className="chips" role="group" aria-label="Zona a personalizar" style={{ marginBottom: '0.8rem' }}>
        {SLOT_ORDER.map((s) => (
          <button key={s} className={`chip${slot === s ? ' active' : ''}`} aria-pressed={slot === s} onClick={() => setSlot(s)}>
            {SLOT_LABELS[s]}
          </button>
        ))}
      </div>
      <div className="item-grid">
        {items.map((item) => {
          const value = item.id.split(':')[1];
          const owned = isItemOwned(item.id, achievements, pet.purchased);
          const equipped = pet.equipped[item.slot] === value;
          const ach = achievementForItem(item.id);
          const status = equipped ? 'Puesto' : owned ? '' : item.price ? `${item.price} gemas` : ach ? `Logro: ${ach.title}` : '';
          return (
            <button
              key={item.id}
              className={`item${owned ? '' : ' locked'}`}
              aria-pressed={equipped}
              onClick={() => onItem(item)}
              aria-label={`${item.name}. ${equipped ? 'Puesto' : owned ? 'Disponible' : item.price ? `Bloqueado, cuesta ${item.price} gemas` : ach ? `Bloqueado, se consigue con el logro ${ach.title}` : 'Bloqueado'}`}
            >
              <span className="item-preview" aria-hidden="true">
                <Mascot
                  species={pet.species}
                  equipped={{ ...pet.equipped, [item.slot]: value }}
                  level={game.level}
                  mood="feliz"
                  size="100%"
                  scene={item.slot === 'scene'}
                />
              </span>
              {!owned && <span className="lock" aria-hidden="true"><IconLock size={11} /></span>}
              <span aria-hidden="true">{item.name}</span>
              {status && (
                <span className="tiny muted ellipsis" style={{ maxWidth: '100%' }} aria-hidden="true">
                  {item.price && !owned ? <span className="row" style={{ gap: '0.2rem', justifyContent: 'center' }}><Gem size={12} />{item.price}</span> : status}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <h2 className="section-title">Cómo ganar gemas</h2>
      <div className="group inset-icons">
        {[
          ['🍽️', 'Cada comida registrada (máx. 4/día)', '+10'],
          ['💧', 'Cumplir el objetivo de agua', '+15'],
          ['🎯', 'Día dentro de tu objetivo (±10 %, 3+ comidas)', '+25'],
          ['🥦', 'Día con alimentación de calidad', '+20'],
          ['👟', 'Registrar actividad', '+10'],
          ['✏️', 'Escribir una nota del día', '+5'],
          ['🏆', 'Cada logro desbloqueado', '+50']
        ].map(([e, t, g]) => (
          <Cell key={t} icon={<span className="emoji-tile" aria-hidden="true">{e}</span>} title={<span className="small">{t}</span>}
            right={<b className="num" style={{ color: 'var(--gem)' }}>{g}</b>} />
        ))}
      </div>
      <p className="section-footer">Hoy llevas <b className="num">{game.todayReward.total}</b> gemas ganadas.</p>
    </div>
  );
}
