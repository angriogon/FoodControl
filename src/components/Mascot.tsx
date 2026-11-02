import { useId } from 'react';
import type { Equipped, Species } from '../types';
import { LEAF_LEVELS, PET_COLORS, SCENES, SPECIES, bodyColor, type Mood } from '../lib/pet';

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
const COVERING_HATS = ['gorra', 'chef', 'lana', 'corona', 'paja', 'boina', 'fiesta', 'vaquero', 'mago', 'casco', 'pirata', 'vikingo', 'copa', 'navidad', 'birrete'];

export function Mascot({ species = 'brote', equipped, level = 1, mood = 'feliz', size = 200, scene = true, label }: Props) {
  const uid = useId().replace(/:/g, '');
  const sp = SPECIES[species];
  const grad = PET_COLORS[equipped.color]?.gradient;
  const body = grad ? `url(#body-${uid})` : bodyColor(species, equipped.color);
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
        {grad && (
          <linearGradient id={`body-${uid}`} x1="0" x2="1" y1="0" y2="1">
            {grad.map((c, i) => <stop key={c} offset={i / (grad.length - 1)} stopColor={c} />)}
          </linearGradient>
        )}
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
        {equipped.neck === 'capa' && (
          <path d="M60 118 38 178q62 14 124 0l-22-60Z" fill="#E5463D" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        )}

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
      <Pal pal={equipped.pal ?? 'none'} />
    </svg>
  );
}

// ───────────────────────── Rasgos de especie ─────────────────────────

