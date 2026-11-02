import { useRef, useState } from 'react';
import type { Profile } from '../types';
import { Mascot } from '../components/Mascot';
import { IconChevronLeft } from '../components/Icons';
import { toast } from '../components/Toast';
import { actions, useAppState } from '../store/store';
import { computeTargets, fmt } from '../lib/nutrition';
import { parseBackup, requestPersistence } from '../lib/storage';
import { todayKey } from '../lib/dates';
import { ProfileFields } from './Settings';
import { SPECIES, SPECIES_ORDER } from '../lib/pet';

export function Onboarding() {
  const state = useAppState();
  const [step, setStep] = useState(0);
  const [p, setP] = useState<Profile>(state.profile);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((x) => ({ ...x, [k]: v }));
  const targets = computeTargets(p, p.startWeightKg);

  const finish = () => {
    actions.updateProfile({ ...p, name: p.name.trim(), onboarded: true });
    actions.addWeight({ date: todayKey(), kg: p.startWeightKg });
    void requestPersistence();
    window.scrollTo(0, 0);
  };

  const validPersonal = p.heightCm >= 120 && p.heightCm <= 230 && p.birthYear > 1920 && p.birthYear < new Date().getFullYear() - 12;
  const validGoal = p.startWeightKg >= 30 && p.goalWeightKg >= 30 && p.startWeightKg <= 350 && p.goalWeightKg <= 350;

  return (
    <div className="screen" style={{ paddingBottom: 'calc(var(--safe-bottom) + 1.4rem)', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {step > 0 && (
        <button className="icon-btn" onClick={() => setStep(step - 1)} aria-label="Atrás"><IconChevronLeft size={16} /></button>
      )}

      {step === 0 && (
        <div className="grow center" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="pet-stage" style={{ width: '15rem', margin: '0 auto' }}>
            <Mascot species={state.pet.species} equipped={state.pet.equipped} mood="eufórico" size="100%" label={`${state.pet.name}, tu mascota`} />
          </div>
          <h1 className="large-title" style={{ marginTop: '1.4rem' }}>¡Hola! Soy {state.pet.name}</h1>
          <p className="muted" style={{ marginTop: '0.5rem' }}>
            Te acompañaré en tu día a día. Registra lo que comes, bebes y entrenas, y yo iré creciendo y desbloqueando cosas contigo.
          </p>
          <h2 className="section-header" style={{ textAlign: 'left' }}>Elige tu compañero</h2>
          <div className="species-row" role="group" aria-label="Especie">
            {SPECIES_ORDER.map((sp) => (
              <button key={sp} className="species" aria-pressed={state.pet.species === sp} onClick={() => actions.setSpecies(sp, SPECIES[sp].defaultName)} aria-label={SPECIES[sp].name}>
                <Mascot species={sp} equipped={state.pet.equipped} mood="feliz" size="4.4rem" scene={false} />
                <span aria-hidden="true">{SPECIES[sp].name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {step === 1 && (
        <div className="grow">
          <h1 className="large-title" style={{ margin: '0.8rem 0 1.2rem' }}>Cuéntame sobre ti</h1>
          <ProfileFields p={p} set={set} only="personal" />
        </div>
      )}
      {step === 2 && (
        <div className="grow">
          <h1 className="large-title" style={{ margin: '0.8rem 0 1.2rem' }}>Tu objetivo</h1>
          <ProfileFields p={p} set={set} only="goal" />
        </div>
      )}
      {step === 3 && (
        <div className="grow">
          <h1 className="large-title" style={{ margin: '0.8rem 0 1.2rem' }}>Tu plan diario</h1>
          <div className="card center">
            <div className="num" style={{ fontSize: '3.06rem', fontWeight: 700 }}>{fmt(targets.kcal)}</div>
            <div className="muted">kcal al día</div>
            <div className="grid-3" style={{ marginTop: '1.06rem' }}>
              <div><b className="num">{targets.protein} g</b><div className="small muted">Proteína</div></div>
              <div><b className="num">{targets.carbs} g</b><div className="small muted">Carbohid.</div></div>
              <div><b className="num">{targets.fat} g</b><div className="small muted">Grasa</div></div>
            </div>
          </div>
          <p className="small muted">
            Calculado con la fórmula Mifflin-St Jeor según tus datos{p.goal !== 'mantener' ? ` y un ritmo de ${String(p.weeklyRateKg).replace('.', ',')} kg/semana` : ''}.
            Puedes cambiarlo cuando quieras en Perfil → Objetivos.
          </p>
          <div className="banner small" style={{ marginTop: '0.82rem' }}>
            <span>🔒</span>
            <span>Tus datos se guardan <b>solo en tu iPhone</b>. Para no perderlos, instala la app en la pantalla de inicio y haz copias de seguridad en iCloud desde Perfil.</span>
          </div>
        </div>
      )}

      <div style={{ marginTop: '1.41rem' }}>
        {step < 3 ? (
          <button className="btn block" disabled={(step === 1 && !validPersonal) || (step === 2 && !validGoal)} onClick={() => setStep(step + 1)}>
            {step === 0 ? 'Empezar' : 'Continuar'}
          </button>
        ) : (
          <button className="btn block" onClick={finish}>¡Vamos allá!</button>
        )}
        {step === 0 && (
          <>
            <button className="btn block plain" style={{ marginTop: '0.3rem' }} onClick={() => fileRef.current?.click()}>Ya tengo una copia de seguridad</button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                try {
                  const next = await parseBackup(f);
                  actions.replaceState({ ...next, profile: { ...next.profile, onboarded: true } });
                  void requestPersistence();
                  toast('Copia restaurada', '✅');
                } catch (err) {
                  toast((err as Error).message, '⚠️', 4000);
                }
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
