import { useId } from 'react';
import type { Equipped, Species } from '../types';
import { SCENES, SPECIES, bodyColor, type Mood } from '../lib/pet';

// Mascotas originales en SVG. Todas comparten la misma silueta base (un
// “mochi” redondeado), así los accesorios encajan en cualquier especie:
//   cabeza ≈ y 68 · ojos y 112 · boca y 127 · cuello y 140 · mano derecha (167, 144)

interface Props {
  species?: Species;
  equipped: Equipped;
  level?: number;
  mood?: Mood;
  size?: number | string;
  scene?: boolean;
  /** Etiqueta accesible; si se omite la imagen se considera decorativa */
  label?: string;
}

const INK = '#2A3344';
const BODY = 'M100 68C140 68 158 100 158 128C158 156 134 172 100 172C66 172 42 156 42 128C42 100 60 68 100 68Z';
const COVERING_HATS = ['gorra', 'chef', 'lana', 'corona', 'paja', 'boina', 'fiesta'];

export function Mascot({ species = 'brote', equipped, level = 1, mood = 'feliz', size = 200, scene = true, label }: Props) {
  const uid = useId().replace(/:/g, '');
  const sp = SPECIES[species];
  const body = bodyColor(species, equipped.color);
  const sc = SCENES[equipped.scene] ?? SCENES.prado;
  const covered = COVERING_HATS.includes(equipped.hat);
  const clip = `clip-${uid}`;
  const dark = species === 'panda' ? '#2A2F38' : null;

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      style={{ display: 'block' }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <clipPath id={clip}>
          <path d={BODY} />
        </clipPath>
        {scene && (
          <linearGradient id={`sky-${uid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={sc.sky[0]} />
            <stop offset="1" stopColor={sc.sky[1]} />
          </linearGradient>
        )}
      </defs>

      {scene && (
        <>
          <rect width="200" height="200" fill={`url(#sky-${uid})`} />
          <SceneDecor scene={equipped.scene} />
          <ellipse cx="100" cy="200" rx="150" ry="34" fill={sc.ground} />
          {equipped.scene === 'nieve' && <ellipse cx="100" cy="200" rx="150" ry="34" fill="none" stroke="#DCE6F0" strokeWidth="2" />}
        </>
      )}
      <ellipse cx="100" cy="176" rx="44" ry="6" fill="#000" opacity=".1" />

      <g className="pet-bounce">
        {/* Capa trasera: orejas, cola, brote… */}
        <BackFeatures species={species} body={body} level={level} covered={covered} dark={dark} />

        {/* Pies y brazos */}
        <ellipse cx="80" cy="170" rx="14" ry="7" fill={species === 'pollito' ? '#F39C38' : dark ?? body} stroke={INK} strokeWidth="3" />
        <ellipse cx="120" cy="170" rx="14" ry="7" fill={species === 'pollito' ? '#F39C38' : dark ?? body} stroke={INK} strokeWidth="3" />
        {species === 'pollito' ? (
          <>
            <ellipse cx="44" cy="134" rx="10" ry="16" transform="rotate(25 44 134)" fill={body} stroke={INK} strokeWidth="3" />
            <ellipse cx="156" cy="134" rx="10" ry="16" transform="rotate(-25 156 134)" fill={body} stroke={INK} strokeWidth="3" />
          </>
        ) : (
          <>
            <path d="M46 126c-10 2-15 10-13 18" fill="none" stroke={dark ?? INK} strokeWidth={dark ? 7 : 3} strokeLinecap="round" />
            <path d="M154 126c10 2 15 10 13 18" fill="none" stroke={dark ?? INK} strokeWidth={dark ? 7 : 3} strokeLinecap="round" />
          </>
        )}

        {/* Cuerpo */}
        <path d={BODY} fill={body} stroke={INK} strokeWidth="3" />
        {sp.belly && <ellipse cx="100" cy="146" rx="30" ry="20" fill={sp.belly} opacity=".95" />}
        {species === 'dino' && (
          <g stroke="#9CCB84" strokeWidth="2.5" strokeLinecap="round">
            <path d="M80 140h40M78 149h44M82 158h36" />
          </g>
        )}
        <path d="M66 86c6-6 14-9 22-10" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".45" fill="none" />

        {/* Ropa: se recorta con la silueta para que “vista” el cuerpo */}
        <Clothing item={equipped.body} clip={clip} />

        <FrontFeatures species={species} />
        <Face mood={mood} face={equipped.face} species={species} />
        <Neck neck={equipped.neck} />
        <Hand item={equipped.hand} />
        <Hat hat={equipped.hat} />
      </g>
    </svg>
  );
}

// ───────────────────────── Rasgos de especie ─────────────────────────

function BackFeatures({ species, body, level, covered, dark }: { species: Species; body: string; level: number; covered: boolean; dark: string | null }) {
  switch (species) {
    case 'brote':
      return covered ? null : <Sprout leaves={Math.min(5, Math.max(1, level))} />;
    case 'gato':
      return (
        <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
          <path d="M150 156c22 0 32-18 26-40" fill="none" stroke={INK} strokeWidth="12" strokeLinecap="round" />
          <path d="M150 156c22 0 32-18 26-40" fill="none" stroke={body} strokeWidth="6" strokeLinecap="round" />
          <path d="M62 92 60 56 92 74Z" fill={body} />
          <path d="M138 92 140 56 108 74Z" fill={body} />
          <path d="M66 84 65 66 82 76Z" fill="#F7A4B3" stroke="none" />
          <path d="M134 84 135 66 118 76Z" fill="#F7A4B3" stroke="none" />
        </g>
      );
    case 'panda':
      return (
        <g stroke={INK} strokeWidth="3">
          <circle cx="64" cy="80" r="16" fill={dark ?? INK} />
          <circle cx="136" cy="80" r="16" fill={dark ?? INK} />
        </g>
      );
    case 'conejo':
      return (
        <g stroke={INK} strokeWidth="3">
          <ellipse cx="80" cy="44" rx="12" ry="32" transform="rotate(-10 80 44)" fill={body} />
          <ellipse cx="120" cy="44" rx="12" ry="32" transform="rotate(10 120 44)" fill={body} />
          <ellipse cx="80" cy="46" rx="5" ry="22" transform="rotate(-10 80 46)" fill="#F7B6C6" stroke="none" />
          <ellipse cx="120" cy="46" rx="5" ry="22" transform="rotate(10 120 46)" fill="#F7B6C6" stroke="none" />
        </g>
      );
    case 'pollito':
      return covered ? null : (
        <g fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round">
          <path d="M100 70c-2-10 2-16 8-18" />
          <path d="M94 70c-6-8-6-14-2-18" />
        </g>
      );
    case 'dino':
      return (
        <g stroke={INK} strokeWidth="3" strokeLinejoin="round" fill="#F2B84B">
          <path d="M150 150c18 4 32 14 40 22-16 2-32 0-44-6Z" fill={body} />
          <path d="M92 70 100 52 110 70Z" />
          <path d="M118 74 132 60 134 80Z" />
          <path d="M138 86 154 78 150 98Z" />
          <path d="M148 104 164 102 156 118Z" />
        </g>
      );
  }
}

function FrontFeatures({ species }: { species: Species }) {
  switch (species) {
    case 'panda':
      return (
        <g fill="#2A2F38">
          <ellipse cx="81" cy="114" rx="12" ry="15" transform="rotate(20 81 114)" />
          <ellipse cx="119" cy="114" rx="12" ry="15" transform="rotate(-20 119 114)" />
          <ellipse cx="100" cy="122" rx="5" ry="3.5" />
        </g>
      );
    case 'gato':
      return (
        <g stroke={INK} strokeWidth="2" strokeLinecap="round">
          <path d="M96 120h8l-4 4Z" fill="#F28FA2" />
          <path d="M60 120l-16-3M60 126h-17M140 120l16-3M140 126h17" opacity=".7" />
        </g>
      );
    case 'conejo':
      return <ellipse cx="100" cy="121" rx="4.5" ry="3" fill="#F28FA2" stroke={INK} strokeWidth="1.5" />;
    case 'dino':
      return (
        <g fill={INK} opacity=".6">
          <circle cx="94" cy="120" r="1.6" />
          <circle cx="106" cy="120" r="1.6" />
        </g>
      );
    default:
      return null;
  }
}

function Sprout({ leaves }: { leaves: number }) {
  const positions = [
    { y: 46, r: -35, s: 1 },
    { y: 52, r: 215, s: 0.9 },
    { y: 40, r: 215, s: 0.8 },
    { y: 58, r: -30, s: 0.75 },
    { y: 36, r: -40, s: 0.7 }
  ];
  return (
    <g>
      <path d="M100 72C100 62 101 52 100 38" stroke="#4E8B3A" strokeWidth="4" strokeLinecap="round" fill="none" />
      {positions.slice(0, leaves).map((p, i) => (
        <path key={i} d="M0 0C6 -10 20 -12 28 -6C22 4 8 6 0 0Z" fill="#7CC36A" stroke="#4E8B3A" strokeWidth="2.5"
          strokeLinejoin="round" transform={`translate(100 ${p.y}) rotate(${p.r}) scale(${p.s})`} />
      ))}
    </g>
  );
}

// ───────────────────────── Cara ─────────────────────────

function Face({ mood, face, species }: { mood: Mood; face: string; species: Species }) {
  const onDark = species === 'panda';
  const lid = onDark ? '#FFFFFF' : INK;
  let eyes: React.ReactNode;
  if (face === 'estrellas') eyes = <><Star x={82} y={112} /><Star x={118} y={112} /></>;
  else if (face === 'corazones') eyes = <><Heart x={82} y={112} /><Heart x={118} y={112} /></>;
  else if (mood === 'dormido')
    eyes = (
      <>
        <path d="M74 113q8 6 16 0" stroke={lid} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M110 113q8 6 16 0" stroke={lid} strokeWidth="3" fill="none" strokeLinecap="round" />
      </>
    );
  else if (mood === 'eufórico')
    eyes = (
      <>
        <path d="M74 115q8 -10 16 0" stroke={lid} strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <path d="M110 115q8 -10 16 0" stroke={lid} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      </>
    );
  else
    eyes = (
      <g className="pet-blink">
        {onDark && <><circle cx="82" cy="112" r="7.5" fill="#fff" /><circle cx="118" cy="112" r="7.5" fill="#fff" /></>}
        <ellipse cx="82" cy="112" rx="5" ry="6.5" fill={INK} />
        <ellipse cx="118" cy="112" rx="5" ry="6.5" fill={INK} />
        <circle cx="84" cy="109.5" r="1.8" fill="#fff" />
        <circle cx="120" cy="109.5" r="1.8" fill="#fff" />
      </g>
    );

  const mouthY = species === 'gato' || species === 'conejo' || species === 'panda' ? 3 : 0;
  const mouth =
    species === 'pollito' ? (
      <path d="M92 124 100 119 108 124 100 131Z" fill="#F39C38" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
    ) : mood === 'dormido' ? (
      <ellipse cx="100" cy={130 + mouthY} rx="4" ry="3" fill={INK} opacity=".7" />
    ) : mood === 'contento' ? (
      <path d={`M93 ${127 + mouthY}q7 5 14 0`} stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
    ) : (
      <path d={`M90 ${125 + mouthY}q10 12 20 0Z`} fill="#C4485A" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
    );

  return (
    <g>
      <ellipse cx="66" cy="126" rx="7" ry="4.5" fill="#FF8FA3" opacity=".7" />
      <ellipse cx="134" cy="126" rx="7" ry="4.5" fill="#FF8FA3" opacity=".7" />
      {eyes}
      {mouth}
      {species === 'conejo' && mood !== 'dormido' && <rect x="96" y={134 + (mood === 'contento' ? -2 : 1)} width="8" height="6" rx="1.5" fill="#fff" stroke={INK} strokeWidth="1.5" />}
      {mood === 'dormido' && (
        <text x="140" y="86" fontSize="16" fontWeight="700" fill={INK} opacity=".6" fontFamily="system-ui">
          z<tspan dx="2" dy="-8" fontSize="12">z</tspan>
        </text>
      )}
      {face === 'gafas' && (
        <g fill="none" stroke={INK} strokeWidth="3">
          <circle cx="82" cy="112" r="12" fill="#fff" fillOpacity=".15" />
          <circle cx="118" cy="112" r="12" fill="#fff" fillOpacity=".15" />
          <path d="M94 111q6 -4 12 0M70 109l-16 -4M130 109l16 -4" />
        </g>
      )}
      {face === 'gafas-sol' && (
        <g stroke={INK} strokeWidth="3">
          <path d="M67 104h30v8a13 11 0 0 1-30 0Z" fill="#1E2632" />
          <path d="M103 104h30v8a13 11 0 0 1-30 0Z" fill="#1E2632" />
          <path d="M97 106h6M67 105l-12 -4M133 105l12 -4" fill="none" />
          <path d="M73 108h6M109 108h6" stroke="#fff" strokeWidth="2.5" opacity=".6" />
        </g>
      )}
    </g>
  );
}

function Star({ x, y }: { x: number; y: number }) {
  return (
    <path transform={`translate(${x} ${y})`} d="M0 -9 2.6 -3 9 -2.8 4 1.4 5.6 8 0 4.4 -5.6 8 -4 1.4 -9 -2.8 -2.6 -3Z"
      fill="#F6C343" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
  );
}

function Heart({ x, y }: { x: number; y: number }) {
  return (
    <path transform={`translate(${x} ${y})`} d="M0 7C-9 1-10-5-6-8-3-10 0-8 0-5 0-8 3-10 6-8 10-5 9 1 0 7Z"
      fill="#F0506E" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
  );
}

// ───────────────────────── Ropa ─────────────────────────

function Clothing({ item, clip }: { item: string; clip: string }) {
  if (item === 'none') return null;
  if (item === 'tutu') {
    return (
      <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
        <path d="M44 150q8 10 16 4 8 10 16 4 8 10 16 4 8 10 16 4 8 10 16 4 8 10 16 4 8 10 16 4l-8-18H52Z" fill="#F7B6D2" />
        <path d="M52 146h96" stroke="#E07AAE" strokeWidth="5" />
      </g>
    );
  }
  const content = (() => {
    switch (item) {
      case 'camiseta':
        return (
          <>
            <rect x="30" y="126" width="140" height="60" fill="#E5564F" />
            <path d="M82 126q18 14 36 0" fill="none" stroke="#fff" strokeWidth="3" />
          </>
        );
      case 'deportiva':
        return (
          <>
            <rect x="30" y="124" width="140" height="60" fill="#3E7CC9" />
            <path d="M30 136h140" stroke="#fff" strokeWidth="4" />
            <text x="100" y="166" textAnchor="middle" fontSize="22" fontWeight="800" fill="#fff" fontFamily="system-ui">1</text>
          </>
        );
      case 'sudadera':
        return (
          <>
            <rect x="30" y="118" width="140" height="70" fill="#9A7FD6" />
            <rect x="78" y="148" width="44" height="16" rx="6" fill="#8468C4" />
            <path d="M93 120v16M107 120v16" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          </>
        );
      case 'delantal':
        return (
          <>
            <path d="M74 128h52l4 50H70Z" fill="#FFFFFF" />
            <rect x="88" y="146" width="24" height="12" rx="3" fill="#EAEFF4" />
            <path d="M74 128 62 120M126 128l12-8" stroke="#E5564F" strokeWidth="3" />
          </>
        );
      default:
        return null;
    }
  })();
  return (
    <g>
      <g clipPath={`url(#${clip})`}>{content}</g>
      <path d={BODY} fill="none" stroke={INK} strokeWidth="3" />
    </g>
  );
}

// ───────────────────────── Cuello ─────────────────────────

function Neck({ neck }: { neck: string }) {
  switch (neck) {
    case 'pajarita':
      return (
        <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M100 146 80 136v20Z" fill="#E5564F" />
          <path d="M100 146 120 136v20Z" fill="#E5564F" />
          <circle cx="100" cy="146" r="5" fill="#C23F3A" />
        </g>
      );
    case 'bufanda':
      return (
        <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M52 134q48 22 96 0l3 12q-51 24 -102 0Z" fill="#F2A33A" />
          <path d="M120 144l4 26 14 -2 -6 -27Z" fill="#F2A33A" />
          <path d="M64 141l2 7M80 147l1 7M96 149v7M112 148l-1 7M128 144l-2 7" stroke="#fff" opacity=".6" />
        </g>
      );
    case 'corbata':
      return (
        <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M94 136h12l-3 7h-6Z" fill="#3E7CC9" />
          <path d="M97 143h6l5 22-8 7-8-7Z" fill="#3E7CC9" />
          <path d="M98 150l6 5M96 158l8 6" stroke="#fff" strokeWidth="2" opacity=".6" />
        </g>
      );
    case 'panuelo':
      return (
        <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M66 134q34 12 68 0L100 162Z" fill="#E5564F" />
          <circle cx="92" cy="142" r="2" fill="#fff" stroke="none" />
          <circle cx="106" cy="144" r="2" fill="#fff" stroke="none" />
          <circle cx="99" cy="152" r="2" fill="#fff" stroke="none" />
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
            <circle key={x} cx={x} cy={140 + Math.sin((i / 5) * Math.PI) * 9} r="6" fill={['#F49AC1', '#F6C343', '#FFFFFF'][i % 3]} />
          ))}
        </g>
      );
    default:
      return null;
  }
}

