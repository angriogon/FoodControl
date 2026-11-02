import { useEffect, useRef, useState } from 'react';
import type { ActivityLevel, Goal, MealId, Profile, Sex } from '../types';
import { Sheet } from '../components/Sheet';
import { NumberInput, Segmented, Switch, toNum } from '../components/common';
import { IconShare } from '../components/Icons';
import { toast } from '../components/Toast';
import { actions, currentWeight, flush, useAppState } from '../store/store';
import { ACTIVITY_FACTORS, MEALS, bmr, computeTargets, fmt, tdee } from '../lib/nutrition';
import { exportBackup, isStandalone, parseBackup, storageInfo } from '../lib/storage';

export function SettingsSheet({ open, onClose, section }: { open: boolean; onClose: () => void; section: 'perfil' | 'datos' | 'accesibilidad' }) {
  if (section === 'perfil') return <ProfileSettings open={open} onClose={onClose} />;
  if (section === 'accesibilidad') return <AccessibilitySettings open={open} onClose={onClose} />;
  return <DataSettings open={open} onClose={onClose} />;
}

// ───────────────────────── Accesibilidad ─────────────────────────

function AccessibilitySettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { ui } = useAppState();
  return (
    <Sheet open={open} onClose={onClose} title="Accesibilidad">
      <h3 className="section-header" style={{ marginTop: '0.5rem' }}>Tamaño del texto</h3>
      <Segmented
        label="Tamaño del texto"
        value={ui.textSize}
        onChange={(v) => actions.updateUi({ textSize: v })}
        options={[
          { value: 'auto', label: <><span aria-hidden="true">iOS</span><span className="sr-only">Como en Ajustes de iOS</span></> },
          { value: 'm', label: <><span aria-hidden="true">A</span><span className="sr-only">Normal</span></> },
          { value: 'l', label: <><span aria-hidden="true" style={{ fontSize: '1.1em' }}>A</span><span className="sr-only">Grande</span></> },
          { value: 'xl', label: <><span aria-hidden="true" style={{ fontSize: '1.25em' }}>A</span><span className="sr-only">Muy grande</span></> }
        ]}
      />
      <p className="section-footer">
        “iOS” usa el tamaño que tengas en Ajustes › Pantalla y brillo › Tamaño del texto. Toda la app (textos, botones y gráficos)
        se adapta, así no hace falta hacer zoom.
      </p>

      <h3 className="section-header">Apariencia</h3>
      <Segmented
        label="Tema"
        value={ui.theme}
        onChange={(v) => actions.updateUi({ theme: v })}
        options={[
          { value: 'light', label: 'Claro' },
          { value: 'dark', label: 'Oscuro' },
          { value: 'auto', label: 'Automático' }
        ]}
      />
      <p className="section-footer">“Automático” cambia a oscuro cuando tu iPhone lo esté.</p>

      <h3 className="section-header">Visión</h3>
      <div className="group">
        <div className="cell">
          <span className="grow">
            <span className="cell-title">Aumentar contraste</span>
            <span className="cell-sub">Textos secundarios más oscuros y bordes visibles</span>
          </span>
          <Switch checked={ui.highContrast} onChange={(v) => actions.updateUi({ highContrast: v })} label="Aumentar contraste" />
        </div>
      </div>
      <p className="section-footer">
        La app también respeta “Reducir movimiento” de iOS y es compatible con VoiceOver: los anillos, barras y botones
        anuncian su valor.
      </p>
    </Sheet>
  );
}

// ───────────────────────── Perfil y objetivos ─────────────────────────

function ProfileSettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const state = useAppState();
  const [p, setP] = useState<Profile>(state.profile);

  useEffect(() => {
    if (open) setP(state.profile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((x) => ({ ...x, [k]: v }));
  const macroSum = p.macroSplit.protein + p.macroSplit.carbs + p.macroSplit.fat;
  const mealSum = Object.values(p.mealSplit).reduce((a, b) => a + b, 0);
  const valid = macroSum === 100 && mealSum === 100 && p.heightCm > 100 && p.startWeightKg > 25 && p.goalWeightKg > 25;
  const w = currentWeight(state);
  const preview = computeTargets(p, w);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      full
      title="Objetivos y perfil"
      footer={
        <button className="btn block" disabled={!valid} onClick={() => { actions.updateProfile(p); toast('Ajustes guardados', '✅'); onClose(); }}>
          {valid ? `Guardar · ${fmt(preview.kcal)} kcal/día` : macroSum !== 100 ? `Los macros suman ${macroSum}% (deben ser 100%)` : mealSum !== 100 ? `Las comidas suman ${mealSum}%` : 'Revisa los datos'}
        </button>
      }
    >
      <ProfileFields p={p} set={set} />

      <h3 className="section-header">Calorías</h3>
      <div className="card small">
        <div className="row between"><span>Metabolismo basal</span><b className="num">{fmt(bmr(p, w))} kcal</b></div>
        <div className="row between" style={{ marginTop: '0.35rem' }}><span>Gasto diario estimado</span><b className="num">{fmt(tdee(p, w))} kcal</b></div>
        <div className="row between" style={{ marginTop: '0.35rem' }}><span>Tu objetivo</span><b className="num">{fmt(preview.kcal)} kcal</b></div>
      </div>
      <div className="field" style={{ marginTop: '0.71rem' }}>
        <label>Objetivo manual (opcional, sustituye al cálculo)</label>
        <NumberInput value={p.kcalOverride ?? ''} onChange={(v) => set('kcalOverride', v === '' ? undefined : v)} suffix="kcal" decimal={false} placeholder="Automático" />
      </div>
      <div className="row between" style={{ marginTop: '0.82rem' }}>
        <div>
          <div>Sumar kcal del ejercicio</div>
          <div className="small muted">Las kcal quemadas amplían tu margen del día</div>
        </div>
        <Switch checked={p.addExerciseKcal} onChange={(v) => set('addExerciseKcal', v)} label="Sumar kcal del ejercicio" />
      </div>

      <h3 className="section-header">Macronutrientes</h3>
      <p className="small muted" style={{ marginTop: '-0.35rem' }}>% de las calorías. Para perder grasa suele funcionar bien 30% proteína / 40% carbohidratos / 30% grasa.</p>
      <div className="grid-3">
        {(['protein', 'carbs', 'fat'] as const).map((k) => (
          <div key={k} className="field">
            <label>{{ protein: 'Proteína', carbs: 'Carbohid.', fat: 'Grasa' }[k]}</label>
            <NumberInput value={p.macroSplit[k]} onChange={(v) => set('macroSplit', { ...p.macroSplit, [k]: Math.round(toNum(v)) })} suffix="%" decimal={false} />
            <span className="tiny muted center num">{preview[k]} g</span>
          </div>
        ))}
      </div>
      <div className="field" style={{ marginTop: '0.59rem' }}>
        <label>Fibra diaria</label>
        <NumberInput value={p.fiberG} onChange={(v) => set('fiberG', Math.round(toNum(v)))} suffix="g" decimal={false} />
      </div>

      <h3 className="section-header">Reparto por comidas</h3>
      <div className="grid-2">
        {MEALS.map((m) => (
          <div key={m.id} className="field">
            <label>{m.label} · {preview.meals[m.id]} kcal</label>
            <NumberInput value={p.mealSplit[m.id]} onChange={(v) => set('mealSplit', { ...p.mealSplit, [m.id as MealId]: Math.round(toNum(v)) })} suffix="%" decimal={false} />
          </div>
        ))}
      </div>

      <h3 className="section-header">Agua</h3>
      <div className="grid-2">
        <div className="field"><label>Objetivo diario</label><NumberInput value={p.waterGoalMl} onChange={(v) => set('waterGoalMl', Math.round(toNum(v)))} suffix="ml" decimal={false} /></div>
        <div className="field"><label>Tamaño del vaso</label><NumberInput value={p.glassMl} onChange={(v) => set('glassMl', Math.max(50, Math.round(toNum(v))))} suffix="ml" decimal={false} /></div>
      </div>
    </Sheet>
  );
}

/** Campos de datos personales, reutilizados en el onboarding. */
export function ProfileFields({ p, set, only }: { p: Profile; set: <K extends keyof Profile>(k: K, v: Profile[K]) => void; only?: 'personal' | 'goal' }) {
  return (
    <div className="stack">
      {only !== 'goal' && (
        <>
          <div className="field"><label>Nombre</label><input className="input" value={p.name} onChange={(e) => set('name', e.target.value)} placeholder="¿Cómo te llamas?" autoComplete="given-name" /></div>
          <div className="field">
            <label>Sexo (para el cálculo metabólico)</label>
            <div className="segmented">
              {(['mujer', 'hombre'] as Sex[]).map((s) => (
                <button key={s} aria-pressed={p.sex === s} onClick={() => set('sex', s)}>{s === 'mujer' ? 'Mujer' : 'Hombre'}</button>
              ))}
            </div>
          </div>
          <div className="grid-2">
            <div className="field"><label>Año de nacimiento</label><NumberInput value={p.birthYear} onChange={(v) => set('birthYear', Math.round(toNum(v)))} decimal={false} /></div>
            <div className="field"><label>Altura</label><NumberInput value={p.heightCm} onChange={(v) => set('heightCm', toNum(v))} suffix="cm" decimal={false} /></div>
          </div>
          <div className="field">
            <label>Nivel de actividad</label>
            <select className="input" value={p.activityLevel} onChange={(e) => set('activityLevel', e.target.value as ActivityLevel)}>
              {(Object.keys(ACTIVITY_FACTORS) as ActivityLevel[]).map((k) => (
                <option key={k} value={k}>{ACTIVITY_FACTORS[k].label} — {ACTIVITY_FACTORS[k].hint}</option>
              ))}
            </select>
          </div>
        </>
      )}
      {only !== 'personal' && (
        <>
          <div className="field">
            <label>Objetivo</label>
            <div className="segmented">
              {(['perder', 'mantener', 'ganar'] as Goal[]).map((g) => (
                <button key={g} aria-pressed={p.goal === g} onClick={() => set('goal', g)}>{{ perder: 'Perder', mantener: 'Mantener', ganar: 'Ganar' }[g]}</button>
              ))}
            </div>
          </div>
          <div className="grid-2">
            <div className="field"><label>Peso inicial</label><NumberInput value={p.startWeightKg} onChange={(v) => set('startWeightKg', toNum(v))} suffix="kg" /></div>
            <div className="field"><label>Peso objetivo</label><NumberInput value={p.goalWeightKg} onChange={(v) => set('goalWeightKg', toNum(v))} suffix="kg" /></div>
          </div>
          {p.goal !== 'mantener' && (
            <div className="field">
              <label>Ritmo semanal</label>
              <div className="segmented">
                {[0.25, 0.5, 0.75, 1].map((r) => (
                  <button key={r} aria-pressed={p.weeklyRateKg === r} onClick={() => set('weeklyRateKg', r)}>{String(r).replace('.', ',')} kg</button>
                ))}
              </div>
              <span className="tiny muted">0,5 kg/semana es un ritmo sostenible para la mayoría de personas.</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ───────────────────────── Datos y copias ─────────────────────────

function DataSettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const state = useAppState();
  const fileRef = useRef<HTMLInputElement>(null);
  const [info, setInfo] = useState<{ persisted: boolean | null; usageKb: number | null }>({ persisted: null, usageKb: null });

  useEffect(() => {
    if (open) void storageInfo().then(setInfo);
  }, [open]);

  const doExport = async () => {
    await flush();
    const r = await exportBackup(state);
    if (r !== 'cancelled') {
      actions.markBackup();
      toast(r === 'shared' ? 'Copia lista. Guárdala en Archivos → iCloud Drive' : 'Copia descargada', '☁️', 3500);
    }
  };

  const doImport = async (file: File) => {
    try {
      const next = await parseBackup(file);
      const days = Object.keys(next.days).length;
      if (!confirm(`La copia contiene ${days} días registrados y ${next.weights.length} pesos.\n\nSe REEMPLAZARÁN los datos actuales de este iPhone. ¿Continuar?`)) return;
      actions.replaceState(next);
      toast('Copia restaurada correctamente', '✅');
      onClose();
    } catch (err) {
      toast((err as Error).message, '⚠️', 4000);
    }
  };

  const days = Object.keys(state.days).length;
  const lastBackup = state.lastBackupAt ? new Date(state.lastBackupAt).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : 'Nunca';

  return (
    <Sheet open={open} onClose={onClose} full title="Datos y copia de seguridad">
      <div className="card">
        <b>¿Dónde están mis datos?</b>
        <p className="small muted">
          Se guardan <b>solo en este iPhone</b> (almacenamiento IndexedDB de la app). No se envían a ningún servidor: nadie más puede verlos.
        </p>
        <div className="small">
          <div className="row between" style={{ padding: '0.29rem 0' }}><span className="muted">Días registrados</span><b>{days}</b></div>
          <div className="row between" style={{ padding: '0.29rem 0' }}><span className="muted">Instalada en pantalla de inicio</span><b>{isStandalone() ? 'Sí ✅' : 'No ⚠️'}</b></div>
          <div className="row between" style={{ padding: '0.29rem 0' }}><span className="muted">Almacenamiento persistente</span><b>{info.persisted == null ? 'No disponible' : info.persisted ? 'Sí ✅' : 'No'}</b></div>
          {info.usageKb != null && <div className="row between" style={{ padding: '0.29rem 0' }}><span className="muted">Espacio usado</span><b>{fmt(info.usageKb)} KB</b></div>}
          <div className="row between" style={{ padding: '0.29rem 0' }}><span className="muted">Última copia</span><b>{lastBackup}</b></div>
        </div>
      </div>

      {!isStandalone() && (
        <div className="banner small" style={{ marginTop: '0.82rem' }}>
          <span>⚠️</span>
          <span>Desde Safari (sin instalar), iOS puede borrar los datos tras 7 días sin abrir la web. Instálala con <b>Compartir → Añadir a pantalla de inicio</b>. Ojo: Safari y la app instalada tienen almacenamientos separados.</span>
        </div>
      )}

      <h3 className="section-header">Copia de seguridad</h3>
      <p className="small muted" style={{ marginTop: '-0.35rem' }}>
        Si borras la app, cambias de iPhone o limpias los datos de Safari, se pierde todo. Exporta una copia de vez en cuando
        y guárdala en <b>iCloud Drive</b>: es un archivo pequeño (JSON) que puedes restaurar en cualquier momento.
      </p>
      <button className="btn block" onClick={doExport}><IconShare size={20} /> Exportar copia</button>
      <button className="btn block secondary" style={{ marginTop: '0.59rem' }} onClick={() => fileRef.current?.click()}>Restaurar desde archivo</button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void doImport(f);
        }}
      />

      <h3 className="section-header">Zona peligrosa</h3>
      <button
        className="btn block danger"
        style={{ background: 'var(--card)' }}
        onClick={() => {
          if (!confirm('¿Borrar TODOS los datos de FoodControl de este iPhone? Esta acción no se puede deshacer.')) return;
          if (!confirm('Última confirmación: ¿has exportado una copia? Se borrará todo.')) return;
          actions.reset();
          toast('Datos borrados', '🗑️');
          onClose();
        }}
      >
        Borrar todos los datos
      </button>
    </Sheet>
  );
}
