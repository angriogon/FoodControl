import { useEffect, useMemo, useState } from 'react';
import type { Food, FoodEntry, MealId, Menu, Nutrients, Portion } from '../types';
import { Sheet } from '../components/Sheet';
import { GradeBadge, NumberInput, Segmented, toNum } from '../components/common';
import { IconPlus, IconSearch, IconSliders, IconTrash } from '../components/Icons';
import { toast } from '../components/Toast';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { actions, uid, useAppState, useDay, useTargets, useUsage } from '../store/store';
import { BASE_FOODS, normalize } from '../lib/foods';
import { lookupBarcode } from '../lib/openfoodfacts';
import { MEALS, burnedKcal, dayTotals, estimateGrade, fmt, foodGrade, mealTotals, scaleNutrients } from '../lib/nutrition';
import { addDays } from '../lib/dates';
import { describeItems, menuTotals, portionToEntry, recipeToFood } from '../lib/recipes';
import { suggestionsFor } from '../lib/suggestions';
import { habitualAmount } from '../lib/usage';
import { OnlineResults, useLocalSearch, useOnlineSearch, useRecipeFoods } from './FoodSearch';
import { MenuAddSheet, RecipeEditorSheet } from './RecipeSheets';
import { QuickTextSheet } from './QuickText';

// ───────────────────────── Buscar y añadir ─────────────────────────

type ListTab = 'menus' | 'recientes' | 'mios' | 'base';