// ───────────────────────── Mano ─────────────────────────

function Hand({ item }: { item: string }) {
  switch (item) {
    case 'manzana':
      return (
        <g stroke={INK} strokeWidth="2.5">
          <circle cx="171" cy="147" r="10" fill="#E5463D" />
          <path d="M171 137v-6" />
          <path d="M172 133q7-5 10 1-6 3-10-1Z" fill="#7CC36A" strokeWidth="2" />
        </g>
      );
    case 'taza':
      return (
        <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
          <rect x="161" y="136" width="18" height="18" rx="3" fill="#FFFFFF" />
          <path d="M179 140h4a4 4 0 0 1 0 9h-4" fill="none" />
          <path d="M166 130q-3-4 0-8M173 130q-3-4 0-8" fill="none" stroke="#9AA8B8" strokeLinecap="round" />
        </g>
      );
    case 'globo':
      return (
        <g stroke={INK} strokeWidth="2.5">
          <path d="M168 144c8-20-4-40 10-62" fill="none" strokeWidth="1.5" />
          <ellipse cx="180" cy="62" rx="14" ry="18" fill="#F0506E" />
          <path d="M176 79l4 4 4-4Z" fill="#F0506E" strokeWidth="2" />
          <path d="M173 54q2-6 7-7" stroke="#fff" strokeWidth="3" fill="none" opacity=".6" strokeLinecap="round" />
        </g>
      );
    case 'raqueta':
      return (
        <g stroke={INK} strokeWidth="2.5">
          <path d="M167 148l12-24" strokeWidth="5" strokeLinecap="round" />
          <ellipse cx="184" cy="110" rx="11" ry="15" transform="rotate(25 184 110)" fill="#FFFFFF" stroke="#E5564F" strokeWidth="4" />
          <g stroke="#B9C4CF" strokeWidth="1.2">
            <path d="M176 104l16 8M175 111l15 7M179 98l14 7M180 99l-6 18M186 101l-6 18M192 104l-5 12" />
          </g>
        </g>
      );
    case 'botella':
      return (
        <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
          <rect x="163" y="124" width="14" height="30" rx="5" fill="#7EC4E8" />
          <rect x="165" y="118" width="10" height="7" rx="2" fill="#3E7CC9" />
          <path d="M166 136h8" stroke="#fff" strokeWidth="2" opacity=".7" />
        </g>
      );
    case 'pesa':
      return (
        <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
          <rect x="156" y="143" width="30" height="5" rx="2" fill="#9AA8B8" />
          <rect x="152" y="134" width="8" height="23" rx="2" fill="#2A3344" />
          <rect x="182" y="134" width="8" height="23" rx="2" fill="#2A3344" />
        </g>
      );
    default:
      return null;
  }
}

