// Popup overlays for Seven Seas — Player picker, Card picker (Merchant/Guard),
// and the full Swordsman Duel sequence.
//
// All Bangla, Anek Bangla font. Reuses SeaCard / SeaCardBack / SEA palette
// from sea-card-art.jsx.

const { useState, useEffect, useRef } = React;

// ─── Shared chrome ──────────────────────────────────────────────────────────

function PopupBackdrop({ children, blackout, onClose, zIndex = 50 }) {
  return (
    <div
      onClick={onClose || undefined}
      style={{
        position: 'fixed', inset: 0, zIndex,
        background: blackout ? 'rgba(0,0,0,0.94)' : 'rgba(11,18,28,0.78)',
        backdropFilter: blackout ? 'none' : 'blur(10px)',
        WebkitBackdropFilter: blackout ? 'none' : 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'popupFadeIn 0.25s ease-out',
        fontFamily: '"Anek Bangla", sans-serif',
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{ animation: 'popupScaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
        {children}
      </div>
    </div>
  );
}

function PopupChrome({ title, subtitle, accentCard, children, width = 720, footer }) {
  return (
    <div style={{
      width, padding: '32px 40px 28px',
      background: `linear-gradient(180deg, ${SEA.parchment} 0%, ${SEA.parchmentEdge} 100%)`,
      border: `4px solid ${SEA.woodDark}`, borderRadius: 18,
      boxShadow: '0 30px 80px rgba(0,0,0,0.6), inset 0 0 0 1.5px rgba(0,0,0,0.15), inset 0 0 50px rgba(125,78,25,0.12)',
      position: 'relative',
    }}>
      {/* Brass corner studs */}
      {[[14, 14], [null, 14], [14, null], [null, null]].map(([l, t], i) => (
        <div key={i} style={{
          position: 'absolute',
          ...(l !== null ? { left: l } : { right: 14 }),
          ...(t !== null ? { top: t } : { bottom: 14 }),
          width: 14, height: 14, borderRadius: '50%',
          background: `radial-gradient(circle at 30% 30%, ${SEA.gold} 0%, ${SEA.brass} 60%, ${SEA.brassDark} 100%)`,
          border: `1.5px solid ${SEA.ink}`,
        }} />
      ))}

      {/* Card icon ribbon (top) */}
      {accentCard && (
        <div style={{
          position: 'absolute', top: -28, left: '50%', transform: 'translateX(-50%)',
          width: 56, height: 56, borderRadius: '50%',
          background: `radial-gradient(circle at 30% 30%, ${SEA.gold} 0%, ${SEA.brass} 55%, ${SEA.brassDark} 100%)`,
          border: `3px solid ${SEA.ink}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: '"Anek Bangla", sans-serif', fontWeight: 700, fontSize: 22, color: SEA.ink,
          boxShadow: '0 6px 16px rgba(0,0,0,0.5)',
        }}>{accentCard}</div>
      )}

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24, marginTop: accentCard ? 10 : 0 }}>
        <div style={{ fontFamily: '"Anek Bangla", sans-serif', fontSize: 30, fontWeight: 700, color: SEA.ocean, lineHeight: 1.1 }}>{title}</div>
        {subtitle && <div style={{ fontFamily: '"Anek Bangla", sans-serif', fontSize: 16, color: SEA.woodDark, marginTop: 6, fontWeight: 500 }}>{subtitle}</div>}
        {/* Rope divider */}
        <div style={{
          margin: '14px auto 0', width: 100, height: 4,
          backgroundImage: `repeating-linear-gradient(90deg, ${SEA.rope} 0 6px, ${SEA.woodDark} 6px 8px)`,
          borderRadius: 2,
        }} />
      </div>

      {children}

      {footer && (
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1.5px dashed ${SEA.rope}`, display: 'flex', justifyContent: 'center', gap: 12 }}>
          {footer}
        </div>
      )}
    </div>
  );
}

function PopupButton({ label, primary, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        appearance: 'none', border: `2.5px solid ${SEA.ink}`, borderRadius: 8,
        padding: '10px 22px',
        background: disabled ? '#BBA67A' : primary ? `linear-gradient(180deg, ${SEA.coral} 0%, ${SEA.red} 100%)` : SEA.parchment,
        color: disabled ? SEA.woodDark : primary ? SEA.cream : SEA.ink,
        fontFamily: '"Anek Bangla", sans-serif', fontSize: 17, fontWeight: 700, letterSpacing: 0.3,
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: disabled ? 'none' : `3px 3px 0 0 ${SEA.ink}`,
        transition: 'transform 0.1s, box-shadow 0.1s',
      }}
      onMouseDown={e => !disabled && (e.currentTarget.style.transform = 'translate(2px, 2px)', e.currentTarget.style.boxShadow = `1px 1px 0 0 ${SEA.ink}`)}
      onMouseUp={e => !disabled && (e.currentTarget.style.transform = '', e.currentTarget.style.boxShadow = `3px 3px 0 0 ${SEA.ink}`)}
      onMouseLeave={e => !disabled && (e.currentTarget.style.transform = '', e.currentTarget.style.boxShadow = `3px 3px 0 0 ${SEA.ink}`)}
    >{label}</button>
  );
}

// ─── 1. Player picker — Guard / Merchant / Cannoneer / Swordsman target ────

function PlayerPickerPopup({ cardName, players, onPick, action }) {
  const [pickedId, setPickedId] = useState(null);
  const card = BY_ID[cardName] || ROSTER[0];
  const action_label = action || 'নিশানা কর';

  return (
    <PopupBackdrop>
      <PopupChrome
        title={`${card.bn} খেলছ`}
        subtitle="কোন খেলোয়াড়কে নিশানা করবে?"
        accentCard={BN_NUM[card.value]}
        width={760}
        footer={
          <PopupButton label={action_label} primary disabled={!pickedId} onClick={() => onPick(pickedId)} />
        }
      >
        <div style={{ display: 'flex', gap: 18, justifyContent: 'center', flexWrap: 'wrap' }}>
          {players.map(p => {
            const isPicked = pickedId === p.id;
            const isLocked = p.protected || p.eliminated;
            return (
              <button
                key={p.id}
                disabled={isLocked}
                onClick={() => !isLocked && setPickedId(p.id)}
                style={{
                  position: 'relative',
                  appearance: 'none',
                  border: `3px solid ${isPicked ? SEA.gold : isLocked ? SEA.woodDark : SEA.ink}`,
                  borderRadius: 14,
                  padding: '14px 12px',
                  background: isPicked ? `rgba(242,201,76,0.25)` : SEA.parchment,
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  width: 130,
                  opacity: isLocked ? 0.55 : 1,
                  transform: isPicked ? 'translateY(-4px)' : 'none',
                  boxShadow: isPicked ? `0 8px 20px rgba(242,201,76,0.5), 4px 4px 0 0 ${SEA.ink}` : `3px 3px 0 0 ${SEA.ink}`,
                  transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s, background 0.15s',
                }}
              >
                {/* Porthole avatar */}
                <div style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: `radial-gradient(circle at 30% 30%, ${SEA.gold} 0%, ${SEA.brass} 55%, ${SEA.brassDark} 100%)`,
                  border: `2.5px solid ${isPicked ? SEA.gold : SEA.ink}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: isPicked ? `0 0 0 3px ${SEA.ocean}, 0 0 0 4.5px ${SEA.gold}` : 'none',
                  transition: 'box-shadow 0.15s',
                }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: SEA.midSea,
                    border: `2px solid ${SEA.ink}`,
                    overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <PlayerAvatar playerId={p.id} name={p.name} isAI={!!p.isAI} size={56} />
                  </div>
                </div>
                <div style={{ fontFamily: '"Anek Bangla", sans-serif', fontSize: 15, fontWeight: 700, color: SEA.ink, lineHeight: 1.1, textAlign: 'center' }}>
                  {p.name}
                </div>
                {p.protected && (
                  <div style={{
                    position: 'absolute', top: -10, right: -10,
                    background: SEA.teal, color: SEA.cream, fontWeight: 700,
                    padding: '3px 10px', borderRadius: 999, fontSize: 11,
                    border: `2px solid ${SEA.ink}`, whiteSpace: 'nowrap',
                  }}>সুরক্ষিত ⚓</div>
                )}
                {p.eliminated && (
                  <div style={{
                    position: 'absolute', top: -10, right: -10,
                    background: SEA.redDark, color: SEA.cream, fontWeight: 700,
                    padding: '3px 10px', borderRadius: 999, fontSize: 11,
                    border: `2px solid ${SEA.ink}`, whiteSpace: 'nowrap',
                  }}>পরাজিত</div>
                )}
                {/* checkmark on pick */}
                {isPicked && (
                  <div style={{
                    position: 'absolute', top: -12, left: -12,
                    width: 30, height: 30, borderRadius: '50%',
                    background: SEA.gold, border: `2.5px solid ${SEA.ink}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 700, color: SEA.ink,
                    boxShadow: '0 3px 6px rgba(0,0,0,0.4)',
                  }}>✓</div>
                )}
              </button>
            );
          })}
        </div>
      </PopupChrome>
    </PopupBackdrop>
  );
}

