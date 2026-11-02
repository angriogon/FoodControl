import { useEffect, useMemo, useRef, useState } from 'react';
import type { Food, FoodEntry, MealId, Nutrients } from '../types';
import { Sheet } from '../components/Sheet';
import { GradeBadge, NumberInput, toNum } from '../components/common';
import { IconCopy, IconPlus, IconSearch, IconTrash } from '../components/Icons';
import { toast } from '../components/Toast';
import { actions, uid, useAppState } from '../store/store';
import { BASE_FOODS, searchFoods } from '../lib/foods';
import { lookupBarcode, searchOpenFoodFacts } from '../lib/openfoodfacts';
import { MEALS, estimateGrade, fmt, foodGrade, scaleNutrients } from '../lib/nutrition';
import { addDays } from '../lib/dates';

// ───────────────────────── Buscar y añadir ─────────────────────────

type ListTab = 'recientes' | 'mios' | 'todos';

export function AddFoodSheet({ open, onClose, date, meal: initialMeal }: { open: boolean; onClose: () => void; date: string; meal: MealId }) {
  const state = useAppState();
  const [meal, setMeal] = useState<MealId>(initialMeal);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<ListTab>('recientes');
  const [online, setOnline] = useState<{ loading: boolean; results: Food[]; error?: string; done: boolean }>({ loading: false, results: [], done: false });
  const [picked, setPicked] = useState<Food | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) {
      setMeal(initialMeal);
      setQuery('');
      setOnline({ loading: false, results: [], done: false });
      setTab(state.recentFoods.length ? 'recientes' : 'todos');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialMeal]);

  // Cualquier cambio en la búsqueda invalida los resultados online anteriores
  useEffect(() => {
    abortRef.current?.abort();
    setOnline({ loading: false, results: [], done: false });
  }, [query]);

  const pool = useMemo(() => {
    const seen = new Set<string>();
    return [...state.customFoods, ...state.recentFoods, ...BASE_FOODS].filter((f) => (seen.has(f.id) ? false : (seen.add(f.id), true)));
  }, [state.customFoods, state.recentFoods]);

  const localResults = useMemo(() => searchFoods(query, pool).slice(0, 40), [query, pool]);

  const searchOnline = async () => {
    if (query.trim().length < 2) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setOnline({ loading: true, results: [], done: false });
    try {
      const results = await searchOpenFoodFacts(query.trim(), ctrl.signal);
      setOnline({ loading: false, results, done: true });
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') return;
      setOnline({ loading: false, results: [], done: false, error: navigator.onLine ? 'No se pudo consultar Open Food Facts. Inténtalo de nuevo en unos segundos.' : 'Sin conexión. Busca en la base local o crea el alimento.' });
    }
  };

  const yesterdayCount = state.days[addDays(date, -1)]?.entries.filter((e) => e.meal === meal).length ?? 0;
  const mealLabel = MEALS.find((m) => m.id === meal)!.label;

  const list: Food[] = query.trim()
    ? localResults
    : tab === 'recientes'
      ? state.recentFoods
      : tab === 'mios'
        ? state.customFoods
        : BASE_FOODS;

  return (
    <>
      <Sheet open={open} onClose={onClose} full title="Añadir alimento">
        <div className="segmented" style={{ marginBottom: 14 }}>
          {MEALS.map((m) => (
            <button key={m.id} className={meal === m.id ? 'active' : ''} onClick={() => setMeal(m.id)}>
              {m.label}
            </button>
          ))}
        </div>

        <form
          className="search"
          onSubmit={(e) => {
            e.preventDefault();
            (document.activeElement as HTMLElement | null)?.blur();
            if (!localResults.length) void searchOnline();
          }}
        >
          <IconSearch size={20} className="faint" />
          <input
            type="search"
            placeholder="Buscar: huevo, yogur, Hacendado…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            enterKeyHint="search"
            autoCorrect="off"
            autoCapitalize="none"
            aria-label="Buscar alimento"
          />
        </form>

        <div className="chips" style={{ marginTop: 12 }}>
          <button className="chip" onClick={() => setQuickOpen(true)}>⚡ Añadido rápido</button>
          <button className="chip" onClick={() => setCustomOpen(true)}>✏️ Crear alimento</button>
          <button className="chip" onClick={() => setBarcodeOpen(true)}>🏷️ Código de barras</button>
          {yesterdayCount > 0 && (
            <button
              className="chip"
              onClick={() => {
                const n = actions.copyMeal(addDays(date, -1), date, meal);
                toast(`${n} alimento${n === 1 ? '' : 's'} copiado${n === 1 ? '' : 's'} de ayer`, '📋');
                onClose();
              }}
            >
              <IconCopy size={14} /> {mealLabel} de ayer
            </button>
          )}
        </div>

        {!query.trim() && (
          <div className="segmented" style={{ margin: '16px 0 4px' }}>
            <button className={tab === 'recientes' ? 'active' : ''} onClick={() => setTab('recientes')}>Recientes</button>
            <button className={tab === 'mios' ? 'active' : ''} onClick={() => setTab('mios')}>Mis alimentos</button>
            <button className={tab === 'todos' ? 'active' : ''} onClick={() => setTab('todos')}>Base</button>
          </div>
        )}

        <div className="list" style={{ marginTop: 8 }}>
          {list.map((f) => (
            <FoodRow key={f.id} food={f} onClick={() => setPicked(f)} />
          ))}
        </div>

        {!query.trim() && !list.length && (
          <p className="muted center" style={{ padding: '30px 10px' }}>
            {tab === 'recientes' ? 'Aquí aparecerán los alimentos que vayas usando.' : 'Aún no has creado alimentos propios.'}
          </p>
        )}

        {query.trim().length >= 2 && (
          <div style={{ marginTop: 18 }}>
            {!online.done && (
              <button className="btn secondary block" onClick={searchOnline} disabled={online.loading}>
                {online.loading ? 'Buscando…' : `🛒 Buscar “${query.trim()}” en productos de supermercado`}
              </button>
            )}
            {online.error && <p className="muted small center">{online.error}</p>}
            {online.done && (
              <>
                <div className="field-label" style={{ margin: '6px 0 4px' }}>Open Food Facts</div>
                {online.results.length ? (
                  <div className="list">
                    {online.results.map((f) => <FoodRow key={f.id} food={f} onClick={() => setPicked(f)} />)}
                  </div>
                ) : (
                  <p className="muted small center">Sin resultados online. Puedes crear el alimento tú mismo.</p>
                )}
              </>
            )}
            {!localResults.length && !online.done && !online.loading && (
              <p className="muted small center" style={{ marginTop: 10 }}>No está en la base local.</p>
            )}
          </div>
        )}
      </Sheet>

      <FoodAmountSheet
        food={picked}
        meal={meal}
        onClose={() => setPicked(null)}
        onSave={(entry, food) => {
          actions.addEntry(date, entry);
          actions.pushRecent(food);
          setPicked(null);
          toast(`Añadido a ${MEALS.find((m) => m.id === entry.meal)!.label}`, food.emoji ?? '✅');
        }}
      />
      <QuickAddSheet
        open={quickOpen}
        meal={meal}
        onClose={() => setQuickOpen(false)}
        onSave={(entry) => {
          actions.addEntry(date, entry);
          setQuickOpen(false);
          toast('Añadido rápido guardado', '⚡');
        }}
      />
      <CustomFoodSheet
        open={customOpen}
        initialName={query}
        onClose={() => setCustomOpen(false)}
        onSaved={(f) => {
          setCustomOpen(false);
          setPicked(f);
        }}
      />
      <BarcodeSheet
        open={barcodeOpen}
        onClose={() => setBarcodeOpen(false)}
        onFound={(f) => {
          setBarcodeOpen(false);
          setPicked(f);
        }}
      />
    </>
  );
}

