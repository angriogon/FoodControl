import type { SVGProps } from 'react';

// Iconos SVG propios (trazo 2px, estilo SF Symbols) para no depender de librerías.
type P = SVGProps<SVGSVGElement> & { size?: number; filled?: boolean };

function Base({ size = 24, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {children}
    </svg>
  );
}

export const IconHome = ({ filled, ...p }: P) => (
  <Base {...p}>
    <path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-5.5h-6v5.5H5.5A1.5 1.5 0 0 1 4 19z" fill={filled ? 'currentColor' : 'none'} />
  </Base>
);
export const IconDiary = ({ filled, ...p }: P) => (
  <Base {...p}>
    <rect x="5" y="3.5" width="14" height="17" rx="3" fill={filled ? 'currentColor' : 'none'} />
    <path d="M9 9h6M9 13h4" stroke={filled ? 'var(--card)' : 'currentColor'} />
  </Base>
);
export const IconSprout = ({ filled, ...p }: P) => (
  <Base {...p}>
    <path d="M12 21v-8" />
    <path d="M12 13c0-4 3-6.5 7-6.5 0 4-3 6.5-7 6.5Z" fill={filled ? 'currentColor' : 'none'} />
    <path d="M12 15c0-3.3-2.5-5.5-6-5.5 0 3.3 2.5 5.5 6 5.5Z" fill={filled ? 'currentColor' : 'none'} />
  </Base>
);
export const IconTrophy = ({ filled, ...p }: P) => (
  <Base {...p}>
    <path d="M8 4h8v5a4 4 0 0 1-8 0z" fill={filled ? 'currentColor' : 'none'} />
    <path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7" />
  </Base>
);
export const IconUser = ({ filled, ...p }: P) => (
  <Base {...p}>
    <circle cx="12" cy="8" r="4" fill={filled ? 'currentColor' : 'none'} />
    <path d="M4.5 20c.8-3.5 3.8-5.5 7.5-5.5s6.7 2 7.5 5.5" fill={filled ? 'currentColor' : 'none'} />
  </Base>
);
export const IconPlus = (p: P) => (
  <Base {...p} strokeWidth={2.6}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);
export const IconMinus = (p: P) => (
  <Base {...p} strokeWidth={2.6}>
    <path d="M5 12h14" />
  </Base>
);
export const IconChevronLeft = (p: P) => (
  <Base {...p} strokeWidth={2.6}>
    <path d="m15 5-7 7 7 7" />
  </Base>
);
export const IconChevronRight = (p: P) => (
  <Base {...p} strokeWidth={2.6}>
    <path d="m9 5 7 7-7 7" />
  </Base>
);
export const IconChevronDown = (p: P) => (
  <Base {...p} strokeWidth={2.4}>
    <path d="m5 9 7 7 7-7" />
  </Base>
);
export const IconClose = (p: P) => (
  <Base {...p} strokeWidth={2.4}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Base>
);
export const IconCalendar = (p: P) => (
  <Base {...p}>
    <rect x="4" y="5" width="16" height="15" rx="3" />
    <path d="M8 3v4M16 3v4M4 10h16" />
    <rect x="13" y="13.5" width="3" height="3" rx=".5" fill="currentColor" stroke="none" />
  </Base>
);
export const IconSparkles = (p: P) => (
  <Base {...p} strokeWidth={0} fill="currentColor">
    <path d="M10 3.5c.5 3.7 2.3 5.5 6 6-3.7.5-5.5 2.3-6 6-.5-3.7-2.3-5.5-6-6 3.7-.5 5.5-2.3 6-6ZM18 13c.3 2 1.2 3 3 3.3-1.8.3-2.7 1.2-3 3.2-.3-2-1.2-2.9-3-3.2 1.8-.3 2.7-1.3 3-3.3ZM18 2.5c.2 1.3.8 2 2 2.2-1.2.2-1.8.9-2 2.2-.2-1.3-.8-2-2-2.2 1.2-.2 1.8-.9 2-2.2Z" />
  </Base>
);
export const IconArrowRight = (p: P) => (
  <Base {...p}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </Base>
);
export const IconSearch = (p: P) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </Base>
);
export const IconTrash = (p: P) => (
  <Base {...p}>
    <path d="M4.5 7h15M10 11v6M14 11v6M6.5 7l1 12a2 2 0 0 0 2 1.8h5a2 2 0 0 0 2-1.8l1-12M9 7V4.5h6V7" />
  </Base>
);
export const IconGear = (p: P) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
  </Base>
);
export const IconCheck = (p: P) => (
  <Base {...p} strokeWidth={3}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Base>
);
export const IconInfo = (p: P) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 7.5v.5" />
  </Base>
);
export const IconPencil = (p: P) => (
  <Base {...p}>
    <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" />
  </Base>
);
export const IconLock = (p: P) => (
  <Base {...p}>
    <rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </Base>
);
export const IconCopy = (p: P) => (
  <Base {...p}>
    <rect x="8" y="8" width="12" height="12" rx="2.5" />
    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
  </Base>
);
export const IconSliders = (p: P) => (
  <Base {...p}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </Base>
);
export const IconBook = ({ filled, ...p }: P) => (
  <Base {...p}>
    <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z" fill={filled ? 'currentColor' : 'none'} />
    <path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3" />
    <path d="M9 7.5h6" stroke={filled ? 'var(--bg)' : 'currentColor'} />
  </Base>
);
export const IconShare = (p: P) => (
  <Base {...p}>
    <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M5 12v6.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V12" />
  </Base>
);

export function Gem({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3h10l5 6.5L12 21 2 9.5z" fill="#3CC8B4" />
      <path d="M7 3h10l-5 6.5zM2 9.5h20L12 21z" fill="#5FDCC9" opacity=".7" />
    </svg>
  );
}

export function Flame({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.5c.8 3.6 5.5 5.6 5.5 11a5.5 5.5 0 0 1-11 0c0-2.7 1.4-4.3 2.6-5.6.2 1.9.9 3 2 3.6-.4-3.3-.1-6 .9-9Z" fill="#F39A3D" />
      <path d="M12 21a3 3 0 0 1-3-3c0-1.8 1.6-2.9 2.3-4.6.9 1.5 3.7 2.5 3.7 4.6a3 3 0 0 1-3 3Z" fill="#FFD27A" />
    </svg>
  );
}
