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
    <nav className="tabbar" aria-label="Navegación principal">
      <div className="tabbar-inner">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`tab${tab === id ? ' active' : ''}`}
            onClick={() => {
              if (tab === id) window.scrollTo({ top: 0, behavior: 'smooth' });
              onChange(id);
            }}
            aria-current={tab === id ? 'page' : undefined}
          >
            <Icon size={26} filled={tab === id} />
            {label}
            {!!badges?.[id] && <span className="badge">{badges[id]}</span>}
          </button>
        ))}
      </div>
    </nav>
  );
}