// ───────────────────────── Cabeza ─────────────────────────

function Hat({ hat }: { hat: string }) {
  switch (hat) {
    case 'flor':
      return (
        <g transform="translate(132 82)" stroke={INK} strokeWidth="2">
          {[0, 72, 144, 216, 288].map((r) => <ellipse key={r} cx="0" cy="-8" rx="6" ry="8" fill="#FFFFFF" transform={`rotate(${r})`} />)}
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
    case 'cinta':
      return (
        <g stroke={INK} strokeWidth="2.5">
          <path d="M50 98q50 -24 100 0l-2 10q-48 -22 -96 0Z" fill="#E5564F" />
          <path d="M53 101q47 -20 94 0" stroke="#fff" strokeWidth="2" fill="none" />
        </g>
      );
    case 'lazo':
      return (
        <g transform="translate(128 78) rotate(15)" stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M0 0-18-10v20Z" fill="#F49AC1" />
          <path d="M0 0 18-10v20Z" fill="#F49AC1" />
          <circle r="4.5" fill="#E07AAE" />
        </g>
      );
    case 'paja':
      return (
        <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
          <ellipse cx="100" cy="86" rx="58" ry="10" fill="#E9C46A" />
          <path d="M70 86C70 58 130 58 130 86Z" fill="#F2D27E" />
          <path d="M71 80h58" stroke="#E5564F" strokeWidth="6" />
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
          <path d="M60 94C58 58 142 58 140 94Z" fill="#E5564F" />
          <path d="M58 92h84v10H58Z" fill="#C23F3A" />
          <circle cx="100" cy="56" r="10" fill="#FFFFFF" />
        </g>
      );
    case 'boina':
      return (
        <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
          <path d="M58 86c-4-22 70-34 90-10 4 8-6 12-14 12H66c-6 0-8-1-8-2Z" fill="#2A3344" />
          <path d="M104 64l2-8" strokeLinecap="round" />
        </g>
      );
    case 'fiesta':
      return (
        <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
          <path d="M80 76 104 30 120 78Z" fill="#7EC4E8" />
          <path d="M88 62l26-4M95 48l14-2" stroke="#F6C343" strokeWidth="4" />
          <circle cx="104" cy="28" r="6" fill="#F49AC1" />
        </g>
      );
    case 'auriculares':
      return (
        <g stroke={INK} strokeWidth="3">
          <path d="M50 112C46 60 154 60 150 112" fill="none" strokeWidth="6" />
          <rect x="38" y="100" width="16" height="28" rx="7" fill="#E5564F" />
          <rect x="146" y="100" width="16" height="28" rx="7" fill="#E5564F" />
        </g>
      );
    default:
      return null;
  }
}

// ───────────────────────── Escenarios ─────────────────────────

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
        <g>
          <rect x="0" y="0" width="200" height="120" fill="#FFF6EC" />
          {[1, 2, 3, 4, 5, 6, 7].map((i) => <path key={i} d={`M${i * 25} 0v120`} stroke="#F1DFCA" strokeWidth="2" />)}
          <rect x="14" y="40" width="50" height="6" rx="3" fill="#C59A6C" />
          <circle cx="26" cy="32" r="8" fill="#F4908C" />
          <rect x="40" y="22" width="14" height="18" rx="3" fill="#9FD3F2" />
          <rect x="140" y="24" width="40" height="30" rx="6" fill="#D6EFEB" stroke="#C59A6C" strokeWidth="3" />
        </g>
      );
    case 'ciudad':
      return (
        <g>
          <circle cx="150" cy="44" r="16" fill="#FFB86B" />
          {[[0, 90, 30], [28, 70, 26], [56, 100, 24], [138, 80, 28], [168, 60, 34]].map(([x, y, w], i) => (
            <g key={i}>
              <rect x={x} y={y} width={w} height={180 - y} fill={['#B9C6D6', '#A7B6C9', '#C3CEDC', '#AEBCCD', '#9DAEC3'][i]} />
              {Array.from({ length: Math.floor((150 - y) / 16) }, (_, r) => (
                <rect key={r} x={x + 6} y={y + 8 + r * 16} width={w - 12} height="5" rx="1" fill="#FFF4D6" opacity=".8" />
              ))}
            </g>
          ))}
        </g>
      );
    case 'gimnasio':
      return (
        <g>
          <rect width="200" height="140" fill="#EEF1F5" />
          <rect x="0" y="118" width="200" height="6" fill="#D5DCE5" />
          <rect x="12" y="40" width="44" height="6" rx="3" fill="#9AA8B8" />
          {[16, 28, 40].map((x) => <rect key={x} x={x} y="46" width="8" height="18" rx="2" fill="#2A3344" />)}
          <rect x="140" y="30" width="44" height="30" rx="4" fill="#fff" stroke="#D5DCE5" strokeWidth="2" />
          <path d="M146 50l8-8 8 6 8-12 8 8" stroke="#34C759" strokeWidth="3" fill="none" />
        </g>
      );
    case 'nieve':
      return (
        <g>
          <path d="M150 170 168 120 186 170Z" fill="#4E8B6A" />
          <path d="M160 132 168 112 176 132Z" fill="#fff" />
          <path d="M18 170 32 130 46 170Z" fill="#4E8B6A" />
          {[[30, 30], [70, 50], [110, 20], [150, 60], [180, 30], [50, 90], [130, 95]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="3" fill="#fff" stroke="#DCE6F0" />
          ))}
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
