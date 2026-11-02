import { useEffect, useMemo, useRef, useState } from 'react';
import type { Food, MealId, Portion } from '../types';
import { Sheet } from '../components/Sheet';
import { NumberInput, Segmented, toNum } from '../components/common';
import { IconPlus, IconSearch, IconTrash } from '../components/Icons';
import { toast } from '../components/Toast';
import { actions, uid, useAppState, useUsage } from '../store/store';
import { habitualAmount } from '../lib/usage';
import { MEALS, fmt, scaleNutrients, sumNutrients } from '../lib/nutrition';
import { portionToEntry } from '../lib/recipes';
import { MAX_TEXT, learnedPairs, parseQuickText, swapFood, type QuickItem } from '../lib/quicktext';
import { useFoodPool } from './FoodSearch';
import { FoodPickerSheet, MenuEditorSheet } from './RecipeSheets';

// ───────────────────────── Registro rápido por texto ─────────────────────────
// Paso 1: escribes o dictas lo que has comido. Paso 2: revisas la lista que
// sale (cambiar alimento, ajustar cantidad, quitar, añadir) y la guardas.
// Todo se resuelve con la base local: sin conexión y sin enviar nada fuera.

type Row = QuickItem & { key: number };

const EXAMPLE = '200 g de pollo, arroz 150 g, una cucharada de aceite y un plátano';