function BackFeatures({ species, body, level, covered, dark }: { species: Species; body: string; level: number; covered: boolean; dark: string | null }) {
  switch (species) {
    case 'brote':
      return covered ? null : <Sprout leaves={Math.max(1, LEAF_LEVELS.filter((l) => level >= l).length)} />;
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
      {face === 'pecas' && (
        <g fill="#B97A45" opacity=".6">
          {[[62, 120], [68, 124], [64, 128], [136, 120], [132, 124], [138, 128]].map(([x, y]) => <circle key={x + '-' + y} cx={x} cy={y} r="1.6" />)}
        </g>
      )}
      {face === 'tirita' && (
        <g transform="rotate(-30 136 104)" stroke={INK} strokeWidth="1.5">
          <rect x="124" y="100" width="24" height="9" rx="4" fill="#F2C9A0" />
          <rect x="132" y="100" width="8" height="9" fill="#E8B285" />
        </g>
      )}
      {face === 'bigote' && (
        <path d="M100 121c-5-6-16-7-22 1 7 3 15 1 22-1 7 2 15 4 22 1-6-8-17-7-22-1Z" fill="#5A3A20" stroke={INK} strokeWidth="1.5" />
      )}
      {face === 'gafas-corazon' && (
        <g stroke={INK} strokeWidth="2.5">
          <path transform="translate(82 112) scale(1.6)" d="M0 7C-9 1-10-5-6-8-3-10 0-8 0-5 0-8 3-10 6-8 10-5 9 1 0 7Z" fill="#F0506E" fillOpacity=".9" strokeWidth="1.5" />
          <path transform="translate(118 112) scale(1.6)" d="M0 7C-9 1-10-5-6-8-3-10 0-8 0-5 0-8 3-10 6-8 10-5 9 1 0 7Z" fill="#F0506E" fillOpacity=".9" strokeWidth="1.5" />
          <path d="M94 106h12M68 106l-14-4M132 106l14-4" fill="none" />
        </g>
      )}
      {face === 'antifaz' && (
        <path
          fillRule="evenodd"
          d="M62 104q38-12 76 0 4 14-10 18-14 2-28-8-14 10-28 8-14-4-10-18Z M76 112a6 6 0 1 0 12 0a6 6 0 1 0-12 0Z M112 112a6 6 0 1 0 12 0a6 6 0 1 0-12 0Z"
          fill="#2A3344"
          stroke={INK}
          strokeWidth="2"
        />
      )}
      {face === 'gafas-pixel' && (
        <g fill="#111">
          <rect x="62" y="104" width="76" height="5" />
          <rect x="66" y="109" width="26" height="9" />
          <rect x="108" y="109" width="26" height="9" />
          <rect x="70" y="110" width="4" height="4" fill="#fff" />
          <rect x="112" y="110" width="4" height="4" fill="#fff" />
        </g>
      )}
      {face === 'gafas-natacion' && (
        <g stroke={INK} strokeWidth="2.5">
          <path d="M44 110h112" stroke="#3E7CC9" strokeWidth="4" />
          <ellipse cx="82" cy="112" rx="12" ry="9" fill="#7EC4E8" fillOpacity=".7" />
          <ellipse cx="118" cy="112" rx="12" ry="9" fill="#7EC4E8" fillOpacity=".7" />
        </g>
      )}
      {face === 'monoculo' && (
        <g fill="none" stroke="#C9921A" strokeWidth="2.5">
          <circle cx="118" cy="112" r="11" fill="#fff" fillOpacity=".2" />
          <path d="M128 118q8 14 2 26" strokeWidth="1.5" />
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
  if (item === 'flotador') {
    return (
      <g stroke={INK} strokeWidth="2.5">
        <path d="M34 150q66 40 132 0" fill="none" stroke={INK} strokeWidth="17" strokeLinecap="round" />
        <path d="M34 150q66 40 132 0" fill="none" stroke="#FF6B5E" strokeWidth="12" strokeLinecap="round" />
        <path d="M58 162l6 6M96 170v8M136 164l-6 6" stroke="#FFFFFF" strokeWidth="8" />
      </g>
    );
  }
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
      case 'rayas':
        return (
          <>
            <rect x="30" y="122" width="140" height="64" fill="#FFFFFF" />
            {[128, 140, 152, 164, 176].map((y) => <rect key={y} x="30" y={y} width="140" height="5" fill="#3E7CC9" />)}
          </>
        );
      case 'peto':
        return (
          <>
            <rect x="30" y="146" width="140" height="40" fill="#4A6FA5" />
            <rect x="80" y="128" width="40" height="20" rx="3" fill="#4A6FA5" />
            <path d="M82 130 62 104M118 130l20-26" stroke="#4A6FA5" strokeWidth="6" />
            <circle cx="86" cy="134" r="2.5" fill="#F6C343" />
            <circle cx="114" cy="134" r="2.5" fill="#F6C343" />
            <rect x="92" y="134" width="16" height="10" rx="2" fill="#3D5D8C" />
          </>
        );
      case 'chaleco':
        return (
          <>
            <path d="M30 118h62l-8 70H30Z" fill="#8A5A2B" />
            <path d="M170 118h-62l8 70h54Z" fill="#8A5A2B" />
            <circle cx="90" cy="148" r="2.5" fill="#F6C343" />
            <circle cx="88" cy="162" r="2.5" fill="#F6C343" />
          </>
        );
      case 'traje':
        return (
          <>
            <rect x="30" y="118" width="140" height="70" fill="#2F3E5C" />
            <path d="M84 120 100 160 116 120Z" fill="#FFFFFF" />
            <path d="M84 120l10 18-8 4M116 120l-10 18 8 4" fill="#253250" stroke="#1C2740" strokeWidth="1.5" />
            <path d="M97 132h6l2 20-5 5-5-5Z" fill="#E5463D" />
          </>
        );
      case 'kimono':
        return (
          <>
            <rect x="30" y="118" width="140" height="70" fill="#FFFFFF" />
            <path d="M80 118l22 34M120 118l-22 34" stroke="#D5DCE5" strokeWidth="4" />
            <rect x="30" y="152" width="140" height="8" fill="#2A3344" />
          </>
        );
      case 'superheroe':
        return (
          <>
            <rect x="30" y="118" width="140" height="70" fill="#3E7CC9" />
            <rect x="30" y="160" width="140" height="6" fill="#E5463D" />
            <circle cx="100" cy="142" r="12" fill="#F6C343" />
            <path d="M100 133l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" fill="#E5463D" />
          </>
        );
      case 'jersey':
        return (
          <>
            <rect x="30" y="118" width="140" height="70" fill="#C23F3A" />
            <path d="M30 146l8-6 8 6 8-6 8 6 8-6 8 6 8-6 8 6 8-6 8 6 8-6 8 6 8-6 8 6 8-6 8 6 8-6" stroke="#FFFFFF" strokeWidth="3" fill="none" />
            <path d="M100 150l8 14H92Z" fill="#34C759" />
            <circle cx="100" cy="148" r="2.5" fill="#F6C343" />
          </>
        );
      case 'hawaiana':
        return (
          <>
            <rect x="30" y="118" width="140" height="70" fill="#2BB39B" />
            {[[72, 140], [118, 134], [96, 160], [134, 158], [62, 164]].map(([x, y]) => (
              <g key={x}>
                <circle cx={x} cy={y} r="5" fill="#F49AC1" />
                <circle cx={x} cy={y} r="2" fill="#F6C343" />
              </g>
            ))}
            <path d="M86 118l14 14 14-14" fill="none" stroke="#1E8C79" strokeWidth="3" />
          </>
        );
      case 'impermeable':
        return (
          <>
            <rect x="30" y="118" width="140" height="70" fill="#FFCC00" />
            <path d="M100 120v70" stroke="#D9A800" strokeWidth="2" />
            {[132, 146, 160].map((y) => <circle key={y} cx="106" cy={y} r="2.5" fill="#2A3344" />)}
            <path d="M70 156h16M114 156h16" stroke="#D9A800" strokeWidth="3" />
          </>
        );
      case 'cinturon':
        return (
          <>
            <rect x="30" y="146" width="140" height="12" fill="#2A3344" />
            <ellipse cx="100" cy="152" rx="18" ry="11" fill="#F6C343" stroke="#C9921A" strokeWidth="2" />
            <path d="M100 145l2 4 4 .5-3 3 .8 4-3.8-2-3.8 2 .8-4-3-3 4-.5Z" fill="#E5463D" />
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
    case 'perlas':
      return (
        <g fill="#FFFDF6" stroke={INK} strokeWidth="1.2">
          {Array.from({ length: 11 }, (_, i) => {
            const t = i / 10;
            return <circle key={i} cx={66 + t * 68} cy={136 + Math.sin(t * Math.PI) * 12} r="3.6" />;
          })}
        </g>
      );
    case 'cascabel':
      return (
        <g stroke={INK} strokeWidth="2.5">
          <path d="M60 134q40 18 80 0" fill="none" stroke="#E5463D" strokeWidth="6" strokeLinecap="round" />
          <circle cx="100" cy="150" r="8" fill="#F6C343" />
          <path d="M94 151h12M100 151v6" strokeWidth="2" />
        </g>
      );
    case 'capa':
      return (
        <g stroke={INK} strokeWidth="2.5">
          <path d="M66 132q34 10 68 0" fill="none" stroke="#C23F3A" strokeWidth="6" strokeLinecap="round" />
          <circle cx="100" cy="138" r="5" fill="#F6C343" />
        </g>
      );
    case 'silbato':
      return (
        <g stroke={INK} strokeWidth="2">
          <path d="M80 130l22 24M120 130l-14 24" fill="none" stroke="#E5463D" strokeWidth="2.5" />
          <rect x="98" y="152" width="16" height="9" rx="4" fill="#C9D3DD" />
          <circle cx="102" cy="158" r="5" fill="#C9D3DD" />
        </g>
      );
    case 'toalla':
      return (
        <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M66 126q34 16 68 0" fill="none" stroke="#FFFFFF" strokeWidth="10" strokeLinecap="round" />
          <path d="M68 128h14v34H68Z" fill="#FFFFFF" />
          <path d="M118 128h14v34h-14Z" fill="#FFFFFF" />
          <path d="M68 154h14M118 154h14" stroke="#3E7CC9" strokeWidth="3" />
        </g>
      );
    case 'lazo-grande':
      return (
        <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M100 144 74 128q-6 16 0 32Z" fill="#F49AC1" />
          <path d="M100 144l26-16q6 16 0 32Z" fill="#F49AC1" />
          <path d="M96 146 88 168M104 146l8 22" stroke="#E07AAE" strokeWidth="5" />
          <circle cx="100" cy="144" r="6" fill="#E07AAE" />
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
    case 'platano':
      return <path d="M160 132q20 6 18 26-6-14-20-18Z" fill="#FFD54F" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />;
    case 'zanahoria':
      return (
        <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M160 136l12-4 4 6-12 26Z" fill="#F39C38" />
          <path d="M172 132l4-10M174 134l10-6M170 132l-2-10" stroke="#4E8B3A" strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    case 'brocoli':
      return (
        <g stroke={INK} strokeWidth="2">
          <path d="M168 156l2-14" stroke="#7CC36A" strokeWidth="6" />
          <circle cx="164" cy="136" r="7" fill="#4E9A3C" />
          <circle cx="176" cy="134" r="7" fill="#4E9A3C" />
          <circle cx="170" cy="126" r="7" fill="#5BAE47" />
        </g>
      );
    case 'helado':
      return (
        <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M160 132h18l-9 24Z" fill="#E9C27D" />
          <circle cx="164" cy="128" r="7" fill="#F7B6D2" />
          <circle cx="174" cy="127" r="7" fill="#FFF3C4" />
          <circle cx="169" cy="119" r="6" fill="#A47551" />
        </g>
      );
    case 'batido':
      return (
        <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M160 128h20l-3 28h-14Z" fill="#F7B6D2" />
          <path d="M160 128h20" stroke="#fff" strokeWidth="4" />
          <path d="M174 128l6-16" stroke="#3E7CC9" strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    case 'banderin':
      return (
        <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M168 150V96" strokeWidth="3" />
          <path d="M168 98l26 10-26 10Z" fill="#E5463D" />
        </g>
      );
    case 'ramo':
      return (
        <g stroke={INK} strokeWidth="2">
          <path d="M166 150l4-20M170 150v-22M174 150l-2-20" stroke="#4E8B3A" strokeWidth="2.5" />
          <circle cx="164" cy="128" r="6" fill="#F49AC1" />
          <circle cx="176" cy="126" r="6" fill="#F6C343" />
          <circle cx="170" cy="118" r="6" fill="#B49BE8" />
          <path d="M162 140h16l-4 12h-8Z" fill="#FFFFFF" />
        </g>
      );
    case 'paraguas':
      return (
        <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M170 152V98" strokeWidth="3" />
          <path d="M170 152q0 6-6 4" fill="none" />
          <path d="M142 100q28-32 56 0q-7-6-14 0-7-6-14 0-7-6-14 0-7-6-14 0Z" fill="#3E7CC9" />
        </g>
      );
    case 'pelota':
      return (
        <g stroke={INK} strokeWidth="2">
          <circle cx="172" cy="148" r="11" fill="#FFFFFF" />
          <path d="M172 143l5 4-2 6h-6l-2-6Z" fill="#2A3344" />
          <path d="M172 143v-6M177 147l6-2M175 153l3 5M169 153l-3 5M167 147l-6-2" strokeWidth="1.5" />
        </g>
      );
    case 'varita':
      return (
        <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M166 150l16-34" strokeWidth="4" strokeLinecap="round" />
          <path d="M184 104l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" fill="#F6C343" strokeWidth="2" />
          <circle cx="194" cy="100" r="1.8" fill="#F6C343" stroke="none" />
          <circle cx="176" cy="98" r="1.5" fill="#F6C343" stroke="none" />
        </g>
      );
    case 'libro':
      return (
        <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round" transform="rotate(-12 170 142)">
          <rect x="158" y="128" width="24" height="30" rx="2" fill="#E5463D" />
          <path d="M162 128v30" stroke="#C23F3A" strokeWidth="3" />
          <path d="M166 138h12M166 144h10" stroke="#fff" strokeWidth="2" />
        </g>
      );
    case 'cronometro':
      return (
        <g stroke={INK} strokeWidth="2.5">
          <rect x="168" y="124" width="6" height="5" rx="1" fill="#9AA8B8" />
          <circle cx="171" cy="141" r="12" fill="#FFFFFF" />
          <path d="M171 141v-7M171 141l5 3" strokeLinecap="round" />
        </g>
      );
    case 'trofeo':
      return (
        <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M160 120h22v8a11 11 0 0 1-22 0Z" fill="#F6C343" />
          <path d="M160 124h-5a5 5 0 0 0 7 8M182 124h5a5 5 0 0 1-7 8" fill="none" />
          <path d="M168 139h6v8h-6Z" fill="#F6C343" />
          <rect x="162" y="147" width="18" height="6" rx="1" fill="#8A5A2B" />
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
    case 'cerezas':
      return (
        <g stroke={INK} strokeWidth="2">
          <path d="M120 64q6 4 6 16M120 64q10 2 14 14" fill="none" stroke="#4E8B3A" strokeWidth="2.5" />
          <circle cx="125" cy="84" r="6" fill="#E5463D" />
          <circle cx="136" cy="80" r="6" fill="#E5463D" />
          <path d="M118 62q6-6 12 0q-6 4-12 0Z" fill="#7CC36A" />
        </g>
      );
    case 'casco':
      return (
        <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
          <path d="M54 98C54 56 146 56 146 98Z" fill="#34C759" />
          <path d="M80 66v14M100 62v16M120 66v14" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
          <path d="M54 98h92" />
        </g>
      );
    case 'navidad':
      return (
        <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
          <path d="M62 92C64 58 110 38 148 62l2 16C128 66 98 70 62 92Z" fill="#E5463D" />
          <path d="M58 92c30-14 64-18 94-14" stroke="#fff" strokeWidth="9" strokeLinecap="round" />
          <circle cx="152" cy="80" r="8" fill="#fff" />
        </g>
      );
    case 'vaquero':
      return (
        <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
          <ellipse cx="100" cy="86" rx="62" ry="10" fill="#A0693B" />
          <path d="M70 86C68 54 82 52 100 62 118 52 132 54 130 86Z" fill="#B97A45" />
          <path d="M71 78h58" stroke="#5A3A20" strokeWidth="5" />
        </g>
      );
    case 'pirata':
      return (
        <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
          <path d="M44 90Q100 34 156 90Q100 72 44 90Z" fill="#2A3344" />
          <circle cx="100" cy="70" r="6" fill="#fff" />
          <path d="M94 80l12 -6M94 74l12 6" stroke="#fff" strokeWidth="2" />
        </g>
      );
    case 'mago':
      return (
        <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
          <path d="M66 84 108 14 134 84Z" fill="#6C5BD4" />
          <ellipse cx="100" cy="84" rx="44" ry="8" fill="#5847B8" />
          <path d="M102 44l2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1Z" fill="#F6C343" strokeWidth="1.5" />
          <circle cx="116" cy="66" r="2.5" fill="#F6C343" stroke="none" />
          <circle cx="90" cy="70" r="2" fill="#F6C343" stroke="none" />
        </g>
      );
    case 'vikingo':
      return (
        <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
          <path d="M60 70c-14-4-20-20-14-32 4 12 14 18 22 20Z" fill="#FFF3D6" />
          <path d="M140 70c14-4 20-20 14-32-4 12-14 18-22 20Z" fill="#FFF3D6" />
          <path d="M60 94C60 60 140 60 140 94Z" fill="#B9C4CF" />
          <path d="M58 90h84v8H58Z" fill="#8A6B3A" />
          <path d="M100 64v26" stroke="#8A6B3A" strokeWidth="5" />
        </g>
      );
    case 'copa':
      return (
        <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
          <rect x="76" y="32" width="48" height="46" rx="3" fill="#2A3344" />
          <path d="M77 64h46v8H77Z" fill="#E5463D" strokeWidth="2" />
          <ellipse cx="100" cy="80" rx="38" ry="6" fill="#2A3344" />
        </g>
      );
    case 'halo':
      return (
        <g>
          <ellipse cx="100" cy="44" rx="28" ry="7" fill="none" stroke="#F6C343" strokeWidth="6" />
          <ellipse cx="100" cy="44" rx="28" ry="7" fill="none" stroke="#FFF3B0" strokeWidth="2" />
        </g>
      );
    case 'girasol':
      return (
        <g transform="translate(130 76)" stroke={INK} strokeWidth="2">
          {Array.from({ length: 10 }, (_, i) => <ellipse key={i} cx="0" cy="-11" rx="5" ry="9" fill="#FFC72C" transform={`rotate(${i * 36})`} />)}
          <circle r="8" fill="#8A5A2B" />
        </g>
      );
    case 'tiara':
      return (
        <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M74 78 80 62l10 8 10-14 10 14 10-8 6 16Z" fill="#E6E9F0" />
          <circle cx="100" cy="66" r="4" fill="#F49AC1" strokeWidth="2" />
          <circle cx="84" cy="72" r="2.5" fill="#7EC4E8" strokeWidth="1.5" />
          <circle cx="116" cy="72" r="2.5" fill="#7EC4E8" strokeWidth="1.5" />
        </g>
      );
    case 'birrete':
      return (
        <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
          <path d="M76 70v14h48V70" fill="#2A3344" />
          <path d="M56 64 100 48l44 16-44 16Z" fill="#2A3344" />
          <path d="M100 64l38 6v18" fill="none" stroke="#F6C343" strokeWidth="2.5" />
          <circle cx="138" cy="90" r="3.5" fill="#F6C343" strokeWidth="1.5" />
        </g>
      );
    case 'laurel':
      return (
        <g fill="#7CC36A" stroke="#4E8B3A" strokeWidth="1.8">
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <ellipse cx={64 + i * 7} cy={96 - i * 6} rx="8" ry="4" transform={`rotate(${-40 + i * 8} ${64 + i * 7} ${96 - i * 6})`} />
              <ellipse cx={136 - i * 7} cy={96 - i * 6} rx="8" ry="4" transform={`rotate(${40 - i * 8} ${136 - i * 7} ${96 - i * 6})`} />
            </g>
          ))}
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
    case 'otono':
      return (
        <g>
          <circle cx="160" cy="40" r="14" fill="#F4B34E" />
          {[[28, 120, '#E07A2E'], [176, 112, '#C9561C']].map(([x, y, c]) => (
            <g key={String(x)}>
              <rect x={Number(x) - 3} y={Number(y)} width="6" height="50" fill="#7A4E2D" />
              <circle cx={Number(x)} cy={Number(y)} r="22" fill={String(c)} />
            </g>
          ))}
          {[[60, 60], [90, 40], [130, 76], [50, 100]].map(([x, y]) => (
            <ellipse key={x} cx={x} cy={y} rx="4" ry="2.5" fill="#E07A2E" transform={`rotate(30 ${x} ${y})`} />
          ))}
        </g>
      );
    case 'desierto':
      return (
        <g>
          <circle cx="150" cy="40" r="18" fill="#FFB84D" />
          <path d="M-10 168q60-40 120-10t110 0v40H-10Z" fill="#F0CF8E" />
          <g fill="#5BAE47" stroke="#3E7A2F" strokeWidth="2">
            <rect x="24" y="120" width="10" height="48" rx="5" />
            <path d="M24 140h-8v-14a4 4 0 0 1 8 0Z" />
            <path d="M34 134h8v-12a4 4 0 0 0-8 0Z" />
          </g>
        </g>
      );
    case 'bosque':
      return (
        <g>
          {[[16, 110], [44, 96], [160, 100], [186, 116]].map(([x, y], i) => (
            <g key={i}>
              <rect x={x - 3} y={y + 40} width="6" height="24" fill="#6B4A2E" />
              <path d={`M${x} ${y}l20 44H${x - 20}Z`} fill={i % 2 ? '#3E7A4F' : '#4E9A5F'} />
            </g>
          ))}
          <circle cx="100" cy="34" r="12" fill="#FFE08A" opacity=".8" />
        </g>
      );
    case 'cerezo':
      return (
        <g>
          <path d="M30 170V110q0-16 14-26M30 120q-10-10-14-22" stroke="#7A4E2D" strokeWidth="6" fill="none" strokeLinecap="round" />
          {[[44, 80], [24, 92], [14, 76], [36, 64], [56, 96], [8, 104]].map(([x, y]) => <circle key={x + '-' + y} cx={x} cy={y} r="14" fill="#F7B6D2" />)}
          {[[120, 50], [150, 80], [90, 30], [170, 40], [130, 100]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="3" fill="#F49AC1" />)}
        </g>
      );
    case 'huerto':
      return (
        <g>
          <circle cx="40" cy="36" r="14" fill="#FFD25E" />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <g key={i}>
              <path d={`M${14 + i * 28} 168l-6-14M${14 + i * 28} 168l6-14M${14 + i * 28} 168v-16`} stroke="#4E9A3C" strokeWidth="3" strokeLinecap="round" />
              {i % 2 === 0 && <circle cx={14 + i * 28} cy="150" r="4" fill="#E5463D" />}
            </g>
          ))}
          <rect x="150" y="96" width="34" height="40" fill="#C59A6C" stroke="#8A5A2B" strokeWidth="2" />
          <path d="M146 98l21-16 21 16Z" fill="#E5463D" />
        </g>
      );
    case 'mercado':
      return (
        <g>
          <rect x="10" y="60" width="180" height="70" fill="#FFF3DC" />
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <path key={i} d={`M${10 + i * 20} 40h20v22q-10 8-20 0Z`} fill={i % 2 ? '#FFFFFF' : '#E5463D'} />
          ))}
          <rect x="10" y="118" width="180" height="14" fill="#C59A6C" />
          {[[30, '#E5463D'], [46, '#F39C38'], [62, '#FFD54F'], [140, '#7CC36A'], [156, '#B49BE8'], [172, '#E5463D']].map(([x, c]) => (
            <circle key={String(x)} cx={Number(x)} cy="114" r="7" fill={String(c)} />
          ))}
        </g>
      );
    case 'estadio':
      return (
        <g>
          <rect x="0" y="60" width="200" height="60" fill="#B9C6D6" />
          {Array.from({ length: 30 }, (_, i) => (
            <circle key={i} cx={6 + (i % 15) * 13.5} cy={72 + Math.floor(i / 15) * 18} r="4" fill={['#E5463D', '#3E7CC9', '#F6C343', '#FFFFFF'][i % 4]} />
          ))}
          <path d="M20 40v40M180 40v40" stroke="#9AA8B8" strokeWidth="3" />
          <rect x="12" y="32" width="16" height="10" fill="#FFF8D6" />
          <rect x="172" y="32" width="16" height="10" fill="#FFF8D6" />
          <path d="M0 170h200" stroke="#FFFFFF" strokeWidth="2" opacity=".8" />
        </g>
      );
    case 'submarino':
      return (
        <g>
          {[[30, 40, 6], [50, 70, 4], [160, 50, 5], [176, 90, 3], [140, 20, 4]].map(([x, y, r]) => (
            <circle key={x} cx={x} cy={y} r={r} fill="none" stroke="#DFF4FF" strokeWidth="2" />
          ))}
          <path d="M20 170q-8-20 4-36t-2-34M180 170q8-20-4-36" stroke="#2BB39B" strokeWidth="6" fill="none" strokeLinecap="round" />
          <path d="M150 60q10-8 20 0-10 8-20 0Zm20 0 6-5v10Z" fill="#F39C38" />
        </g>
      );
    case 'espacio':
      return (
        <g>
          {[[20, 20], [60, 50], [110, 16], [150, 70], [30, 100], [180, 30], [90, 80], [170, 110]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 3 ? 1.5 : 2.5} fill="#fff" />
          ))}
          <circle cx="156" cy="44" r="18" fill="#F7A98B" />
          <ellipse cx="156" cy="44" rx="30" ry="6" fill="none" stroke="#FFD54F" strokeWidth="3" transform="rotate(-20 156 44)" />
          {[[60, 186], [140, 190], [100, 196]].map(([x, y]) => <ellipse key={x} cx={x} cy={y} rx="8" ry="3" fill="#7E8496" />)}
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

