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
    <div className="screen" style={{ paddingBottom: 'calc(var(--safe-bottom) + 24px)', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {step > 0 && (
        <button className="icon-btn" onClick={() => setStep(step - 1)} aria-label="Atrás"><IconChevronLeft size={20} /></button>
      )}

      {step === 0 && (
        <div className="grow center" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden', maxWidth: 320, margin: '0 auto', borderRadius: 32 }}>
            <Mascot equipped={state.pet.equipped} mood="eufórico" size={280} />
          </div>
          <h1 className="serif" style={{ fontSize: 34, marginTop: 28 }}>¡Hola! Soy Brotín</h1>
          <p className="muted" style={{ fontSize: 18 }}>
            Te acompañaré en tu día a día. Registra lo que comes, bebes y entrenas, y yo iré creciendo y desbloqueando cosas contigo.
          </p>
        </div>
      )}
      {step === 1 && (
        <div className="grow">
          <h1 className="screen-title">Cuéntame sobre ti</h1>
          <ProfileFields p={p} set={set} only="personal" />
        </div>
      )}
      {step === 2 && (
        <div className="grow">
          <h1 className="screen-title">Tu objetivo</h1>
          <ProfileFields p={p} set={set} only="goal" />
        </div>
      )}
      {step === 3 && (
        <div className="grow">
          <h1 className="screen-title">Tu plan diario</h1>
          <div className="card center">
            <div className="num" style={{ fontSize: 52, fontWeight: 700 }}>{fmt(targets.kcal)}</div>
            <div className="muted">kcal al día</div>
            <div className="grid-3" style={{ marginTop: 18 }}>
              <div><b className="num">{targets.protein} g</b><div className="small muted">Proteína</div></div>
              <div><b className="num">{targets.carbs} g</b><div className="small muted">Carbohid.</div></div>
              <div><b className="num">{targets.fat} g</b><div className="small muted">Grasa</div></div>
            </div>
          </div>
          <p className="small muted">
            Calculado con la fórmula Mifflin-St Jeor según tus datos{p.goal !== 'mantener' ? ` y un ritmo de ${String(p.weeklyRateKg).replace('.', ',')} kg/semana` : ''}.
            Puedes cambiarlo cuando quieras en Perfil → Objetivos.
          </p>
          <div className="banner small" style={{ marginTop: 14 }}>
            <span>🔒</span>
            <span>Tus datos se guardan <b>solo en tu iPhone</b>. Para no perderlos, instala la app en la pantalla de inicio y haz copias de seguridad en iCloud desde Perfil.</span>
          </div>
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        {step < 3 ? (
          <button className="btn block" disabled={(step === 1 && !validPersonal) || (step === 2 && !validGoal)} onClick={() => setStep(step + 1)}>
            {step === 0 ? 'Empezar' : 'Continuar'}
          </button>
        ) : (
          <button className="btn block" onClick={finish}>¡Vamos allá!</button>
        )}
        {step === 0 && (
          <>
            <button className="btn block ghost" style={{ marginTop: 10 }} onClick={() => fileRef.current?.click()}>Ya tengo una copia de seguridad</button>
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