export function FoodRow({ food, onClick, right }: { food: Food; onClick: () => void; right?: React.ReactNode }) {
  const s = food.serving;
  const sub = s ? `${s.label} · ${Math.round((food.per100.kcal * s.grams) / 100)} kcal` : `100 ${food.unit} · ${food.per100.kcal} kcal`;
  return (
    <button className="entry-row" onClick={onClick}>
      <span className="entry-emoji">{food.emoji ?? '🍽️'}</span>
      <span className="grow">
        <span className="ellipsis" style={{ display: 'block', fontWeight: 500 }}>{food.name}</span>
        <span className="small muted ellipsis" style={{ display: 'block' }}>
          {food.brand ? `${food.brand} · ` : ''}{sub}
        </span>
      </span>
      <GradeBadge grade={foodGrade(food)} />
      {right ?? <span className="icon-btn" style={{ width: 34, height: 34 }}><IconPlus size={16} /></span>}
    </button>
  );
}

// ───────────────────────── Cantidad ─────────────────────────

export function FoodAmountSheet({
  food, meal: initialMeal, entry, onClose, onSave, onDelete
}: {
  food: Food | null;
  meal: MealId;
  entry?: FoodEntry;
  onClose: () => void;
  onSave: (entry: FoodEntry, food: Food) => void;
  onDelete?: () => void;
}) {
  const [mode, setMode] = useState<'serving' | 'grams'>('grams');
  const [amount, setAmount] = useState<number | ''>(100);
  const [meal, setMeal] = useState<MealId>(initialMeal);

  useEffect(() => {
    if (!food) return;
    setMeal(entry?.meal ?? initialMeal);
    if (entry) {
      setMode('grams');
      setAmount(entry.amount);
    } else if (food.serving) {
      setMode('serving');
      setAmount(1);
    } else {
      setMode('grams');
      setAmount(100);
    }
  }, [food, entry, initialMeal]);

  if (!food) return null;
  const grams = mode === 'serving' && food.serving ? toNum(amount) * food.serving.grams : toNum(amount);
  const n = scaleNutrients(food.per100, grams);
  const presets = food.serving ? [0.5, 1, 1.5, 2] : [50, 100, 150, 200];

  const save = () => {
    if (grams <= 0) return;
    onSave(
      {
        id: entry?.id ?? uid(),
        meal,
        foodId: food.id,
        name: food.brand ? `${food.name} (${food.brand})` : food.name,
        amount: Math.round(grams),
        unit: food.unit,
        nutrients: n,
        grade: foodGrade(food),
        emoji: food.emoji,
        createdAt: entry?.createdAt ?? new Date().toISOString()
      },
      food
    );
  };

  return (
    <Sheet
      open={!!food}
      onClose={onClose}
      title={<span className="clamp-2" style={{ fontSize: 22 }}>{food.emoji} {food.name}</span>}
      footer={
        <div className="row">
          {onDelete && (
            <button className="icon-btn" style={{ width: 50, height: 50 }} onClick={onDelete} aria-label="Eliminar">
              <IconTrash size={22} color="var(--bad)" />
            </button>
          )}
          <button className="btn block grow" onClick={save} disabled={grams <= 0}>
            {entry ? 'Guardar cambios' : `Añadir a ${MEALS.find((m) => m.id === meal)!.label}`}
          </button>
        </div>
      }
    >
      {food.brand && <div className="muted" style={{ marginTop: -6, marginBottom: 10 }}>{food.brand}</div>}

      <div className="card center" style={{ marginBottom: 16 }}>
        <div className="num" style={{ fontSize: 44, fontWeight: 700 }}>{fmt(n.kcal)}</div>
        <div className="muted">kcal · {fmt(grams)} {food.unit}</div>
        <div className="grid-3" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginTop: 16 }}>
          <MiniMacro label="Prot." value={n.protein} color="var(--protein)" />
          <MiniMacro label="Carbos" value={n.carbs} color="var(--carbs)" />
          <MiniMacro label="Grasa" value={n.fat} color="var(--fat)" />
          <MiniMacro label="Fibra" value={n.fiber} color="var(--fiber)" />
        </div>
      </div>

      {food.serving && (
        <div className="segmented" style={{ marginBottom: 12 }}>
          <button className={mode === 'serving' ? 'active' : ''} onClick={() => { setMode('serving'); setAmount(1); }}>
            Raciones
          </button>
          <button className={mode === 'grams' ? 'active' : ''} onClick={() => { setMode('grams'); setAmount(food.serving!.grams); }}>
            {food.unit === 'ml' ? 'Mililitros' : 'Gramos'}
          </button>
        </div>
      )}

      <div className="field">
        <label>{mode === 'serving' ? `Raciones (${food.serving!.label} = ${food.serving!.grams} ${food.unit})` : `Cantidad en ${food.unit}`}</label>
        <NumberInput value={amount} onChange={setAmount} suffix={mode === 'serving' ? 'rac.' : food.unit} />
      </div>
      <div className="chips" style={{ marginTop: 10 }}>
        {presets.map((p) => (
          <button key={p} className={`chip${toNum(amount) === p ? ' active' : ''}`} onClick={() => setAmount(p)}>
            {mode === 'serving' ? `${String(p).replace('.', ',')} rac.` : `${p} ${food.unit}`}
          </button>
        ))}
      </div>

      <div className="field" style={{ marginTop: 18 }}>
        <label>Comida</label>
        <div className="segmented">
          {MEALS.map((m) => (
            <button key={m.id} className={meal === m.id ? 'active' : ''} onClick={() => setMeal(m.id)}>{m.label}</button>
          ))}
        </div>
      </div>

      <div className="card flat small" style={{ marginTop: 18 }}>
        <div className="row between"><span className="muted">Azúcares</span><b className="num">{fmt(n.sugar ?? 0, 1)} g</b></div>
        <div className="row between" style={{ marginTop: 6 }}><span className="muted">Grasa saturada</span><b className="num">{fmt(n.satFat ?? 0, 1)} g</b></div>
        {!!n.salt && <div className="row between" style={{ marginTop: 6 }}><span className="muted">Sal</span><b className="num">{fmt(n.salt, 2)} g</b></div>}
        <div className="row between" style={{ marginTop: 6 }}>
          <span className="muted">Calidad {food.source === 'off' && food.grade ? '(Nutri-Score oficial)' : '(estimada)'}</span>
          <GradeBadge grade={foodGrade(food)} />
        </div>
      </div>
    </Sheet>
  );
}

