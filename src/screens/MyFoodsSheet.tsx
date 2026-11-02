import { useState } from 'react';
import type { Food } from '../types';
import { Sheet } from '../components/Sheet';
import { IconPencil, IconTrash } from '../components/Icons';
import { toast } from '../components/Toast';
import { actions, useAppState } from '../store/store';
import { CustomFoodSheet, FoodRow } from './FoodSheets';

export function MyFoodsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const state = useAppState();
  const [editing, setEditing] = useState<Food | undefined>();
  const [creating, setCreating] = useState(false);

  return (
    <>
      <Sheet open={open} onClose={onClose} full title="Mis alimentos" footer={<button className="btn block" onClick={() => setCreating(true)}>Crear alimento</button>}>
        <p className="muted small" style={{ marginTop: 0 }}>
          Tus recetas y productos guardados. Aparecen primero al buscar.
        </p>
        {!state.customFoods.length && <p className="center muted" style={{ padding: 30 }}>🥣<br />Aún no has creado ningún alimento.</p>}
        <div className="list">
          {state.customFoods.map((f) => (
            <FoodRow
              key={f.id}
              food={f}
              onClick={() => setEditing(f)}
              right={
                <span className="row" style={{ gap: 6 }}>
                  <span className="icon-btn" style={{ width: 34, height: 34 }}><IconPencil size={16} /></span>
                  <span
                    role="button"
                    className="icon-btn"
                    style={{ width: 34, height: 34 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`¿Eliminar “${f.name}”? Los registros ya hechos se conservan.`)) {
                        actions.removeCustomFood(f.id);
                        toast('Alimento eliminado', '🗑️');
                      }
                    }}
                  >
                    <IconTrash size={16} color="var(--bad)" />
                  </span>
                </span>
              }
            />
          ))}
        </div>
      </Sheet>
      <CustomFoodSheet
        open={creating || !!editing}
        editing={editing}
        onClose={() => { setCreating(false); setEditing(undefined); }}
        onSaved={() => { setCreating(false); setEditing(undefined); }}
      />
    </>
  );
}
