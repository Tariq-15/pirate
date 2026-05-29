// ─────────────────────────────────────────────────────────────────────────────
// Engine — pure state transitions. The host owns the state; clients apply the
// same actions locally on the snapshot they receive. All randomness is the
// host's responsibility (only the host calls startGame / startRound / etc.).
// ─────────────────────────────────────────────────────────────────────────────
const Engine = (() => {
  const PHASES = {
    LOBBY:           'LOBBY',
    TURN_PLAY:       'TURN_PLAY',
    NEEDS_TARGET:    'NEEDS_TARGET',
    NEEDS_GUARD:     'NEEDS_GUARD',
    NEEDS_MERCHANT:  'NEEDS_MERCHANT',
    PEEKING:         'PEEKING',
    ROUND_OVER:      'ROUND_OVER',
    MATCH_OVER:      'MATCH_OVER',
  };

  const shuffle = arr => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const buildDeck = () => {
    const deck = [];
    let uid = 0;
    Object.values(CARD_DB).forEach(def => {
      for (let i = 0; i < def.qty; i++) deck.push({ code: def.code, rank: def.rank, uid: uid++ });
    });
    return deck;
  };

  const addLog = (S, msg, meta = {}) => {
    const turnKey = meta.turnKey ?? `r${S.roundNum}:t${S.turnIndex}`;
    S.log.unshift({ msg, t: Date.now(), turnKey });
    if (S.log.length > 60) S.log.pop();
  };

  const getPlayer  = (S, id) => S.players.find(p => p.playerId === id);
  const getAlive   = S      => S.players.filter(p => p.isAlive);
  const getTargets = (S, id) => S.players.filter(p => p.isAlive && p.playerId !== id && !p.isProtected);

  const roundEndCheck = S => {
    if (getAlive(S).length <= 1)  return { ended: true, reason: 'ALPHA' };
    if (S.deck.length === 0)      return { ended: true, reason: 'OMEGA' };
    return { ended: false };
  };

  const eliminate = (S, pid, info = {}) => {
    const p = getPlayer(S, pid);
    if (!p || !p.isAlive) return;
    p.isAlive = false;
    while (p.hand.length) p.discards.push(p.hand.pop());
    const byName = info.byPlayerId ? (getPlayer(S, info.byPlayerId)?.username || '?') : null;
    const cardName = info.cardCode ? (CARD_DB[info.cardCode]?.name || info.cardCode) : null;
    let msg = `💀 ${p.username} বাদ পড়েছেন।`;
    let description = `${p.username} এই রাউন্ড থেকে বাদ পড়েছেন।`;
    if (info.reason === 'GUARD_GUESS') {
      msg = `💀 ${p.username} ${byName}-এর পাহারাদার অনুমানে (${cardName}) বাদ পড়েছেন।`;
      description = `${byName} পাহারাদার হিসেবে ${cardName} অনুমান করেছিলেন — ${p.username}-এর হাতে ঠিক সেই তাস ছিল, তাই তিনি বাদ পড়েছেন।`;
    } else if (info.reason === 'SWORDSMAN_DUEL') {
      msg = `💀 ${p.username} ${byName}-এর বিরুদ্ধে তলোয়ারের লড়াইয়ে হেরেছেন।`;
      description = `${p.username} ও ${byName}-এর মধ্যে তলোয়ারের লড়াইয়ে ${p.username}-এর তাসের শক্তি কম ছিল, তাই তিনি বাদ পড়েছেন।`;
    } else if (info.reason === 'PIRATE_PLAYED') {
      msg = `💀 ${p.username} জলদস্যু খেলে বাদ পড়েছেন।`;
      description = `${p.username} নিজে জলদস্যু তাস খেলেছেন — নিয়ম অনুযায়ী তিনি সঙ্গে সঙ্গে বাদ পড়েছেন।`;
    } else if (info.reason === 'PIRATE_FORCED_DISCARD' && info.cardCode === 'CANNONEER') {
      msg = `💀 ${p.username} ${byName}-এর কামানদারে জলদস্যু ফেলতে বাধ্য হয়ে বাদ পড়েছেন।`;
      description = `${byName}-এর কামানদার ${p.username}-কে একটি তাস ফেলতে বাধ্য করেছিল — ফেলা তাসটি জলদস্যু ছিল, তাই ${p.username} বাদ পড়েছেন।`;
    } else if (info.reason === 'PIRATE_FORCED_DISCARD' && info.cardCode === 'SAILOR') {
      msg = `💀 ${p.username} ${byName}-এর নাবিক বদলে জলদস্যু পেয়ে বাদ পড়েছেন।`;
      description = `${byName}-এর নাবিক তাস বদলের পর ${p.username}-এর হাতে জলদস্যু এসেছিল — তাই তিনি বাদ পড়েছেন।`;
    } else if (info.reason === 'PIRATE_FORCED_DISCARD') {
      msg = `💀 ${p.username} জলদস্যু ফেলে বাদ পড়েছেন।`;
      description = `${p.username} জলদস্যু তাস ফেলতে বাধ্য হয়েছিলেন — নিয়ম অনুযায়ী তিনি বাদ পড়েছেন।`;
    }
    const notice = {
      playerId: p.playerId,
      username: p.username,
      byPlayerId: info.byPlayerId || null,
      cardCode: info.cardCode || null,
      reason: info.reason || 'ELIMINATED',
      msg,
      description,
      t: Date.now(),
    };
    if (!S.deathNotices) S.deathNotices = [];
    S.deathNotices.push(notice);
    S.lastDeathNotice = notice;
    S.lastEvent = { type: 'PLAYER_ELIMINATED', playerId: p.playerId, t: notice.t };
    addLog(S, `💀 ${p.username} বাদ পড়েছেন!`);
  };

  const drawForPlayer = (S, p) => {
    if (S.deck.length > 0)      { p.hand.push(S.deck.pop()); return; }
    if (S.burnFaceDown)         { p.hand.push(S.burnFaceDown); S.burnFaceDown = null; }
  };

  // Begin a turn: rogue bonus, draw, captain check, set phase to TURN_PLAY.
  const startTurn = S => {
    const p = S.players[S.turnIndex];
    p.isProtected = false;
    p.mustPlayCaptain = false;

    S.rogueAward = null;
    if (p.rogueBonus) {
      p.rogueBonus = false;
      p.tokens++;
      S.rogueAward = p.username;
      addLog(S, `🪙 ${p.username} ছিঁচকে চোর বোনাস পেয়েছেন!`);
    }

    drawForPlayer(S, p);
    const codes = p.hand.map(c => c.code);
    if (codes.includes('CAPTAIN') && (codes.includes('SAILOR') || codes.includes('CANNONEER'))) {
      p.mustPlayCaptain = true;
    }
    addLog(S, `${p.username}-এর টার্ন — ডেক: ${S.deck.length}।`);
    S.phase = PHASES.TURN_PLAY;
    S.pending = null;
    S.lastEvent = { type: 'TURN_START', seat: S.turnIndex, t: Date.now() };
  };

  const advanceTurn = S => {
    const n = S.players.length;
    let next = (S.turnIndex + 1) % n;
    for (let i = 0; i < n; i++) {
      if (S.players[next].isAlive) break;
      next = (next + 1) % n;
    }
    S.turnIndex = next;
  };

  const initRound = S => {
    S.log = [];
    S.rogueAward = null;
    S.lastPlayedCard = null;
    S.lastPlayedBy   = null;
    S.lastDeathNotice = null;
    S.deathNotices = [];
    S.lastCinematic = null;
    S.players.forEach(p => {
      p.hand = []; p.discards = [];
      p.isAlive = true; p.isProtected = false; p.mustPlayCaptain = false;
      p.rogueBonus = false;
    });
    S.deck = shuffle(buildDeck());
    S.burnFaceDown = S.deck.pop();
    S.burnFaceUp = [];
    if (S.players.length === 2) {
      for (let i = 0; i < 3; i++) S.burnFaceUp.push(S.deck.pop());
    }
    S.players.forEach(p => p.hand.push(S.deck.pop()));
    addLog(S, `⚓ রাউন্ড ${S.roundNum} শুরু! ডেক: ${S.deck.length}।`, { turnKey: `r${S.roundNum}:init` });
    startTurn(S);
  };

  // After any action that resolves a turn, check round end + advance.
  const finishTurn = S => {
    const ec = roundEndCheck(S);
    if (ec.ended) {
      resolveRound(S, ec.reason);
      return;
    }
    advanceTurn(S);
    startTurn(S);
  };

  const resolveRound = (S, reason) => {
    const results = { reason, winners: [] };
    if (reason === 'ALPHA') {
      const survivor = getAlive(S)[0];
      if (survivor) { survivor.tokens++; results.winners = [survivor.playerId]; addLog(S, `🏆 ${survivor.username} রাউন্ড জিতেছেন!`, { turnKey: `r${S.roundNum}:end` }); }
    } else {
      const alive = getAlive(S);
      if (alive.length) {
        const maxRank = Math.max(...alive.map(p => p.hand[0]?.rank ?? -1));
        const tops = alive.filter(p => (p.hand[0]?.rank ?? -1) === maxRank);
        tops.forEach(p => { p.tokens++; addLog(S, `🏆 ${p.username} (র‍্যাঙ্ক ${maxRank}) জিতেছেন!`, { turnKey: `r${S.roundNum}:end` }); });
        results.winners = tops.map(p => p.playerId);
      }
    }
    S.roundResults = results;

    const thr = S.config.winningTokens;
    const matchWinner = S.players.find(p => p.tokens >= thr);
    if (matchWinner) {
      S.matchWinnerId = matchWinner.playerId;
      S.phase = PHASES.MATCH_OVER;
    } else {
      S.phase = PHASES.ROUND_OVER;
    }
  };

  // ─── action handlers ────────────────────────────────────────────────────────

  const actPlayCard = (S, action) => {
    if (S.phase !== PHASES.TURN_PLAY) return { error: 'আপনার টার্ন নয়।' };
    const p = S.players[S.turnIndex];
    const card = p.hand[action.cardIdx];
    if (!card) return { error: 'অবৈধ কার্ড।' };
    if (p.mustPlayCaptain && card.code !== 'CAPTAIN') return { error: 'ক্যাপ্টেন খেলতে হবে!' };

    p.hand.splice(action.cardIdx, 1);
    p.discards.push(card);
    S.lastPlayedCard = card;
    S.lastPlayedBy = p.playerId;
    S.lastEvent = { type: 'PLAY_CARD', card, by: p.playerId, t: Date.now() };
    addLog(S, `${p.username} খেলেছেন ${CARD_DB[card.code].name}।`);

    if (card.code === 'PIRATE') {
      eliminate(S, p.playerId, { byPlayerId: p.playerId, cardCode: 'PIRATE', reason: 'PIRATE_PLAYED' });
      finishTurn(S);
      return { ok: true };
    }
    if (card.code === 'SPY') {
      p.isProtected = true;
      addLog(S, `🛡️ ${p.username} এখন সুরক্ষিত।`);
      finishTurn(S);
      return { ok: true };
    }
    if (card.code === 'CAPTAIN') {
      finishTurn(S);
      return { ok: true };
    }
    if (card.code === 'ROGUE') {
      p.rogueBonus = true;
      addLog(S, `🦹 ${p.username} ছিঁচকে চোর খেলেছেন — পরের টার্ন পর্যন্ত বেঁচে থাকলে বোনাস।`);
      finishTurn(S);
      return { ok: true };
    }
    if (card.code === 'MERCHANT') {
      const drawn = [];
      for (let i = 0; i < 2; i++) if (S.deck.length > 0) drawn.push(S.deck.pop());
      p.hand.push(...drawn);
      addLog(S, `${p.username} ${drawn.length}টি কার্ড টেনেছেন।`);
      S.phase = PHASES.NEEDS_MERCHANT;
      S.pending = { card };
      return { ok: true };
    }

    // Targeted cards
    const validTargets = getTargets(S, p.playerId);
    const canSelf = card.code === 'CANNONEER' && validTargets.length === 0;
    if (validTargets.length === 0 && !canSelf) {
      addLog(S, `কোনো বৈধ লক্ষ্য নেই — প্রভাব বাতিল।`);
      finishTurn(S);
      return { ok: true };
    }
    S.phase = PHASES.NEEDS_TARGET;
    S.pending = {
      card,
      validTargetIds: validTargets.map(t => t.playerId),
      canSelf,
    };
    return { ok: true };
  };

  const actPickTarget = (S, action) => {
    if (S.phase !== PHASES.NEEDS_TARGET) return { error: 'ভুল পর্যায়।' };
    const actor = S.players[S.turnIndex];
    const card  = S.pending.card;
    const target = action.targetId ? getPlayer(S, action.targetId) : null;

    if (target && target.isProtected) {
      addLog(S, `লক্ষ্য সুরক্ষিত — প্রভাব বাতিল।`);
      finishTurn(S);
      return { ok: true };
    }

    const cardDef = CARD_DB[card.code];
    if (card.code !== 'CREW') {
      const tgtName = target?.username || actor.username;
      addLog(S, `🎯 ${actor.username} → ${tgtName} (${cardDef?.name || card.code})`);
    }

    switch (card.code) {
      case 'GUARD':
        S.phase = PHASES.NEEDS_GUARD;
        S.pending = { card, targetId: action.targetId };
        return { ok: true };

      case 'CREW': {
        if (!target?.hand[0]) { finishTurn(S); return { ok: true }; }
        const peeked = target.hand[0];
        addLog(S, `👁️ ${actor.username} ক্রু ব্যবহার করেছেন।`);
        S.phase = PHASES.PEEKING;
        S.pending = { card, targetId: target.playerId, peekedCard: { ...peeked } };
        return { ok: true };
      }

      case 'CANNONEER': {
        const tgt = target || actor;
        const dropped = tgt.hand.splice(0, 1)[0];
        if (!dropped) { finishTurn(S); return { ok: true }; }
        tgt.discards.push(dropped);
        addLog(S, `💥 ${tgt.username}-কে ফেলতে হয়েছে: ${CARD_DB[dropped.code].name}।`);
        S.lastCinematic = {
          type: 'CANNONEER_BLAST',
          targetId: tgt.playerId,
          targetName: tgt.username,
          droppedCode: dropped.code,
          t: Date.now(),
        };
        if (dropped.code === 'PIRATE') {
          eliminate(S, tgt.playerId, { byPlayerId: actor.playerId, cardCode: 'CANNONEER', reason: 'PIRATE_FORCED_DISCARD' });
        } else {
          drawForPlayer(S, tgt);
          S.lastEvent = { type: 'DRAW_CARD', playerId: tgt.playerId, t: Date.now() };
        }
        finishTurn(S);
        return { ok: true };
      }

      case 'SWORDSMAN': {
        if (!target) { finishTurn(S); return { ok: true }; }
        const attackerCard = actor.hand[0];
        const targetCard = target.hand[0];
        const aRank = attackerCard?.rank ?? -1;
        const tRank = targetCard?.rank ?? -1;
        const aName = CARD_DB[attackerCard?.code]?.name || '?';
        const tName = CARD_DB[targetCard?.code]?.name || '?';
        addLog(S, `⚔️ ${actor.username} (${aName}, শক্তি ${aRank}) বনাম ${target.username} (${tName}, শক্তি ${tRank})`);
        const tied = aRank === tRank;
        if (tied) addLog(S, 'টাই — কেউ বাদ নয়।');
        S.lastCinematic = {
          type: 'SWORDSMAN_DUEL',
          attackerId: actor.playerId,
          attackerName: actor.username,
          targetId: target.playerId,
          targetName: target.username,
          attackerCardCode: attackerCard?.code || null,
          targetCardCode: targetCard?.code || null,
          attackerRank: aRank,
          targetRank: tRank,
          tied,
          t: Date.now(),
        };
        if (!tied) {
          eliminate(S, aRank < tRank ? actor.playerId : target.playerId, {
            byPlayerId: aRank < tRank ? target.playerId : actor.playerId,
            cardCode: 'SWORDSMAN',
            reason: 'SWORDSMAN_DUEL',
          });
        }
        finishTurn(S);
        return { ok: true };
      }

      case 'SAILOR': {
        if (!target) { finishTurn(S); return { ok: true }; }
        [actor.hand[0], target.hand[0]] = [target.hand[0], actor.hand[0]];
        const aAfter = CARD_DB[actor.hand[0]?.code]?.name || '?';
        const tAfter = CARD_DB[target.hand[0]?.code]?.name || '?';
        addLog(S, `🔄 ${actor.username} ${target.username}-এর সাথে বদল করেছেন — এখন ${actor.username}: ${aAfter}, ${target.username}: ${tAfter}`);
        for (const pid of [actor.playerId, target.playerId]) {
          const pp = getPlayer(S, pid);
          if (pp.hand[0]?.code === 'PIRATE') {
            pp.discards.push(pp.hand.shift());
            addLog(S, `${pp.username} জলদস্যু পেয়েছেন!`);
            eliminate(S, pp.playerId, { byPlayerId: actor.playerId, cardCode: 'SAILOR', reason: 'PIRATE_FORCED_DISCARD' });
          }
        }
        finishTurn(S);
        return { ok: true };
      }

      default:
        finishTurn(S);
        return { ok: true };
    }
  };

  const actPickGuard = (S, action) => {
    if (S.phase !== PHASES.NEEDS_GUARD) return { error: 'ভুল পর্যায়।' };
    const actor  = S.players[S.turnIndex];
    const target = getPlayer(S, S.pending.targetId);
    if (!target?.isAlive || !target.hand[0]) {
      addLog(S, 'পাহারাদার: লক্ষ্য অনুপলব্ধ।');
      finishTurn(S);
      return { ok: true };
    }
    const hit = target.hand[0].code === action.code;
    if (hit) {
      addLog(S, `🎯 ${actor.username} অনুমান করেছেন ${CARD_DB[action.code].name} — সঠিক! ${target.username} বাদ!`);
      eliminate(S, target.playerId, {
        byPlayerId: actor.playerId,
        cardCode: action.code,
        reason: 'GUARD_GUESS',
      });
    } else {
      addLog(S, `❌ ${actor.username} অনুমান করেছেন ${CARD_DB[action.code].name} — ভুল!`);
    }
    finishTurn(S);
    return { ok: true };
  };

  const actPickMerchant = (S, action) => {
    if (S.phase !== PHASES.NEEDS_MERCHANT) return { error: 'ভুল পর্যায়।' };
    const p = S.players[S.turnIndex];
    const kept = p.hand[action.idx];
    if (!kept) return { error: 'অবৈধ নির্বাচন।' };
    const rest = p.hand.filter((_, i) => i !== action.idx);
    p.hand = [kept];
    rest.forEach(c => S.deck.unshift(c));
    addLog(S, `🪙 ${p.username} বণিকের পছন্দ সম্পন্ন করেছেন।`);
    finishTurn(S);
    return { ok: true };
  };

  const actClosePeek = S => {
    if (S.phase !== PHASES.PEEKING) return { error: 'ভুল পর্যায়।' };
    const actor = S.players[S.turnIndex];
    const pending = S.pending;
    if (pending?.peekedCard && pending.targetId) addLog(S, `✓ ${actor.username} দেখা শেষ করেছেন।`);
    finishTurn(S);
    return { ok: true };
  };

  const actStartGame = S => {
    if (S.phase !== PHASES.LOBBY) return { error: 'ইতিমধ্যে শুরু হয়েছে।' };
    const occupied = S.players.filter(p => p.username);
    if (occupied.length < 2) return { error: 'কমপক্ষে ২ জন খেলোয়াড় দরকার।' };
    // Compact to occupied seats only
    S.players = occupied;
    S.players.forEach((p, i) => { p.playerId = 'p' + i; });
    const n = S.players.length;
    S.config = { winningTokens: { 2: 6, 3: 5, 4: 4, 5: 3, 6: 3 }[n] };
    S.turnIndex = 0;
    S.roundNum = 1;
    initRound(S);
    return { ok: true };
  };

  const actNextRound = S => {
    if (S.phase !== PHASES.ROUND_OVER) return { error: 'ভুল পর্যায়।' };
    S.roundNum++;
    const winners = S.roundResults?.winners || [];
    const firstId = winners[0];
    if (firstId) {
      const idx = S.players.findIndex(p => p.playerId === firstId);
      if (idx >= 0) S.turnIndex = idx;
    }
    S.roundResults = null;
    initRound(S);
    return { ok: true };
  };

  const actPlayAgain = S => {
    if (S.phase !== PHASES.MATCH_OVER) return { error: 'ভুল পর্যায়।' };
    S.players.forEach(p => { p.tokens = 0; });
    S.roundNum = 1;
    S.matchWinnerId = null;
    S.roundResults = null;
    S.turnIndex = 0;
    initRound(S);
    return { ok: true };
  };

  // ─── lobby actions ──────────────────────────────────────────────────────────

  const actJoin = (S, action) => {
    // Already seated → silent resume (handles refresh & reconnect)
    if (S.players.find(p => p.clientId === action.clientId)) return { ok: true };
    if (S.phase !== PHASES.LOBBY) return { error: 'খেলা চলছে।' };
    // Fill empty seat first
    const empty = S.players.findIndex(p => !p.clientId && !p.isAI && !p.username);
    if (empty >= 0) {
      S.players[empty] = {
        ...S.players[empty],
        clientId: action.clientId,
        username: action.username,
        isAI: false,
      };
      return { ok: true };
    }
    if (S.players.length >= 6) return { error: 'রুম পূর্ণ।' };
    S.players.push({
      playerId: 'p' + S.players.length,
      username: action.username,
      clientId: action.clientId,
      isAI: false,
      hand: [], discards: [],
      isAlive: true, isProtected: false,
      tokens: 0, mustPlayCaptain: false, rogueBonus: false,
    });
    return { ok: true };
  };

  const actLeave = (S, action) => {
    if (S.phase !== PHASES.LOBBY) {
      // Mid-game: leave seat as ghost (player gone). Don't remove, game continues.
      const p = S.players.find(x => x.clientId === action.clientId);
      if (p) p.clientId = null;
      return { ok: true };
    }
    S.players = S.players.filter(p => p.clientId !== action.clientId);
    S.players.forEach((p, i) => { p.playerId = 'p' + i; });
    return { ok: true };
  };

  const actAddAI = (S, action) => {
    if (S.phase !== PHASES.LOBBY) return { error: 'ইতিমধ্যে শুরু হয়েছে।' };
    if (S.players.length >= 6) return { error: 'রুম পূর্ণ।' };
    const aiNames = ['Bot Blackbeard', 'Bot Anne', 'Bot Calico', 'Bot Morgan', 'Bot Drake'];
    const used = new Set(S.players.map(p => p.username));
    const name = aiNames.find(n => !used.has(n)) || ('Bot ' + S.players.length);
    S.players.push({
      playerId: 'p' + S.players.length,
      username: action.name || name,
      clientId: null,
      isAI: true,
      hand: [], discards: [],
      isAlive: true, isProtected: false,
      tokens: 0, mustPlayCaptain: false, rogueBonus: false,
    });
    return { ok: true };
  };

  const actRemoveSeat = (S, action) => {
    if (S.phase !== PHASES.LOBBY) return { error: 'ইতিমধ্যে শুরু হয়েছে।' };
    S.players = S.players.filter((_, i) => i !== action.seatIdx);
    S.players.forEach((p, i) => { p.playerId = 'p' + i; });
    return { ok: true };
  };

  // ─── public API ─────────────────────────────────────────────────────────────

  const HANDLERS = {
    JOIN:          actJoin,
    LEAVE:         actLeave,
    ADD_AI:        actAddAI,
    REMOVE_SEAT:   actRemoveSeat,
    START_GAME:    actStartGame,
    PLAY_CARD:     actPlayCard,
    PICK_TARGET:   actPickTarget,
    PICK_GUARD:    actPickGuard,
    PICK_MERCHANT: actPickMerchant,
    CLOSE_PEEK:    actClosePeek,
    NEXT_ROUND:    actNextRound,
    PLAY_AGAIN:    actPlayAgain,
  };

  return {
    PHASES,

    // Create a brand-new lobby state for a fresh room.
    newRoom(hostClientId) {
      return {
        roomCode:   null,
        hostId:     hostClientId,
        phase:      PHASES.LOBBY,
        config:     {},
        players:    [],
        deck:       [],
        burnFaceDown: null,
        burnFaceUp: [],
        turnIndex:  0,
        roundNum:   0,
        pending:    null,
        log:        [],
        rogueAward: null,
        roundResults: null,
        matchWinnerId: null,
        lastPlayedCard: null,
        lastPlayedBy:   null,
        lastDeathNotice: null,
        deathNotices: [],
        lastCinematic: null,
        lastEvent:  null,
        updatedAt:  Date.now(),
      };
    },

    applyAction(state, action, actorClientId) {
      const handler = HANDLERS[action.type];
      if (!handler) return { error: 'অজানা কাজ: ' + action.type };
      // Authorization: certain actions are host-only
      const HOST_ONLY = new Set(['ADD_AI', 'REMOVE_SEAT', 'START_GAME', 'NEXT_ROUND', 'PLAY_AGAIN']);
      if (HOST_ONLY.has(action.type) && actorClientId !== state.hostId) {
        return { error: 'শুধু হোস্ট।' };
      }
      // Turn-only: actor must own the current-turn seat
      const TURN_ONLY = new Set(['PLAY_CARD', 'PICK_TARGET', 'PICK_GUARD', 'PICK_MERCHANT', 'CLOSE_PEEK']);
      if (TURN_ONLY.has(action.type)) {
        const cur = state.players[state.turnIndex];
        if (!cur) return { error: 'বর্তমান খেলোয়াড় নেই।' };
        const isSeatOwner = cur.clientId === actorClientId || (cur.isAI && state.hostId === actorClientId);
        if (!isSeatOwner) return { error: 'আপনার টার্ন নয়।' };
      }
      const res = handler(state, action);
      if (!res.error) state.updatedAt = Date.now();
      return res;
    },

    // Helpers (read-only)
    currentPlayer: S => S.players[S.turnIndex],
    isCurrentSeat: (S, clientId) => {
      const cur = S.players[S.turnIndex];
      return cur && cur.clientId === clientId;
    },
    isHost: (S, clientId) => S.hostId === clientId,
    roundEndCheck,
  };
})();
