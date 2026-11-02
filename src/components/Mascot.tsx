import type { PetState } from '../types';
import { PET_COLORS, SCENES, type Mood } from '../lib/pet';

// Mascota original: “Brotín”, una semillita con un brote que crece con el
// nivel (1 hoja por nivel, hasta 5). Todo es SVG para que escale perfecto en
// pantallas Retina y no pese nada.

interface Props {
  equipped: PetState['equipped'];
  level?: number;
  mood?: Mood;
  size?: number;
  scene?: boolean;
}

const INK = '#2A3344';

export function Mascot({ equipped, level = 1, mood = 'feliz', size = 200, scene = true }: Props) {
  const color = PET_COLORS[equipped.color] ?? PET_COLORS.verde;
  const sc = SCENES[equipped.scene] ?? SCENES.prado;
  const leaves = Math.min(5, Math.max(1, level));
  const gid = `sky-${equipped.scene}`;
  const hatCoversTop = ['gorra', 'chef', 'lana', 'corona'].includes(equipped.hat);

  return (
    <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label="Mascota" style={{ display: 'block' }}>
      {scene && (
        <>
          <defs>
            <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={sc.sky[0]} />
              <stop offset="1" stopColor={sc.sky[1]} />
            </linearGradient>
          </defs>
          <rect width="200" height="200" fill={`url(#${gid})`} />
          <SceneDecor scene={equipped.scene} />
          <ellipse cx="100" cy="200" rx="150" ry="34" fill={sc.ground} />
        </>
      )}
      <ellipse cx="100" cy="176" rx="44" ry="6" fill="#000" opacity=".1" />

      <g className="pet-bounce">
        {/* Brote: crece con el nivel */}
        {!hatCoversTop && <Sprout leaves={leaves} />}
        {hatCoversTop && equipped.hat !== 'corona' && <Sprout leaves={Math.min(leaves, 2)} lift={-22} />}

        {/* Pies y brazos */}
        <ellipse cx="80" cy="170" rx="14" ry="7" fill={color.body} stroke={INK} strokeWidth="3" />
        <ellipse cx="120" cy="170" rx="14" ry="7" fill={color.body} stroke={INK} strokeWidth="3" />
        <path d="M46 126c-10 2-15 10-13 18" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <path d="M154 126c10 2 15 10 13 18" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />

        {/* Cuerpo */}
        <path
          d="M100 68C140 68 158 100 158 128C158 156 134 172 100 172C66 172 42 156 42 128C42 100 60 68 100 68Z"
          fill={color.body}
          stroke={INK}
          strokeWidth="3"
        />
        <ellipse cx="100" cy="146" rx="30" ry="20" fill={color.belly} opacity=".95" />
        <path d="M66 86c6-6 14-9 22-10" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".45" fill="none" />

        <Face mood={mood} face={equipped.face} />
        <Neck neck={equipped.neck} />
        <Hat hat={equipped.hat} />
      </g>
    </svg>
  );
}

function Sprout({ leaves, lift = 0 }: { leaves: number; lift?: number }) {
  const positions = [
    { x: 100, y: 46, r: -35, s: 1 },
    { x: 100, y: 52, r: 215, s: 0.9 },
    { x: 100, y: 40, r: 215, s: 0.8 },
    { x: 100, y: 58, r: -30, s: 0.75 },
    { x: 100, y: 36, r: -40, s: 0.7 }
  ];
  return (
    <g transform={`translate(0 ${lift})`}>
      <path d="M100 72C100 62 101 52 100 38" stroke="#4E8B3A" strokeWidth="4" strokeLinecap="round" fill="none" />
      {positions.slice(0, leaves).map((p, i) => (
        <path
          key={i}
          d="M0 0C6 -10 20 -12 28 -6C22 4 8 6 0 0Z"
          fill="#7CC36A"
          stroke="#4E8B3A"
          strokeWidth="2.5"
          strokeLinejoin="round"
          transform={`translate(${p.x} ${p.y}) rotate(${p.r}) scale(${p.s})`}
        />
      ))}
    </g>
  );
}

