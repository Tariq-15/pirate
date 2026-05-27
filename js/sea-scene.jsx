// Seven Seas game scene — wired to the real engine state

const { useState, useEffect, useRef, useCallback } = React;

// Compute total copies per sea ID from the engine's CARD_DB
function buildTotalCopies() {
  const t = {};
  Object.values(CARD_DB).forEach(def => {
    const seaId = CODE_TO_SEA_ID[def.code];
    if (seaId) t[seaId] = def.qty;
  });
  return t;
}
const TOTAL_COPIES = buildTotalCopies();
const BN = '"Anek Bangla", sans-serif';
const TABLE_INK = SEA.ink;
const TABLE_INK_SOFT = SEA.inkSoft;
const SEA_CARD_BACK = typeof CARD_BACK !== 'undefined' ? CARD_BACK : 'illustration/card-backside.png';
/** Breathing room after each animation / popup before the next one */
const SEA_STEP_PAUSE_MS = 800;

function seaEventKey(state) {
  const e = state?.lastEvent;
  if (!e) return null;
  return `${state.roundNum}:${e.type}:${e.t}:${e.card?.uid ?? ''}:${e.by ?? ''}:${e.playerId ?? ''}:${e.seat ?? ''}`;
}

/** Flying card overlay (deck pull / play push) — visible to all clients */
function seaCardFly(fromEl, toEl, { src, mode = 'pull', duration = 520, onComplete } = {}) {
  if (!fromEl || !toEl) { onComplete?.(); return; }
  const from = fromEl.getBoundingClientRect();
  const to = toEl.getBoundingClientRect();
  if (from.width < 2 || to.width < 2) { onComplete?.(); return; }

  const w = mode === 'push' ? 96 : 72;
  const h = Math.round(w * 1.42);
  const startX = from.left + from.width / 2 - w / 2;
  const startY = from.top + from.height / 2 - h / 2;
  const destX = to.left + to.width / 2 - w / 2;
  const destY = to.top + to.height / 2 - h / 2;
  const dx = destX - startX;
  const dy = destY - startY;

  const fly = document.createElement('img');
  fly.src = src || SEA_CARD_BACK;
  fly.alt = '';
  fly.className = 'sea-fly-card';
  fly.setAttribute('aria-hidden', 'true');
  Object.assign(fly.style, {
    left: `${startX}px`, top: `${startY}px`, width: `${w}px`, height: `${h}px`,
    opacity: '1', transform: 'scale(0.85)', transition: 'none',
    objectFit: 'cover', objectPosition: 'top center',
  });
  document.body.appendChild(fly);

  const easing = mode === 'push'
    ? 'cubic-bezier(0.22, 0.61, 0.36, 1)'
    : 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';

  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (mode === 'push') {
      fly.style.transition = `transform ${duration}ms ${easing}, box-shadow ${duration}ms ease`;
      fly.style.transform = `translate(${dx}px, ${dy}px) scale(1.12)`;
      fly.style.boxShadow = '0 0 40px rgba(242,201,76,0.75), 0 12px 32px rgba(0,0,0,0.85)';
    } else {
      fly.style.transition = `transform ${duration}ms ${easing}, opacity 0.18s ease ${duration - 100}ms`;
      fly.style.transform = `translate(${dx}px, ${dy}px) scale(1.05) rotate(-3deg)`;
      fly.style.opacity = '0';
    }
  }));

  setTimeout(() => {
    fly.remove();
    onComplete?.();
  }, duration + 60);
}

/** Serial queue: card fly → cinematic → death — one at a time with pauses */
function usePresentationQueue() {
  const [current, setCurrent] = useState(null);
  const [isPausing, setIsPausing] = useState(false);
  const queueRef = useRef([]);
  const pauseTimerRef = useRef(null);
  const currentIdRef = useRef(null);

  const drain = useCallback(() => {
    const next = queueRef.current.shift();
    if (next) {
      currentIdRef.current = next.id;
      setCurrent(next);
    } else {
      currentIdRef.current = null;
      setCurrent(null);
    }
  }, []);

  const complete = useCallback(() => {
    currentIdRef.current = null;
    setCurrent(null);
    setIsPausing(true);
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = setTimeout(() => {
      pauseTimerRef.current = null;
      setIsPausing(false);
      drain();
    }, SEA_STEP_PAUSE_MS);
  }, [drain]);

  const enqueue = useCallback((item) => {
    if (currentIdRef.current === item.id) return;
    if (queueRef.current.some(i => i.id === item.id)) return;
    if (currentIdRef.current || pauseTimerRef.current) {
      queueRef.current.push(item);
      return;
    }
    currentIdRef.current = item.id;
    setCurrent(item);
  }, []);

  const reset = useCallback(() => {
    queueRef.current = [];
    currentIdRef.current = null;
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = null;
    setIsPausing(false);
    setCurrent(null);
  }, []);

  const isBusy = !!currentIdRef.current || isPausing || queueRef.current.length > 0;

  useEffect(() => () => {
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
  }, []);

  return { current, enqueue, complete, reset, isBusy };
}

// Wood table (scaled down ~12% to free space for side panels)
const TABLE = { left: 324, top: 231, outerW: 792, outerH: 458, innerLeft: 350, innerTop: 253, innerW: 746, innerH: 419 };

function seaSeatsFor(count) {
  const opps = {
    1: [],
    2: [{ x: 720, y: 110 }],
    3: [{ x: 1080, y: 200 }, { x: 360, y: 200 }],
    4: [{ x: 1080, y: 200 }, { x: 720, y: 110 }, { x: 360, y: 200 }],
    5: [{ x: 1080, y: 300 }, { x: 900, y: 110 }, { x: 540, y: 110 }, { x: 360, y: 300 }],
    6: [{ x: 1090, y: 720 }, { x: 1100, y: 400 }, { x: 1060, y: 130 },
        { x: 720,  y: 90  }, { x: 380,  y: 130 }],
  };
  return opps[count] || opps[4];
}