export function AddFoodSheet({ open, onClose, date, meal: initialMeal }: { open: boolean; onClose: () => void; date: string; meal: MealId }) {
  const state = useAppState();
  const [meal, setMeal] = useState<MealId>(initialMeal);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<ListTab>('recientes');
  const [picked, setPicked] = useState<Food | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [adjustMenu, setAdjustMenu] = useState<Menu | null>(null);
  const [newRecipe, setNewRecipe] = useState(false);
  const [writeOpen, setWriteOpen] = useState(false);
  const recipeFoods = useRecipeFoods();
  const localResults = useLocalSearch(query);
  const online = useOnlineSearch(query);

  useEffect(() => {
    if (open) {
      setMeal(initialMeal);
      setQuery('');
      setTab(state.menus.length ? 'menus' : state.recentFoods.length ? 'recientes' : 'base');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialMeal]);

  const q = normalize(query);
  const menuResults = q ? state.menus.filter((m) => normalize(m.name).includes(q)) : [];
  const suggestions = useMemo(() => (open ? suggestionsFor(state, meal, date) : []), [open, state, meal, date]);

  const yesterdayCount = state.days[addDays(date, -1)]?.entries.filter((e) => e.meal === meal).length ?? 0;
  const mealLabel = MEALS.find((m) => m.id === meal)!.label;
  const myRecipeFoods = recipeFoods.filter((f) => !f.id.startsWith('recipe:base-'));

  /** Añade varios alimentos como un grupo y ofrece deshacer */
  const addGroup = (portions: Portion[], groupName: string, menuId?: string) => {
    const now = new Date().toISOString();
    const groupId = uid();
    const entries = portions.map((p) => portionToEntry(p, meal, 1, uid(), now, { groupId, groupName }));
    const ids = actions.addEntries(date, entries);
    if (menuId) actions.markMenuUsed(menuId);
    onClose();
    toast(`${groupName} añadido a ${mealLabel}`, '✅', undefined, { label: 'Deshacer', run: () => actions.removeEntries(date, ids) });
  };

  // Accesos rápidos: los que más usas primero (con empate, en este orden)
  const quickActions = [
    { id: 'texto', label: '✍️ Escribir lo que comí', run: () => setWriteOpen(true) },
    { id: 'escanear', label: '📷 Escanear código', run: () => setBarcodeOpen(true) },
    ...(yesterdayCount > 0 ? [{
      id: 'ayer', label: `📋 ${mealLabel} de ayer`, run: () => {
        const ids = actions.copyMeal(addDays(date, -1), date, meal);
        const n = ids.length;
        toast(`${n} alimento${n === 1 ? '' : 's'} copiado${n === 1 ? '' : 's'} de ayer`, '📋', undefined, { label: 'Deshacer', run: () => actions.removeEntries(date, ids) });
        onClose();
      }
    }] : []),
    { id: 'plato', label: '🍲 Nuevo plato', run: () => setNewRecipe(true) },
    { id: 'alimento', label: '✏️ Crear alimento', run: () => setCustomOpen(true) },
    { id: 'rapido', label: '⚡ Solo calorías', run: () => setQuickOpen(true) }
  ].map((a, i) => ({ ...a, order: i, uses: state.actionUses[a.id] ?? 0 }))
    .sort((a, b) => b.uses - a.uses || a.order - b.order);

  const list: Food[] = tab === 'recientes' ? state.recentFoods : tab === 'mios' ? [...myRecipeFoods, ...state.customFoods] : BASE_FOODS;

  return (
    <>
      <Sheet open={open} onClose={onClose} full title="Añadir alimento">
        <Segmented label="Comida" value={meal} onChange={setMeal} options={MEALS.map((m) => ({ value: m.id, label: m.label }))} />
        <Budget date={date} meal={meal} />

        <form
          className="search"
          style={{ marginTop: '0.8rem' }}
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            (document.activeElement as HTMLElement | null)?.blur();
            if (!localResults.length && !menuResults.length) void online.search();
          }}
        >
          <IconSearch size={18} />
          <input
            type="search"
            placeholder="Alimento, plato, menú o marca…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            enterKeyHint="search"
            autoCorrect="off"
            autoCapitalize="none"
            aria-label="Buscar alimento, plato o menú"
          />
        </form>

        <div className="chips" style={{ marginTop: '0.7rem' }}>
          {quickActions.map((a) => (
            <button key={a.id} className="chip" onClick={() => { actions.countAction(a.id); a.run(); }}>{a.label}</button>
          ))}
        </div>

        {!query.trim() && suggestions.length > 0 && (
          <section aria-label="Sugerencias" style={{ marginTop: '1rem' }}>
            <h3 className="section-header" style={{ marginLeft: 0, marginTop: 0 }}>Sugerencias para {mealLabel.toLowerCase()}</h3>
            {suggestions.map((s) => (
              <button key={s.key} className="suggest" style={{ width: '100%', textAlign: 'left' }}
                onClick={() => addGroup(s.portions, s.groupName, s.menuId)}
                aria-label={`Añadir ${s.title}: ${s.subtitle}, ${s.kcal} kilocalorías`}>
                <span style={{ fontSize: '1.4rem' }} aria-hidden="true">{s.emoji}</span>
                <span className="grow">
                  <span className="bold" style={{ display: 'block' }}>{s.title}</span>
                  <span className="small muted ellipsis" style={{ display: 'block' }}>{s.subtitle}</span>
                </span>
                <span className="num small bold">{s.kcal} kcal</span>
                <span className="add-btn" aria-hidden="true"><IconPlus size={16} /></span>
              </button>
            ))}
          </section>
        )}

        {query.trim() ? (
          <>
            {menuResults.length > 0 && (
              <>
                <h3 className="section-header" style={{ marginLeft: 0 }}>Menús</h3>
                <div className="group">
                  {menuResults.map((m) => <MenuRow key={m.id} menu={m} onAdd={() => addGroup(m.items, m.name, m.id)} onAdjust={() => setAdjustMenu(m)} />)}
                </div>
              </>
            )}
            {localResults.length > 0 && (
              <>
                <h3 className="section-header" style={{ marginLeft: 0 }}>Alimentos y platos</h3>
                <div className="group">
                  {localResults.map((f) => <FoodRow key={f.id} food={f} onClick={() => setPicked(f)} />)}
                </div>
              </>
            )}
            <OnlineResults query={query} online={online} hasLocal={localResults.length + menuResults.length > 0} onPick={setPicked} />
          </>
        ) : (
          <>
            <div style={{ margin: '1rem 0 0.5rem' }}>
              <Segmented label="Lista" value={tab} onChange={setTab}
                options={[{ value: 'menus', label: 'Menús' }, { value: 'recientes', label: 'Recientes' }, { value: 'mios', label: 'Míos' }, { value: 'base', label: 'Base' }]} />
            </div>
            {tab === 'menus' ? (
              state.menus.length ? (
                <div className="group">
                  {[...state.menus].sort((a, b) => b.uses - a.uses).map((m) => (
                    <MenuRow key={m.id} menu={m} onAdd={() => addGroup(m.items, m.name, m.id)} onAdjust={() => setAdjustMenu(m)} />
                  ))}
                </div>
              ) : (
                <p className="muted center small" style={{ padding: '1.5rem 0.5rem' }}>
                  Aún no tienes menús. Registra una comida y, desde el Diario, pulsa <b>Guardar como menú</b>: la próxima vez la añadirás de un toque.
                </p>
              )
            ) : list.length ? (
              <div className="group">
                {list.map((f) => <FoodRow key={f.id} food={f} onClick={() => setPicked(f)} />)}
              </div>
            ) : (
              <p className="muted center small" style={{ padding: '1.5rem 0.5rem' }}>
                {tab === 'recientes' ? 'Aquí aparecerán los alimentos que vayas usando.' : <>Aún no tienes platos ni alimentos propios. Créalos con <b>🍲 Nuevo plato</b> o <b>✏️ Crear alimento</b>.</>}
              </p>
            )}
          </>
        )}
      </Sheet>

      <FoodAmountSheet
        food={picked}
        meal={meal}
        onClose={() => setPicked(null)}
        onSave={(entry, food) => {
          actions.addEntry(date, entry);
          if (food.source !== 'recipe') actions.pushRecent(food);
          setPicked(null);
          toast(`Añadido a ${MEALS.find((m) => m.id === entry.meal)!.label}`, food.emoji ?? '✅', undefined, {
            label: 'Deshacer', run: () => actions.removeEntry(date, entry.id)
          });
        }}
      />
      <QuickAddSheet
        open={quickOpen}
        meal={meal}
        onClose={() => setQuickOpen(false)}
        onSave={(entry) => {
          actions.addEntry(date, entry);
          setQuickOpen(false);
          toast('Calorías añadidas', '⚡', undefined, { label: 'Deshacer', run: () => actions.removeEntry(date, entry.id) });
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
      <QuickTextSheet open={writeOpen} onClose={() => setWriteOpen(false)} date={date} meal={meal} onAdded={onClose} />
      <MenuAddSheet menu={adjustMenu} date={date} meal={meal} onClose={() => setAdjustMenu(null)} onAdded={() => { setAdjustMenu(null); onClose(); }} />
      <RecipeEditorSheet
        open={newRecipe}
        onClose={() => setNewRecipe(false)}
        onSaved={(r) => {
          setNewRecipe(false);
          setPicked(recipeToFood(r));
        }}
      />
    </>
  );
}

/** Lo que te queda hoy y en esta comida, para decidir mientras añades */
function Budget({ date, meal }: { date: string; meal: MealId }) {
  const state = useAppState();
  const day = useDay(date);
  const targets = useTargets();
  const eaten = dayTotals(day).kcal;
  const budget = targets.kcal + (state.profile.addExerciseKcal ? burnedKcal(day) : 0);
  const left = Math.round(budget - eaten);
  const mealEaten = Math.round(mealTotals(day, meal).kcal);
  const mealTarget = targets.meals[meal];
  const label = MEALS.find((m) => m.id === meal)!.label;
  return (
    <p className="small muted num" style={{ margin: '0.55rem 0 0', textAlign: 'center' }} aria-live="polite">
      {left >= 0 ? <>Te quedan <b style={{ color: 'var(--text)' }}>{fmt(left)} kcal</b> hoy</> : <>Llevas <b style={{ color: 'var(--warn)' }}>{fmt(-left)} kcal</b> de más hoy</>}
      {' · '}{label}: {fmt(mealEaten)} de {fmt(mealTarget)}
    </p>
  );
}

/** Fila de menú: tocar = añadir de un toque; botón secundario = ajustar antes */
export function MenuRow({ menu, onAdd, onAdjust }: { menu: Menu; onAdd: () => void; onAdjust?: () => void }) {
  const kcal = Math.round(menuTotals(menu).kcal);
  return (
    <div className="cell" style={{ padding: 0 }}>
      <button className="cell" style={{ flex: 1 }} onClick={onAdd} aria-label={`Añadir menú ${menu.name}: ${describeItems(menu.items)}. ${kcal} kilocalorías`}>
        <span className="emoji-tile" aria-hidden="true">{menu.emoji}</span>
        <span className="grow">
          <span className="cell-title ellipsis bold">{menu.name}</span>
          <span className="cell-sub ellipsis">{describeItems(menu.items)} · {kcal} kcal</span>
        </span>
        <span className="add-btn" aria-hidden="true"><IconPlus size={16} /></span>
      </button>
      {onAdjust && (
        <button className="icon-btn" style={{ marginRight: '0.8rem' }} onClick={onAdjust} aria-label={`Ajustar ${menu.name} antes de añadir`}>
          <IconSliders size={16} />
        </button>
      )}
    </div>
  );
}

export function FoodRow({ food, onClick, right }: { food: Food; onClick: () => void; right?: React.ReactNode }) {
  const s = food.serving;
  const sub = s ? `${s.label} · ${Math.round((food.per100.kcal * s.grams) / 100)} kcal` : `100 ${food.unit} · ${food.per100.kcal} kcal`;
  return (
    <div className="cell tappable" style={{ padding: 0 }}>
      <button className="cell" style={{ flex: 1 }} onClick={onClick} aria-label={`${food.name}${food.brand ? `, ${food.brand}` : ''}. ${sub}`}>
        <span className="emoji-tile" aria-hidden="true">{food.emoji ?? '🍽️'}</span>
        <span className="grow">
          <span className="cell-title ellipsis">{food.name}</span>
          <span className="cell-sub ellipsis">
            {food.brand ? `${food.brand} · ` : ''}{sub}
          </span>
        </span>
        <GradeBadge grade={foodGrade(food)} />
        {!right && <span className="add-btn soft" aria-hidden="true"><IconPlus size={14} /></span>}
      </button>
      {right && <span style={{ paddingRight: '1rem' }}>{right}</span>}
    </div>
  );
}

// ───────────────────────── Cantidad ─────────────────────────

export function FoodAmountSheet({
  food, meal: initialMeal, entry, onClose, onSave, onDelete, actionLabel, hideMeal
}: {
  food: Food | null;
  meal: MealId;
  entry?: FoodEntry;
  onClose: () => void;
  onSave: (entry: FoodEntry, food: Food) => void;
  onDelete?: () => void;
  /** Texto del botón (p. ej. “Añadir al plato” cuando se usa como selector) */
  actionLabel?: string;
  /** Oculta el selector de comida (editores de platos y menús) */
  hideMeal?: boolean;
}) {
  const [mode, setMode] = useState<'serving' | 'grams'>('grams');
  const [amount, setAmount] = useState<number | ''>(100);
  const [meal, setMeal] = useState<MealId>(initialMeal);
  const usage = useUsage();
  const usual = food && !entry ? habitualAmount(usage.get(food.id)) : undefined;

  useEffect(() => {
    if (!food) return;
    setMeal(entry?.meal ?? initialMeal);
    if (entry) {
      setMode('grams');
      setAmount(entry.amount);
    } else if (usual) {
      // Tu cantidad de siempre; en raciones si coincide con un número redondo de ellas
      const r = food.serving ? usual / food.serving.grams : NaN;
      if (food.serving && [0.5, 1, 1.5, 2, 2.5, 3, 4].some((x) => Math.abs(x - r) < 0.01)) {
        setMode('serving');
        setAmount(Math.round(r * 10) / 10);
      } else {
        setMode('grams');
        setAmount(usual);
      }
    } else if (food.serving) {
      setMode('serving');
      setAmount(1);
    } else {
      setMode('grams');
      setAmount(100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [food, entry, initialMeal]);

  if (!food) return null;
  const grams = mode === 'serving' && food.serving ? toNum(amount) * food.serving.grams : toNum(amount);
  const n = scaleNutrients(food.per100, grams);
  // Atajos según el modo (antes, en “Gramos” se veían los de raciones: “0.5 g”)
  const presets = mode === 'serving' && food.serving
    ? [0.5, 1, 1.5, 2]
    : [...new Set([...(usual ? [usual] : []), 50, 100, 150, 200])].sort((a, b) => a - b);

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
      title={food.name}
      footer={
        <div className="row">
          {onDelete && (
            <button className="btn gray" style={{ padding: '0 1rem' }} onClick={onDelete} aria-label="Eliminar">
              <IconTrash size={22} color="var(--danger)" />
            </button>
          )}
          <button className="btn block grow" onClick={save} disabled={grams <= 0}>
            {actionLabel ?? (entry ? 'Guardar cambios' : `Añadir a ${MEALS.find((m) => m.id === meal)!.label}`)}
          </button>
        </div>
      }
    >
      <div className="center" style={{ fontSize: '2.4rem' }} aria-hidden="true">{food.emoji ?? '🍽️'}</div>
      {food.brand && <div className="muted center" style={{ marginBottom: '0.59rem' }}>{food.brand}</div>}

      <div className="card center" style={{ marginBottom: '0.94rem' }}>
        <div className="num" style={{ fontSize: '2.6rem', fontWeight: 700 }}>{fmt(n.kcal)}</div>
        <div className="muted">kcal · {fmt(grams)} {food.unit}</div>
        <div className="grid-3" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginTop: '0.94rem' }}>
          <MiniMacro label="Prot." value={n.protein} color="var(--protein)" />
          <MiniMacro label="Carbos" value={n.carbs} color="var(--carbs)" />
          <MiniMacro label="Grasa" value={n.fat} color="var(--fat)" />
          <MiniMacro label="Fibra" value={n.fiber} color="var(--fiber)" />
        </div>
      </div>

      {food.serving && (
        <div className="segmented" style={{ marginBottom: '0.71rem' }}>
          <button aria-pressed={mode === 'serving'} onClick={() => { setMode('serving'); setAmount(1); }}>
            Raciones
          </button>
          <button aria-pressed={mode === 'grams'} onClick={() => { setMode('grams'); setAmount(food.serving!.grams); }}>
            {food.unit === 'ml' ? 'Mililitros' : 'Gramos'}
          </button>
        </div>
      )}

      <div className="field">
        <label>{mode === 'serving' ? `Raciones (${food.serving!.label} = ${food.serving!.grams} ${food.unit})` : `Cantidad en ${food.unit}`}</label>
        <NumberInput value={amount} onChange={setAmount} suffix={mode === 'serving' ? 'rac.' : food.unit} />
        {usual !== undefined && Math.abs(grams - usual) < 0.5 && (
          <span className="small muted" style={{ display: 'block', marginTop: '0.35rem' }}>↺ Tu cantidad habitual</span>
        )}
      </div>
      <div className="chips" style={{ marginTop: '0.59rem' }}>
        {presets.map((p) => (
          <button key={p} className={`chip${toNum(amount) === p ? ' active' : ''}`} onClick={() => setAmount(p)}>
            {mode === 'serving' ? `${String(p).replace('.', ',')} rac.` : `${String(p).replace('.', ',')} ${food.unit}`}
          </button>
        ))}
      </div>

      {!hideMeal && (
        <div className="field" style={{ marginTop: '1.06rem' }}>
          <label>Comida</label>
          <Segmented label="Comida" value={meal} onChange={setMeal} options={MEALS.map((m) => ({ value: m.id, label: m.label }))} />
        </div>
      )}

      <div className="card small" style={{ marginTop: '1.06rem' }}>
        <div className="row between"><span className="muted">Azúcares</span><b className="num">{fmt(n.sugar ?? 0, 1)} g</b></div>
        <div className="row between" style={{ marginTop: '0.35rem' }}><span className="muted">Grasa saturada</span><b className="num">{fmt(n.satFat ?? 0, 1)} g</b></div>
        {!!n.salt && <div className="row between" style={{ marginTop: '0.35rem' }}><span className="muted">Sal</span><b className="num">{fmt(n.salt, 2)} g</b></div>}
        <div className="row between" style={{ marginTop: '0.35rem' }}>
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
      <div style={{ width: 10, height: 10, borderRadius: 99, background: color, margin: '0 auto 0.24rem' }} />
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

// ───────────────────────── Solo calorías (sin alimento) ─────────────────────────

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
      name: name.trim() || 'Solo calorías',
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
      title="Añadir solo calorías"
      footer={
        <div className="row">
          {onDelete && (
            <button className="btn gray" style={{ padding: '0 1rem' }} onClick={onDelete} aria-label="Eliminar">
              <IconTrash size={22} color="var(--danger)" />
            </button>
          )}
          <button className="btn block grow" disabled={kcal <= 0} onClick={save}>{entry ? 'Guardar' : 'Añadir'}</button>
        </div>
      }
    >
      <p className="muted small" style={{ marginTop: '0.0rem' }}>
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
              <button key={m.id} aria-pressed={meal === m.id} onClick={() => setMeal(m.id)}>{m.label}</button>
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
            <button key={e} className={`chip${emoji === e ? ' active' : ''}`} style={{ fontSize: '1.2rem' }} aria-label={`Icono ${e}`} aria-pressed={emoji === e} onClick={() => setEmoji(e)}>{e}</button>
          ))}
        </div>
        <div className="field"><label>Nombre</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Bowl de quinoa casero" /></div>
        <div className="field"><label>Marca (opcional)</label><input className="input" value={brand} onChange={(e) => setBrand(e.target.value)} /></div>
        <div className="segmented">
          <button aria-pressed={unit === 'g'} onClick={() => setUnit('g')}>Por 100 g</button>
          <button aria-pressed={unit === 'ml'} onClick={() => setUnit('ml')}>Por 100 ml</button>
        </div>
        <p className="muted small" style={{ margin: '0.0rem' }}>Copia los valores de la etiqueta nutricional (columna “por 100 {unit}”).</p>
        {field('kcal', 'Calorías', 'kcal')}
        <div className="grid-2">
          {field('protein', 'Proteínas')}
          {field('carbs', 'Carbohidratos')}
          {field('fat', 'Grasa')}
          {field('fiber', 'Fibra')}
          {field('sugar', 'de los cuales azúcares')}
          {field('satFat', 'Grasa saturada')}
        </div>
        <div className="field-label" style={{ marginTop: '0.35rem' }}>Ración habitual (opcional)</div>
        <div className="grid-2">
          <input className="input" value={servingLabel} onChange={(e) => setServingLabel(e.target.value)} placeholder="1 bol" />
          <NumberInput value={servingGrams} onChange={setServingGrams} suffix={unit} />
        </div>
      </div>
    </Sheet>
  );
}