function Face({ mood, face }: { mood: Mood; face: string }) {
  const eyes =
    face === 'estrellas' ? (
      <>
        <Star x={82} y={112} />
        <Star x={118} y={112} />
      </>
    ) : mood === 'dormido' ? (
      <>
        <path d="M74 113q8 6 16 0" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M110 113q8 6 16 0" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
      </>
    ) : mood === 'eufórico' ? (
      <>
        <path d="M74 115q8 -10 16 0" stroke={INK} strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <path d="M110 115q8 -10 16 0" stroke={INK} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      </>
    ) : (
      <g className="pet-blink">
        <ellipse cx="82" cy="112" rx="5" ry="6.5" fill={INK} />
        <ellipse cx="118" cy="112" rx="5" ry="6.5" fill={INK} />
        <circle cx="84" cy="109.5" r="1.8" fill="#fff" />
        <circle cx="120" cy="109.5" r="1.8" fill="#fff" />
      </g>
    );

  const mouth =
    mood === 'dormido' ? (
      <ellipse cx="100" cy="130" rx="4" ry="3" fill={INK} opacity=".7" />
    ) : mood === 'contento' ? (
      <path d="M93 127q7 5 14 0" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
    ) : (
      <path d="M90 125q10 12 20 0Z" fill="#C4485A" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
    );

  return (
    <g>
      <ellipse cx="68" cy="124" rx="7" ry="4.5" fill="#FF8FA3" opacity=".75" />
      <ellipse cx="132" cy="124" rx="7" ry="4.5" fill="#FF8FA3" opacity=".75" />
      {eyes}
      {mouth}
      {mood === 'dormido' && (
        <text x="140" y="86" fontSize="16" fontWeight="700" fill={INK} opacity=".6" fontFamily="system-ui">
          z<tspan dx="2" dy="-8" fontSize="12">z</tspan>
        </text>
      )}
      {face === 'gafas' && (
        <g fill="none" stroke={INK} strokeWidth="3">
          <circle cx="82" cy="112" r="12" />
          <circle cx="118" cy="112" r="12" />
          <path d="M94 111q6 -4 12 0M70 109l-16 -4M130 109l16 -4" />
        </g>
      )}
      {face === 'gafas-sol' && (
        <g stroke={INK} strokeWidth="3">
          <path d="M67 104h30v8a13 11 0 0 1-30 0Z" fill="#1E2632" />
          <path d="M103 104h30v8a13 11 0 0 1-30 0Z" fill="#1E2632" />
          <path d="M97 106h6M67 105l-12 -4M133 105l12 -4" fill="none" />
          <path d="M73 108l6 0" stroke="#fff" strokeWidth="2.5" opacity=".6" />
          <path d="M109 108l6 0" stroke="#fff" strokeWidth="2.5" opacity=".6" />
        </g>
      )}
    </g>
  );
}

function Star({ x, y }: { x: number; y: number }) {
  return (
    <path
      transform={`translate(${x} ${y})`}
      d="M0 -9 2.6 -3 9 -2.8 4 1.4 5.6 8 0 4.4 -5.6 8 -4 1.4 -9 -2.8 -2.6 -3Z"
      fill="#F6C343"
      stroke={INK}
      strokeWidth="2"
      strokeLinejoin="round"
    />
  );
}

function Neck({ neck }: { neck: string }) {
  switch (neck) {
    case 'pajarita':
      return (
        <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M100 150 80 140v20Z" fill="#E5564F" />
          <path d="M100 150 120 140v20Z" fill="#E5564F" />
          <circle cx="100" cy="150" r="5" fill="#C23F3A" />
        </g>
      );
    case 'bufanda':
      return (
        <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M52 138q48 22 96 0l3 12q-51 24 -102 0Z" fill="#E5564F" />
          <path d="M120 148l4 26 14 -2 -6 -27Z" fill="#E5564F" />
          <path d="M64 145l2 7M80 151l1 7M96 153v7M112 152l-1 7M128 148l-2 7" stroke="#fff" opacity=".6" />
        </g>
      );
    case 'medalla':
      return (
        <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M84 132 100 152 116 132" fill="none" stroke="#3E7CC9" strokeWidth="6" />
          <circle cx="100" cy="158" r="10" fill="#F6C343" />
          <path d="M100 152v12M96 156h8" stroke="#B88A10" strokeWidth="2" />
        </g>
      );
    case 'collar-flores':
      return (
        <g stroke={INK} strokeWidth="2">
          {[64, 78, 92, 108, 122, 136].map((x, i) => (
            <circle key={x} cx={x} cy={142 + Math.sin((i / 5) * Math.PI) * 9} r="6"
              fill={['#F49AC1', '#F6C343', '#FFFFFF', '#F49AC1', '#F6C343', '#FFFFFF'][i]} />
          ))}
        </g>
      );
    default:
      return null;
  }
}