// ─── Doubloon ──────────────────────────────────────────────────────────────────
function Doubloon({ size = 14, dim }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ filter: dim ? 'grayscale(0.8) opacity(0.4)' : 'none', flexShrink: 0 }}>
      <defs>
        <radialGradient id={`dub${size}`} cx="35%" cy="30%">
          <stop offset="0%" stopColor="#FCE07A" />
          <stop offset="60%" stopColor={SEA.brass} />
          <stop offset="100%" stopColor={SEA.brassDark} />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill={`url(#dub${size})`} stroke={SEA.ink} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="7" fill="none" stroke={SEA.brassDark} strokeWidth="0.8" />
      <g transform="translate(12 12)" stroke={SEA.brassDark} strokeWidth="1.2" fill="none" strokeLinecap="round">
        <circle cx="0" cy="-4" r="1.2" />
        <line x1="0" y1="-3" x2="0" y2="5" />
        <line x1="-2.5" y1="-1" x2="2.5" y2="-1" />
        <path d="M -4 2 Q -4 5 0 5.5 Q 4 5 4 2" />
      </g>
      <path d="M 4 5 Q 7 4 9 5" stroke="rgba(255,255,255,0.5)" strokeWidth="1" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// ─── Seat (porthole avatar) ────────────────────────────────────────────────────
function SeaSeat({ player, isActive, position, target = 4, dock }) {
  const { id, name, initial, tokens, hand, protected: prot, eliminated, isYou, isAI } = player;
  return (
    <div
      data-sea-player={id}
      style={dock ? {
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      opacity: eliminated ? 0.55 : 1,
      width: 132,
      flexShrink: 0,
    } : {
      position: 'absolute', left: position.x, top: position.y,
      transform: 'translate(-50%, -50%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      opacity: eliminated ? 0.55 : 1,
      width: 132,
    }}>
      <div style={{ position: 'relative' }}>
        <div style={{
          width: 82, height: 82, borderRadius: '50%',
          background: `radial-gradient(circle at 30% 30%, ${SEA.gold} 0%, ${SEA.brass} 55%, ${SEA.brassDark} 100%)`,
          border: `3px solid ${SEA.ink}`,
          boxShadow: isActive
            ? `0 0 0 4px ${SEA.deep}, 0 0 0 5.5px ${SEA.gold}, 0 0 24px rgba(242,201,76,0.7), 0 4px 12px rgba(0,0,0,0.4)`
            : `0 4px 10px rgba(0,0,0,0.35)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          <div style={{
            width: 62, height: 62, borderRadius: '50%',
            background: `radial-gradient(circle at 35% 30%, ${SEA.sky} 0%, ${SEA.midSea} 70%, ${SEA.ocean} 100%)`,
            border: `2px solid ${SEA.ink}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: BN,
            fontSize: 28, fontWeight: 700, color: TABLE_INK,
            position: 'relative', overflow: 'hidden',
          }}>
            {isAI ? '🤖' : initial}
            <svg style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }} viewBox="0 0 60 20">
              <path d="M 0 10 Q 15 6 30 10 T 60 10 L 60 20 L 0 20 Z" fill={SEA.midSea} opacity="0.5" />
            </svg>
          </div>

          {eliminated && (
            <div style={{
              position: 'absolute', inset: 4, borderRadius: '50%',
              background: 'rgba(11,18,28,0.65)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36, color: SEA.coral, fontFamily: 'sans-serif', fontWeight: 700,
            }}>✕</div>
          )}

          {[0, 60, 120, 180, 240, 300].map(a => {
            const rad = (a * Math.PI) / 180;
            return (
              <div key={a} style={{
                position: 'absolute',
                left: 41 + 36 * Math.cos(rad) - 2,
                top: 41 + 36 * Math.sin(rad) - 2,
                width: 4, height: 4, borderRadius: '50%',
                background: SEA.brassDark, border: `0.5px solid ${SEA.ink}`,
              }} />
            );
          })}
        </div>

        {isYou && (
          <div style={{
            position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)',
            padding: '2px 10px', background: SEA.gold,
            borderRadius: 999, fontSize: 9, fontFamily: '"Anek Bangla", sans-serif',
            color: SEA.ink, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
            border: `1.5px solid ${SEA.ink}`, whiteSpace: 'nowrap',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          }}>তুমি</div>
        )}

        {!eliminated && (
          <div style={{
            position: 'absolute', top: -4, right: -10,
            width: 30, height: 34, borderRadius: 4,
            background: SEA.ocean, border: `2px solid ${SEA.brass}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: '"Anek Bangla", sans-serif', color: TABLE_INK, fontSize: 15, fontWeight: 700,
            boxShadow: '2px 3px 4px rgba(0,0,0,0.4)',
            transform: 'rotate(8deg)',
          }}>{hand}</div>
        )}

        {prot && !eliminated && (
          <div title="সুরক্ষিত" style={{
            position: 'absolute', top: -8, left: -10,
            width: 30, height: 30, borderRadius: '50%',
            background: SEA.teal, border: `2.5px solid ${SEA.ink}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: TABLE_INK, fontWeight: 700,
            boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
          }}>⚓</div>
        )}
      </div>

      <div style={{
        fontFamily: '"Anek Bangla", sans-serif', fontSize: 14, fontWeight: 600,
        color: TABLE_INK, letterSpacing: 0.6, lineHeight: 1.1,
        marginTop: isYou ? 6 : 2, textAlign: 'center',
      }}>
        {name}
      </div>

      <div style={{ display: 'flex', gap: 3, alignItems: 'center', marginTop: -2 }}>
        {Array.from({ length: Math.max(target, tokens) }).map((_, i) => (
          <Doubloon key={i} size={16} dim={i >= tokens} />
        ))}
      </div>

      {(eliminated || isActive) && (
        <div style={{
          fontFamily: '"Anek Bangla", sans-serif', fontSize: 12,
          color: eliminated ? SEA.coral : TABLE_INK, fontWeight: 600,
          lineHeight: 1, marginTop: 1, letterSpacing: 0.3,
          textAlign: 'center',
        }}>
          {eliminated ? 'সমুদ্রে! 💀' : 'খেলছেন…'}
        </div>
      )}
    </div>
  );
}

