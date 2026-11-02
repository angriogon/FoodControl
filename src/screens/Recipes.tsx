import { useMemo, useState } from 'react';
import type { Food, Menu, Recipe } from '../types';
import { Segmented } from '../components/common';
import { IconPencil, IconPlus, IconSearch } from '../components/Icons';
import { toast } from '../components/Toast';
import { actions, uid, useAppState } from '../store/store';
import { BASE_RECIPES } from '../lib/base-recipes';
import { normalize } from '../lib/foods';
import { MEALS, fmt } from '../lib/nutrition';
import { describeItems, menuToEntries, menuTotals, perServing, recipeToFood } from '../lib/recipes';
import { mealForNow } from '../lib/suggestions';
import { todayKey } from '../lib/dates';
import { FoodAmountSheet } from './FoodSheets';
import { MenuAddSheet, MenuEditorSheet, RecipeEditorSheet } from './RecipeSheets';

type View = 'menus' | 'platos';

export function Recipes() {
  const state = useAppState();
  const [view, setView] = useState<View>(state.menus.length || !state.recipes.length ? 'menus' : 'platos');
  const [query, setQuery] = useState('');
  const [editMenu, setEditMenu] = useState<Menu | 'new' | null>(null);
  const [adjustMenu, setAdjustMenu] = useState<Menu | null>(null);
  const [editRecipe, setEditRecipe] = useState<Recipe | 'new' | null>(null);
  const [addFood, setAddFood] = useState<Food | null>(null);
  const today = todayKey();
  const q = normalize(query);

  const match = (name: string, tags: string[] = []) => !q || normalize(`${name} ${tags.join(' ')}`).includes(q);
  const menus = useMemo(() => [...state.menus].filter((m) => match(m.name)).sort((a, b) => b.uses - a.uses), [state.menus, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const mine = state.recipes.filter((r) => match(r.name, r.tags));
  const house = BASE_RECIPES.filter((r) => match(r.name, r.tags));

  const quickAddMenu = (m: Menu) => {
    const ids = actions.addEntries(today, menuToEntries(m, m.meal, 1, new Set(), uid));
    actions.markMenuUsed(m.id);
    const label = MEALS.find((x) => x.id === m.meal)!.label;
    toast(`${m.name} añadido a ${label} de hoy`, m.emoji, undefined, { label: 'Deshacer', run: () => actions.removeEntries(today, ids) });
  };

  return (
    <div className="screen">
      <header className="header">
        <div>
          <div className="eyebrow">{state.menus.length} menús · {state.recipes.length} platos propios</div>
          <h1 className="large-title">Recetario</h1>
        </div>
      </header>

      <div className="search" role="search">
        <IconSearch size={18} />
        <input type="search" placeholder="Buscar menú, plato o etiqueta…" value={query} onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar en el recetario" autoCorrect="off" autoCapitalize="none" />
      </div>

      <div className="mt">
        <Segmented label="Sección" value={view} onChange={setView}
          options={[{ value: 'menus', label: `Menús (${state.menus.length})` }, { value: 'platos', label: 'Platos' }]} />
      </div>

      {view === 'menus' ? (
        <>
          <button className="btn block mt" onClick={() => setEditMenu('new')}><IconPlus size={18} /> Nuevo menú</button>
          {menus.length > 0 ? (
            <>
              <h2 className="section-header">Toca + para añadirlo hoy</h2>
              <div className="group inset-icons">
                {menus.map((m) => (
                  <div key={m.id} className="cell" style={{ padding: 0 }}>
                    <button className="cell" style={{ flex: 1 }} onClick={() => setAdjustMenu(m)}
                      aria-label={`${m.name}: ${describeItems(m.items)}. Ajustar y añadir`}>
                      <span className="emoji-tile" aria-hidden="true">{m.emoji}</span>
                      <span className="grow">
                        <span className="cell-title bold ellipsis">{m.name}</span>
                        <span className="cell-sub ellipsis">{describeItems(m.items)}</span>
                        <span className="cell-sub num">{fmt(menuTotals(m).kcal)} kcal · {MEALS.find((x) => x.id === m.meal)!.label}{m.uses ? ` · usado ${m.uses} ${m.uses === 1 ? 'vez' : 'veces'}` : ''}</span>
                      </span>
                    </button>
                    <button className="icon-btn" onClick={() => setEditMenu(m)} aria-label={`Editar ${m.name}`}><IconPencil size={15} /></button>
                    <button className="add-btn" style={{ margin: '0 0.9rem 0 0.6rem' }} onClick={() => quickAddMenu(m)} aria-label={`Añadir ${m.name} a hoy`}>
                      <IconPlus size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="card mt">
              <b>¿Cómo funcionan los menús?</b>
              <ol className="small muted" style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem', lineHeight: 1.5 }}>
                <li>Registra una comida normal en el Diario.</li>
                <li>Despliégala y pulsa <b>Guardar como menú</b>.</li>
                <li>La próxima vez añádela entera de un toque (aquí, en “Añadir alimento” o desde las sugerencias de Inicio).</li>
              </ol>
              <p className="small muted mb-0">También puedes crear uno desde cero con “Nuevo menú”.</p>
            </div>
          )}
        </>
      ) : (
        <>
          <button className="btn block mt" onClick={() => setEditRecipe('new')}><IconPlus size={18} /> Nuevo plato</button>
          {mine.length > 0 && (
            <>
              <h2 className="section-header">Mis platos</h2>
              <RecipeList recipes={mine} onOpen={setEditRecipe} onAdd={(r) => setAddFood(recipeToFood(r))} />
            </>
          )}
          {house.length > 0 && (
            <>
              <h2 className="section-header">Recetas de la casa</h2>
              <RecipeList recipes={house} onOpen={setEditRecipe} onAdd={(r) => setAddFood(recipeToFood(r))} />
              <p className="section-footer">Toca una receta para guardar tu propia versión y adaptarla (cantidades, ingredientes, raciones).</p>
            </>
          )}
          {!mine.length && !house.length && <p className="center muted mt">Nada coincide con “{query}”.</p>}
        </>
      )}

      <MenuEditorSheet open={editMenu !== null} menu={editMenu === 'new' ? undefined : editMenu ?? undefined}
        initialMeal={mealForNow()} onClose={() => setEditMenu(null)} />
      <MenuAddSheet menu={adjustMenu} date={today} meal={adjustMenu?.meal ?? 'comida'} onClose={() => setAdjustMenu(null)} onAdded={() => setAdjustMenu(null)} />
      <RecipeEditorSheet open={editRecipe !== null} recipe={editRecipe === 'new' ? undefined : editRecipe ?? undefined} onClose={() => setEditRecipe(null)} />
      <FoodAmountSheet
        food={addFood}
        meal={mealForNow()}
        onClose={() => setAddFood(null)}
        onSave={(entry) => {
          actions.addEntry(today, entry);
          setAddFood(null);
          toast(`Añadido a ${MEALS.find((m) => m.id === entry.meal)!.label} de hoy`, entry.emoji ?? '✅', undefined, {
            label: 'Deshacer', run: () => actions.removeEntry(today, entry.id)
          });
        }}
      />
    </div>
  );
}

function RecipeList({ recipes, onOpen, onAdd }: { recipes: Recipe[]; onOpen: (r: Recipe) => void; onAdd: (r: Recipe) => void }) {
  return (
    <div className="group inset-icons">
      {recipes.map((r) => {
        const per = perServing(r);
        return (
          <div key={r.id} className="cell" style={{ padding: 0 }}>
            <button className="cell" style={{ flex: 1 }} onClick={() => onOpen(r)} aria-label={`${r.name}, ${fmt(per.kcal)} kilocalorías por ración. Ver o editar`}>
              <span className="emoji-tile" aria-hidden="true">{r.emoji}</span>
              <span className="grow">
                <span className="cell-title bold ellipsis">{r.name}</span>
                <span className="cell-sub num">{fmt(per.kcal)} kcal/ración · P {fmt(per.protein)} g · {fmt(r.servings)} rac.</span>
                {r.tags.length > 0 && <span aria-hidden="true">{r.tags.slice(0, 3).map((t) => <span key={t} className="tag">{t}</span>)}</span>}
              </span>
            </button>
            <button className="add-btn" style={{ margin: '0 0.9rem 0 0.4rem' }} onClick={() => onAdd(r)} aria-label={`Añadir ${r.name} a hoy`}>
              <IconPlus size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
