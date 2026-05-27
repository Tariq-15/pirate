// Seven Seas card art — Photo illustrations + Card Template design
// Maps both lowercase sea IDs ('pirate') and engine codes ('PIRATE')

const SEA = {
  deep:         '#0E2B3E',
  ocean:        '#1B3A56',
  midSea:       '#2E6B8E',
  teal:         '#4DA0B0',
  sky:          '#7FB8C9',
  foam:         '#EAF4F5',
  sand:         '#E8D5A8',
  parchment:    '#F5E8C8',
  parchmentEdge:'#E2CC95',
  wood:         '#B07A4D',
  woodLight:    '#D4A574',
  woodDark:     '#6E4730',
  brass:        '#D4A93C',
  brassDark:    '#9A7821',
  coral:        '#E26A56',
  red:          '#C84B3A',
  redDark:      '#8B2A15',
  gold:         '#F2C94C',
  ink:          '#1E2E3D',
  inkSoft:      '#536B7E',
  cream:        '#FAF6E8',
  sail:         '#EFE5C8',
  rope:         '#C9A876',
};

const BN_NUM = ['', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯', '১০'];

const CODE_TO_SEA_ID = {
  PIRATE:    'pirate',
  CAPTAIN:   'captain',
  SAILOR:    'sailor',
  SWORDSMAN: 'swordsman',
  MERCHANT:  'merchant',
  CANNONEER: 'cannoneer',
  CREW:      'deckhand',
  SPY:       'spy',
  GUARD:     'guard',
  ROGUE:     'pickpocket',
};

// Card roster — illustration path, ring tint, Bengali description
const ROSTER = [
  {
    id: 'pirate',    en: 'Pirate',      bn: 'জলদস্যু',
    value: 9,
    img: '/illustration/pirate.png',
    ring: '#C84B3A',
    desc: 'এই তাস খেললে তুমি নিজেই দলের বাইরে হয়ে যাবে।',
  },
  {
    id: 'captain',   en: 'Captain',     bn: 'ক্যাপ্টেন',
    value: 8,
    img: '/illustration/captain.png',
    ring: '#3D5A2E',
    desc: 'হাতে নির্দিষ্ট তাস থাকলে এটিই খেলতে হবে।',
  },
  {
    id: 'sailor',    en: 'Sailor',      bn: 'নাবিক',
    value: 7,
    img: '/illustration/sailor.png',
    ring: '#2E6B8E',
    desc: 'অন্য একজন খেলোয়াড়ের সাথে হাতের তাস বদলে নাও।',
  },
  {
    id: 'merchant',  en: 'Merchant',    bn: 'বণিক',
    value: 6,
    img: '/illustration/merchant.png',
    ring: '#D4A93C',
    desc: 'ডেক থেকে ২টি তোলো, ১টি রাখো, বাকিটি ফেরত দাও।',
  },
  {
    id: 'cannoneer', en: 'Cannoneer',   bn: 'কামান চালক',
    value: 5,
    img: '/illustration/canoneer.png',
    ring: '#8B2A15',
    desc: 'লক্ষ্যকে তাস ফেলতে এবং নতুন তাস তুলতে বাধ্য করো।',
  },
  {
    id: 'spy',       en: 'Spy',         bn: 'গুপ্তচর',
    value: 4,
    img: '/illustration/spy.png',
    ring: '#536B7E',
    desc: 'পরবর্তী টার্ন পর্যন্ত তুমি সুরক্ষিত থাকবে।',
  },
  {
    id: 'swordsman', en: 'Swordsman',   bn: 'তলোয়ারবাজ',
    value: 3,
    img: '/illustration/swordsman.png',
    ring: '#6E4730',
    desc: 'দুজনের তাস তুলনা করো; কম মান যার, সে বাদ পড়বে।',
  },
  {
    id: 'deckhand',  en: 'Ship Crew',   bn: 'জাহাজ কর্মচারী',
    value: 3,
    img: '/illustration/crew.png',
    ring: '#4DA0B0',
    desc: 'অন্য একজন খেলোয়াড়ের তাস গোপনে দেখো।',
  },
  {
    id: 'guard',     en: 'Guard',       bn: 'পাহারাদার',
    value: 1,
    img: '/illustration/guard.png',
    ring: '#1E5A4A',
    desc: 'অন্যের তাস অনুমান করো; সঠিক হলে সে বাদ পড়বে।',
  },
  {
    id: 'pickpocket', en: 'Pickpocket', bn: 'ছিঁচকে চোর',
    value: 0,
    img: '/illustration/rouge.png',
    ring: '#9A7821',
    desc: 'রাউন্ড শেষ পর্যন্ত টিকে থাকলে বোনাস টোকেন পাও।',
  },
];

const BY_ID = Object.fromEntries(ROSTER.map(r => [r.id, r]));
const BY_EN = Object.fromEntries(ROSTER.map(r => [r.en, r]));

// ─── SeaCard — Card Template design (460×660 baseline, scales to any width) ────
function SeaCard({ id = 'pirate', w = 160, tilt = 0, highlight, dim, style, onClick }) {
  const s = w / 460;
  const h = Math.round(w * 660 / 460);
  const seaId = CODE_TO_SEA_ID[id] || id;
  const card = BY_ID[seaId] || ROSTER[0];
  const RING = card.ring;

  return (
    <div onClick={onClick} style={{
      width: w, height: h, position: 'relative',
      borderRadius: Math.round(20 * s),
      background: SEA.parchment,
      border: `${Math.max(1, Math.round(4 * s))}px solid ${SEA.ink}`,
      boxShadow: `0 ${24*s}px ${60*s}px rgba(0,0,0,0.55), 0 ${8*s}px ${16*s}px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(0,0,0,0.15)`,
      overflow: 'hidden',
      flexShrink: 0,
      transform: `rotate(${tilt}deg)`,
      cursor: onClick ? 'pointer' : 'default',
      filter: dim ? 'grayscale(0.5) brightness(0.85)' : 'none',
      transition: 'transform 0.18s ease-out',
      ...style,
    }}>
      {/* Wood-plank grain */}
      <svg viewBox="0 0 460 660" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.13 }}>
        {[110, 220, 330, 440, 550].map((y, i) => (
          <line key={i} x1="0" y1={y} x2="460" y2={y} stroke={SEA.woodDark} strokeWidth="1.5" />
        ))}
        <line x1="180" y1="0"   x2="180" y2="110" stroke={SEA.woodDark} strokeWidth="1.2" />
        <line x1="320" y1="110" x2="320" y2="220" stroke={SEA.woodDark} strokeWidth="1.2" />
        <line x1="140" y1="440" x2="140" y2="550" stroke={SEA.woodDark} strokeWidth="1.2" />
        <line x1="290" y1="550" x2="290" y2="660" stroke={SEA.woodDark} strokeWidth="1.2" />
      </svg>

      {/* Rope inner border */}
      <div style={{
        position: 'absolute', inset: Math.round(14 * s),
        borderRadius: Math.round(14 * s),
        border: `${Math.max(1, Math.round(4 * s))}px dashed ${SEA.rope}`,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', inset: Math.round(18 * s),
        borderRadius: Math.round(12 * s),
        border: `${Math.max(1, Math.round(1.5 * s))}px solid ${SEA.ink}`,
        pointerEvents: 'none', opacity: 0.55,
      }} />

      {/* Brass corner studs */}
      {[[28, 28], [432, 28], [432, 632], [28, 632]].map(([x, y], i) => (
        <div key={i} style={{
          position: 'absolute',
          left: (x - 6) * s, top: (y - 6) * s,
          width: 12 * s, height: 12 * s,
          borderRadius: '50%',
          background: `radial-gradient(circle at 30% 30%, ${SEA.gold} 0%, ${SEA.brass} 60%, ${SEA.brassDark} 100%)`,
          border: `${Math.max(0.5, 1.5 * s)}px solid ${SEA.ink}`,
          boxShadow: 'inset -1px -1px 2px rgba(0,0,0,0.35)',
        }} />
      ))}

      {/* Power coin */}
      <div style={{
        position: 'absolute', top: 28 * s, left: 28 * s,
        width: 76 * s, height: 76 * s, borderRadius: '50%',
        background: `radial-gradient(circle at 32% 28%, ${SEA.gold} 0%, ${SEA.brass} 55%, ${SEA.brassDark} 100%)`,
        border: `${Math.max(1, 3 * s)}px solid ${SEA.ink}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: SEA.ink, lineHeight: 1,
        boxShadow: `inset ${-4*s}px ${-4*s}px ${8*s}px rgba(0,0,0,0.3), 0 ${3*s}px ${6*s}px rgba(0,0,0,0.35)`,
      }}>
        <div style={{ fontFamily: '"Anek Bangla", sans-serif', fontSize: 38 * s, fontWeight: 700, lineHeight: 1 }}>
          {BN_NUM[card.value] || card.value}
        </div>
      </div>

      {/* Bangla title */}
      <div style={{
        position: 'absolute',
        top: 28 * s, left: 120 * s, right: 28 * s,
        height: 76 * s,
        display: 'flex', alignItems: 'center',
      }}>
        <div style={{
          fontFamily: '"Anek Bangla", sans-serif',
          fontSize: 40 * s, fontWeight: 700,
          color: SEA.ink, lineHeight: 1.05,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{card.bn}</div>
      </div>

      {/* Divider 1 — rope pattern */}
      <div style={{
        position: 'absolute', top: 124 * s, left: 32 * s, right: 32 * s, height: Math.max(2, 4 * s),
        backgroundImage: `repeating-linear-gradient(90deg, ${SEA.rope} 0 ${8*s}px, ${SEA.woodDark} ${8*s}px ${10*s}px)`,
        borderRadius: 2 * s,
      }} />

      {/* Illustration */}
      <div style={{
        position: 'absolute', top: 144 * s, left: 32 * s, right: 32 * s, height: 340 * s,
        borderRadius: 10 * s,
        background: `linear-gradient(180deg, ${SEA.sky} 0%, ${SEA.midSea} 100%)`,
        border: `${Math.max(1, 3 * s)}px solid ${RING}`,
        boxShadow: `inset 0 0 ${24*s}px rgba(0,0,0,0.3), 0 ${4*s}px ${8*s}px rgba(0,0,0,0.25)`,
        overflow: 'hidden',
      }}>
        <img
          src={card.img}
          alt={card.bn}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>

      {/* Corner ribbons over illustration */}
      <svg viewBox="0 0 60 60" width={36 * s} height={36 * s}
        style={{ position: 'absolute', top: 138 * s, left: 26 * s }}>
        <path d="M 0 8 Q 0 0 8 0 L 28 0 Q 14 4 4 28 Z" fill={RING} stroke={SEA.ink} strokeWidth="2" />
      </svg>
      <svg viewBox="0 0 60 60" width={36 * s} height={36 * s}
        style={{ position: 'absolute', top: 138 * s, right: 26 * s }}>
        <path d="M 60 8 Q 60 0 52 0 L 32 0 Q 46 4 56 28 Z" fill={RING} stroke={SEA.ink} strokeWidth="2" />
      </svg>

      {/* Divider 2 — rope pattern */}
      <div style={{
        position: 'absolute', top: 504 * s, left: 32 * s, right: 32 * s, height: Math.max(2, 4 * s),
        backgroundImage: `repeating-linear-gradient(90deg, ${SEA.rope} 0 ${8*s}px, ${SEA.woodDark} ${8*s}px ${10*s}px)`,
        borderRadius: 2 * s,
      }} />

      {/* Center ornament */}
      <div style={{
        position: 'absolute', top: 498 * s, left: '50%', transform: 'translateX(-50%)',
        width: 18 * s, height: 18 * s, borderRadius: '50%',
        background: SEA.parchment, border: `${Math.max(1, 2 * s)}px solid ${SEA.woodDark}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 8 * s, height: 8 * s, borderRadius: '50%',
          background: `radial-gradient(circle at 30% 30%, ${SEA.gold} 0%, ${SEA.brass} 100%)`,
        }} />
      </div>

      {/* Bengali ability description */}
      <div style={{
        position: 'absolute', top: 522 * s, left: 32 * s, right: 32 * s, bottom: 28 * s,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          fontFamily: '"Anek Bangla", sans-serif',
          fontSize: 24 * s, lineHeight: 1.45,
          color: SEA.ink, fontWeight: 500, textAlign: 'center',
        }}>{card.desc}</div>
      </div>

      {/* Highlight glow */}
      {highlight && (
        <div style={{
          position: 'absolute', inset: -6, borderRadius: Math.round(20 * s) + 6,
          boxShadow: `0 0 22px ${SEA.gold}, 0 0 0 2.5px ${SEA.gold}`,
          pointerEvents: 'none',
        }} />
      )}
    </div>
  );
}

// ─── Card Back — uses illustration/card-backside.png ─────────────────────────
function SeaCardBack({ w = 160, tilt = 0, style }) {
  const s = w / 460;
  const h = Math.round(w * 660 / 460);
  return (
    <div style={{
      width: w, height: h, position: 'relative',
      borderRadius: Math.round(20 * s),
      border: `${Math.max(1, Math.round(4 * s))}px solid ${SEA.ink}`,
      overflow: 'hidden',
      flexShrink: 0,
      transform: `rotate(${tilt}deg)`,
      background: SEA.ocean,
      boxShadow: `0 ${8*s}px ${20*s}px rgba(0,0,0,0.4)`,
      ...style,
    }}>
      <img
        src="/illustration/card-backside.png"
        alt="Card Back"
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </div>
  );
}

Object.assign(window, { SEA, ROSTER, BY_ID, BY_EN, BN_NUM, SeaCard, SeaCardBack, CODE_TO_SEA_ID });
