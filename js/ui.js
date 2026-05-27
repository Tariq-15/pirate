const UI = (() => {
  let isAnimating = false;
  let didAnimateThisTurn = null;  // 'p0' etc — track per-turn so we animate draw once
  let renderedPlayedUid  = null;  // last card uid rendered in submit zone (animate slam once)
  let wasAliveLastFrame = true;
  let settingsReady = false;

  const $ = id => document.getElementById(id);

  function initSettingsUI() {
    if (settingsReady) return;
    settingsReady = true;
    const toggle = $('toggle-card-details');
    const show = localStorage.getItem('pirate.showCardDetails') === '1';
    document.body.classList.toggle('show-card-details', show);
    if (toggle) {
      toggle.checked = show;
      toggle.addEventListener('change', () => {
        const enabled = !!toggle.checked;
        localStorage.setItem('pirate.showCardDetails', enabled ? '1' : '0');
        document.body.classList.toggle('show-card-details', enabled);
      });
    }
  }

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = $('screen-' + id);
    if (el) el.classList.add('active');
  }
  function showModal(id) {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    const el = $('modal-' + id);
    if (el) el.classList.remove('hidden');
  }
  function hideModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  }

  // ── Card HTML ─────────────────────────────────────────────────────────────────
  function cardHTML(card, { clickable = false, idx = -1, disabled = false, isNew = false } = {}) {
    const def = CARD_DB[card.code];
    if (!def) return '';
    const cls = ['card',
      clickable && 'card-clickable',
      disabled  && 'card-disabled',
      isNew     && 'card-new',
    ].filter(Boolean).join(' ');
    const data = idx >= 0 ? `data-idx="${idx}"` : '';
    return `
      <div class="${cls}" ${data}>
        <div class="card-img-wrap">
          <img src="${def.img}" alt="${def.en}" loading="lazy">
          <span class="card-rank-badge">${def.rank}</span>
        </div>
        <div class="card-name-bar">
          <span class="card-name-text">${def.name}</span>
        </div>
        <p class="card-text-bn">${def.text || ''}</p>
      </div>`;
  }

  function backCardHTML() {
    return `
      <div class="card card-back">
        <div class="card-img-wrap">
          <img src="${CARD_BACK}" alt="" loading="lazy">
        </div>
        <div class="card-name-bar"><span class="card-name-text">গোপন</span></div>
      </div>`;
  }

  // ── Animations ────────────────────────────────────────────────────────────────
  function animateDraw(onComplete) {
    const deckEl = $('deck-visual');
    const handEl = $('hand-cards');
    if (!deckEl || !handEl) { onComplete?.(); return; }
    const deckRect = deckEl.getBoundingClientRect();
    const handRect = handEl.getBoundingClientRect();
    if (deckRect.width === 0 || handRect.width === 0) { onComplete?.(); return; }

    isAnimating = true;
    const fly = document.createElement('img');
    fly.src = CARD_BACK;
    fly.alt = '';
    fly.setAttribute('aria-hidden', 'true');
    fly.className = 'fly-card';

    const startX = deckRect.left;
    const startY = deckRect.top;
    Object.assign(fly.style, {
      left: startX + 'px', top: startY + 'px',
      width: deckRect.width + 'px', height: deckRect.height + 'px',
      opacity: '1', transform: 'scale(1) rotateZ(0deg)', transition: 'none',
    });
    document.body.appendChild(fly);

    const destX = handRect.left + handRect.width / 2 - deckRect.width / 2;
    const destY = handRect.top + 16;
    const dx = destX - startX;
    const dy = destY - startY;

    requestAnimationFrame(() => requestAnimationFrame(() => {
      fly.style.transition =
        'transform 0.44s cubic-bezier(0.25,0.46,0.45,0.94), ' +
        'opacity 0.18s ease 0.3s';
      fly.style.transform  = `translate(${dx}px, ${dy}px) scale(0.86) rotateZ(-6deg)`;
      fly.style.opacity    = '0';
    }));

    setTimeout(() => { fly.remove(); isAnimating = false; onComplete?.(); }, 530);
  }

  // ── Renderers ────────────────────────────────────────────────────────────────
  function mySeat(state) {
    if (!state) return null;
    return state.players.find(p => p.clientId === Net.getClientId());
  }

  function isMyTurn(state) {
    if (!state) return false;
    const cur = state.players[state.turnIndex];
    return cur && cur.clientId === Net.getClientId();
  }

  function renderTopBar(state) {
    const cur = state.players[state.turnIndex];
    const aliveCount = state.players.filter(p => p.isAlive).length;
    const inPlay = state.deck.length + aliveCount + (state.burnFaceDown ? 1 : 0);
    const inPlayEl = $('status-in-play-count');
    const turnEl = $('status-turn');
    const lastPlayedEl = $('status-last-played');
    const playerListEl = $('status-player-list');
    if (inPlayEl) inPlayEl.textContent = String(inPlay);
    if (turnEl) turnEl.textContent = cur ? cur.username : '—';
    if (lastPlayedEl) {
      if (state.lastPlayedCard && state.lastPlayedBy) {
        const who = state.players.find(p => p.playerId === state.lastPlayedBy)?.username || 'Unknown';
        const card = CARD_DB[state.lastPlayedCard.code];
        lastPlayedEl.textContent = `${who} • ${card?.en || state.lastPlayedCard.code}`;
      } else {
        lastPlayedEl.textContent = '—';
      }
    }
    if (playerListEl) {
      playerListEl.innerHTML = state.players.map(p => {
        const isCur = p === cur;
        const icon = p.isProtected ? '🛡️' : (p.isAlive ? (p.isAI ? '🤖' : '🏴‍☠️') : '💀');
        const cls = ['status-player-row', isCur ? 'is-current' : '', !p.isAlive ? 'is-dead' : ''].filter(Boolean).join(' ');
        return `<div class="${cls}">
          <span class="status-player-icon">${icon}</span>
          <span class="status-player-name">${p.username}</span>
          <span class="status-player-tokens">${p.tokens}</span>
        </div>`;
      }).join('');
    }

    const counts = {};
    state.players.forEach(p => p.discards.forEach(c => { counts[c.code] = (counts[c.code] || 0) + 1; }));
    state.burnFaceUp.forEach(c => { counts[c.code] = (counts[c.code] || 0) + 1; });
    const lpDiscards = $('lp-discards');
    if (lpDiscards) {
      const entries = Object.entries(counts);
      lpDiscards.innerHTML = entries.length === 0
        ? '<span class="dumped-empty">—</span>'
        : entries.map(([code, count]) => {
            const c = CARD_DB[code];
            if (!c) return '';
            return `<div class="dumped-row">
              <img src="${c.img}" class="dumped-thumb" alt="${c.en}" title="${c.en}">
              <span class="dumped-name">${c.name}</span>
              <span class="dumped-count-badge">${count}</span>
            </div>`;
          }).join('');
    }
  }

  function renderSubmitZone(card) {
    const content = $('submit-content');
    if (!content) return;
    if (!card) {
      content.innerHTML = '<span class="submit-empty">—</span>';
      renderedPlayedUid = null;
      return;
    }
    // Don't re-animate slam if the same card is still shown
    if (renderedPlayedUid === card.uid) return;
    renderedPlayedUid = card.uid;
    content.innerHTML = cardHTML(card);
    const el = content.querySelector('.card');
    if (el) {
      el.getBoundingClientRect();
      el.classList.add('card-slam');
    }
  }

  function renderHand(state) {
    const me = mySeat(state);
    const container = $('hand-cards');
    const label     = $('hand-label');
    const hint      = $('captain-hint');
    if (!container) return;

    if (!me) {
      container.innerHTML = '';
      if (label) label.textContent = 'দর্শক';
      if (hint) hint.style.display = 'none';
      return;
    }

    const myTurn = isMyTurn(state);
    if (label) label.textContent = me.isAlive ? 'Your Cards' : 'You Are Out';

    container.innerHTML = me.hand.map((card, i) => {
      const disabled = !myTurn || !me.isAlive || (me.mustPlayCaptain && card.code !== 'CAPTAIN') ||
                       state.phase !== Engine.PHASES.TURN_PLAY;
      return cardHTML(card, { clickable: myTurn && !disabled, idx: i, disabled });
    }).join('');

    container.querySelectorAll('.card-clickable:not(.card-disabled)').forEach(el =>
      el.addEventListener('click', () => onCardClick(+el.dataset.idx)));

    if (hint) hint.style.display = (myTurn && me.mustPlayCaptain) ? 'block' : 'none';
  }

  function renderDeathPrompt(state) {
    const me = mySeat(state);
    const prompt = $('death-prompt');
    if (!prompt || !me) return;

    const justDied = wasAliveLastFrame && !me.isAlive;
    if (justDied) {
      const death = state.lastDeathNotice;
      prompt.textContent = (death && death.playerId === me.playerId && death.msg)
        ? death.msg
        : 'You were eliminated this round.';
      prompt.classList.remove('hidden');
    } else if (me.isAlive) {
      prompt.classList.add('hidden');
      prompt.textContent = '';
    }

    wasAliveLastFrame = me.isAlive;
  }

  function renderDeck(state) {
    const cnt     = $('deck-count');
    const deckImg = $('deck-img');
    if (cnt)     cnt.textContent = state.deck.length;
    if (deckImg) deckImg.classList.toggle('deck-empty', state.deck.length === 0);

    const fdImg = $('burn-facedown-img');
    if (fdImg) fdImg.classList.toggle('used', !state.burnFaceDown);

    const fuRow = $('burn-face-up');
    if (fuRow) {
      if (state.burnFaceUp.length === 0) fuRow.innerHTML = '';
      else fuRow.innerHTML = state.burnFaceUp.map(c => {
        const def = CARD_DB[c.code];
        return `
          <div class="burn-card-wrap" title="${def.en} — Rank ${def.rank}">
            <img src="${def.img}" class="burn-card-face" alt="${def.en}">
            <span class="burn-card-rank-badge">${def.rank}</span>
          </div>`;
      }).join('');
    }
  }

  function renderLog(state) {
    const list = $('log-list');
    if (!list) return;
    list.innerHTML = (state.log || []).slice(0, 40).map(e => `<li>${e.msg}</li>`).join('');
  }

  function renderMeta(state) {
    const cur = state.players[state.turnIndex];
    const lbl = $('current-player-label');
    const rb  = $('round-badge');
    if (lbl) lbl.textContent = (cur ? cur.username + '-এর টার্ন' : '—');
    if (rb)  rb.textContent  = 'R' + (state.roundNum || 1);
  }

  function updateWaitingOverlay(state) {
    const overlay = $('waiting-overlay');
    const text    = $('waiting-text');
    if (!overlay) return;
    const me = mySeat(state);
    if (!me) { overlay.style.display = 'none'; return; }
    const myTurn = isMyTurn(state);
    if (myTurn || state.phase === Engine.PHASES.LOBBY) {
      overlay.style.display = 'none';
      return;
    }
    overlay.style.display = '';
    const cur = state.players[state.turnIndex];
    if (text) text.textContent = (cur ? cur.username : '?') + '-এর টার্নের অপেক্ষায়…';
  }

  // ── Modals based on phase + ownership ─────────────────────────────────────────
  function renderPhaseModals(state) {
    const myTurn = isMyTurn(state);
    if (!myTurn) {
      // Make sure we close any modal that was previously open
      hideModals();
      return;
    }
    switch (state.phase) {
      case Engine.PHASES.NEEDS_TARGET:
        showTargetModal(state);
        break;
      case Engine.PHASES.NEEDS_GUARD:
        showGuardModal(state);
        break;
      case Engine.PHASES.NEEDS_MERCHANT:
        showMerchantModal(state);
        break;
      case Engine.PHASES.PEEKING:
        showPeekModal(state);
        break;
      default:
        hideModals();
    }
  }

  function showTargetModal(state) {
    const pending = state.pending;
    if (!pending) return;
    const cardDef = CARD_DB[pending.card.code];
    let targetIds = pending.validTargetIds || [];
    let targets = state.players.filter(p => targetIds.includes(p.playerId));
    if (targets.length === 0 && pending.canSelf) {
      targets = [state.players[state.turnIndex]];
    }
    const title = $('target-title');
    if (title) title.textContent = `${cardDef.en} — একজন লক্ষ্য বেছে নিন`;

    const list = $('target-list');
    if (list) {
      list.innerHTML = targets.map(t => {
        const avatar = t.discards.at(-1)
          ? CARD_DB[t.discards.at(-1).code].img
          : CARD_BACK;
        return `
          <button class="target-btn" data-id="${t.playerId}">
            <img src="${avatar}" class="target-avatar" onerror="this.src='${CARD_BACK}'">
            <span>${t.username}${t.isAI ? ' 🤖' : ''}</span>
          </button>`;
      }).join('');
      list.querySelectorAll('.target-btn').forEach(btn =>
        btn.addEventListener('click', () => {
          Net.submit({ type: 'PICK_TARGET', targetId: btn.dataset.id });
        }));
    }
    showModal('target');
  }

  function showGuardModal(state) {
    const pending = state.pending;
    if (!pending) return;
    const target = state.players.find(p => p.playerId === pending.targetId);
    const lbl = $('guard-target-name');
    if (lbl) lbl.textContent = (target?.username || '?') + '-এর কার্ড অনুমান করুন';

    const list = $('guard-card-list');
    if (list) {
      const choices = Object.values(CARD_DB).filter(c => c.code !== 'GUARD');
      list.innerHTML = choices.map(c => `
        <button class="guard-btn" data-code="${c.code}">
          <img src="${c.img}" alt="${c.en}">
          <span>${c.en}</span>
          <span class="guard-rank">${c.rank}</span>
        </button>`).join('');
      list.querySelectorAll('.guard-btn').forEach(btn =>
        btn.addEventListener('click', () => {
          Net.submit({ type: 'PICK_GUARD', code: btn.dataset.code });
        }));
    }
    showModal('guard');
  }

  function showMerchantModal(state) {
    const me = mySeat(state);
    if (!me) return;
    const container = $('merchant-cards');
    if (!container) return;
    container.innerHTML = me.hand.map((card, i) =>
      cardHTML(card, { clickable: true, idx: i })).join('');
    container.querySelectorAll('.card-clickable').forEach(el =>
      el.addEventListener('click', () => {
        Net.submit({ type: 'PICK_MERCHANT', idx: +el.dataset.idx });
      }));
    showModal('merchant');
  }

  function showPeekModal(state) {
    const pending = state.pending;
    if (!pending?.peekedCard) return;
    const target = state.players.find(p => p.playerId === pending.targetId);
    const lbl  = $('peek-player-name');
    const wrap = $('peek-card');
    if (lbl) lbl.textContent = target?.username || '?';
    if (wrap) wrap.innerHTML = cardHTML(pending.peekedCard);

    $('btn-close-peek').onclick = () => {
      Net.submit({ type: 'CLOSE_PEEK' });
    };
    showModal('peek');
  }

  // ── Card click → submit PLAY_CARD ────────────────────────────────────────────
  function onCardClick(idx) {
    if (isAnimating) return;
    const state = Net.getState();
    if (!state) return;
    if (!isMyTurn(state)) return;
    const me = mySeat(state);
    const card = me.hand[idx];
    if (!card) return;
    if (me.mustPlayCaptain && card.code !== 'CAPTAIN') {
      showToast('আপনাকে অবশ্যই ক্যাপ্টেন খেলতে হবে!'); return;
    }
    Net.submit({ type: 'PLAY_CARD', cardIdx: idx });
  }

  // ── Round / match-over screens ───────────────────────────────────────────────
  function renderRoundOver(state) {
    const r = state.roundResults || {};
    const reasonText = r.reason === 'ALPHA'
      ? '⚔️ শেষ জীবিত খেলোয়াড় জিতেছে!'
      : '📦 ডেক শেষ হয়ে গেছে!';
    const winnersHTML = (r.winners || []).map(pid => {
      const p = state.players.find(x => x.playerId === pid);
      return p ? `<span class="winner-chip">${p.username}</span>` : '';
    }).join(' ');

    const scoresHTML = [...state.players].sort((a, b) => b.tokens - a.tokens).map(p => {
      const coins = Array.from({ length: p.tokens },
        () => `<img src="${COIN}" style="width:13px;height:13px;object-fit:contain;margin-right:1px">`
      ).join('');
      return `
        <div class="score-row ${p.tokens >= state.config.winningTokens ? 'score-winning' : ''}">
          <span>${p.username}${p.isAI ? ' 🤖' : ''}</span>
          <span style="display:flex;align-items:center;gap:2px">${coins}<strong>${p.tokens}</strong></span>
        </div>`;
    }).join('');

    $('round-end-reason').innerHTML  = reasonText;
    $('round-end-winners').innerHTML = 'বিজয়ী: ' + (winnersHTML || '—');
    $('round-rogue-bonus').innerHTML = '';
    $('round-scores').innerHTML      = scoresHTML;
    $('round-goal').textContent      = `প্রথমে ${state.config.winningTokens} টোকেন পেলে ম্যাচ জেতা যাবে।`;

    const btn = $('btn-next-round');
    const hint = $('round-host-hint');
    if (Net.amHost()) {
      btn.style.display = '';
      btn.disabled = false;
      btn.onclick = () => Net.submit({ type: 'NEXT_ROUND' });
      if (hint) hint.textContent = '';
    } else {
      btn.style.display = 'none';
      if (hint) hint.textContent = 'হোস্ট পরের রাউন্ড শুরু করবে…';
    }
    showScreen('round-over');
  }

  function renderMatchOver(state) {
    const winner = state.players.find(p => p.playerId === state.matchWinnerId)
      || [...state.players].sort((a, b) => b.tokens - a.tokens)[0];
    $('match-winner-name').textContent = winner.username + ' জিতেছে!';
    $('final-scores').innerHTML = [...state.players].sort((a, b) => b.tokens - a.tokens).map(p => `
      <div class="final-row ${p === winner ? 'final-winner' : ''}">
        <span>${p === winner ? '🏆 ' : ''}${p.username}${p.isAI ? ' 🤖' : ''}</span>
        <span>${p.tokens} টোকেন</span>
      </div>`).join('');

    const btn = $('btn-play-again');
    if (Net.amHost()) {
      btn.style.display = '';
      btn.onclick = () => Net.submit({ type: 'PLAY_AGAIN' });
    } else {
      btn.style.display = 'none';
    }
    showScreen('match-over');
  }

  // ── Room screen ──────────────────────────────────────────────────────────────
  function renderRoom(state) {
    $('room-code-display').textContent = state.roomCode || '— — — —';
    const count = state.players.length;
    $('room-player-count').textContent = count + '/6';

    const seatsEl = $('room-seats');
    seatsEl.innerHTML = state.players.map((p, i) => {
      const isMe = p.clientId === Net.getClientId();
      const isHostSeat = p.clientId === state.hostId;
      const tag = p.isAI ? '🤖 AI' : (isHostSeat ? '👑 হোস্ট' : '🎭 অতিথি');
      const meTag = isMe ? '<span class="seat-me">(আপনি)</span>' : '';
      const removeBtn = Net.amHost() && !isMe
        ? `<button class="seat-remove" data-idx="${i}" title="Remove">✕</button>` : '';
      return `
        <div class="room-seat">
          <span class="seat-num">${i + 1}</span>
          <span class="seat-name">${p.username || '—'}</span>
          <span class="seat-tag">${tag}</span>
          ${meTag}
          ${removeBtn}
        </div>`;
    }).join('') + (count < 6 ? `
      <div class="room-seat seat-empty">
        <span class="seat-num">${count + 1}</span>
        <span class="seat-name">— ফাঁকা —</span>
      </div>` : '');

    seatsEl.querySelectorAll('.seat-remove').forEach(btn =>
      btn.addEventListener('click', () => {
        Net.submit({ type: 'REMOVE_SEAT', seatIdx: +btn.dataset.idx });
      }));

    const startBtn = $('btn-start-game');
    const addAiBtn = $('btn-add-ai');
    if (Net.amHost()) {
      startBtn.style.display = '';
      addAiBtn.style.display = count < 6 ? '' : 'none';
      startBtn.disabled = count < 2;
      $('room-hint').textContent = count < 2
        ? 'কমপক্ষে ২ জন খেলোয়াড় দরকার। শেয়ার লিঙ্ক পাঠান বা AI যোগ করুন।'
        : 'প্রস্তুত? "যাত্রা শুরু" তে ক্লিক করুন!';
    } else {
      startBtn.style.display = 'none';
      addAiBtn.style.display = 'none';
      $('room-hint').textContent = 'হোস্টের অপেক্ষায়…';
    }
  }

  // ── Master state-update handler ──────────────────────────────────────────────
  function onState(state) {
    if (!state) return;
    initSettingsUI();

    // Route to the right screen based on phase
    switch (state.phase) {
      case Engine.PHASES.LOBBY:
        renderRoom(state);
        showScreen('room');
        return;

      case Engine.PHASES.ROUND_OVER:
        renderTopBar(state);
        renderRoundOver(state);
        return;

      case Engine.PHASES.MATCH_OVER:
        renderMatchOver(state);
        return;

      default: {
        showScreen('game');
        renderMeta(state);
        renderTopBar(state);
        renderDeck(state);
        renderLog(state);
        renderDeathPrompt(state);

        // Show submit-zone replay of last played card (persists across turns)
        if (state.lastPlayedCard) {
          renderSubmitZone(state.lastPlayedCard);
        } else {
          renderSubmitZone(null);
        }

        // Animate the draw when a new turn begins, once per turn
        const turnKey = state.roundNum + ':' + state.turnIndex + ':' + state.players[state.turnIndex]?.playerId;
        const isFreshTurn = (state.phase === Engine.PHASES.TURN_PLAY) && (didAnimateThisTurn !== turnKey);
        if (isFreshTurn) {
          didAnimateThisTurn = turnKey;
          const handEl = $('hand-cards');
          if (handEl) handEl.innerHTML = '';
          animateDraw(() => {
            renderHand(state);
            updateWaitingOverlay(state);
            renderPhaseModals(state);
          });
        } else {
          renderHand(state);
          updateWaitingOverlay(state);
          renderPhaseModals(state);
        }
        return;
      }
    }
  }

  // ── Guide ────────────────────────────────────────────────────────────────────
  function buildGuide() {
    const grid = $('guide-grid');
    if (!grid || grid.dataset.built) return;
    grid.dataset.built = '1';
    grid.innerHTML = Object.values(CARD_DB).sort((a, b) => b.rank - a.rank).map(card => `
      <div class="guide-card">
        <div class="guide-img-wrap">
          <img src="${card.img}" alt="${card.en}" loading="lazy">
          <span class="guide-rank-badge">${card.rank}</span>
        </div>
        <div class="guide-card-meta">
          <span class="guide-card-name">${card.en}</span>
          <span class="guide-card-qty">×${card.qty}</span>
        </div>
        <p class="guide-card-text">${card.text}</p>
      </div>`).join('');
  }

  // ── Toast ────────────────────────────────────────────────────────────────────
  function showToast(msg) {
    let toast = $('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('toast-show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('toast-show'), 2600);
  }

  // ── Lobby (pre-room) ─────────────────────────────────────────────────────────
  function initLobby() {
    const nameInput = $('guest-name-input');
    const joinInput = $('join-code-input');
    const errEl     = $('lobby-error');

    // Pre-fill name from localStorage
    nameInput.value = Net.getSavedUsername() || ('Guest ' + Math.floor(Math.random() * 1000));

    const setErr = msg => { if (errEl) errEl.textContent = msg || ''; };

    // Deep link: ?room=ABCD
    const urlParams = new URLSearchParams(location.search);
    const linkedCode = (urlParams.get('room') || '').toUpperCase();
    if (linkedCode) joinInput.value = linkedCode;

    const getName = () => {
      const v = nameInput.value.trim();
      if (!v) { setErr('নাম লিখুন।'); return null; }
      return v;
    };

    $('btn-create-room').onclick = async () => {
      const name = getName(); if (!name) return;
      setErr('');
      try {
        const code = await Net.createRoom(name);
        // Update URL so the host can also share immediately
        const u = new URL(location.href); u.searchParams.set('room', code);
        history.replaceState(null, '', u.toString());
      } catch (e) {
        console.error(e); setErr(e.message || 'রুম তৈরি করতে সমস্যা।');
      }
    };

    $('btn-join-room').onclick = async () => {
      const name = getName(); if (!name) return;
      const code = (joinInput.value || '').trim().toUpperCase();
      if (code.length !== 4) { setErr('৪ অক্ষরের রুম কোড লিখুন।'); return; }
      setErr('');
      try {
        await Net.joinRoom(code, name);
        const u = new URL(location.href); u.searchParams.set('room', code);
        history.replaceState(null, '', u.toString());
      } catch (e) {
        console.error(e); setErr(e.message || 'রুমে যোগ দিতে সমস্যা।');
      }
    };

    // Auto-join if deep link present and name pre-filled
    if (linkedCode && Net.getSavedUsername()) {
      // Don't auto-submit — let user confirm name first. But pre-fill code.
    }
  }

  // ── Room screen wiring ───────────────────────────────────────────────────────
  function initRoomScreen() {
    $('btn-copy-code').onclick = async () => {
      const code = Net.getRoomCode();
      if (!code) return;
      try {
        await navigator.clipboard.writeText(code);
        showToast('রুম কোড কপি হয়েছে: ' + code);
      } catch { showToast(code); }
    };
    $('btn-copy-link').onclick = async () => {
      const code = Net.getRoomCode();
      if (!code) return;
      const url = new URL(location.href);
      url.searchParams.set('room', code);
      try {
        await navigator.clipboard.writeText(url.toString());
        showToast('লিঙ্ক কপি হয়েছে!');
      } catch { showToast(url.toString()); }
    };
    $('btn-add-ai').onclick = () => Net.submit({ type: 'ADD_AI' });
    $('btn-start-game').onclick = () => Net.submit({ type: 'START_GAME' });
    $('btn-leave-room').onclick = async () => {
      await Net.leaveRoom();
      const u = new URL(location.href); u.searchParams.delete('room');
      history.replaceState(null, '', u.toString());
      showScreen('lobby');
    };
  }

  // ── Public API ───────────────────────────────────────────────────────────────
  return {
    showScreen,
    showToast,
    buildGuide,
    onState,
    initLobby,
    initRoomScreen,
  };
})();
