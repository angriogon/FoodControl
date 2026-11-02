import { useEffect, useMemo, useState } from 'react';
import type { Food, MealId, Menu, Portion, Recipe } from '../types';
import { Sheet } from '../components/Sheet';
import { NumberInput, Segmented, toNum } from '../components/common';
import { IconCheck, IconPlus, IconSearch, IconTrash } from '../components/Icons';
import { toast } from '../components/Toast';
import { actions, getState, uid, useAppState } from '../store/store';
import { BASE_FOODS } from '../lib/foods';
import { MEALS, fmt, scaleNutrients, sumNutrients } from '../lib/nutrition';
import { menuToEntries, portionNutrients, recipeTotals, recipeWeight } from '../lib/recipes';
import { BarcodeSheet, FoodAmountSheet, FoodRow } from './FoodSheets';
import { OnlineResults, useLocalSearch, useOnlineSearch } from './FoodSearch';

const RECIPE_EMOJIS = ['🍲', '🥗', '🍝', '🍚', '🥘', '🍳', '🍗', '🐟', '🥩', '🥪', '🌯', '🍕', '🥣', '🍜', '🥞', '🥤', '🍰', '🍽️'];
const MENU_EMOJIS = ['🍽️', '☀️', '🥐', '☕', '🍲', '🥗', '🌙', '🍎', '💪', '🏃', '🥪', '⭐'];
const TAGS = ['desayuno', 'comida', 'cena', 'snack', 'rápido', 'ligero', 'alto en proteína', 'vegetariano', 'legumbre', 'horno'];

function MacroLine({ n }: { n: ReturnType<typeof sumNutrients> }) {
  return (
    <span className="small muted num">P {fmt(n.protein)} g · C {fmt(n.carbs)} g · G {fmt(n.fat)} g · F {fmt(n.fiber)} g</span>
  );
}

