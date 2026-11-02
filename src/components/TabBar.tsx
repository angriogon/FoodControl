import { IconDiary, IconHome, IconSprout, IconTrophy, IconUser } from './Icons';

export type Tab = 'inicio' | 'diario' | 'logros' | 'mascota' | 'perfil';

const TABS: { id: Tab; label: string; Icon: typeof IconHome }[] = [
  { id: 'inicio', label: 'Inicio', Icon: IconHome },
  { id: 'diario', label: 'Diario', Icon: IconDiary },
  { id: 'logros', label: 'Logros', Icon: IconTrophy },
  { id: 'mascota', label: 'Mascota', Icon: IconSprout },
  { id: 'perfil', label: 'Perfil', Icon: IconUser }
];

export function TabBar({ tab, onChange, badges }: { tab: Tab; onChange: (t: Tab) => void; badges?: Partial<Record<Tab, number>> }) {
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
                if (tab === id) window.scrollTo({ top: 0, behavior: 'smooth' });
                onChange(id);
              }}
              aria-current={tab === id ? 'page' : undefined}
              aria-label={badge ? `${label}, ${badge} novedad${badge === 1 ? '' : 'es'}` : label}
            >
              <Icon filled={tab === id} />
              <span aria-hidden="true">{label}</span>
              {!!badge && <span className="badge" aria-hidden="true">{badge}</span>}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