// ─── 2. Card picker — Merchant pick-of-3 / Guard guess ─────────────────────

function CardPickerPopup({ title, subtitle, cardName, options, onPick, mode = 'pick' }) {
  // mode='pick' shows the actual cards (Merchant). mode='guess' shows mini cards (Guard guess).
  const [pickedId, setPickedId] = useState(null);
  const card = BY_ID[cardName] || ROSTER[0];

  return (
    <PopupBackdrop>
      <PopupChrome
        title={title || `${card.bn} খেলছ`}
        subtitle={subtitle || (mode === 'pick' ? 'একটি তাস বেছে নাও' : 'অনুমান কর — তার হাতে কোন তাস?')}
        accentCard={BN_NUM[card.value]}
        width={720}
        footer={
          <PopupButton label={mode === 'pick' ? 'নাও' : 'অভিযোগ কর'} primary disabled={!pickedId} onClick={() => onPick(pickedId)} />
        }
      >
        {mode === 'pick' ? (
          // Big cards — 3 displayed in a row (Merchant)
          <div style={{ display: 'flex', gap: 28, justifyContent: 'center', alignItems: 'center', padding: '6px 0 4px' }}>
            {options.map((id, i) => {
              const isPicked = pickedId === id;
              return (
                <div
                  key={id + i}
                  onClick={() => setPickedId(id)}
                  style={{
                    cursor: 'pointer',
                    transform: isPicked ? 'translateY(-12px) rotate(0deg)' : `translateY(0) rotate(${(i - 1) * 4}deg)`,
                    transition: 'transform 0.25s',
                    position: 'relative',
                  }}
                >
                  <SeaCard id={id} w={150} highlight={isPicked} />
                  {isPicked && (
                    <div style={{
                      position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)',
                      background: SEA.gold, border: `2.5px solid ${SEA.ink}`, borderRadius: 999,
                      padding: '4px 12px',
                      fontFamily: '"Anek Bangla", sans-serif', fontSize: 13, fontWeight: 700, color: SEA.ink,
                      boxShadow: '0 4px 8px rgba(0,0,0,0.4)',
                    }}>বেছে নেওয়া</div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          // Compact horizontal thumbnail chips — Guard guess
          <div style={{
            display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap',
            padding: '4px 0 8px',
          }}>
            {options.map((id) => {
              const card = BY_ID[id] || ROSTER[0];
              const isPicked = pickedId === id;
              return (
                <button
                  key={id}
                  onClick={() => setPickedId(id)}
                  style={{
                    appearance: 'none',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 5, padding: '7px 5px 9px',
                    width: 72, flexShrink: 0,
                    background: isPicked ? `rgba(242,201,76,0.25)` : 'rgba(245,232,200,0.55)',
                    border: `2.5px solid ${isPicked ? SEA.gold : SEA.woodDark}`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    position: 'relative',
                    transform: isPicked ? 'translateY(-6px) scale(1.04)' : 'none',
                    boxShadow: isPicked
                      ? `0 8px 20px rgba(242,201,76,0.45), 2px 2px 0 ${SEA.ink}`
                      : `2px 2px 0 ${SEA.woodDark}`,
                    transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s',
                  }}
                >
                  {/* Value badge */}
                  <div style={{
                    position: 'absolute', top: 4, left: 4,
                    width: 20, height: 20, borderRadius: '50%',
                    background: `radial-gradient(circle at 30% 30%, ${SEA.gold} 0%, ${SEA.brass} 60%, ${SEA.brassDark} 100%)`,
                    border: `1.5px solid ${SEA.ink}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: '"Anek Bangla", sans-serif', fontSize: 10, fontWeight: 700, color: SEA.ink,
                  }}>{BN_NUM[card.value]}</div>

                  {/* Illustration thumbnail */}
                  <div style={{
                    width: 52, height: 52, borderRadius: 7,
                    border: `2px solid ${isPicked ? SEA.gold : card.ring}`,
                    overflow: 'hidden',
                    boxShadow: `0 2px 6px rgba(0,0,0,0.4)`,
                    marginTop: 6,
                  }}>
                    <img
                      src={card.img}
                      alt={card.bn}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }}
                    />
                  </div>

                  {/* Bengali name */}
                  <div style={{
                    fontFamily: '"Anek Bangla", sans-serif',
                    fontSize: 11, fontWeight: 700, lineHeight: 1.2,
                    color: isPicked ? SEA.ocean : SEA.ink,
                    textAlign: 'center',
                  }}>{card.bn}</div>

                  {isPicked && (
                    <div style={{
                      position: 'absolute', top: -9, right: -9,
                      width: 20, height: 20, borderRadius: '50%',
                      background: SEA.gold, border: `1.5px solid ${SEA.ink}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: SEA.ink,
                    }}>✓</div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </PopupChrome>
    </PopupBackdrop>
  );
}

// ─── 4. Cannon Blast — Cannoneer destroys a player's card ─────────────────
function CannonBlastPopup({ targetCard, targetName = 'Rakesh', onClose }) {
  const [phase, setPhase] = useState('splash');
  // phases: splash → aim → fire → impact → debris → final
  useEffect(() => {
    const t = [
      setTimeout(() => setPhase('aim'),    900),
      setTimeout(() => setPhase('fire'),   1700),
      setTimeout(() => setPhase('impact'), 2400),
      setTimeout(() => setPhase('debris'), 2700),
      setTimeout(() => setPhase('final'),  4000),
    ];
    return () => t.forEach(clearTimeout);
  }, []);

  const card = BY_ID[targetCard] || ROSTER[0];

  useEffect(() => {
    if (phase !== 'final') return;
    const t = setTimeout(() => onClose?.(), CINEMATIC_HOLD_MS);
    return () => clearTimeout(t);
  }, [phase, onClose]);

  return (
    <PopupBackdrop blackout zIndex={75}>
      <div style={{
        width: '92vw', maxWidth: 1100, height: '78vh', minHeight: 540,
        position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: '"Anek Bangla", sans-serif',
      }}>
        {phase === 'splash' && (
          <div style={{ textAlign: 'center', animation: 'duelSplash 0.9s ease-out forwards' }}>
            <div style={{
              fontSize: 110, fontWeight: 800,
              color: SEA.coral, lineHeight: 1, letterSpacing: 2,
              textShadow: '0 0 40px rgba(232,106,86,0.6), 0 8px 0 #5C1409, 0 12px 24px rgba(0,0,0,0.7)',
            }}>কামান চালক!</div>
            <div style={{ marginTop: 14, fontSize: 22, fontWeight: 600, color: SEA.gold, letterSpacing: 4 }}>কামান দাগ!</div>
          </div>
        )}

        {phase !== 'splash' && (
          <div style={{
            position: 'relative', width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {/* Cannon on the left */}
            <div style={{
              position: 'absolute', left: '8%', top: '50%', transform: 'translateY(-50%)',
              animation: phase === 'aim' ? 'slideInLeft 0.6s ease-out backwards' :
                         phase === 'fire' ? 'cannonRecoil 0.5s ease-out' : 'none',
            }}>
              <CannonRig firing={phase === 'fire' || phase === 'impact'} />
            </div>

            {/* Aim trajectory line */}
            {phase === 'aim' && (
              <svg style={{ position: 'absolute', left: '20%', right: '20%', top: '50%', height: 4, pointerEvents: 'none' }}>
                <line x1="0" y1="2" x2="100%" y2="2" stroke={SEA.gold} strokeWidth="2" strokeDasharray="6 6" opacity="0.55" />
              </svg>
            )}

            {/* Cannonball */}
            {phase === 'fire' && (
              <div style={{
                position: 'absolute', left: '20%', top: '50%', transform: 'translateY(-50%)',
                width: 38, height: 38, borderRadius: '50%',
                background: `radial-gradient(circle at 30% 30%, #555 0%, #1a1a1a 70%, #000 100%)`,
                border: `2px solid #000`,
                boxShadow: '0 0 24px rgba(255,180,80,0.5), inset -4px -4px 8px rgba(0,0,0,0.6)',
                animation: 'cannonball 0.6s linear forwards',
              }} />
            )}

            {/* Target card on the right */}
            <div style={{
              position: 'absolute', right: '14%', top: '50%', transform: 'translateY(-50%)',
              animation: phase === 'aim' ? 'slideInRight 0.6s ease-out backwards' : 'none',
            }}>
              {(phase === 'aim' || phase === 'fire') && (
                <div style={{ position: 'relative' }}>
                  <SeaCardBack w={200} />
                  {/* target reticle */}
                  <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', animation: 'targetPulse 1.2s ease-in-out infinite' }} viewBox="0 0 200 284">
                    <circle cx="100" cy="142" r="60" fill="none" stroke={SEA.red} strokeWidth="3" strokeDasharray="8 4" />
                    <line x1="100" y1="82" x2="100" y2="202" stroke={SEA.red} strokeWidth="2" />
                    <line x1="40" y1="142" x2="160" y2="142" stroke={SEA.red} strokeWidth="2" />
                  </svg>
                </div>
              )}
              {phase === 'impact' && <Blast />}
              {(phase === 'debris' || phase === 'final') && (
                <ExplodedCard cardId={targetCard} w={200} settled={phase === 'final'} />
              )}
            </div>

            {/* Target name label */}
            <div style={{
              position: 'absolute', right: '14%', top: 'calc(50% - 195px)',
              transform: 'translateX(50%)',
              fontFamily: '"Anek Bangla", sans-serif', fontSize: 22, fontWeight: 700,
              color: SEA.cream, textShadow: '0 2px 4px rgba(0,0,0,0.8)',
              animation: 'popupFadeIn 0.5s ease-out',
            }}>{targetName}</div>

            {/* Final caption */}
            {phase === 'final' && (
              <div style={{
                position: 'absolute', left: 0, right: 0, bottom: '8%', textAlign: 'center',
                animation: 'finalPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) backwards',
              }}>
                <div style={{ fontSize: 64, fontWeight: 800, color: SEA.red,
                              textShadow: '0 6px 0 rgba(0,0,0,0.8), 0 0 32px rgba(232,106,86,0.7)', lineHeight: 1.1 }}>
                  ধ্বংস!
                </div>
                <div style={{ marginTop: 8, fontSize: 22, fontWeight: 600, color: SEA.cream, textShadow: '0 2px 4px rgba(0,0,0,0.7)' }}>
                  {targetName} — <span style={{ color: SEA.gold }}>{card.bn}</span> ধ্বংস হল
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </PopupBackdrop>
  );
}

function CannonRig({ firing }) {
  return (
    <div style={{ position: 'relative', width: 220, height: 180 }}>
      <svg viewBox="0 0 220 180" width="220" height="180">
        {/* Wheels */}
        {[50, 160].map(cx => (
          <g key={cx}>
            <circle cx={cx} cy="140" r="28" fill={SEA.woodDark} stroke={SEA.ink} strokeWidth="3" />
            <circle cx={cx} cy="140" r="20" fill="none" stroke={SEA.woodLight} strokeWidth="1.5" />
            <circle cx={cx} cy="140" r="4" fill={SEA.ink} />
            {[0, 60, 120, 180, 240, 300].map(a => {
              const rad = a * Math.PI / 180;
              return <line key={a} x1={cx} y1="140" x2={cx + 24 * Math.cos(rad)} y2={140 + 24 * Math.sin(rad)} stroke={SEA.ink} strokeWidth="2" />;
            })}
          </g>
        ))}
        {/* Carriage body */}
        <path d="M 30 130 L 180 130 L 175 150 L 35 150 Z" fill={SEA.wood} stroke={SEA.ink} strokeWidth="3" />
        {/* Barrel */}
        <defs>
          <linearGradient id="barrel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SEA.gold} />
            <stop offset="50%" stopColor={SEA.brass} />
            <stop offset="100%" stopColor={SEA.brassDark} />
          </linearGradient>
        </defs>
        <rect x="40" y="90" width="150" height="36" rx="6" fill="url(#barrel)" stroke={SEA.ink} strokeWidth="3" />
        <rect x="40" y="90" width="24" height="36" fill={SEA.brassDark} stroke={SEA.ink} strokeWidth="3" />
        <circle cx="52" cy="108" r="4" fill={SEA.ink} />
        <rect x="180" y="86" width="14" height="44" rx="3" fill={SEA.brassDark} stroke={SEA.ink} strokeWidth="3" />
        <ellipse cx="192" cy="108" rx="4" ry="14" fill={SEA.ink} />
      </svg>
      {firing && (
        <div style={{
          position: 'absolute', left: 192, top: 88, width: 90, height: 60,
          animation: 'muzzleFlash 0.4s ease-out forwards', pointerEvents: 'none',
        }}>
          <svg viewBox="0 0 90 60" width="90" height="60">
            <defs>
              <radialGradient id="flash" cx="5%" cy="50%">
                <stop offset="0%" stopColor="#FFF6B8" stopOpacity="1" />
                <stop offset="40%" stopColor="#FFAA3A" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#C84B3A" stopOpacity="0" />
              </radialGradient>
            </defs>
            <ellipse cx="4" cy="30" rx="70" ry="26" fill="url(#flash)" />
            {[0,1,2,3].map(i => (
              <path key={i} d={`M 0 30 L ${30 + i*12} ${18 + (i%2)*8} L ${70 + i*4} ${30 + (i%3)*6} L ${30 + i*12} ${42 - (i%2)*6} Z`}
                    fill="#FFF6B8" opacity={0.7 - i*0.1} />
            ))}
          </svg>
        </div>
      )}
    </div>
  );
}

function Blast() {
  return (
    <div style={{
      position: 'absolute', inset: '-60%',
      animation: 'blastPop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      pointerEvents: 'none',
    }}>
      <svg viewBox="0 0 500 500" width="100%" height="100%">
        <defs>
          <radialGradient id="blastCore" cx="50%" cy="50%">
            <stop offset="0%"  stopColor="#FFF6B8" stopOpacity="1" />
            <stop offset="30%" stopColor="#FFAA3A" stopOpacity="0.95" />
            <stop offset="70%" stopColor="#C84B3A" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#5C1409" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="250" cy="250" r="240" fill="none" stroke="#FFAA3A" strokeWidth="4" opacity="0.6" />
        <circle cx="250" cy="250" r="200" fill="url(#blastCore)" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map(a => {
          const rad = a * Math.PI / 180;
          const r1 = 80, r2 = 230;
          return (
            <path key={a} d={`M ${250 + r1 * Math.cos(rad - 0.15)} ${250 + r1 * Math.sin(rad - 0.15)} L ${250 + r2 * Math.cos(rad)} ${250 + r2 * Math.sin(rad)} L ${250 + r1 * Math.cos(rad + 0.15)} ${250 + r1 * Math.sin(rad + 0.15)} Z`}
                  fill="#FFF6B8" opacity="0.9" />
          );
        })}
        {[...Array(16)].map((_, i) => {
          const a = (i / 16) * 2 * Math.PI + 0.2;
          const r = 250;
          return <circle key={i} cx={250 + r * Math.cos(a)} cy={250 + r * Math.sin(a)} r="4" fill="#FFF6B8" opacity="0.9" />;
        })}
      </svg>
    </div>
  );
}

function ExplodedCard({ cardId, w, settled }) {
  const h = Math.round(w * 1.42);
  const chunks = [
    { clip: 'polygon(0 0, 55% 0, 40% 50%, 0 45%)',          tx: -180, ty: -120, rot: -28 },
    { clip: 'polygon(55% 0, 100% 0, 100% 35%, 70% 55%)',    tx:  180, ty: -120, rot:  30 },
    { clip: 'polygon(0 45%, 40% 50%, 35% 100%, 0 100%)',    tx: -200, ty:  140, rot: -36 },
    { clip: 'polygon(70% 55%, 100% 35%, 100% 100%, 60% 100%)', tx: 200, ty: 140, rot:  40 },
    { clip: 'polygon(40% 50%, 70% 55%, 60% 100%, 35% 100%)', tx:  -10, ty: 220, rot:  8  },
    { clip: 'polygon(35% 32%, 60% 38%, 50% 70%, 30% 60%)',   tx:  60,  ty: -200, rot: 60 },
  ];
  return (
    <div style={{ position: 'relative', width: w, height: h }}>
      <div style={{
        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
        width: w * 1.4, height: h * 1.0, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(80,70,55,0.45) 0%, rgba(40,35,28,0.2) 50%, transparent 80%)',
        animation: 'smokeFade 1.2s ease-out forwards',
        pointerEvents: 'none',
      }} />
      {chunks.map((c, i) => (
        <div key={i} style={{
          position: 'absolute', inset: 0,
          clipPath: c.clip, WebkitClipPath: c.clip,
          animation: `chunkFly${i} 1.1s cubic-bezier(0.16, 0.84, 0.44, 1) forwards`,
        }}>
          <style>{`@keyframes chunkFly${i} {
            0% { transform: translate(0,0) rotate(0deg); opacity: 1; }
            100% { transform: translate(${c.tx}px, ${c.ty}px) rotate(${c.rot}deg); opacity: 0; }
          }`}</style>
          <SeaCard id={cardId} w={w} />
        </div>
      ))}
      <div style={{ position: 'absolute', inset: 0, animation: 'revealFade 0.45s ease-out forwards' }}>
        <SeaCard id={cardId} w={w} highlight />
      </div>
    </div>
  );
}

// ─── Death notice (3s timer) ─────────────────────────────────────────────

const DEATH_POPUP_MS = 3000;
/** Hold on final duel frame before queue advances */
const CINEMATIC_HOLD_MS = 1100;

function DeathPopup({ notice, onDone }) {
  const [progress, setProgress] = useState(1);
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;
    const start = performance.now();
    let raf = 0;
    const tick = (now) => {
      const elapsed = now - start;
      const remaining = Math.max(0, 1 - elapsed / DEATH_POPUP_MS);
      setProgress(remaining);
      if (elapsed >= DEATH_POPUP_MS) {
        if (!doneRef.current) {
          doneRef.current = true;
          onDone?.();
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [notice?.t, onDone]);

  const name = notice?.username || '?';
  const description = notice?.description || (notice?.msg || '').replace(/^💀\s*/, '');

  return (
    <PopupBackdrop zIndex={85}>
      <PopupChrome
        title="সমুদ্রে হারিয়ে গেছেন!"
        subtitle={name}
        width={580}
      >
        <div style={{
          textAlign: 'center', padding: '4px 8px 0',
          fontFamily: '"Anek Bangla", sans-serif',
          fontSize: 48, lineHeight: 1,
        }}>💀</div>

        <div style={{
          marginTop: 16, padding: '14px 16px',
          background: 'rgba(200, 75, 58, 0.12)',
          border: `2px solid ${SEA.coral}`,
          borderRadius: 10,
          fontFamily: '"Anek Bangla", sans-serif',
          fontSize: 18, fontWeight: 500, color: SEA.ink,
          lineHeight: 1.55, textAlign: 'center',
        }}>
          {description}
        </div>

        <div style={{ marginTop: 22 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 8,
            fontFamily: '"Anek Bangla", sans-serif',
            fontSize: 13, fontWeight: 600, color: SEA.inkSoft,
          }}>
            <span>সময় শেষ হচ্ছে…</span>
            <span>{Math.max(0, Math.ceil(progress * (DEATH_POPUP_MS / 1000)))} সেকেন্ড</span>
          </div>
          <div className="sea-death-timer-track">
            <div
              className="sea-death-timer-fill"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      </PopupChrome>
    </PopupBackdrop>
  );
}

// ─── 3b. Swordsman Duel ──────────────────────────────────────────────────

function DuelPopup({ yourCard, theirCard, yourName = 'তুমি', theirName, perspective = 'player', onClose }) {
  // perspective: 'player' (you're in the duel — both revealed) | 'spectator' (only loser revealed)
  // Phases: splash → enter → flip → compare → rip → final
  const [phase, setPhase] = useState('splash');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('enter'), 900);
    const t2 = setTimeout(() => setPhase('flip'), 1500);
    const t3 = setTimeout(() => setPhase('compare'), 2300);
    const t4 = setTimeout(() => setPhase('rip'), 3200);
    const t5 = setTimeout(() => setPhase('final'), 4400);
    return () => [t1, t2, t3, t4, t5].forEach(clearTimeout);
  }, []);

  const yourVal = (BY_ID[yourCard] || ROSTER[0]).value;
  const theirVal = (BY_ID[theirCard] || ROSTER[1]).value;
  const youWin = yourVal > theirVal;
  const tied = yourVal === theirVal;
  const reveal = phase !== 'splash' && phase !== 'enter';
  const showRip = phase === 'rip' || phase === 'final';

  useEffect(() => {
    if (phase !== 'final') return;
    const t = setTimeout(() => onClose?.(), CINEMATIC_HOLD_MS);
    return () => clearTimeout(t);
  }, [phase, onClose]);

  return (
    <PopupBackdrop blackout zIndex={75}>
      <div style={{
        width: '92vw', maxWidth: 1100, height: '78vh', minHeight: 540,
        position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: '"Anek Bangla", sans-serif',
      }}>
        {/* Splash title */}
        {phase === 'splash' && (
          <div style={{
            textAlign: 'center',
            animation: 'duelSplash 0.9s ease-out forwards',
          }}>
            <div style={{
              fontFamily: '"Anek Bangla", sans-serif',
              fontSize: 110, fontWeight: 800,
              color: SEA.red, lineHeight: 1, letterSpacing: 2,
              textShadow: '0 0 40px rgba(232,106,86,0.5), 0 8px 0 #5C1409, 0 12px 24px rgba(0,0,0,0.7)',
            }}>তলোয়ারের লড়াই</div>
            <div style={{
              marginTop: 18, fontSize: 24, fontWeight: 600, color: SEA.gold,
              letterSpacing: 8, textTransform: 'uppercase',
            }}>তলোয়ারের দ্বন্দ</div>
          </div>
        )}

        {/* Card duel scene */}
        {phase !== 'splash' && (
          <div style={{
            position: 'relative', width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40,
          }}>
            {/* Lightning slashes background */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: phase === 'compare' || phase === 'rip' ? 0.4 : 0.15 }}>
              <defs>
                <linearGradient id="duelGlow" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={SEA.gold} stopOpacity="0" />
                  <stop offset="50%" stopColor={SEA.gold} stopOpacity="0.7" />
                  <stop offset="100%" stopColor={SEA.gold} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M 0 60% L 100% 35%" stroke="url(#duelGlow)" strokeWidth="3" />
              <path d="M 0 35% L 100% 60%" stroke="url(#duelGlow)" strokeWidth="3" />
            </svg>

            {/* Your card */}
            <DuelSlot
              cardId={yourCard}
              name={yourName}
              isYou
              revealed={reveal && (perspective === 'player' || !youWin || tied)}
              ripped={showRip && !youWin && !tied}
              winning={phase === 'final' && youWin}
              loser={phase === 'final' && !youWin && !tied}
              enter="left"
              phase={phase}
            />

            {/* VS / Result */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              zIndex: 5,
            }}>
              {phase !== 'final' && (
                <div style={{
                  fontSize: 64, fontWeight: 800, color: SEA.red,
                  textShadow: '0 6px 0 #5C1409, 0 0 24px rgba(232,106,86,0.6)',
                  animation: phase === 'compare' ? 'vsPulse 0.4s ease-in-out 3' : 'none',
                }}>⚔</div>
              )}
              {phase === 'compare' && (
                <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginTop: 8 }}>
                  <ValueChip value={yourVal} winner={youWin} loser={!youWin && !tied} />
                  <span style={{ color: SEA.cream, fontSize: 28, fontWeight: 700 }}>বনাম</span>
                  <ValueChip value={theirVal} winner={!youWin && !tied} loser={youWin} />
                </div>
              )}
              {phase === 'final' && (
                <div style={{
                  fontSize: 56, fontWeight: 800, color: tied ? SEA.gold : (youWin ? SEA.gold : SEA.red),
                  textShadow: '0 6px 0 rgba(0,0,0,0.8), 0 0 24px currentColor',
                  textAlign: 'center', lineHeight: 1.1,
                  animation: 'finalPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                }}>
                  {tied ? 'সমান!' : youWin ? 'বিজয়!' : 'পরাজয়'}
                  <div style={{ fontSize: 18, marginTop: 6, color: SEA.cream, fontWeight: 500, textShadow: '0 2px 4px rgba(0,0,0,0.7)' }}>
                    {tied ? 'কেউ বাদ পড়েনি' : youWin ? `${theirName} বাদ পড়ল` : 'তুমি বাদ পড়েছ'}
                  </div>
                </div>
              )}
            </div>

            {/* Their card */}
            <DuelSlot
              cardId={theirCard}
              name={theirName}
              revealed={reveal && (perspective === 'player' || youWin || tied)}
              ripped={showRip && youWin && !tied}
              winning={phase === 'final' && !youWin && !tied}
              loser={phase === 'final' && youWin}
              enter="right"
              phase={phase}
            />
          </div>
        )}

      </div>
    </PopupBackdrop>
  );
}

function ValueChip({ value, winner, loser }) {
  return (
    <div style={{
      width: 64, height: 64, borderRadius: '50%',
      background: `radial-gradient(circle at 30% 30%, ${SEA.gold} 0%, ${SEA.brass} 55%, ${SEA.brassDark} 100%)`,
      border: `4px solid ${winner ? SEA.gold : loser ? SEA.red : SEA.ink}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Anek Bangla", sans-serif', fontSize: 30, fontWeight: 700, color: SEA.ink,
      boxShadow: winner ? `0 0 24px ${SEA.gold}` : loser ? `0 0 16px ${SEA.red}` : '0 4px 8px rgba(0,0,0,0.5)',
      transform: winner ? 'scale(1.1)' : 'scale(1)',
      transition: 'all 0.4s',
    }}>
      {BN_NUM[value]}
    </div>
  );
}

function DuelSlot({ cardId, name, isYou, revealed, ripped, winning, loser, enter, phase }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
      position: 'relative',
      animation: phase === 'enter' || phase === 'flip' || phase === 'compare' || phase === 'rip' || phase === 'final'
        ? (enter === 'left' ? 'slideInLeft 0.6s ease-out backwards' : 'slideInRight 0.6s ease-out backwards')
        : 'none',
    }}>
      {/* Name label */}
      <div style={{
        fontFamily: '"Anek Bangla", sans-serif', fontSize: 22, fontWeight: 700,
        color: isYou ? SEA.gold : SEA.cream,
        textShadow: '0 2px 4px rgba(0,0,0,0.7)',
        letterSpacing: 0.5,
      }}>
        {isYou ? `${name} (তুমি)` : name}
      </div>

      {/* Card with flip + rip */}
      <div style={{
        position: 'relative', width: 200, height: 284,
        perspective: 1000,
      }}>
        {ripped ? (
          <RippedCard cardId={cardId} w={200} />
        ) : (
          <div style={{
            position: 'relative', width: '100%', height: '100%',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transform: revealed ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              backfaceVisibility: 'hidden',
              filter: winning ? `drop-shadow(0 0 30px ${SEA.gold})` : 'none',
            }}>
              <SeaCardBack w={200} />
            </div>
            <div style={{
              position: 'absolute', inset: 0,
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              filter: winning ? `drop-shadow(0 0 30px ${SEA.gold})` : loser ? `drop-shadow(0 0 16px ${SEA.red})` : 'none',
            }}>
              <SeaCard id={cardId} w={200} highlight={winning} />
            </div>
          </div>
        )}

        {/* "WINNER" sash */}
        {winning && (
          <div style={{
            position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)',
            background: SEA.gold, color: SEA.ink, fontWeight: 800,
            padding: '6px 18px', borderRadius: 999,
            fontFamily: '"Anek Bangla", sans-serif', fontSize: 14, letterSpacing: 1,
            border: `2.5px solid ${SEA.ink}`,
            boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
            whiteSpace: 'nowrap',
            animation: 'winnerPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) backwards',
          }}>বিজয়ী ★</div>
        )}
      </div>
    </div>
  );
}

// Ripped card — two halves that fly apart with rotation
function RippedCard({ cardId, w }) {
  const h = Math.round(w * 1.42);
  return (
    <div style={{ position: 'relative', width: w, height: h }}>
      {/* Left half */}
      <div style={{
        position: 'absolute', left: 0, top: 0, width: w/2 + 6, height: h,
        overflow: 'hidden',
        animation: 'ripLeft 0.9s ease-out forwards',
        transformOrigin: 'right center',
      }}>
        <div style={{ width: w, height: h, position: 'relative' }}>
          <SeaCard id={cardId} w={w} />
          {/* tear edge shadow */}
          <div style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: 6,
            background: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.4) 100%)',
          }} />
        </div>
      </div>
      {/* Right half */}
      <div style={{
        position: 'absolute', left: w/2 - 6, top: 0, width: w/2 + 6, height: h,
        overflow: 'hidden',
        animation: 'ripRight 0.9s ease-out forwards',
        transformOrigin: 'left center',
      }}>
        <div style={{ width: w, height: h, marginLeft: -w/2 + 6, position: 'relative' }}>
          <SeaCard id={cardId} w={w} />
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: 6,
            background: 'linear-gradient(270deg, transparent 0%, rgba(0,0,0,0.4) 100%)',
          }} />
        </div>
      </div>
      {/* Jagged tear flash */}
      <svg style={{ position: 'absolute', left: w/2 - 14, top: 0, width: 28, height: h, pointerEvents: 'none', animation: 'flashFade 0.5s ease-out forwards' }} viewBox={`0 0 28 ${h}`}>
        <path d={`M 14 0 ${[...Array(Math.floor(h/12))].map((_,i) => `L ${10 + (i%2)*8} ${(i+1)*12}`).join(' ')} L 14 ${h}`} stroke={SEA.gold} strokeWidth="3" fill="none" />
      </svg>
      {/* Tear caption */}
      <div style={{
        position: 'absolute', top: h + 12, left: 0, right: 0, textAlign: 'center',
        fontFamily: '"Anek Bangla", sans-serif', fontSize: 18, fontWeight: 700,
        color: SEA.red, textShadow: '0 2px 4px rgba(0,0,0,0.7)',
        animation: 'popupFadeIn 0.6s ease-out 0.5s backwards',
      }}>ছিন্নভিন্ন!</div>
    </div>
  );
}

// ─── 5. Peek Popup — Crew / Deckhand card reveal ──────────────────────────────
function PeekPopup({ cardId, targetName, onClose }) {
  const card = BY_ID[cardId] || ROSTER[0];
  return (
    <PopupBackdrop zIndex={85}>
      <PopupChrome
        title="গোপনে দেখছেন"
        subtitle={`${targetName}-এর তাস`}
        accentCard="👁"
        width={480}
        footer={<PopupButton label="ঠিক আছে!" primary onClick={onClose} />}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, padding: '4px 0 8px' }}>
          <div style={{
            padding: '10px 18px',
            background: `rgba(77,160,176,0.15)`,
            border: `2px dashed ${SEA.teal}`,
            borderRadius: 10,
            fontFamily: '"Anek Bangla", sans-serif',
            fontSize: 14, color: SEA.woodDark, textAlign: 'center', lineHeight: 1.5,
          }}>
            এই তথ্য শুধু আপনিই দেখতে পাচ্ছেন
          </div>
          <div style={{ transform: 'rotate(-2deg)', filter: `drop-shadow(0 0 18px ${SEA.teal})` }}>
            <SeaCard id={cardId} w={170} highlight />
          </div>
          <div style={{
            fontFamily: '"Anek Bangla", sans-serif',
            fontSize: 18, fontWeight: 700, color: SEA.ocean,
          }}>
            {card.bn} — শক্তি {BN_NUM[card.value]}
          </div>
        </div>
      </PopupChrome>
    </PopupBackdrop>
  );
}

// ─── Global animation styles — injected once ──────────────────────────────

(function injectPopupCSS(){
  if (document.getElementById('popup-css')) return;
  const css = `
@keyframes popupFadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes popupScaleIn { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
@keyframes duelSplash {
  0%   { opacity: 0; transform: scale(0.4) rotate(-6deg); }
  60%  { opacity: 1; transform: scale(1.08) rotate(2deg); }
  100% { opacity: 1; transform: scale(1) rotate(0deg); }
}
@keyframes slideInLeft  { from { opacity: 0; transform: translateX(-280px) rotate(-12deg); } to { opacity: 1; transform: translateX(0) rotate(0); } }
@keyframes slideInRight { from { opacity: 0; transform: translateX(280px)  rotate(12deg);  } to { opacity: 1; transform: translateX(0) rotate(0); } }
@keyframes vsPulse   { 0%,100% { transform: scale(1); } 50% { transform: scale(1.35); } }
@keyframes winnerPop { from { opacity: 0; transform: translateX(-50%) scale(0.6); } to { opacity: 1; transform: translateX(-50%) scale(1); } }
@keyframes finalPop  { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: scale(1); } }
@keyframes ripLeft  { 0% { transform: translateX(0) rotate(0); opacity: 1; } 70% { opacity: 1; } 100% { transform: translateX(-260px) rotate(-22deg); opacity: 0; } }
@keyframes ripRight { 0% { transform: translateX(0) rotate(0); opacity: 1; } 70% { opacity: 1; } 100% { transform: translateX(260px)  rotate(22deg);  opacity: 0; } }
@keyframes flashFade { 0% { opacity: 0; } 30% { opacity: 1; } 100% { opacity: 0; } }
@keyframes cannonRecoil { 0% { transform: translateY(-50%) translateX(0); } 30% { transform: translateY(-50%) translateX(-30px); } 100% { transform: translateY(-50%) translateX(0); } }
@keyframes muzzleFlash { 0% { opacity: 0; transform: scaleX(0.4); } 30% { opacity: 1; transform: scaleX(1); } 100% { opacity: 0; transform: scaleX(1.1); } }
@keyframes cannonball  { 0% { transform: translateY(-50%) translateX(0); } 100% { transform: translateY(-50%) translateX(820px); } }
@keyframes targetPulse { 0%,100% { opacity: 0.7; transform: scale(1); } 50% { opacity: 1; transform: scale(1.05); } }
@keyframes blastPop    { 0% { opacity: 0; transform: scale(0.2); } 50% { opacity: 1; transform: scale(1.05); } 100% { opacity: 0.6; transform: scale(1); } }
@keyframes smokeFade   { 0% { opacity: 0; transform: translate(-50%,-50%) scale(0.5); } 30% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%,-50%) scale(1.4); } }
@keyframes revealFade  { 0% { opacity: 1; } 70% { opacity: 1; } 100% { opacity: 0; } }
`;
  const tag = document.createElement('style');
  tag.id = 'popup-css';
  tag.textContent = css;
  document.head.appendChild(tag);
})();

Object.assign(window, {
  PopupBackdrop, PopupChrome, PopupButton,
  PlayerPickerPopup, CardPickerPopup, PeekPopup, DuelPopup, CannonBlastPopup, DeathPopup,
});