// ─── Wood-plank deck table ──────────────────────────────────────────────────────
function DeckTable() {
  return (
    <>
      <div style={{
        position: 'absolute', left: TABLE.left, top: TABLE.top, width: TABLE.outerW, height: TABLE.outerH,
        borderRadius: '50%',
        background: `repeating-conic-gradient(${SEA.rope} 0deg 8deg, ${SEA.woodDark} 8deg 10deg)`,
        boxShadow: '0 14px 40px rgba(0,0,0,0.4), inset 0 0 30px rgba(0,0,0,0.4)',
      }} />
      <div style={{
        position: 'absolute', left: TABLE.innerLeft, top: TABLE.innerTop, width: TABLE.innerW, height: TABLE.innerH,
        borderRadius: '50%',
        background: SEA.wood,
        overflow: 'hidden',
        boxShadow: 'inset 0 0 60px rgba(0,0,0,0.55), inset 0 6px 12px rgba(0,0,0,0.35)',
      }}>
        <svg viewBox="0 0 848 476" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <defs>
            <linearGradient id="deckGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SEA.woodLight} stopOpacity="0.8" />
              <stop offset="50%" stopColor={SEA.wood} stopOpacity="1" />
              <stop offset="100%" stopColor={SEA.woodDark} stopOpacity="1" />
            </linearGradient>
          </defs>
          <rect width="848" height="476" fill="url(#deckGrad)" />
          {[60, 120, 180, 240, 300, 360, 420].map(y => (
            <g key={y}>
              <line x1="0" y1={y} x2="848" y2={y} stroke={SEA.woodDark} strokeWidth="1.5" opacity="0.5" />
              <line x1="0" y1={y + 1} x2="848" y2={y + 1} stroke={SEA.woodLight} strokeWidth="0.5" opacity="0.5" />
            </g>
          ))}
          {[
            [200,0,60],[500,60,120],[120,120,180],[620,120,180],[320,180,240],
            [680,180,240],[180,240,300],[480,240,300],[240,300,360],[600,300,360],
          ].map(([x, y0, y1], i) => (
            <line key={i} x1={x} y1={y0} x2={x} y2={y1} stroke={SEA.woodDark} strokeWidth="1.2" opacity="0.6" />
          ))}
        </svg>
        <svg viewBox="0 0 100 100" style={{
          position: 'absolute', left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 246, height: 246, opacity: 0.08,
        }}>
          <circle cx="50" cy="50" r="45" fill="none" stroke={SEA.ink} strokeWidth="1.5" />
          <circle cx="50" cy="50" r="36" fill="none" stroke={SEA.ink} strokeWidth="0.8" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
            <g key={a} transform={`rotate(${a} 50 50)`} stroke={SEA.ink} strokeWidth="1" fill={SEA.ink}>
              <path d={a % 90 === 0 ? "M 50 5 L 52 50 L 50 50 L 48 50 Z" : "M 50 15 L 51 50 L 50 50 L 49 50 Z"} />
            </g>
          ))}
          <circle cx="50" cy="50" r="3" fill={SEA.ink} />
        </svg>
      </div>
    </>
  );
}

