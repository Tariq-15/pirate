// ─────────────────────────────────────────────────────────────────────────────
// AI — simple heuristic player. Runs on the HOST only (host owns state).
// Strategy:
//   • Never play Captain unless forced (mustPlayCaptain) — Captain is high value.
//   • Never play Pirate voluntarily (it eliminates you). If forced to choose
//     between Pirate and something else, play the something else.
//   • If forced to play Pirate (only card left? Captain rule excludes it), do it.
//   • Otherwise play the LOWER-rank card to keep the stronger card in hand
//     (classic Love Letter style heuristic).
//   • Targets: random valid target.
//   • Guard guess: random non-Guard code.
//   • Merchant keep: highest-rank non-Pirate card.
//   • Cannoneer: target self only if forced; otherwise random opponent.
// ─────────────────────────────────────────────────────────────────────────────
const AI = (() => {
  const THINK_MS = 700; // pause so humans can see what just happened

  let scheduled = false;

  const randomOf = arr => arr[Math.floor(Math.random() * arr.length)];

  const pickCardIdx = p => {
    const hand = p.hand;
    if (p.mustPlayCaptain) {
      const i = hand.findIndex(c => c.code === 'CAPTAIN');
      return i >= 0 ? i : 0;
    }
    // Avoid Captain (keep it) and Pirate (kills you)
    const candidates = hand
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => c.code !== 'CAPTAIN' && c.code !== 'PIRATE');
    if (candidates.length === 0) {
      // All cards are Captain or Pirate — prefer Captain over Pirate
      const cap = hand.findIndex(c => c.code === 'CAPTAIN');
      if (cap >= 0) return cap;
      return 0;
    }
    // Lower-rank first → keep the strong card
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
      // Skip Pirate (suicide)
      if (c.code === 'PIRATE') return;
      if (c.rank > bestRank) { bestRank = c.rank; bestIdx = i; }
    });
    return bestIdx;
  };

  // Inspect state; if it's an AI seat's turn, schedule the next action.
  const maybeAct = (state, submit) => {
    if (!state) return;
    if (scheduled) return;
    if (state.phase === Engine.PHASES.LOBBY ||
        state.phase === Engine.PHASES.ROUND_OVER ||
        state.phase === Engine.PHASES.MATCH_OVER) return;

    const cur = state.players[state.turnIndex];
    if (!cur || !cur.isAI) return;

    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      // Re-read latest state from Net
      const S = Net.getState();
      if (!S) return;
      const c = S.players[S.turnIndex];
      if (!c || !c.isAI) return;

      switch (S.phase) {
        case Engine.PHASES.TURN_PLAY: {
          submit({ type: 'PLAY_CARD', cardIdx: pickCardIdx(c) });
          break;
        }
        case Engine.PHASES.NEEDS_TARGET: {
          submit({ type: 'PICK_TARGET', targetId: pickTarget(S) });
          break;
        }
        case Engine.PHASES.NEEDS_GUARD: {
          submit({ type: 'PICK_GUARD', code: pickGuardGuess() });
          break;
        }
        case Engine.PHASES.NEEDS_MERCHANT: {
          submit({ type: 'PICK_MERCHANT', idx: pickMerchantKeep(S) });
          break;
        }
        case Engine.PHASES.PEEKING: {
          submit({ type: 'CLOSE_PEEK' });
          break;
        }
      }
    }, THINK_MS);
  };

  return { maybeAct };
})();