function MiniMacro({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div style={{ width: 10, height: 10, borderRadius: 99, background: color, margin: '0 auto 4px' }} />
      <div className="num" style={{ fontWeight: 600 }}>{fmt(value, 1)} g</div>
      <div className="tiny muted">{label}</div>
    </div>
  );
}

/** Construye un “Food” a partir de una entrada guardada, para poder editar su cantidad. */
export function foodFromEntry(e: FoodEntry): Food {
  const f = e.amount > 0 ? 100 / e.amount : 1;
  const k = (v?: number) => Math.round((v ?? 0) * f * 10) / 10;
  return {
    id: e.foodId ?? `entry:${e.id}`,
    name: e.name,
    unit: e.unit === 'ml' ? 'ml' : 'g',
    per100: {
      kcal: Math.round(e.nutrients.kcal * f), protein: k(e.nutrients.protein), carbs: k(e.nutrients.carbs),
      fat: k(e.nutrients.fat), fiber: k(e.nutrients.fiber), sugar: k(e.nutrients.sugar), satFat: k(e.nutrients.satFat), salt: k(e.nutrients.salt)
    },
    grade: e.grade,
    emoji: e.emoji,
    source: 'custom'
  };
}

// ───────────────────────── Añadido rápido ─────────────────────────

export function QuickAddSheet({
  open, meal: initialMeal, entry, onClose, onSave, onDelete
}: {
  open: boolean;
  meal: MealId;
  entry?: FoodEntry;
  onClose: () => void;
  onSave: (e: FoodEntry) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState('');
  const [meal, setMeal] = useState<MealId>(initialMeal);
  const [v, setV] = useState<Record<'kcal' | 'protein' | 'carbs' | 'fat' | 'fiber', number | ''>>({ kcal: '', protein: '', carbs: '', fat: '', fiber: '' });

  useEffect(() => {
    if (!open) return;
    setMeal(entry?.meal ?? initialMeal);
    setName(entry?.name ?? '');
    const n = entry?.nutrients;
    setV({ kcal: n?.kcal ?? '', protein: n?.protein || '', carbs: n?.carbs || '', fat: n?.fat || '', fiber: n?.fiber || '' });
  }, [open, entry, initialMeal]);

  const kcal = toNum(v.kcal);
  const save = () => {
    const nutrients: Nutrients = {
      kcal: Math.round(kcal), protein: toNum(v.protein), carbs: toNum(v.carbs), fat: toNum(v.fat), fiber: toNum(v.fiber), sugar: 0, satFat: 0
    };
    const hasMacros = nutrients.protein + nutrients.carbs + nutrients.fat > 0;
    onSave({
      id: entry?.id ?? uid(),
      meal,
      name: name.trim() || 'Añadido rápido',
      amount: 0,
      unit: 'kcal',
      nutrients,
      grade: hasMacros ? estimateGrade(nutrients) : undefined,
      emoji: '⚡',
      createdAt: entry?.createdAt ?? new Date().toISOString()
    });
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Añadido rápido"
      footer={
        <div className="row">
          {onDelete && (
            <button className="icon-btn" style={{ width: 50, height: 50 }} onClick={onDelete} aria-label="Eliminar">
              <IconTrash size={22} color="var(--bad)" />
            </button>
          )}
          <button className="btn block grow" disabled={kcal <= 0} onClick={save}>{entry ? 'Guardar' : 'Añadir'}</button>
        </div>
      }
    >
      <p className="muted small" style={{ marginTop: 0 }}>
        Para cuando comes fuera o no sabes el alimento exacto. Solo las kcal son obligatorias.
      </p>
      <div className="stack">
        <div className="field">
          <label>Descripción</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: menú del día" />
        </div>
        <div className="field">
          <label>Calorías</label>
          <NumberInput value={v.kcal} onChange={(x) => setV({ ...v, kcal: x })} suffix="kcal" decimal={false} autoFocus={!entry} />
        </div>
        <div className="grid-2">
          <div className="field"><label>Proteínas</label><NumberInput value={v.protein} onChange={(x) => setV({ ...v, protein: x })} suffix="g" /></div>
          <div className="field"><label>Carbohidratos</label><NumberInput value={v.carbs} onChange={(x) => setV({ ...v, carbs: x })} suffix="g" /></div>
          <div className="field"><label>Grasa</label><NumberInput value={v.fat} onChange={(x) => setV({ ...v, fat: x })} suffix="g" /></div>
          <div className="field"><label>Fibra</label><NumberInput value={v.fiber} onChange={(x) => setV({ ...v, fiber: x })} suffix="g" /></div>
        </div>
        <div className="field">
          <label>Comida</label>
          <div className="segmented">
            {MEALS.map((m) => (
              <button key={m.id} className={meal === m.id ? 'active' : ''} onClick={() => setMeal(m.id)}>{m.label}</button>
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  );
}

// ───────────────────────── Crear alimento ─────────────────────────

const EMOJIS = ['🍽️', '🥗', '🍲', '🍝', '🥪', '🍳', '🥩', '🐟', '🥛', '🧀', '🍞', '🍎', '🥜', '🍫', '🥤', '☕', '🍰', '🛒'];

export function CustomFoodSheet({ open, onClose, onSaved, initialName = '', editing }: {
  open: boolean;
  onClose: () => void;
  onSaved: (f: Food) => void;
  initialName?: string;
  editing?: Food;
}) {
  const empty = { kcal: '' as number | '', protein: '' as number | '', carbs: '' as number | '', fat: '' as number | '', fiber: '' as number | '', sugar: '' as number | '', satFat: '' as number | '' };
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [emoji, setEmoji] = useState('🍽️');
  const [unit, setUnit] = useState<'g' | 'ml'>('g');
  const [n, setN] = useState(empty);
  const [servingLabel, setServingLabel] = useState('');
  const [servingGrams, setServingGrams] = useState<number | ''>('');

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setBrand(editing.brand ?? '');
      setEmoji(editing.emoji ?? '🍽️');
      setUnit(editing.unit);
      const p = editing.per100;
      setN({ kcal: p.kcal, protein: p.protein, carbs: p.carbs, fat: p.fat, fiber: p.fiber, sugar: p.sugar ?? '', satFat: p.satFat ?? '' });
      setServingLabel(editing.serving?.label ?? '');
      setServingGrams(editing.serving?.grams ?? '');
    } else {
      setName(initialName.trim().replace(/^./, (c) => c.toUpperCase()));
      setBrand('');
      setEmoji('🍽️');
      setUnit('g');
      setN(empty);
      setServingLabel('');
      setServingGrams('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const valid = name.trim() && toNum(n.kcal) >= 0 && n.kcal !== '';
  const save = () => {
    const per100: Nutrients = {
      kcal: toNum(n.kcal), protein: toNum(n.protein), carbs: toNum(n.carbs), fat: toNum(n.fat),
      fiber: toNum(n.fiber), sugar: toNum(n.sugar), satFat: toNum(n.satFat)
    };
    const food: Food = {
      id: editing?.id ?? `custom:${uid()}`,
      name: name.trim(),
      brand: brand.trim() || undefined,
      unit,
      per100,
      serving: toNum(servingGrams) > 0 ? { label: servingLabel.trim() || '1 ración', grams: toNum(servingGrams) } : undefined,
      source: 'custom',
      emoji
    };
    actions.saveCustomFood(food);
    toast(editing ? 'Alimento actualizado' : 'Alimento guardado en “Mis alimentos”', emoji);
    onSaved(food);
  };

  const field = (k: keyof typeof empty, label: string, suffix = 'g') => (
    <div className="field">
      <label>{label}</label>
      <NumberInput value={n[k]} onChange={(x) => setN({ ...n, [k]: x })} suffix={suffix} />
    </div>
  );

  return (
    <Sheet open={open} onClose={onClose} full title={editing ? 'Editar alimento' : 'Crear alimento'}
      footer={<button className="btn block" disabled={!valid} onClick={save}>Guardar</button>}>
      <div className="stack">
        <div className="chips">
          {EMOJIS.map((e) => (
            <button key={e} className={`chip${emoji === e ? ' active' : ''}`} style={{ fontSize: 20, padding: '6px 10px' }} onClick={() => setEmoji(e)}>{e}</button>
          ))}
        </div>
        <div className="field"><label>Nombre</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Bowl de quinoa casero" /></div>
        <div className="field"><label>Marca (opcional)</label><input className="input" value={brand} onChange={(e) => setBrand(e.target.value)} /></div>
        <div className="segmented">
          <button className={unit === 'g' ? 'active' : ''} onClick={() => setUnit('g')}>Por 100 g</button>
          <button className={unit === 'ml' ? 'active' : ''} onClick={() => setUnit('ml')}>Por 100 ml</button>
        </div>
        <p className="muted small" style={{ margin: 0 }}>Copia los valores de la etiqueta nutricional (columna “por 100 {unit}”).</p>
        {field('kcal', 'Calorías', 'kcal')}
        <div className="grid-2">
          {field('protein', 'Proteínas')}
          {field('carbs', 'Carbohidratos')}
          {field('fat', 'Grasa')}
          {field('fiber', 'Fibra')}
          {field('sugar', 'de los cuales azúcares')}
          {field('satFat', 'Grasa saturada')}
        </div>
        <div className="field-label" style={{ marginTop: 6 }}>Ración habitual (opcional)</div>
        <div className="grid-2">
          <input className="input" value={servingLabel} onChange={(e) => setServingLabel(e.target.value)} placeholder="1 bol" />
          <NumberInput value={servingGrams} onChange={setServingGrams} suffix={unit} />
        </div>
      </div>
    </Sheet>
  );
}

// ───────────────────────── Código de barras ─────────────────────────
// iOS Safari no expone la API BarcodeDetector, así que se introduce el código
// a mano (está bajo las barras, 8 o 13 dígitos).

function BarcodeSheet({ open, onClose, onFound }: { open: boolean; onClose: () => void; onFound: (f: Food) => void }) {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'notfound' | 'error'>('idle');

  useEffect(() => {
    if (open) {
      setCode('');
      setStatus('idle');
    }
  }, [open]);

  const search = async () => {
    setStatus('loading');
    try {
      const f = await lookupBarcode(code);
      if (f) onFound(f);
      else setStatus('notfound');
    } catch {
      setStatus('error');
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Código de barras"
      footer={<button className="btn block" disabled={code.replace(/\D/g, '').length < 8 || status === 'loading'} onClick={search}>{status === 'loading' ? 'Buscando…' : 'Buscar producto'}</button>}>
      <p className="muted small" style={{ marginTop: 0 }}>Escribe los números que aparecen bajo el código de barras del envase.</p>
      <input className="input num" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="8410000000000" autoFocus />
      {status === 'notfound' && <p className="small" style={{ color: 'var(--warn)' }}>No encontrado en Open Food Facts. Puedes crearlo con “Crear alimento”.</p>}
      {status === 'error' && <p className="small" style={{ color: 'var(--bad)' }}>Error de conexión. Revisa tu conexión a internet.</p>}
    </Sheet>
  );
}
