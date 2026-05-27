// ─────────────────────────────────────────────────────────────────────────────
// Net — Supabase room sync.
//
// Design:
//   • Each room is one row in `rooms` keyed by a 4-digit numeric code.
//   • The room's full game state lives in `rooms.state` (jsonb).
//   • State changes are pushed via Postgres realtime (postgres_changes).
//   • Action submission goes through the realtime broadcast channel `room:<code>`.
//     Non-host clients broadcast actions; the HOST applies them to state and
//     writes the updated state back to the DB.
//   • This means at any time exactly one client (the host) is authoritative.
//   • Host disconnect is currently not migrated — out of scope for v1.
// ─────────────────────────────────────────────────────────────────────────────
const Net = (() => {
  let clientId   = null;
  let username   = '';
  let roomCode   = null;
  let isHost     = false;
  let channel    = null;
  let state      = null;
  let onUpdate   = null;
  let actionsLog = []; // recent action ids we've applied (host) for dedupe

  // ── Identity ────────────────────────────────────────────────────────────────
  const getOrCreateClientId = () => {
    let id = localStorage.getItem('pirate_client_id');
    if (!id) {
      id = (crypto?.randomUUID?.() || ('c' + Math.random().toString(36).slice(2) + Date.now()));
      localStorage.setItem('pirate_client_id', id);
    }
    return id;
  };

  const randomCode = () => String(Math.floor(1000 + Math.random() * 9000));

  const normalizeRoomCode = raw => {
    const digits = String(raw || '').replace(/\D/g, '');
    return /^\d{4}$/.test(digits) ? digits : null;
  };

  // ── DB helpers ──────────────────────────────────────────────────────────────
  const fetchRoom = async code => {
    const { data, error } = await sb.from('rooms').select('*').eq('code', code).maybeSingle();
    if (error) throw error;
    return data;
  };

  const writeState = async (code, newState) => {
    const { error } = await sb
      .from('rooms')
      .update({ state: newState, updated_at: new Date().toISOString() })
      .eq('code', code);
    if (error) console.error('writeState failed', error);
  };

  // ── Channel ─────────────────────────────────────────────────────────────────
  const subscribeChannel = code => {
    channel = sb.channel('room:' + code, {
      config: { broadcast: { ack: false, self: false } },
    });

    // Listen for state row changes
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'rooms', filter: 'code=eq.' + code },
      payload => {
        const newState = payload.new?.state;
        if (newState) {
          state = newState;
          onUpdate?.(state);
        }
      }
    );

    // Host listens for action broadcasts
    channel.on('broadcast', { event: 'action' }, ({ payload }) => {
      if (!isHost || !payload) return;
      if (actionsLog.includes(payload.actionId)) return;
      actionsLog.push(payload.actionId);
      if (actionsLog.length > 100) actionsLog.shift();
      applyAndPublish(payload.action, payload.clientId);
    });

    return new Promise(resolve => {
      channel.subscribe(status => {
        if (status === 'SUBSCRIBED') resolve();
      });
    });
  };

  // Host: apply action and write back
  const applyAndPublish = async (action, actorClientId) => {
    if (!isHost) return;
    const res = Engine.applyAction(state, action, actorClientId);
    if (res.error) {
      console.warn('Action rejected:', res.error, action);
      // Surface error to the local actor only (host)
      if (actorClientId === clientId && window.UI?.showToast) {
        UI.showToast(res.error);
      }
      return;
    }
    await writeState(roomCode, state);
    onUpdate?.(state);
    // Schedule AI if it's an AI's turn
    AI?.maybeAct?.(state, submitAction);
  };

  // Anyone: submit an action. If host → apply locally. Else → broadcast to host.
  const submitAction = async action => {
    const actionId = (crypto?.randomUUID?.() || (Date.now() + '-' + Math.random()));
    if (isHost) {
      actionsLog.push(actionId);
      await applyAndPublish(action, clientId);
    } else {
      await channel.send({
        type: 'broadcast',
        event: 'action',
        payload: { action, clientId, actionId },
      });
    }
  };

  // ── Public API ──────────────────────────────────────────────────────────────
  return {
    init({ onStateUpdate }) {
      clientId = getOrCreateClientId();
      onUpdate = onStateUpdate;
    },

    getClientId: () => clientId,
    getUsername: () => username,
    getRoomCode: () => roomCode,
    getState:    () => state,
    amHost:      () => isHost,
    submit:      submitAction,

    setUsername(name) {
      username = name;
      localStorage.setItem('pirate_username', name);
    },
    getSavedUsername: () => localStorage.getItem('pirate_username') || '',

    // Host creates a new room
    async createRoom(name) {
      username = name;
      localStorage.setItem('pirate_username', name);
      isHost = true;

      // Try a few codes in case of collision
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = randomCode();
        state = Engine.newRoom(clientId);
        state.roomCode = code;
        // Add host as first seat
        Engine.applyAction(state, { type: 'JOIN', clientId, username: name }, clientId);
        const { error } = await sb.from('rooms').insert({
          code,
          state,
          host_id: clientId,
        });
        if (!error) {
          roomCode = code;
          await subscribeChannel(code);
          onUpdate?.(state);
          return code;
        }
        // 23505 = unique violation → try a fresh code
        if (error.code !== '23505') throw error;
      }
      throw new Error('Could not allocate a room code, please retry.');
    },

    // Player joins existing room
    async joinRoom(code, name) {
      username = name;
      localStorage.setItem('pirate_username', name);
      code = normalizeRoomCode(code);
      if (!code) throw new Error('৪ সংখ্যার রুম কোড লিখুন।');
      const row = await fetchRoom(code);
      if (!row) throw new Error('Room not found: ' + code);
      isHost = row.host_id === clientId;
      roomCode = code;
      state = row.state;
      await subscribeChannel(code);

      // Submit JOIN through the normal action flow (so host writes state back)
      await submitAction({ type: 'JOIN', clientId, username: name });
      onUpdate?.(state);
    },

    async leaveRoom() {
      if (!roomCode) return;
      try {
        await submitAction({ type: 'LEAVE', clientId });
      } catch (e) { /* ignore */ }
      await channel?.unsubscribe();
      channel = null;
      state = null;
      roomCode = null;
      isHost = false;
    },
  };
})();