export function QuickTextSheet({ open, onClose, date, meal: initialMeal, onAdded }: {
  open: boolean;
  onClose: () => void;
  date: string;
  meal: MealId;
  /** Tras añadir (para cerrar también la hoja de búsqueda) */
  onAdded?: () => void;
}) {
  const state = useAppState();
  const pool = useFoodPool();
  const [meal, setMeal] = useState<MealId>(initialMeal);
  const [text, setText] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  /** Fila que se está buscando a mano (‑1 = añadir una nueva) */
  const [searching, setSearching] = useState<{ key: number; query: string } | null>(null);
  const [menuItems, setMenuItems] = useState<Portion[] | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (open) {
      setMeal(initialMeal);
      setText('');
      setRows(null);
      setExpanded(null);
    }
  }, [open, initialMeal]);

  // Lo que ya usas pesa más al elegir entre alimentos parecidos
  const usage = useUsage();
  const preferred = useMemo(
    () => [...usage.keys(), ...state.recentFoods.map((f) => f.id), ...state.customFoods.map((f) => f.id), ...state.recipes.map((r) => `recipe:${r.id}`)],
    [usage, state.recentFoods, state.customFoods, state.recipes]
  );

  const habitual = (id: string) => habitualAmount(usage.get(id));

  const analyze = () => {
    const items = parseQuickText(text, pool, { preferred, menus: state.menus, aliases: state.textAliases, habitual });
    setRows(items.map((i) => ({ ...i, key: ++seq.current })));
    setExpanded(null);
    (document.activeElement as HTMLElement | null)?.blur();
  };

  const update = (key: number, fn: (r: Row) => Row) => setRows((prev) => prev?.map((r) => (r.key === key ? fn(r) : r)) ?? prev);
  const remove = (key: number) => setRows((prev) => prev?.filter((r) => r.key !== key) ?? prev);

  const ready = (rows ?? []).filter((r): r is Row & { food: Food } => !!r.food && r.amount > 0);
  const pending = (rows ?? []).filter((r) => !r.food).length;
  const totals = sumNutrients(ready.map((r) => scaleNutrients(r.food.per100, r.amount)));
  const mealLabel = MEALS.find((m) => m.id === meal)!.label;

  const add = () => {
    if (!ready.length) return;
    const now = new Date().toISOString();
    const entries = ready.map((r) => portionToEntry({ food: r.food, amount: r.amount }, meal, 1, uid(), now));
    const ids = actions.addEntries(date, entries);
    // Lo que corregiste se recuerda para la próxima vez
    actions.learnAliases(learnedPairs(rows ?? []));
    const seen = new Set<string>();
    for (const r of ready) {
      if (r.food.source === 'recipe' || seen.has(r.food.id)) continue;
      seen.add(r.food.id);
      actions.pushRecent(r.food);
    }
    onClose();
    onAdded?.();
    toast(`${ready.length} alimento${ready.length === 1 ? '' : 's'} añadido${ready.length === 1 ? '' : 's'} a ${mealLabel}`, '✍️', undefined, {
      label: 'Deshacer', run: () => actions.removeEntries(date, ids)
    });
  };

  const reviewing = rows !== null;

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        full
        title={reviewing ? 'Revisar' : 'Escribir lo que comí'}
        footer={
          reviewing ? (
            <div className="row">
              <button className="btn gray" style={{ padding: '0 1rem' }} onClick={() => setRows(null)}>Editar texto</button>
              <button className="btn block grow" disabled={!ready.length} onClick={add}>
                {ready.length ? `Añadir ${ready.length} · ${fmt(totals.kcal)} kcal` : 'Nada que añadir'}
              </button>
            </div>
          ) : (
            <button className="btn block" disabled={!text.trim()} onClick={analyze}>Revisar</button>
          )
        }
      >
        <Segmented label="Comida" value={meal} onChange={setMeal} options={MEALS.map((m) => ({ value: m.id, label: m.label }))} />

        {!reviewing ? (
          <>
            <div className="field" style={{ marginTop: '1rem' }}>
              <label htmlFor="quick-text">¿Qué has comido?</label>
              <textarea
                id="quick-text"
                className="input"
                value={text}
                maxLength={MAX_TEXT}
                onChange={(e) => setText(e.target.value)}
                placeholder={EXAMPLE}
                autoCapitalize="sentences"
                autoCorrect="on"
                spellCheck
                enterKeyHint="done"
                aria-describedby="quick-text-help"
              />
            </div>
            <div id="quick-text-help" className="card mt-s small">
              <p style={{ margin: 0 }}>
                Separa con comas o con “y”. Puedes poner gramos (<b>200 g</b>), unidades (<b>2 huevos</b>) o medidas caseras
                (<b>una cucharada</b>, <b>un vaso</b>, <b>medio</b>). Si no pones cantidad, se usa la que sueles tomar o una ración estándar.
              </p>
              <p className="muted" style={{ margin: '0.5rem 0 0' }}>
                🎙️ Para dictar, pulsa el micrófono del teclado. Tus menús guardados también valen: escribe su nombre.
              </p>
            </div>
          </>
        ) : (
          <>
            {rows.length === 0 ? (
              <p className="muted center small" style={{ padding: '1.5rem 0.5rem' }}>
                No he encontrado alimentos en el texto. Pulsa <b>Editar texto</b> o añade uno a mano.
              </p>
            ) : (
              <p className="small muted" style={{ margin: '1rem 0 0.6rem' }}>
                Comprueba la lista antes de añadir. Toca un alimento para cambiarlo por otro parecido.
              </p>
            )}
            {pending > 0 && (
              <p className="small" role="status" style={{ color: 'var(--warn)', margin: '0 0 0.6rem' }}>
                {pending === 1 ? 'Hay 1 elemento sin identificar' : `Hay ${pending} elementos sin identificar`}: búscalo o quítalo. Si lo dejas, no se añade.
              </p>
            )}
            {rows.length > 0 && (
              <div className="group">
                {rows.map((r) => (r.food ? (
                  <QuickRow
                    key={r.key}
                    row={r as Row & { food: Food }}
                    open={expanded === r.key}
                    onToggle={() => setExpanded((k) => (k === r.key ? null : r.key))}
                    onAmount={(v) => update(r.key, (x) => ({ ...x, amount: Math.max(0, v), estimated: false }))}
                    onSwap={(f) => { update(r.key, (x) => swapFood(x, f, habitual)); setExpanded(null); }}
                    onSearch={() => setSearching({ key: r.key, query: r.query })}
                    onRemove={() => remove(r.key)}
                  />
                ) : (
                  <div key={r.key} className="quick-row">
                    <div className="quick-head">
                      <span className="quick-main">
                        <span className="emoji-tile" aria-hidden="true">❓</span>
                        <span className="grow" style={{ minWidth: 0 }}>
                          <span className="cell-title">No encontrado</span>
                          <span className="cell-sub">«{r.source}»</span>
                        </span>
                      </span>
                      <button className="icon-btn" onClick={() => remove(r.key)} aria-label={`Quitar «${r.source}»`}>
                        <IconTrash size={15} color="var(--danger)" />
                      </button>
                    </div>
                    <div className="quick-amount">
                      <button className="btn secondary" style={{ minHeight: '2.4rem', padding: '0 1rem' }} onClick={() => setSearching({ key: r.key, query: r.query })}>
                        <IconSearch size={15} /> Buscar «{r.query}»
                      </button>
                    </div>
                  </div>
                )))}
              </div>
            )}
            <button className="btn secondary block mt-s" onClick={() => setSearching({ key: -1, query: '' })}>
              <IconPlus size={18} /> Añadir otro alimento
            </button>

            {ready.length > 0 && (
              <>
                <div className="card mt" aria-live="polite">
                  <div className="row between">
                    <b>Total</b>
                    <span className="num bold" style={{ fontSize: '1.2rem' }}>{fmt(totals.kcal)} kcal</span>
                  </div>
                  <span className="small muted num">P {fmt(totals.protein)} g · C {fmt(totals.carbs)} g · G {fmt(totals.fat)} g · F {fmt(totals.fiber)} g</span>
                </div>
                <button className="btn gray block mt-s" onClick={() => setMenuItems(ready.map((r) => ({ food: r.food, amount: r.amount })))}>
                  Guardar también como menú…
                </button>
              </>
            )}
          </>
        )}
      </Sheet>

      <FoodPickerSheet
        open={searching !== null}
        initialQuery={searching?.query}
        title={searching?.key === -1 ? 'Añadir alimento' : 'Buscar alimento'}
        onClose={() => setSearching(null)}
        onPick={(p) => {
          const s = searching;
          if (!s) return;
          if (s.key === -1) {
            setRows((prev) => [...(prev ?? []), {
              key: ++seq.current, source: p.food.name, query: p.food.name, food: p.food, amount: p.amount,
              qty: { n: p.amount, unit: p.food.unit, implicit: false }, alternatives: [], confidence: 'alta', estimated: false
            }]);
          } else {
            update(s.key, (x) => ({
              ...x, food: p.food, amount: p.amount, confidence: 'alta', estimated: false, habitual: false, corrected: true,
              qty: { n: p.amount, unit: p.food.unit, implicit: false },
              alternatives: [x.food, ...x.alternatives].filter((f): f is Food => !!f && f.id !== p.food.id)
            }));
          }
          setSearching(null);
        }}
      />
      <MenuEditorSheet
        open={menuItems !== null}
        initialItems={menuItems ?? []}
        initialMeal={meal}
        onClose={() => setMenuItems(null)}
      />
    </>
  );
}