/** Lista de ingredientes/elementos con cantidad editable */
function PortionList({ items, onChange }: { items: Portion[]; onChange: (items: Portion[]) => void }) {
  if (!items.length) return null;
  return (
    <div className="group">
      {items.map((p, i) => (
        <div key={`${p.food.id}-${i}`} className="cell">
          <span className="emoji-tile" aria-hidden="true">{p.food.emoji ?? '🍽️'}</span>
          <span className="grow">
            <span className="cell-title ellipsis">{p.food.name}</span>
            <span className="cell-sub num">{fmt(portionNutrients(p).kcal)} kcal</span>
          </span>
          <span style={{ width: '6.2rem' }}>
            <NumberInput
              value={p.amount}
              label={`Cantidad de ${p.food.name}`}
              suffix={p.food.unit}
              onChange={(v) => onChange(items.map((x, j) => (j === i ? { ...x, amount: Math.max(0, toNum(v)) } : x)))}
            />
          </span>
          <button className="icon-btn" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`Quitar ${p.food.name}`}>
            <IconTrash size={15} color="var(--danger)" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ───────────────────────── Selector de ingredientes ─────────────────────────

export function FoodPickerSheet({ open, onClose, onPick, title = 'Añadir ingrediente', excludeId, initialQuery }: {
  open: boolean;
  /** Texto con el que empieza la búsqueda (p. ej. lo que no se reconoció al escribir) */
  initialQuery?: string;
  onClose: () => void;
  onPick: (p: Portion) => void;
  title?: string;
  /** Evita añadir un plato dentro de sí mismo */
  excludeId?: string;
}) {
  const state = useAppState();
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Food | null>(null);
  const [scan, setScan] = useState(false);
  const local = useLocalSearch(query).filter((f) => f.id !== excludeId);
  const online = useOnlineSearch(query);

  useEffect(() => {
    if (open) setQuery(initialQuery ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const list = query.trim() ? local : state.recentFoods.length ? state.recentFoods : BASE_FOODS.slice(0, 40);

  return (
    <>
      <Sheet open={open} onClose={onClose} full title={title}>
        <form className="search" role="search" onSubmit={(e) => { e.preventDefault(); if (!local.length) void online.search(); }}>
          <IconSearch size={18} />
          <input type="search" placeholder="Buscar ingrediente…" value={query} onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar ingrediente" autoCorrect="off" autoCapitalize="none" enterKeyHint="search" />
        </form>
        <div className="chips" style={{ marginTop: '0.7rem' }}>
          <button className="chip" onClick={() => setScan(true)}>📷 Escanear código</button>
        </div>
        {!query.trim() && <h3 className="section-header" style={{ marginLeft: 0 }}>{state.recentFoods.length ? 'Recientes' : 'Sugeridos'}</h3>}
        {list.length > 0 && (
          <div className="group" style={{ marginTop: query.trim() ? '0.8rem' : 0 }}>
            {list.map((f) => <FoodRow key={f.id} food={f} onClick={() => setPicked(f)} />)}
          </div>
        )}
        <OnlineResults query={query} online={online} hasLocal={local.length > 0} onPick={setPicked} />
      </Sheet>
      <FoodAmountSheet
        food={picked}
        meal="comida"
        hideMeal
        actionLabel="Añadir"
        onClose={() => setPicked(null)}
        onSave={(entry, food) => {
          onPick({ food, amount: entry.amount });
          if (food.source !== 'recipe') actions.pushRecent(food);
          setPicked(null);
          onClose();
        }}
      />
      <BarcodeSheet open={scan} onClose={() => setScan(false)} onFound={(f) => { setScan(false); setPicked(f); }} />
    </>
  );
}

// ───────────────────────── Editor de platos ─────────────────────────

export function RecipeEditorSheet({ open, recipe, onClose, onSaved }: {
  open: boolean;
  recipe?: Recipe;
  onClose: () => void;
  onSaved?: (r: Recipe) => void;
}) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🍲');
  const [servings, setServings] = useState<number | ''>(2);
  const [items, setItems] = useState<Portion[]>([]);
  const [cooked, setCooked] = useState<number | ''>('');
  const [tags, setTags] = useState<string[]>([]);
  const [picker, setPicker] = useState(false);
  const isNew = !recipe || recipe.id.startsWith('base-');

  useEffect(() => {
    if (!open) return;
    setName(recipe ? (recipe.id.startsWith('base-') ? `${recipe.name} (mi versión)` : recipe.name) : '');
    setEmoji(recipe?.emoji ?? '🍲');
    setServings(recipe?.servings ?? 2);
    setItems(recipe?.ingredients ?? []);
    setCooked(recipe?.cookedWeightG ?? '');
    setTags(recipe?.tags ?? []);
  }, [open, recipe]);

  const draft: Recipe = {
    id: recipe && !recipe.id.startsWith('base-') ? recipe.id : 'draft',
    name, emoji, servings: Math.max(0.5, toNum(servings) || 1), ingredients: items.filter((i) => i.amount > 0),
    cookedWeightG: toNum(cooked) > 0 ? toNum(cooked) : undefined, tags, createdAt: recipe?.createdAt ?? new Date().toISOString()
  };
  const totals = recipeTotals(draft);
  const per = scaleNutrients(totals, 100 / draft.servings);
  const weight = recipeWeight(draft);
  const valid = name.trim().length > 0 && draft.ingredients.length > 0;

  const save = () => {
    const r: Recipe = { ...draft, id: isNew ? uid() : draft.id, name: name.trim() };
    actions.saveRecipe(r);
    toast(isNew ? 'Plato guardado en tu recetario' : 'Plato actualizado', emoji);
    onSaved?.(r);
    onClose();
  };

  return (
    <>
      <Sheet open={open} onClose={onClose} full title={isNew ? 'Nuevo plato' : 'Editar plato'}
        footer={
          <div className="row">
            {!isNew && (
              <button className="btn gray" style={{ padding: '0 1rem' }} aria-label="Eliminar plato"
                onClick={() => {
                  const prev = getState().recipes;
                  actions.deleteRecipe(recipe!.id);
                  onClose();
                  toast(`“${recipe!.name}” eliminado. Lo ya registrado se conserva`, '🗑️', undefined, { label: 'Deshacer', run: () => actions.restore({ recipes: prev }) });
                }}>
                <IconTrash size={20} color="var(--danger)" />
              </button>
            )}
            <button className="btn block grow" disabled={!valid} onClick={save}>{valid ? 'Guardar plato' : 'Añade nombre e ingredientes'}</button>
          </div>
        }>
        <div className="stack">
          <div className="chips" role="group" aria-label="Icono">
            {RECIPE_EMOJIS.map((e) => (
              <button key={e} className={`chip${emoji === e ? ' active' : ''}`} style={{ fontSize: '1.2rem' }} aria-pressed={emoji === e} aria-label={`Icono ${e}`} onClick={() => setEmoji(e)}>{e}</button>
            ))}
          </div>
          <div className="field">
            <label htmlFor="recipe-name">Nombre</label>
            <input id="recipe-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Lentejas de mi madre" maxLength={80} />
          </div>
          <div className="grid-2">
            <div className="field">
              <label>Raciones que salen</label>
              <NumberInput value={servings} onChange={setServings} suffix="rac." label="Raciones" />
            </div>
            <div className="field">
              <label>Peso cocinado (opcional)</label>
              <NumberInput value={cooked} onChange={setCooked} suffix="g" decimal={false} placeholder={String(Math.round(weight))} label="Peso total cocinado" />
            </div>
          </div>
          <p className="tiny muted" style={{ margin: '-0.3rem 0 0' }}>
            Si pesas la olla al terminar (sin el recipiente), podrás registrar los gramos exactos que te sirves.
          </p>
        </div>

        <h3 className="section-header">Ingredientes ({items.length})</h3>
        <PortionList items={items} onChange={setItems} />
        <button className="btn secondary block mt-s" onClick={() => setPicker(true)}><IconPlus size={18} /> Añadir ingrediente</button>

        {draft.ingredients.length > 0 && (
          <div className="card mt" aria-live="polite">
            <div className="row between">
              <b>Por ración</b>
              <span className="num bold" style={{ fontSize: '1.2rem' }}>{fmt(per.kcal)} kcal</span>
            </div>
            <MacroLine n={per} />
            <div className="row between small muted" style={{ marginTop: '0.5rem' }}>
              <span>Plato completo: {fmt(totals.kcal)} kcal</span>
              <span>{fmt(weight / draft.servings)} g/ración</span>
            </div>
          </div>
        )}

        <h3 className="section-header">Etiquetas</h3>
        <div className="row wrap" style={{ gap: '0.4rem' }}>
          {TAGS.map((t) => (
            <button key={t} className={`chip${tags.includes(t) ? ' active' : ''}`} aria-pressed={tags.includes(t)}
              onClick={() => setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t])}>{t}</button>
          ))}
        </div>
      </Sheet>
      <FoodPickerSheet open={picker} onClose={() => setPicker(false)} excludeId={recipe ? `recipe:${recipe.id}` : undefined}
        onPick={(p) => setItems((prev) => [...prev, p])} />
    </>
  );
}

// ───────────────────────── Editor de menús ─────────────────────────

export function MenuEditorSheet({ open, menu, initialItems, initialMeal = 'comida', initialName = '', onClose, onSaved }: {
  open: boolean;
  menu?: Menu;
  initialItems?: Portion[];
  initialMeal?: MealId;
  initialName?: string;
  onClose: () => void;
  onSaved?: (m: Menu) => void;
}) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🍽️');
  const [meal, setMeal] = useState<MealId>(initialMeal);
  const [items, setItems] = useState<Portion[]>([]);
  const [picker, setPicker] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(menu?.name ?? initialName);
    setEmoji(menu?.emoji ?? (initialMeal === 'desayuno' ? '☀️' : initialMeal === 'cena' ? '🌙' : initialMeal === 'snacks' ? '🍎' : '🍽️'));
    setMeal(menu?.meal ?? initialMeal);
    setItems(menu?.items ?? initialItems ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, menu]);

  const clean = items.filter((i) => i.amount > 0);
  const totals = sumNutrients(clean.map(portionNutrients));
  const valid = name.trim().length > 0 && clean.length > 0;

  const save = () => {
    const m: Menu = {
      id: menu?.id ?? uid(), name: name.trim(), emoji, meal, items: clean,
      createdAt: menu?.createdAt ?? new Date().toISOString(), uses: menu?.uses ?? 0
    };
    actions.saveMenu(m);
    toast(menu ? 'Menú actualizado' : `Menú “${m.name}” guardado. Ya puedes añadirlo de un toque`, emoji, 3500);
    onSaved?.(m);
    onClose();
  };

  return (
    <>
      <Sheet open={open} onClose={onClose} full title={menu ? 'Editar menú' : 'Nuevo menú'}
        footer={
          <div className="row">
            {menu && (
              <button className="btn gray" style={{ padding: '0 1rem' }} aria-label="Eliminar menú"
                onClick={() => {
                  const prev = getState().menus;
                  actions.deleteMenu(menu.id);
                  onClose();
                  toast(`Menú “${menu.name}” eliminado`, '🗑️', undefined, { label: 'Deshacer', run: () => actions.restore({ menus: prev }) });
                }}>
                <IconTrash size={20} color="var(--danger)" />
              </button>
            )}
            <button className="btn block grow" disabled={!valid} onClick={save}>{valid ? 'Guardar menú' : 'Añade nombre y alimentos'}</button>
          </div>
        }>
        <div className="stack">
          <div className="chips" role="group" aria-label="Icono">
            {MENU_EMOJIS.map((e) => (
              <button key={e} className={`chip${emoji === e ? ' active' : ''}`} style={{ fontSize: '1.2rem' }} aria-pressed={emoji === e} aria-label={`Icono ${e}`} onClick={() => setEmoji(e)}>{e}</button>
            ))}
          </div>
          <div className="field">
            <label htmlFor="menu-name">Nombre</label>
            <input id="menu-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Mi desayuno de diario" maxLength={80} />
          </div>
          <div className="field">
            <label>Se añade normalmente en</label>
            <Segmented label="Comida habitual" value={meal} onChange={setMeal} options={MEALS.map((m) => ({ value: m.id, label: m.label }))} />
          </div>
        </div>

        <h3 className="section-header">Contenido ({clean.length})</h3>
        <PortionList items={items} onChange={setItems} />
        <button className="btn secondary block mt-s" onClick={() => setPicker(true)}><IconPlus size={18} /> Añadir alimento o plato</button>

        {clean.length > 0 && (
          <div className="card mt" aria-live="polite">
            <div className="row between">
              <b>Total del menú</b>
              <span className="num bold" style={{ fontSize: '1.2rem' }}>{fmt(totals.kcal)} kcal</span>
            </div>
            <MacroLine n={totals} />
          </div>
        )}
      </Sheet>
      <FoodPickerSheet open={picker} onClose={() => setPicker(false)} title="Añadir al menú" onPick={(p) => setItems((prev) => [...prev, p])} />
    </>
  );
}

// ───────────────────────── Ajustar menú antes de añadir ─────────────────────────

const FACTORS = [0.5, 0.75, 1, 1.5, 2];

export function MenuAddSheet({ menu, date, meal: initialMeal, onClose, onAdded }: {
  menu: Menu | null;
  date: string;
  meal: MealId;
  onClose: () => void;
  onAdded?: () => void;
}) {
  const [skip, setSkip] = useState<Set<number>>(new Set());
  const [factor, setFactor] = useState(1);
  const [meal, setMeal] = useState<MealId>(initialMeal);

  useEffect(() => {
    if (menu) {
      setSkip(new Set());
      setFactor(1);
      setMeal(initialMeal);
    }
  }, [menu, initialMeal]);

  const totals = useMemo(() => {
    if (!menu) return null;
    return sumNutrients(menu.items.filter((_, i) => !skip.has(i)).map((p) => scaleNutrients(p.food.per100, p.amount * factor)));
  }, [menu, skip, factor]);

  if (!menu || !totals) return null;
  const count = menu.items.length - skip.size;
  const mealLabel = MEALS.find((m) => m.id === meal)!.label;

  const add = () => {
    const entries = menuToEntries(menu, meal, factor, skip, uid);
    const ids = actions.addEntries(date, entries);
    actions.markMenuUsed(menu.id);
    onAdded?.();
    toast(`${menu.name} añadido a ${mealLabel}`, menu.emoji, undefined, { label: 'Deshacer', run: () => actions.removeEntries(date, ids) });
  };

  return (
    <Sheet open={!!menu} onClose={onClose} title={menu.name}
      footer={<button className="btn block" disabled={!count} onClick={add}>Añadir {count} alimento{count === 1 ? '' : 's'} · {fmt(totals.kcal)} kcal</button>}>
      <p className="small muted" style={{ marginTop: 0 }}>Desmarca lo que hoy no has tomado o ajusta la cantidad de todo el menú.</p>
      <div className="group">
        {menu.items.map((p, i) => {
          const on = !skip.has(i);
          return (
            <button key={i} className="cell check-row" role="checkbox" aria-checked={on}
              onClick={() => setSkip((prev) => { const n = new Set(prev); if (n.has(i)) n.delete(i); else n.add(i); return n; })}>
              <span className={`check-box${on ? ' on' : ''}`} aria-hidden="true">{on && <IconCheck size={13} />}</span>
              <span className="emoji-tile" aria-hidden="true">{p.food.emoji ?? '🍽️'}</span>
              <span className="grow">
                <span className="cell-title ellipsis" style={{ opacity: on ? 1 : 0.5 }}>{p.food.name}</span>
                <span className="cell-sub num">{fmt(p.amount * factor)} {p.food.unit} · {fmt(scaleNutrients(p.food.per100, p.amount * factor).kcal)} kcal</span>
              </span>
            </button>
          );
        })}
      </div>
      <h3 className="section-header">Cantidad</h3>
      <Segmented label="Cantidad del menú" value={factor} onChange={setFactor}
        options={FACTORS.map((f) => ({ value: f, label: `×${String(f).replace('.', ',')}` }))} />
      <h3 className="section-header">Comida</h3>
      <Segmented label="Comida" value={meal} onChange={setMeal} options={MEALS.map((m) => ({ value: m.id, label: m.label }))} />
      <div className="card mt">
        <div className="row between"><b>Total</b><span className="num bold">{fmt(totals.kcal)} kcal</span></div>
        <MacroLine n={totals} />
      </div>
    </Sheet>
  );
}

