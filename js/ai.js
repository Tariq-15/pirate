// ─────────────────────────────────────────────────────────────────────────────
// AI — simple heuristic player. Runs on the HOST only (host owns state).
// ─────────────────────────────────────────────────────────────────────────────
const AI = (() => {
  const DELAY_DRAW_MS = 1000;
  const DELAY_SHOW_PLAY_MS = 1000;
  const DELAY_TASK_MS = 1000;
  const DELAY_PEEK_MS = 1000;

  let scheduled = false;

  const randomOf = arr => arr[Math.floor(Math.random() * arr.length)];

  const aiDelay = S => {
    const cur = S.players[S.turnIndex];
    if (!cur?.isAI) return 700;
    switch (S.phase) {
      case Engine.PHASES.TURN_PLAY:
        return DELAY_DRAW_MS;
      case Engine.PHASES.NEEDS_TARGET:
      case Engine.PHASES.NEEDS_GUARD:
      case Engine.PHASES.NEEDS_MERCHANT:
        return DELAY_SHOW_PLAY_MS + DELAY_TASK_MS;
      case Engine.PHASES.PEEKING:
        return DELAY_PEEK_MS;
      default:
        return 700;
    }
  };

  const pickCardIdx = p => {
    const hand = p.hand;
    if (p.mustPlayCaptain) {
      const i = hand.findIndex(c => c.code === 'CAPTAIN');
      return i >= 0 ? i : 0;
    }
    const candidates = hand
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => c.code !== 'CAPTAIN' && c.code !== 'PIRATE');
    if (candidates.length === 0) {
      const cap = hand.findIndex(c => c.code === 'CAPTAIN');
      if (cap >= 0) return cap;
      return 0;
    }
    candidates.sort((a, b) => a.c.rank - b.c.rank);
    return candidates[0].i;
  };

  const pickTarget = (state) => {
    const pending = state.pending;
    if (!pending) return null;
    const ids = pending.validTargetIds || [];
    if (ids.length > 0) return randomOf(ids);
    if (pending.canSelf) return state.players[state.turnIndex].playerId;
    return null;
  };

  const pickGuardGuess = () => {
    const codes = Object.values(CARD_DB)
      .filter(c => c.code !== 'GUARD')
      .map(c => c.code);
    return randomOf(codes);
  };

  const pickMerchantKeep = state => {
    const p = state.players[state.turnIndex];
    let bestIdx = 0;
    let bestRank = -1;
    p.hand.forEach((c, i) => {
      if (c.code === 'PIRATE') return;
      if (c.rank > bestRank) { bestRank = c.rank; bestIdx = i; }
    });
    return bestIdx;
  };

  const maybeAct = (state, submit) => {
    if (!state) return;
    if (scheduled) return;
    if (state.phase === Engine.PHASES.LOBBY ||
        state.phase === Engine.PHASES.ROUND_OVER ||
        state.phase === Engine.PHASES.MATCH_OVER) return;

    const cur = state.players[state.turnIndex];
    if (!cur || !cur.isAI) return;

    scheduled = true;
    const delay = aiDelay(state);
    setTimeout(() => {
      scheduled = false;
      const S = Net.getState();
      if (!S) return;
      const c = S.players[S.turnIndex];
      if (!c || !c.isAI) return;

      switch (S.phase) {
        case Engine.PHASES.TURN_PLAY:
          submit({ type: 'PLAY_CARD', cardIdx: pickCardIdx(c) });
          break;
        case Engine.PHASES.NEEDS_TARGET:
          submit({ type: 'PICK_TARGET', targetId: pickTarget(S) });
          break;
        case Engine.PHASES.NEEDS_GUARD:
          submit({ type: 'PICK_GUARD', code: pickGuardGuess() });
          break;
        case Engine.PHASES.NEEDS_MERCHANT:
          submit({ type: 'PICK_MERCHANT', idx: pickMerchantKeep(S) });
          break;
        case Engine.PHASES.PEEKING:
          submit({ type: 'CLOSE_PEEK' });
          break;
      }
    }, delay);
  };

  return { maybeAct };
})();