function QuickRow({ row, open, onToggle, onAmount, onSwap, onSearch, onRemove }: {
  row: Row & { food: Food };
  open: boolean;
  onToggle: () => void;
  onAmount: (v: number) => void;
  onSwap: (f: Food) => void;
  onSearch: () => void;
  onRemove: () => void;
}) {
  const { food } = row;
  const kcal = scaleNutrients(food.per100, row.amount).kcal;
  const warn = row.confidence === 'baja';
  return (
    <div className="quick-row">
      <div className="quick-head">
        <button className="quick-main" onClick={onToggle} aria-expanded={open}
          aria-label={`${food.name}, de «${row.source}». ${fmt(kcal)} kilocalorías. Toca para cambiarlo`}>
          <span className="emoji-tile" aria-hidden="true">{food.emoji ?? '🍽️'}</span>
          <span className="grow" style={{ minWidth: 0 }}>
            <span className="cell-title">{food.name}</span>
            <span className="cell-sub">
              {warn && <span style={{ color: 'var(--warn)', fontWeight: 600 }}>¿Es esto? · </span>}
              {row.menu ? `Menú ${row.menu}` : `«${row.source}»`}
            </span>
          </span>
        </button>
        <button className="icon-btn" onClick={onRemove} aria-label={`Quitar ${food.name}`}>
          <IconTrash size={15} color="var(--danger)" />
        </button>
      </div>
      <div className="quick-amount">
        <span className="quick-input">
          <NumberInput value={row.amount} label={`Cantidad de ${food.name}`} suffix={food.unit} onChange={(v) => onAmount(toNum(v))} />
        </span>
        <span className="small muted num">
          {fmt(kcal)} kcal{row.habitual ? ' · tu cantidad habitual' : row.estimated ? ' · ración estándar' : ''}
        </span>
      </div>
      {open && (
        <div className="quick-alts-wrap">
          {row.alternatives.length > 0 && <p className="small muted" style={{ margin: '0 0 0.4rem' }}>¿Querías decir…?</p>}
          <div className="quick-alts">
            {row.alternatives.map((f) => (
              <button key={f.id} className="chip" onClick={() => onSwap(f)}>{f.emoji ? `${f.emoji} ` : ''}{f.name}</button>
            ))}
            <button className="chip" onClick={onSearch}><IconSearch size={14} /> Buscar otro</button>
          </div>
        </div>
      )}
    </div>
  );
}