// ───────────────────────── Compañeros ─────────────────────────

function Pal({ pal }: { pal: string }) {
  switch (pal) {
    case 'mariposa':
      return (
        <g className="pal-float" stroke={INK} strokeWidth="2">
          <ellipse cx="26" cy="54" rx="9" ry="12" fill="#F49AC1" transform="rotate(-20 26 54)" />
          <ellipse cx="42" cy="54" rx="9" ry="12" fill="#B49BE8" transform="rotate(20 42 54)" />
          <path d="M34 46v20" strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    case 'abeja':
      return (
        <g className="pal-float" stroke={INK} strokeWidth="2">
          <ellipse cx="34" cy="52" rx="8" ry="6" fill="#FFFFFF" fillOpacity=".8" transform="rotate(-30 34 52)" />
          <ellipse cx="32" cy="64" rx="12" ry="9" fill="#FFD54F" />
          <path d="M28 56v16M36 56v16" stroke={INK} strokeWidth="3" />
          <circle cx="42" cy="62" r="1.5" fill={INK} />
        </g>
      );
    case 'pajarito':
      return (
        <g className="pal-float" stroke={INK} strokeWidth="2" strokeLinejoin="round">
          <ellipse cx="30" cy="60" rx="14" ry="11" fill="#7EC4E8" />
          <path d="M22 58q6 8 14 2" fill="#5BA8D6" />
          <path d="M44 58l7 3-7 3Z" fill="#F39C38" />
          <circle cx="37" cy="56" r="1.8" fill={INK} />
        </g>
      );
    case 'caracol':
      return (
        <g stroke={INK} strokeWidth="2" strokeLinejoin="round">
          <path d="M8 176h34q4-8-4-8H8Z" fill="#F2D27E" />
          <circle cx="22" cy="164" r="10" fill="#C59A6C" />
          <path d="M22 164a4 4 0 1 1 4-4" fill="none" />
          <path d="M38 168l2-10M42 168l4-9" />
        </g>
      );
    case 'perrito':
      return (
        <g stroke={INK} strokeWidth="2" strokeLinejoin="round">
          <ellipse cx="24" cy="166" rx="16" ry="10" fill="#E9C27D" />
          <circle cx="30" cy="150" r="10" fill="#E9C27D" />
          <ellipse cx="22" cy="146" rx="4" ry="8" fill="#A47551" transform="rotate(20 22 146)" />
          <circle cx="33" cy="148" r="1.6" fill={INK} />
          <circle cx="39" cy="152" r="2" fill={INK} />
          <path d="M8 162q-6-6-2-12" fill="none" />
        </g>
      );
    case 'pez':
      return (
        <g stroke={INK} strokeWidth="2">
          <path d="M8 152a20 20 0 1 0 36 0Z" fill="#BFE6F7" fillOpacity=".8" />
          <path d="M18 162q6-6 12 0-6 6-12 0Zm12 0 5-4v8Z" fill="#F39C38" strokeWidth="1.5" />
          <path d="M8 152h36" strokeWidth="2.5" />
        </g>
      );
    case 'estrella':
      return (
        <g className="pal-float" stroke={INK} strokeWidth="2" strokeLinejoin="round">
          <path d="M32 40l5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2Z" fill="#FFD54F" />
          <circle cx="29" cy="54" r="1.5" fill={INK} />
          <circle cx="35" cy="54" r="1.5" fill={INK} />
        </g>
      );
    default:
      return null;
  }
}