// ─── Center play area ──────────────────────────────────────────────────────────
function SeaCenterPlay({ lastPlayed, lastPlayer, deckCount, discardCount, discardTop, playSlam }) {
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, top: 248,
      display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: 36,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div style={{
          fontFamily: '"Anek Bangla", sans-serif', fontSize: 11, letterSpacing: 2,
          color: TABLE_INK, textTransform: 'uppercase', fontWeight: 600,
        }}>ফেলা · {discardCount}</div>
        <div style={{ position: 'relative', width: 120, height: 170 }}>
          {discardTop[2] && <SeaCard id={discardTop[2]} w={100} tilt={-7} style={{ position: 'absolute', left: 0, top: 8, opacity: 0.65 }} />}
          {discardTop[1] && <SeaCard id={discardTop[1]} w={100} tilt={4}  style={{ position: 'absolute', left: 6, top: 4, opacity: 0.85 }} />}
          {discardTop[0] && <SeaCard id={discardTop[0]} w={100} tilt={-2} style={{ position: 'absolute', left: 10 }} />}
          {discardTop.length === 0 && (
            <div style={{
              width: 100, height: 142, borderRadius: 10,
              border: `2px dashed ${SEA.rope}`, opacity: 0.4,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: '"Anek Bangla", sans-serif', fontSize: 11, color: TABLE_INK_SOFT,
            }}>খালি</div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, position: 'relative' }}>
        <div style={{
          position: 'absolute', width: 340, height: 340, top: -34, left: '50%', transform: 'translateX(-50%)',
          background: `radial-gradient(circle, rgba(242,201,76,0.22) 0%, transparent 70%)`,
          pointerEvents: 'none', borderRadius: '50%',
        }} />
        <div style={{
          fontFamily: '"Anek Bangla", sans-serif', fontSize: 12, letterSpacing: 2.5,
          color: TABLE_INK, textTransform: 'uppercase', fontWeight: 700, position: 'relative',
        }}>★ এইমাত্র খেলা ★</div>
        <div
          data-sea-anchor="played"
          className={playSlam ? 'sea-played-slam' : ''}
          style={{ position: 'relative' }}
        >
          {lastPlayed
            ? <SeaCard id={lastPlayed} w={144} highlight />
            : <div style={{ width: 144, height: 205, borderRadius: 12, border: `2px dashed ${SEA.rope}`, opacity: 0.3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: BN, fontSize: 13, color: TABLE_INK_SOFT }}>—</div>
          }
        </div>
        {lastPlayer && (
          <div style={{
            fontFamily: '"Anek Bangla", sans-serif', fontSize: 16, fontWeight: 600, color: TABLE_INK,
            position: 'relative', marginTop: 4,
          }}>{lastPlayer} খেলেছেন</div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div style={{
          fontFamily: '"Anek Bangla", sans-serif', fontSize: 11, letterSpacing: 2,
          color: TABLE_INK, textTransform: 'uppercase', fontWeight: 600,
        }}>ডেক · {deckCount}</div>
        <div data-sea-anchor="deck" style={{ position: 'relative', width: 120, height: 180 }}>
          <SeaCardBack w={100} tilt={-3} style={{ position: 'absolute', left: 14, top: 8 }} />
          <SeaCardBack w={100} tilt={1}  style={{ position: 'absolute', left: 8,  top: 4 }} />
          <SeaCardBack w={100} tilt={-1} style={{ position: 'absolute', left: 4 }} />
        </div>
        <div style={{
          fontFamily: '"Anek Bangla", sans-serif', fontSize: 13, fontWeight: 500, fontStyle: 'italic',
          color: TABLE_INK_SOFT,
        }}>+ ১টি লুকানো</div>
      </div>
    </div>
  );
}

// ─── Turn hint (toast chrome, no animation) ────────────────────────────────────
function SeaTurnToast({ isMyTurn, mustPlayCaptain }) {
  let className = 'sea-turn-toast';
  let text = 'তোমার তাস';
  if (isMyTurn && mustPlayCaptain) {
    className += ' sea-turn-toast--captain';
    text = '⚠️ ক্যাপ্টেন খেলুন!';
  } else if (isMyTurn) {
    text = '★ তোমার টার্ন — একটি কার্ড খেলো ★';
  } else {
    className += ' sea-turn-toast--idle';
  }
  return <div className={className}>{text}</div>;
}

// ─── Your hand + avatar (bottom-right dock) ────────────────────────────────────
function SeaYourDock({ player, cards, isMyTurn, isActive, mustPlayCaptain, onPlay, target }) {
  return (
    <div style={{
      position: 'absolute', left: '50%', bottom: 48,
      transform: 'translateX(-50%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      zIndex: 6,
      pointerEvents: 'none',
    }}>
      <SeaTurnToast isMyTurn={isMyTurn} mustPlayCaptain={mustPlayCaptain} />
      <div style={{
        display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: 14,
        pointerEvents: 'auto',
      }}>
        {cards.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'flex-end', position: 'relative', paddingBottom: 22 }}>
            {cards.map((c, i) => {
              const seaId = CODE_TO_SEA_ID[c] || c;
              const disabled = !isMyTurn || (mustPlayCaptain && seaId !== 'captain');
              return (
                <div key={i} style={{ position: 'relative' }}>
                  <SeaCard
                    id={c}
                    w={158}
                    tilt={i === 0 ? -3 : 3}
                    highlight={isMyTurn && !disabled && i === 0}
                    dim={disabled}
                    onClick={(!disabled && onPlay) ? () => onPlay(i) : undefined}
                    style={{
                      marginLeft: i === 0 ? 0 : -22,
                      cursor: (!disabled && isMyTurn) ? 'pointer' : 'default',
                    }}
                  />
                  <div style={{
                    position: 'absolute', bottom: -20, left: 0, right: 0, textAlign: 'center',
                    fontFamily: '"Anek Bangla", sans-serif', fontSize: 12, color: TABLE_INK,
                    fontWeight: 600,
                  }}>
                    {i === 0 ? 'এইমাত্র টানা' : 'হাতে'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <SeaSeat player={player} isActive={isActive} target={target} dock />
      </div>
    </div>
  );
}

// ─── Discard tally ──────────────────────────────────────────────────────────────
function DiscardTally({ counts }) {
  const totalPlayed = Object.values(counts).reduce((a, b) => a + b, 0);
  const totalDeck = Object.values(TOTAL_COPIES).reduce((a, b) => a + b, 0);
  const playedCards = ROSTER.filter(card => (counts[card.id] || 0) > 0);
  return (
    <div style={{
      position: 'absolute', left: 16, top: 96, bottom: 16, width: 248,
      background: `linear-gradient(180deg, ${SEA.parchmentEdge} 0%, ${SEA.parchment} 8%, ${SEA.parchment} 92%, ${SEA.parchmentEdge} 100%)`,
      border: `3px solid ${SEA.woodDark}`, borderRadius: 8,
      boxShadow: '0 8px 24px rgba(0,0,0,0.45), inset 0 0 30px rgba(125,78,25,0.2)',
      padding: '16px 14px 14px',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ textAlign: 'center', paddingBottom: 10 }}>
        <div style={{ fontFamily: '"Anek Bangla", sans-serif', fontSize: 22, color: SEA.ocean, fontWeight: 700, lineHeight: 1.1 }}>
          খেলা হয়েছে
        </div>
        <div style={{ marginTop: 8, height: 4, backgroundImage: `repeating-linear-gradient(90deg, ${SEA.rope} 0 6px, ${SEA.woodDark} 6px 8px)`, borderRadius: 2 }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, marginTop: 4, overflow: 'auto' }}>
        {playedCards.map(card => {
          const n = counts[card.id] || 0;
          const total = TOTAL_COPIES[card.id] || 1;
          const exhausted = n >= total;
          return (
            <div key={card.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '6px 8px', borderRadius: 5,
              background: exhausted ? 'rgba(200,75,58,0.14)' : 'rgba(212,169,60,0.16)',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: `radial-gradient(circle at 32% 28%, ${SEA.gold} 0%, ${SEA.brass} 55%, ${SEA.brassDark} 100%)`,
                border: `2px solid ${SEA.ink}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: '"Anek Bangla", sans-serif', fontSize: 16, fontWeight: 700, color: SEA.ink,
                flexShrink: 0,
              }}>{card.value}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: '"Anek Bangla", sans-serif', fontSize: 17, fontWeight: 700, color: SEA.ink, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.bn}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 2 }}>
                  {Array.from({ length: Math.min(total, 6) }).map((_, i) => (
                    <div key={i} style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: i < n ? SEA.redDark : 'transparent',
                      border: `1.5px solid ${i < n ? SEA.redDark : SEA.inkSoft}`,
                    }} />
                  ))}
                </div>
                <div style={{
                  fontFamily: '"Anek Bangla", sans-serif', fontSize: 18, fontWeight: 700,
                  color: SEA.redDark, minWidth: 22, textAlign: 'right',
                }}>×{n}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: 8, paddingTop: 10,
        borderTop: `2px dashed ${SEA.rope}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        fontFamily: '"Anek Bangla", sans-serif', color: SEA.woodDark,
      }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>মোট খেলা</span>
        <span style={{ fontSize: 22, fontWeight: 700, color: SEA.ocean }}>
          {totalPlayed}
          <span style={{ fontSize: 15, color: SEA.inkSoft, fontWeight: 600 }}> / {totalDeck}</span>
        </span>
      </div>
    </div>
  );
}

// Group consecutive log lines from the same turn (newest-first in state.log)
function groupLogByTurn(entries) {
  const blocks = [];
  for (const entry of entries.slice(0, 50)) {
    const key = entry.turnKey ?? `t:${entry.t}`;
    const last = blocks[blocks.length - 1];
    if (last && last.key === key) {
      last.messages.push(entry.msg);
    } else {
      blocks.push({ key, messages: [entry.msg] });
    }
  }
  return blocks;
}

// ─── Ship's Log ────────────────────────────────────────────────────────────────
function SeaLog({ entries }) {
  const blocks = groupLogByTurn(entries);
  const logInk = '#0B121C';

  return (
    <div style={{
      position: 'absolute', right: 16, top: 100, width: 288, height: 720,
      background: `linear-gradient(180deg, ${SEA.parchmentEdge} 0%, ${SEA.parchment} 8%, ${SEA.parchment} 92%, ${SEA.parchmentEdge} 100%)`,
      border: `3px solid ${SEA.woodDark}`, borderRadius: 6,
      boxShadow: '0 8px 24px rgba(0,0,0,0.45), inset 0 0 30px rgba(125,78,25,0.2)',
      padding: '18px 16px 14px',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ textAlign: 'center', paddingBottom: 8 }}>
        <div style={{ fontFamily: BN, fontSize: 19, color: logInk, fontWeight: 700 }}>জাহাজি দিনলিপি</div>
        <div style={{ marginTop: 8, height: 4, backgroundImage: `repeating-linear-gradient(90deg, ${SEA.rope} 0 6px, ${SEA.woodDark} 6px 8px)`, borderRadius: 2 }} />
      </div>
      <div style={{ flex: 1, marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'auto' }}>
        {blocks.slice(0, 14).map((block, bi) => (
          <div
            key={block.key + bi}
            style={{
              fontFamily: BN,
              fontSize: 14.5, lineHeight: 1.45,
              color: logInk,
              padding: '8px 10px',
              border: `2px solid ${bi === 0 ? SEA.gold : SEA.rope}`,
              borderRadius: 6,
              background: bi === 0 ? 'rgba(212,169,60,0.14)' : 'rgba(255,255,255,0.45)',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}
          >
            {block.messages.map((msg, mi) => (
              <div key={mi}>{msg}</div>
            ))}
          </div>
        ))}
      </div>
      <div style={{
        textAlign: 'center', paddingTop: 8, borderTop: `2px dashed ${SEA.rope}`,
        fontFamily: BN, fontSize: 13.5, color: logInk, fontStyle: 'italic',
      }}>⚓ বহিঃস্থ কর্মকর্তা রেকর্ড করেছেন</div>
    </div>
  );
}

// ─── Top banner ─────────────────────────────────────────────────────────────────
function SeaBanner({ round, target, activeName }) {
  return (
    <div style={{
      position: 'absolute', top: 20, left: 24, right: 320, height: 68,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 22px',
      background: `linear-gradient(180deg, ${SEA.woodLight} 0%, ${SEA.wood} 100%)`,
      border: `3px solid ${SEA.woodDark}`, borderRadius: 8,
      boxShadow: '0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.18)',
    }}>
      {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h]) => (
        <div key={v+h} style={{ position: 'absolute', [v]: 8, [h]: 8, width: 4, height: 4, borderRadius: '50%', background: SEA.ink, opacity: 0.5 }} />
      ))}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, minWidth: 0 }}>
        <div style={{ fontFamily: '"Anek Bangla", sans-serif', fontSize: 22, color: TABLE_INK, fontWeight: 700, letterSpacing: 1, lineHeight: 1.05, whiteSpace: 'nowrap' }}>
          জলদস্যু
        </div>
        <div style={{ fontFamily: '"Anek Bangla", sans-serif', fontSize: 12, color: TABLE_INK_SOFT, fontWeight: 500, fontStyle: 'italic', whiteSpace: 'nowrap' }}>
          জলদস্যু কার্ড গেম
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        {[
          ['রাউন্ড', round],
          ['প্রথমে', <span key="t" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{target}<Doubloon size={14} /></span>],
        ].map(([k, v], i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, letterSpacing: 1.4, color: TABLE_INK_SOFT, fontFamily: '"Anek Bangla", sans-serif', fontWeight: 600 }}>{k}</div>
            <div style={{ fontFamily: '"Anek Bangla", sans-serif', fontSize: 18, fontWeight: 700, color: TABLE_INK, lineHeight: 1.1 }}>{v}</div>
          </div>
        ))}
        <div style={{ width: 1, height: 38, background: SEA.woodDark }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%', background: SEA.gold,
            boxShadow: `0 0 8px ${SEA.gold}`,
            animation: 'seaPulse 1.6s ease-in-out infinite',
          }} />
          <div style={{ fontFamily: '"Anek Bangla", sans-serif', fontSize: 14, color: TABLE_INK, fontWeight: 600 }}>
            {activeName ? `${activeName}-এর টার্ন` : '…'}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Wave footer ───────────────────────────────────────────────────────────────
function WaveFooter() {
  return (
    <svg viewBox="0 0 1440 60" preserveAspectRatio="none"
      style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%', height: 36, opacity: 0.4, pointerEvents: 'none' }}>
      <path d="M 0 30 Q 60 14 120 30 T 240 30 T 360 30 T 480 30 T 600 30 T 720 30 T 840 30 T 960 30 T 1080 30 T 1200 30 T 1320 30 T 1440 30 L 1440 60 L 0 60 Z" fill={SEA.teal} />
      <path d="M 0 40 Q 50 26 100 40 T 200 40 T 300 40 T 400 40 T 500 40 T 600 40 T 700 40 T 800 40 T 900 40 T 1000 40 T 1100 40 T 1200 40 T 1300 40 T 1440 40 L 1440 60 L 0 60 Z" fill={SEA.midSea} opacity="0.8" />
    </svg>
  );
}

// ─── Main game scene (adapts engine state) ────────────────────────────────────
function SeaGameScene({ state, onPlayCard, cardPresentation, onCardPresentationDone }) {
  const stageRef = useRef(null);
  const cardRanRef = useRef(null);
  const [visiblePlayed, setVisiblePlayed] = useState(null);
  const [playSlam, setPlaySlam] = useState(false);

  // Keep center card in sync (play reveal waits for queued push animation)
  useEffect(() => {
    if (cardPresentation) return;
    if (state.lastEvent?.type === 'PLAY_CARD') return;
    const seaId = state.lastPlayedCard
      ? (CODE_TO_SEA_ID[state.lastPlayedCard.code] || 'pirate')
      : null;
    setVisiblePlayed(seaId);
    setPlaySlam(false);
  }, [state.lastPlayedCard?.uid, state.roundNum, state.lastEvent?.type, state.lastEvent?.t, cardPresentation]);

  // Card fly animations (driven by presentation queue)
  useEffect(() => {
    if (!cardPresentation || !stageRef.current) return;
    if (cardRanRef.current === cardPresentation.id) return;
    cardRanRef.current = cardPresentation.id;

    const e = cardPresentation.event;
    const q = (sel) => stageRef.current.querySelector(sel);
    const done = () => onCardPresentationDone?.();

    if (e.type === 'TURN_START') {
      const p = state.players[e.seat];
      if (!p?.isAlive) { done(); return; }
      const deckEl = q('[data-sea-anchor="deck"]');
      const seatEl = q(`[data-sea-player="${p.playerId}"]`);
      if (!deckEl || !seatEl) { done(); return; }
      seaCardFly(deckEl, seatEl, { src: SEA_CARD_BACK, mode: 'pull', duration: 540, onComplete: done });
      return;
    }

    if (e.type === 'DRAW_CARD') {
      const p = state.players.find(pl => pl.playerId === e.playerId);
      if (!p?.isAlive) { done(); return; }
      const deckEl = q('[data-sea-anchor="deck"]');
      const seatEl = q(`[data-sea-player="${p.playerId}"]`);
      if (!deckEl || !seatEl) { done(); return; }
      seaCardFly(deckEl, seatEl, { src: SEA_CARD_BACK, mode: 'pull', duration: 520, onComplete: done });
      return;
    }

    if (e.type === 'PLAY_CARD' && e.card) {
      const p = state.players.find(pl => pl.playerId === e.by);
      if (!p) { done(); return; }
      const seatEl = q(`[data-sea-player="${p.playerId}"]`);
      const centerEl = q('[data-sea-anchor="played"]');
      if (!seatEl || !centerEl) { done(); return; }
      const def = CARD_DB[e.card.code];
      const seaId = CODE_TO_SEA_ID[e.card.code] || 'pirate';

      const finish = () => {
        setVisiblePlayed(seaId);
        setPlaySlam(true);
        setTimeout(() => {
          setPlaySlam(false);
          done();
        }, 480);
      };

      const img = new Image();
      const startFly = () => {
        seaCardFly(seatEl, centerEl, {
          src: def?.img || SEA_CARD_BACK,
          mode: 'push',
          duration: 760,
          onComplete: finish,
        });
      };
      img.onload = startFly;
      img.onerror = startFly;
      img.src = def?.img || SEA_CARD_BACK;
      return;
    }

    done();
  }, [cardPresentation, state.players, onCardPresentationDone]);

  useEffect(() => {
    const fit = () => {
      if (!stageRef.current) return;
      const sx = window.innerWidth / 1440;
      const sy = window.innerHeight / 900;
      stageRef.current.style.transform = `scale(${Math.min(sx, sy)})`;
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const myClientId = Net.getClientId();
  const me = state.players.find(p => p.clientId === myClientId);
  const currentPlayer = state.players[state.turnIndex];
  const isMyTurn = !!(currentPlayer && currentPlayer.clientId === myClientId);
  const target = state.config?.winningTokens || 4;

  // Reorder players so "me" is first (gets bottom-left position)
  const myIdx = state.players.findIndex(p => p.clientId === myClientId);
  const ordered = myIdx >= 0
    ? [...state.players.slice(myIdx), ...state.players.slice(0, myIdx)]
    : state.players;

  // Map engine players to display format
  const displayPlayers = ordered.map(p => ({
    id: p.playerId,
    name: p.username || '?',
    initial: (p.username || '?')[0].toUpperCase(),
    tokens: p.tokens,
    hand: p.hand.length,
    protected: p.isProtected,
    eliminated: !p.isAlive,
    isYou: p.clientId === myClientId,
    isAI: !!p.isAI,
  }));

  const opponents = displayPlayers.filter(p => !p.isYou);
  const mePlayer = displayPlayers.find(p => p.isYou);
  const positions = seaSeatsFor(displayPlayers.length);
  const activePlayerId = currentPlayer?.playerId;

  const lastPlayedByName = state.players.find(p => p.playerId === state.lastPlayedBy)?.username || '';

  // Hand cards for "me"
  const handCards = me ? me.hand.map(c => CODE_TO_SEA_ID[c.code] || c.code.toLowerCase()) : [];

  // Discard counts
  const discardCounts = {};
  state.players.forEach(p => p.discards.forEach(c => {
    const id = CODE_TO_SEA_ID[c.code];
    if (id) discardCounts[id] = (discardCounts[id] || 0) + 1;
  }));
  (state.burnFaceUp || []).forEach(c => {
    const id = CODE_TO_SEA_ID[c.code];
    if (id) discardCounts[id] = (discardCounts[id] || 0) + 1;
  });

  const discardTotal = Object.values(discardCounts).reduce((a, b) => a + b, 0);

  // Top 3 discard cards for pile display
  const allDiscarded = [];
  state.players.forEach(p => p.discards.forEach(c => allDiscarded.push(CODE_TO_SEA_ID[c.code] || 'pirate')));
  (state.burnFaceUp || []).forEach(c => allDiscarded.push(CODE_TO_SEA_ID[c.code] || 'pirate'));
  const discardTop = allDiscarded.slice(-3).reverse();

  const logEntries = state.log || [];

  const meAlive = me?.isAlive;
  const mustPlayCaptain = me?.mustPlayCaptain || false;

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0E2B3E' }}>
      <div ref={stageRef} style={{ transformOrigin: 'center center' }}>
        <div style={{
          width: 1440, height: 900, position: 'relative', overflow: 'hidden',
          background: `linear-gradient(180deg, #2D5878 0%, #1B3A56 40%, #0E2B3E 90%)`,
          fontFamily: BN,
        }}>
          {/* Stars */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: 200, pointerEvents: 'none' }}>
            {[80, 240, 380, 510, 690, 880, 1040, 1210, 1370].map((x, i) => (
              <circle key={i} cx={x} cy={20 + (i * 13) % 80} r={i % 3 === 0 ? 1.5 : 1} fill={SEA.cream} opacity="0.7" />
            ))}
          </svg>

          <SeaBanner round={state.roundNum || 1} target={target} activeName={currentPlayer?.username || ''} />
          <DeckTable />
          <SeaCenterPlay
            lastPlayed={visiblePlayed}
            lastPlayer={lastPlayedByName}
            deckCount={state.deck.length}
            discardCount={discardTotal}
            discardTop={discardTop}
            playSlam={playSlam}
          />

          {opponents.map((p, i) => (
            <SeaSeat
              key={p.id}
              player={p}
              position={positions[i] || { x: 400, y: 300 }}
              isActive={p.id === activePlayerId}
              target={target}
            />
          ))}

          {me && meAlive && mePlayer && (
            <SeaYourDock
              player={mePlayer}
              cards={handCards}
              isMyTurn={isMyTurn}
              isActive={mePlayer.id === activePlayerId}
              mustPlayCaptain={mustPlayCaptain}
              onPlay={isMyTurn ? onPlayCard : null}
              target={target}
            />
          )}

          {me && !meAlive && (
            <div style={{
              position: 'absolute', bottom: 80, left: 0, right: 0,
              display: 'flex', justifyContent: 'center',
            }}>
              <div style={{
                padding: '12px 28px',
                background: 'rgba(245, 232, 200, 0.96)', border: `2px solid ${SEA.coral}`,
                borderRadius: 24, fontFamily: '"Anek Bangla", sans-serif',
                fontSize: 20, color: TABLE_INK, fontWeight: 700,
                boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
              }}>
                💀 আপনি এই রাউন্ডে বাদ পড়েছেন!
              </div>
            </div>
          )}

          {!me && (
            <div style={{
              position: 'absolute', bottom: 80, left: 0, right: 0,
              display: 'flex', justifyContent: 'center',
            }}>
              <div style={{
                padding: '10px 24px',
                background: 'rgba(245, 232, 200, 0.92)', border: `2px solid ${SEA.woodDark}`,
                borderRadius: 20, fontFamily: '"Anek Bangla", sans-serif',
                fontSize: 16, color: TABLE_INK,
              }}>👁️ দর্শক</div>
            </div>
          )}

          {!isMyTurn && me && meAlive && (
            <div style={{
              position: 'absolute', bottom: 30, left: 0, right: 0,
              display: 'flex', justifyContent: 'center',
            }}>
              <div style={{
                padding: '7px 20px',
                background: 'rgba(245, 232, 200, 0.9)', border: `1.5px solid ${SEA.woodDark}`,
                borderRadius: 18, fontFamily: '"Anek Bangla", sans-serif',
                fontSize: 14, color: TABLE_INK,
              }}>
                ⏳ {currentPlayer?.username}-এর টার্নের অপেক্ষায়…
              </div>
            </div>
          )}

          <DiscardTally counts={discardCounts} />
          <SeaLog entries={logEntries} />
          <WaveFooter />

          <style>{`
            @keyframes seaPulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.25); opacity: 0.75; }
            }
            @keyframes sea-card-slam {
              0% { transform: scale(0.7); opacity: 0.4; }
              65% { transform: scale(1.1); }
              100% { transform: scale(1); opacity: 1; }
            }
            .sea-played-slam { animation: sea-card-slam 0.42s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
          `}</style>
        </div>
      </div>
    </div>
  );
}

// ─── Error boundary ──────────────────────────────────────────────────────────────
class SeaErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  componentDidCatch(e) { console.error('[SeaScene crash]', e.message, e.stack); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ position:'fixed', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#0B121C', color:'#F2C94C', fontFamily:'"Anek Bangla", sans-serif', gap:12, padding:24 }}>
          <div style={{ fontSize:28, fontWeight:700 }}>⚠️ দৃশ্যে ত্রুটি</div>
          <div style={{ fontSize:14, color:'#E07B5A', maxWidth:600, textAlign:'center', wordBreak:'break-word' }}>{this.state.error.message}</div>
          <button onClick={() => this.setState({ error: null })} style={{ marginTop:12, padding:'8px 20px', background:'#F2C94C', color:'#0B121C', border:'none', borderRadius:8, fontSize:14, fontWeight:700, cursor:'pointer' }}>আবার চেষ্টা</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── React App root ─────────────────────────────────────────────────────────────
function SeaAppRoot() {
  const [engineState, setEngineState] = useState(null);
  const { current: presentation, enqueue, complete, reset, isBusy } = usePresentationQueue();
  const enqueuedRef = useRef(new Set());
  const roundRef = useRef(0);

  useEffect(() => {
    window.SeaUI = { render: (s) => setEngineState({ ...s }) };
    if (window._pendingSeaState) {
      setEngineState({ ...window._pendingSeaState });
      delete window._pendingSeaState;
    }
  }, []);

  // Reset queue on new round
  useEffect(() => {
    if (!engineState) return;
    const round = engineState.roundNum || 0;
    if (round !== roundRef.current) {
      roundRef.current = round;
      enqueuedRef.current = new Set();
      reset();
    }
  }, [engineState?.roundNum, reset]);

  // Enqueue card fly animations (pull / play push)
  useEffect(() => {
    if (!engineState?.lastEvent) return;
    const e = engineState.lastEvent;
    if (!['TURN_START', 'DRAW_CARD', 'PLAY_CARD'].includes(e.type)) return;
    const key = seaEventKey(engineState);
    if (!key || enqueuedRef.current.has(key)) return;
    enqueuedRef.current.add(key);
    enqueue({ id: key, type: 'card', event: e });
  }, [engineState?.lastEvent, engineState?.roundNum, enqueue]);

  // Enqueue duel / cannon cinematics (after any prior card anims in queue)
  useEffect(() => {
    if (!engineState?.lastCinematic) return;
    const c = engineState.lastCinematic;
    const key = `${engineState.roundNum}:cine:${c.type}:${c.t}`;
    if (enqueuedRef.current.has(key)) return;
    enqueuedRef.current.add(key);

    const myClientId = Net.getClientId();

    if (c.type === 'SWORDSMAN_DUEL') {
      const attackerSeaCard = CODE_TO_SEA_ID[c.attackerCardCode] || 'pirate';
      const defenderSeaCard = CODE_TO_SEA_ID[c.targetCardCode] || 'pirate';
      const attacker = engineState.players.find(p => p.playerId === c.attackerId);
      const target = engineState.players.find(p => p.playerId === c.targetId);
      const meIsAttacker = attacker?.clientId === myClientId;
      const meIsDefender = target?.clientId === myClientId;

      let yourCard, theirCard, yourName, theirName, perspective;
      if (meIsAttacker) {
        yourCard = attackerSeaCard; theirCard = defenderSeaCard;
        yourName = 'তুমি'; theirName = c.targetName || '?';
        perspective = 'player';
      } else if (meIsDefender) {
        yourCard = defenderSeaCard; theirCard = attackerSeaCard;
        yourName = 'তুমি'; theirName = c.attackerName || '?';
        perspective = 'player';
      } else {
        yourCard = attackerSeaCard; theirCard = defenderSeaCard;
        yourName = c.attackerName || '?'; theirName = c.targetName || '?';
        perspective = 'spectator';
      }

      enqueue({
        id: key, type: 'cinematic-duel',
        yourCard, theirCard, yourName, theirName, perspective,
      });
    } else if (c.type === 'CANNONEER_BLAST') {
      enqueue({
        id: key, type: 'cinematic-blast',
        targetCard: CODE_TO_SEA_ID[c.droppedCode] || 'pirate',
        targetName: c.targetName || '?',
      });
    }
  }, [engineState?.lastCinematic, engineState?.roundNum, engineState?.players, enqueue]);

  // Enqueue death notices (after cinematics / card anims ahead in queue)
  useEffect(() => {
    if (!engineState) return;
    const notices = (engineState.deathNotices && engineState.deathNotices.length > 0)
      ? engineState.deathNotices
      : (engineState.lastDeathNotice ? [engineState.lastDeathNotice] : []);
    notices.forEach(n => {
      const key = `${engineState.roundNum}:death:${n.playerId}:${n.t}`;
      if (enqueuedRef.current.has(key)) return;
      enqueuedRef.current.add(key);
      enqueue({ id: key, type: 'death', notice: n });
    });
  }, [engineState?.deathNotices, engineState?.lastDeathNotice, engineState?.roundNum, enqueue]);

  const phaseKey = engineState
    ? `${engineState.phase}_${engineState.pending?.card?.uid || engineState.turnIndex}`
    : null;

  if (!engineState) return null;

  const myClientId = Net.getClientId();
  const me = engineState.players.find(p => p.clientId === myClientId);
  const currentPlayer = engineState.players[engineState.turnIndex];
  const isMyTurn = !!(currentPlayer && currentPlayer.clientId === myClientId);
  const phase = engineState.phase;

  // Reverse map: sea ID → engine code (for guard guess submission)
  const SEA_ID_TO_CODE = {};
  Object.entries(CODE_TO_SEA_ID).forEach(([code, seaId]) => { SEA_ID_TO_CODE[seaId] = code; });

  // Resolve which popup to show (no cancel — must complete the action)
  let activePopup = null;
  if (isMyTurn) {
    if (phase === Engine.PHASES.NEEDS_TARGET) {
      const pending = engineState.pending;
      if (pending) {
        const cardSeaId = CODE_TO_SEA_ID[pending.card.code] || 'pirate';
        const validSet = new Set(pending.validTargetIds || []);
        const targetPlayers = engineState.players
          .filter(p => validSet.has(p.playerId))
          .map(p => ({
            id: p.playerId,
            name: p.username || '?',
            initial: (p.username || '?')[0].toUpperCase(),
            protected: p.isProtected,
            eliminated: !p.isAlive,
          }));
        const actionMap = {
          swordsman: 'লড়াই কর', cannoneer: 'গুলি কর',
          merchant: 'বদল কর', spy: 'নজর দাও',
          guard: 'অভিযোগ কর', pickpocket: 'অভিযোগ কর',
        };
        activePopup = (
          <PlayerPickerPopup
            key={phaseKey}
            cardName={cardSeaId}
            players={targetPlayers}
            action={actionMap[cardSeaId] || 'নিশানা কর'}
            onPick={(playerId) => Net.submit({ type: 'PICK_TARGET', targetId: playerId })}
          />
        );
      }
    } else if (phase === Engine.PHASES.NEEDS_GUARD) {
      const pending = engineState.pending;
      const target = pending ? engineState.players.find(p => p.playerId === pending.targetId) : null;
      const guardOptions = ROSTER.filter(r => r.id !== 'guard').map(r => r.id);
      activePopup = (
        <CardPickerPopup
          key={phaseKey}
          cardName="guard"
          subtitle={`${target?.username || '?'}-কে নিশানা করবে? হাতে কোন তাস আছে অনুমান করো`}
          options={guardOptions}
          mode="guess"
          onPick={(seaId) => Net.submit({ type: 'PICK_GUARD', code: SEA_ID_TO_CODE[seaId] || seaId.toUpperCase() })}
        />
      );
    } else if (phase === Engine.PHASES.NEEDS_MERCHANT && me) {
      const handSeaIds = me.hand.map(c => CODE_TO_SEA_ID[c.code] || c.code.toLowerCase());
      activePopup = (
        <CardPickerPopup
          key={phaseKey}
          cardName="merchant"
          title="বণিকের পছন্দ"
          subtitle="তিনটি থেকে একটি বেছে নাও — বাকিগুলি ফিরে যাবে ডেকে"
          options={handSeaIds}
          mode="pick"
          onPick={(seaId) => {
            const idx = handSeaIds.findIndex(id => id === seaId);
            Net.submit({ type: 'PICK_MERCHANT', idx: Math.max(0, idx) });
          }}
        />
      );
    }
  }

  return (
    <SeaErrorBoundary>
      <SeaGameScene
        state={engineState}
        onPlayCard={(idx) => Net.submit({ type: 'PLAY_CARD', cardIdx: idx })}
        cardPresentation={presentation?.type === 'card' ? presentation : null}
        onCardPresentationDone={complete}
      />
      {activePopup}
      {presentation?.type === 'cinematic-duel' && (
        <DuelPopup
          key={presentation.id}
          yourCard={presentation.yourCard}
          theirCard={presentation.theirCard}
          yourName={presentation.yourName}
          theirName={presentation.theirName}
          perspective={presentation.perspective}
          onClose={complete}
        />
      )}
      {presentation?.type === 'cinematic-blast' && (
        <CannonBlastPopup
          key={presentation.id}
          targetCard={presentation.targetCard}
          targetName={presentation.targetName}
          onClose={complete}
        />
      )}
      {presentation?.type === 'death' && (
        <DeathPopup
          key={presentation.id}
          notice={presentation.notice}
          onDone={complete}
        />
      )}
    </SeaErrorBoundary>
  );
}

ReactDOM.createRoot(document.getElementById('sea-root')).render(<SeaAppRoot />);
