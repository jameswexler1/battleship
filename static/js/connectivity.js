// ./static/js/connectivity.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { config } from './config.js';
import { allShipsPlaced, selectNextShip } from './board.js';

let myId = localStorage.getItem('battleship-peer-id');
if (!myId) {
  myId = crypto.randomUUID();
  localStorage.setItem('battleship-peer-id', myId);
}
export const selfId = myId;

export function initConnectivity(
  generateBtn, connectBtn, opponentInput, myIdEl,
  statusEl, controlsDiv, readyBtn, rematchBtn,
  state, startGame, resetGame, handleMove, handleResult
) {
  const supabase = createClient(config.supabaseUrl, config.supabaseKey);
  myIdEl.textContent = myId.slice(0, 8) + '…';

  let channel = null;

  const toggleConnectUI = (showIt) => {
    connectBtn.style.display    = showIt ? 'inline-block' : 'none';
    opponentInput.style.display = showIt ? 'inline-block' : 'none';
  };

  const setStatus = (msg, type = '') => {
    statusEl.textContent = msg;
    statusEl.dataset.statusType = type;
  };

  const leaveChannel = () => {
    if (channel) { supabase.removeChannel(channel); channel = null; }
  };

  const joinRoom = (roomId) => {
    leaveChannel();
    state.roomId = roomId;
    const loaded = state.loadAndApply(roomId);
    setStatus('Status: Connecting…', 'waiting');

    channel = supabase.channel(`battleship-v2-${roomId}`, {
      config: {
        broadcast: { self: false, ack: false },
        presence:  { key: myId },
      },
    });

    state.sendReady   = (data) => channel.send({ type: 'broadcast', event: 'ready',   payload: data });
    state.sendMove    = (data) => channel.send({ type: 'broadcast', event: 'move',    payload: data });
    state.sendResult  = (data) => channel.send({ type: 'broadcast', event: 'result',  payload: data });
    state.sendRematch = (data) => channel.send({ type: 'broadcast', event: 'rematch', payload: data });
    state.sendChat    = (msg)  => channel.send({ type: 'broadcast', event: 'chat',    payload: { msg } });

    state.room = {
      getPeers: () => {
        const presence = channel.presenceState();
        return Object.fromEntries(
          Object.keys(presence).filter(k => k !== myId).map(k => [k, true])
        );
      },
      leave: leaveChannel,
    };

    channel.on('presence', { event: 'sync' }, () => {
      const peers = Object.keys(channel.presenceState()).filter(k => k !== myId);
      if (peers.length > 0 && !state.opponentConnected) handlePeerArrived(peers[0]);
    });

    channel.on('presence', { event: 'join' }, ({ key }) => {
      if (key === myId) return;
      const peers = Object.keys(channel.presenceState()).filter(k => k !== myId);
      if (peers.length > 1) { setStatus('Error: Room is full (2 players max).', 'error'); return; }
      handlePeerArrived(key);
    });

    channel.on('presence', { event: 'leave' }, ({ key }) => {
      if (key === myId) return;
      state.opponentConnected = false;
      setStatus('⚠ Opponent disconnected — waiting for reconnect…', 'warning');
      connectBtn.textContent = 'Reconnect';
      toggleConnectUI(true);
    });

    channel.on('broadcast', { event: 'ready' },   ({ payload }) => {
      state.opponentReady = true;
      setStatus('Status: Opponent is ready!', 'good');
      if (state.ready) startGame();
      state.save();
    });
    channel.on('broadcast', { event: 'move' },    ({ payload }) => { if (state.gameStarted) handleMove(payload.x, payload.y); });
    channel.on('broadcast', { event: 'result' },  ({ payload }) => { if (state.gameStarted) handleResult(payload); });
    channel.on('broadcast', { event: 'rematch' }, ({ payload }) => {
      state.opponentRematchReady = true;
      setStatus('Opponent wants a rematch!', 'good');
      if (state.rematchReady) resetGame();
    });
    channel.on('broadcast', { event: 'chat' }, ({ payload }) => appendChat('Opponent', payload.msg));

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ joinedAt: new Date().toISOString() });
        const peers = Object.keys(channel.presenceState()).filter(k => k !== myId);
        if (peers.length === 0) { setStatus('Status: Room joined — waiting for opponent…', 'waiting'); toggleConnectUI(true); }
        if (loaded) selectNextShip(state, statusEl);
      } else if (status === 'CHANNEL_ERROR') {
        setStatus('Status: Connection error — check your Supabase config.', 'error'); toggleConnectUI(true);
      } else if (status === 'TIMED_OUT') {
        setStatus('Status: Connection timed out — try reconnecting.', 'error'); toggleConnectUI(true);
      }
    });
  };

  const handlePeerArrived = (peerId) => {
    state.opponentId = peerId;
    state.opponentConnected = true;
    toggleConnectUI(false);
    if (state.gameStarted) {
      setStatus(state.myTurn ? 'Status: Your turn! 🎯' : "Status: Opponent's turn…", state.myTurn ? 'myturn' : 'theirturn');
    } else {
      setStatus('Status: Connected! Place your ships.', 'good');
      if (state.ready) state.sendReady({ type: 'ready' });
    }
    state.save();
  };

  generateBtn.addEventListener('click', () => {
    if (state.room || state.opponentConnected || state.gameStarted) {
      if (!confirm('This will end the current game and start a new one. Continue?')) return;
      leaveChannel(); resetGame();
    }
    const roomId = crypto.randomUUID();
    window.history.pushState({}, '', `${window.location.pathname}?room=${roomId}`);
    opponentInput.value = roomId;
    connectBtn.click();
  });

  connectBtn.addEventListener('click', () => {
    const roomId = opponentInput.value.trim();
    if (!roomId) { setStatus('Status: Enter or generate a Room ID first.', 'error'); return; }
    document.getElementById('share-game-btn')?.remove();
    const shareBtn = document.createElement('button');
    shareBtn.id = 'share-game-btn';
    shareBtn.textContent = '🔗 Share Link';
    shareBtn.classList.add('share-btn');
    const link = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    shareBtn.addEventListener('click', async () => {
      if (navigator.share) {
        try { await navigator.share({ title: 'Join my Battleship game!', url: link }); } catch (e) {}
      } else {
        try {
          await navigator.clipboard.writeText(link);
          shareBtn.textContent = '✓ Copied!'; shareBtn.classList.add('copied');
          setTimeout(() => { shareBtn.textContent = '🔗 Share Link'; shareBtn.classList.remove('copied'); }, 2000);
        } catch (e) {}
      }
    });
    controlsDiv.appendChild(shareBtn);
    joinRoom(roomId);
  });

  readyBtn.addEventListener('click', () => {
    if (!allShipsPlaced(state)) return;
    if (!state.room) { setStatus('Status: Join a room first.', 'error'); return; }
    state.ready = true; readyBtn.disabled = true;
    state.sendReady({ type: 'ready' });
    setStatus('Status: Ready! Waiting for opponent…', 'waiting');
    state.save();
    if (state.opponentReady) startGame();
  });

  rematchBtn.addEventListener('click', () => {
    if (!state.room) { setStatus('Status: Join a room first.', 'error'); return; }
    state.rematchReady = true; rematchBtn.disabled = true;
    state.sendRematch({ type: 'rematch' });
    setStatus('Waiting for opponent to accept rematch…', 'waiting');
    if (state.opponentRematchReady) resetGame();
  });

  const chatInput   = document.getElementById('chat-input');
  const sendChatBtn = document.getElementById('send-chat');
  const sendMsg = () => {
    if (!state.opponentConnected || !state.room) return;
    const msg = chatInput.value.trim(); if (!msg) return;
    state.sendChat(msg); appendChat('You', msg); chatInput.value = '';
  };
  sendChatBtn.addEventListener('click', sendMsg);
  chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMsg(); });

  const roomParam = new URLSearchParams(window.location.search).get('room');
  if (roomParam) { opponentInput.value = roomParam; connectBtn.click(); }

  toggleConnectUI(true);
}

function appendChat(sender, msg) {
  const chatLog = document.getElementById('chat-log');
  if (!chatLog) return;
  const p = document.createElement('p');
  p.innerHTML = `<span class="chat-sender">${sender}:</span> ${msg.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}`;
  chatLog.appendChild(p);
  chatLog.scrollTop = chatLog.scrollHeight;
}
