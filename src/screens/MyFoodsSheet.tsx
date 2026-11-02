import { useState } from 'react';
import type { Food } from '../types';
import { Sheet } from '../components/Sheet';
import { IconTrash } from '../components/Icons';
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
        <p className="muted small" style={{ marginTop: '0.0rem' }}>
          Tus recetas y productos guardados. Aparecen primero al buscar.
        </p>
        {!state.customFoods.length && <p className="center muted" style={{ padding: '1.76rem' }}>🥣<br />Aún no has creado ningún alimento.<br /><span className="small">Créalos desde <b>Añadir alimento → ✏️ Crear alimento</b>, por ejemplo copiando la etiqueta de un producto.</span></p>}
        <div className="group">
          {state.customFoods.map((f) => (
            <FoodRow
              key={f.id}
              food={f}
              onClick={() => setEditing(f)}
              right={
                <span className="row" style={{ gap: '0.35rem' }}>
                  <button
                    aria-label={`Eliminar ${f.name}`}
                    className="icon-btn"
                    
                    onClick={(e) => {
                      e.stopPropagation();
                      const prev = state.customFoods;
                      actions.removeCustomFood(f.id);
                      toast(`“${f.name}” eliminado. Lo ya registrado se conserva`, '🗑️', undefined, { label: 'Deshacer', run: () => actions.restore({ customFoods: prev }) });
                    }}
                  >
                    <IconTrash size={16} color="var(--danger)" />
                  </button>
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
