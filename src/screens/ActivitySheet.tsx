import { useEffect, useMemo, useState } from 'react';
import { Sheet } from '../components/Sheet';
import { NumberInput, toNum } from '../components/common';
import { IconSearch } from '../components/Icons';
import { toast } from '../components/Toast';
import { ACTIVITIES, activityKcal, type ActivityType } from '../lib/activities';
import { normalize } from '../lib/foods';
import { actions, uid } from '../store/store';

export function ActivitySheet({ open, onClose, date, weightKg }: { open: boolean; onClose: () => void; date: string; weightKg: number }) {
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<ActivityType | null>(null);
  const [minutes, setMinutes] = useState<number | ''>(30);
  const [manualKcal, setManualKcal] = useState<number | ''>('');
  const [custom, setCustom] = useState(false);
  const [customName, setCustomName] = useState('');

  useEffect(() => {
    if (open) {
      setQuery('');
      setPicked(null);
      setCustom(false);
      setMinutes(30);
      setManualKcal('');
      setCustomName('');
    }
  }, [open]);

  const list = useMemo(() => ACTIVITIES.filter((a) => normalize(a.name).includes(normalize(query))), [query]);
  const estimated = picked ? activityKcal(picked.met, weightKg, toNum(minutes)) : 0;
  const kcal = manualKcal !== '' ? Math.round(toNum(manualKcal)) : estimated;

  const save = () => {
    if (kcal <= 0) return;
    actions.addActivity(date, {
      id: uid(),
      activityId: picked?.id ?? 'custom',
      name: picked?.name ?? (customName.trim() || 'Actividad'),
      minutes: Math.round(toNum(minutes)),
      kcal,
      emoji: picked?.emoji ?? '⭐',
      createdAt: new Date().toISOString()
    });
    toast(`+${kcal} kcal quemadas`, '🔥');
    onClose();
  };

  const showForm = picked || custom;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      full={!showForm}
      title={picked ? `${picked.emoji} ${picked.name}` : custom ? 'Actividad personalizada' : 'Añadir actividad'}
      footer={showForm ? <button className="btn block" disabled={kcal <= 0} onClick={save}>Añadir · {kcal} kcal</button> : undefined}
    >
      {!showForm ? (
        <>
          <div className="search">
            <IconSearch size={20} className="faint" />
            <input type="search" placeholder="Buscar actividad" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar actividad" />
          </div>
          <div className="group" style={{ marginTop: '0.47rem' }}>
            {list.map((a) => (
              <button key={a.id} className="cell" onClick={() => setPicked(a)}>
                <span className="emoji-tile">{a.emoji}</span>
                <span className="grow">{a.name}</span>
                <span className="small muted num">~{activityKcal(a.met, weightKg, 30)} kcal/30 min</span>
              </button>
            ))}
            <button className="cell" onClick={() => setCustom(true)}>
              <span className="emoji-tile">⭐</span>
              <span className="grow">Otra actividad (introducir kcal)</span>
            </button>
          </div>
          <p className="small faint" style={{ marginTop: '0.94rem' }}>
            Las kcal se estiman con valores MET según tu peso actual ({weightKg} kg). Si tu reloj te da la cifra, introdúcela a mano: será más precisa.
          </p>
        </>
      ) : (
        <div className="stack">
          {custom && (
            <div className="field">
              <label>Nombre</label>
              <input className="input" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Ej: Clase de spinning" autoFocus />
            </div>
          )}
          <div className="field">
            <label>Duración</label>
            <NumberInput value={minutes} onChange={setMinutes} suffix="min" decimal={false} />
          </div>
          <div className="chips">
            {[15, 30, 45, 60, 90].map((m) => (
              <button key={m} className={`chip${toNum(minutes) === m ? ' active' : ''}`} onClick={() => setMinutes(m)}>{m} min</button>
            ))}
          </div>
          <div className="field">
            <label>{picked ? `Calorías (estimado: ${estimated} kcal)` : 'Calorías quemadas'}</label>
            <NumberInput value={manualKcal} onChange={setManualKcal} suffix="kcal" decimal={false} placeholder={picked ? String(estimated) : ''} />
          </div>
          <button className="link" onClick={() => { setPicked(null); setCustom(false); }}>← Elegir otra actividad</button>
        </div>
      )}
    </Sheet>
  );
}
