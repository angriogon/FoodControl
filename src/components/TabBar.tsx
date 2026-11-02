import { IconBook, IconDiary, IconHome, IconSprout, IconUser } from './Icons';

export type Tab = 'inicio' | 'diario' | 'recetas' | 'mascota' | 'logros' | 'perfil';

// 'logros' vive dentro de la pestaña Mascota (los logros desbloquean su ropa)
const TABS: { id: Tab; label: string; Icon: typeof IconHome }[] = [
  { id: 'inicio', label: 'Inicio', Icon: IconHome },
  { id: 'diario', label: 'Diario', Icon: IconDiary },
  { id: 'recetas', label: 'Recetario', Icon: IconBook },
  { id: 'mascota', label: 'Mascota', Icon: IconSprout },
  { id: 'perfil', label: 'Perfil', Icon: IconUser }
];

export function TabBar({ tab, onChange, badges }: { tab: Tab; onChange: (t: Tab) => void; badges?: Partial<Record<Tab, number>> }) {
  const active = tab === 'logros' ? 'mascota' : tab;
  return (
    <nav className="tabbar" aria-label="Secciones">
      <div className="tabbar-inner">
        {TABS.map(({ id, label, Icon }) => {
          const badge = badges?.[id];
          return (
            <button
              key={id}
              className="tab"
              onClick={() => {
                if (active === id) window.scrollTo({ top: 0, behavior: 'smooth' });
                onChange(id);
              }}
              aria-current={active === id ? 'page' : undefined}
              aria-label={badge ? `${label}, ${badge} novedad${badge === 1 ? '' : 'es'}` : label}
            >
              <Icon filled={active === id} />
              <span className="tab-label" aria-hidden="true">{label}</span>
              {!!badge && <span className="badge" aria-hidden="true">{badge}</span>}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