// ───────────────────────── Código de barras ─────────────────────────
// Escaneo con la cámara (lector propio, sin depender de Safari) y, como
// alternativa, escribir los dígitos que hay bajo las barras.

export function BarcodeSheet({ open, onClose, onFound }: { open: boolean; onClose: () => void; onFound: (f: Food) => void }) {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'notfound' | 'error'>('idle');
  const [scanKey, setScanKey] = useState(0);

  useEffect(() => {
    if (open) {
      setCode('');
      setStatus('idle');
      setScanKey((k) => k + 1);
    }
  }, [open]);

  const search = async (value = code) => {
    setStatus('loading');
    try {
      const f = await lookupBarcode(value);
      if (f) onFound(f);
      else setStatus('notfound');
    } catch {
      setStatus('error');
    }
  };

  return (
    <Sheet open={open} onClose={onClose} full title="Escanear producto"
      footer={
        <button className="btn block" disabled={code.replace(/\D/g, '').length < 8 || status === 'loading'} onClick={() => search()}>
          {status === 'loading' ? 'Buscando…' : 'Buscar producto'}
        </button>
      }>
      {open && status !== 'notfound' && (
        <BarcodeScanner
          key={scanKey}
          onCode={(c) => {
            setCode(c);
            void search(c);
          }}
        />
      )}
      {status === 'notfound' && (
        <div className="banner" role="alert">
          <span aria-hidden="true">🔎</span>
          <div className="small">
            <b>Producto {code} no encontrado</b>
            <div className="muted">No está en Open Food Facts. Puedes crearlo con “Crear alimento” copiando la etiqueta.</div>
            <button className="link small" onClick={() => { setStatus('idle'); setScanKey((k) => k + 1); }}>Escanear otro</button>
          </div>
        </div>
      )}
      {status === 'error' && <p className="small" role="alert" style={{ color: 'var(--danger)' }}>Error de conexión. Revisa tu conexión a internet.</p>}
      <div className="field mt">
        <label htmlFor="barcode-input">O escribe el código (bajo las barras)</label>
        <input id="barcode-input" className="input num" inputMode="numeric" value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="8410000000000" />
      </div>
    </Sheet>
  );
}