function Hat({ hat }: { hat: string }) {
  switch (hat) {
    case 'flor':
      return (
        <g transform="translate(132 82)" stroke={INK} strokeWidth="2">
          {[0, 72, 144, 216, 288].map((r) => (
            <ellipse key={r} cx="0" cy="-8" rx="6" ry="8" fill="#FFFFFF" transform={`rotate(${r})`} />
          ))}
          <circle r="5" fill="#F6C343" />
        </g>
      );
    case 'gorra':
      return (
        <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
          <path d="M60 92C62 64 138 64 140 92Z" fill="#3E7CC9" />
          <path d="M120 90q30 -2 40 6q-20 6 -42 2Z" fill="#2F64A8" />
          <circle cx="100" cy="68" r="4" fill="#2F64A8" />
        </g>
      );
    case 'chef':
      return (
        <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
          <path d="M70 84h60v-8H70Z" fill="#FFFFFF" />
          <path d="M72 76c-14-4-12-28 6-26 2-14 22-18 30-6 10-10 28-2 24 12 14 2 12 22-2 20Z" fill="#FFFFFF" />
        </g>
      );
    case 'corona':
      return (
        <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
          <path d="M74 80 70 52l16 14 14-20 14 20 16-14-4 28Z" fill="#F6C343" />
          <circle cx="100" cy="70" r="4" fill="#E5564F" strokeWidth="2" />
          <circle cx="84" cy="74" r="3" fill="#3E7CC9" strokeWidth="2" />
          <circle cx="116" cy="74" r="3" fill="#3E7CC9" strokeWidth="2" />
        </g>
      );
    case 'lana':
      return (
        <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
          <path d="M60 94C58 58 142 58 140 94Z" fill="#B49BE8" />
          <path d="M58 92h84v10H58Z" fill="#9A7FD6" />
          <circle cx="100" cy="56" r="10" fill="#FFFFFF" />
        </g>
      );
    case 'auriculares':
      return (
        <g stroke={INK} strokeWidth="3">
          <path d="M50 112C46 60 154 60 150 112" fill="none" strokeWidth="6" stroke="#2A3344" />
          <rect x="38" y="100" width="16" height="28" rx="7" fill="#E5564F" />
          <rect x="146" y="100" width="16" height="28" rx="7" fill="#E5564F" />
        </g>
      );
    default:
      return null;
  }
}

function SceneDecor({ scene }: { scene: string }) {
  switch (scene) {
    case 'playa':
      return (
        <g>
          <circle cx="160" cy="40" r="18" fill="#FFD25E" />
          <path d="M0 170q25 -8 50 0t50 0 50 0 50 0v30H0Z" fill="#8FD0EE" opacity=".8" />
          <path d="M28 150l4 -40" stroke="#9A6B40" strokeWidth="4" />
          <path d="M32 110q-20 -2 -26 10M32 110q16 -10 28 2M32 110q-6 -16 -20 -14" stroke="#4E8B3A" strokeWidth="5" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'montana':
      return (
        <g>
          <path d="M-10 170 50 80l40 60 30-40 90 70Z" fill="#B6C8E2" />
          <path d="M50 80l14 22h-28ZM120 100l10 14h-20Z" fill="#fff" />
          <circle cx="40" cy="36" r="14" fill="#FFD25E" />
        </g>
      );
    case 'cocina':
      return (
        <g opacity=".9">
          <rect x="0" y="0" width="200" height="120" fill="#FFF6EC" />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <path key={i} d={`M${i * 25} 0v120`} stroke="#F1DFCA" strokeWidth="2" />
          ))}
          <rect x="14" y="40" width="50" height="6" rx="3" fill="#C59A6C" />
          <circle cx="26" cy="32" r="8" fill="#F4908C" />
          <rect x="40" y="22" width="14" height="18" rx="3" fill="#9FD3F2" />
          <rect x="140" y="24" width="40" height="30" rx="6" fill="#D6EFEB" stroke="#C59A6C" strokeWidth="3" />
        </g>
      );
    case 'noche':
      return (
        <g>
          <circle cx="156" cy="40" r="16" fill="#F6E7A8" />
          <circle cx="162" cy="35" r="14" fill="#2C3A60" />
          {[[30, 30], [60, 60], [100, 24], [130, 70], [20, 90], [180, 100], [80, 90]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 2 ? 1.6 : 2.4} fill="#fff" opacity=".85" />
          ))}
        </g>
      );
    default:
      return (
        <g>
          <circle cx="44" cy="42" r="18" fill="#F4B34E" />
          <path d="M120 52a12 12 0 0 1 22 -6 10 10 0 0 1 16 8h-40Z" fill="#fff" opacity=".9" />
          <path d="M20 168l4 -10 4 10M170 166l4 -12 4 12M150 172l3 -8 3 8" stroke="#6E9E3A" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      );
  }
}
