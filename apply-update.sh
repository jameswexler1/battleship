#!/usr/bin/env bash
# =============================================================================
# apply-update.sh  —  run from the ROOT of your Hugo repo
# Applies the Supabase connectivity rebuild, patches config.js with your
# credentials, and leaves every other file untouched.
# =============================================================================

set -euo pipefail

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

ok()   { echo -e "${GREEN}  ✓ $*${RESET}"; }
info() { echo -e "${CYAN}  → $*${RESET}"; }
warn() { echo -e "${YELLOW}  ⚠ $*${RESET}"; }
die()  { echo -e "${RED}  ✗ $*${RESET}"; exit 1; }

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║   Pavia Game Room — Supabase Rebuild         ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════════╝${RESET}"
echo ""

# ── Sanity check: are we in the repo root? ────────────────────────────────────
[[ -f "hugo.toml" || -f "config.toml" || -f "config.yaml" ]] \
  || die "hugo.toml not found. Run this script from the ROOT of your Hugo repo."

# ── Supabase credentials ──────────────────────────────────────────────────────
echo -e "${BOLD}Step 1 of 2 — Supabase credentials${RESET}"
echo ""
echo "  You need two values from your Supabase dashboard:"
echo "  Project Settings → API"
echo ""
echo "  • Project URL  — looks like: https://abcdefgh.supabase.co"
echo "  • Anon key     — long string starting with eyJ..."
echo ""

while true; do
  read -rp "  Paste your Supabase Project URL: " SUPA_URL
  SUPA_URL="${SUPA_URL// /}"   # strip accidental spaces
  if [[ "$SUPA_URL" =~ ^https://[a-zA-Z0-9_-]+\.supabase\.co$ ]]; then
    break
  fi
  warn "That doesn't look right. It should match: https://xxxxxxxx.supabase.co"
done

while true; do
  read -rp "  Paste your Supabase Anon Key: " SUPA_KEY
  SUPA_KEY="${SUPA_KEY// /}"
  if [[ ${#SUPA_KEY} -gt 40 ]]; then
    break
  fi
  warn "That key looks too short. Copy the full 'anon / public' key from the API settings."
done

echo ""
ok "Credentials captured."
echo ""

# ── Write files ───────────────────────────────────────────────────────────────
echo -e "${BOLD}Step 2 of 2 — Writing files${RESET}"
echo ""

mkdir -p static/js static/css

# Helper: write a heredoc to a file and report it
write_file() {
  local path="$1"
  # Content is passed via stdin (heredoc at call site)
  cat > "$path"
  ok "Written: $path"
}

# ── config.js ─────────────────────────────────────────────────────────────────
write_file static/js/config.js << ENDOFFILE
// ./static/js/config.js
// ─────────────────────────────────────────────────────────────────────────────
// Supabase credentials — filled in automatically by apply-update.sh
// ─────────────────────────────────────────────────────────────────────────────
export const config = {
  supabaseUrl: '${SUPA_URL}',
  supabaseKey: '${SUPA_KEY}',
};
// ─────────────────────────────────────────────────────────────────────────────

export const shipsToPlaceTemplate = [
  { name: "Battleship",    size: 4, placed: false, positions: [] },
  { name: "Cruiser 1",     size: 3, placed: false, positions: [] },
  { name: "Cruiser 2",     size: 3, placed: false, positions: [] },
  { name: "Destroyer 1",   size: 2, placed: false, positions: [] },
  { name: "Destroyer 2",   size: 2, placed: false, positions: [] },
  { name: "Destroyer 3",   size: 2, placed: false, positions: [] },
  { name: "Patrol Boat 1", size: 1, placed: false, positions: [] },
  { name: "Patrol Boat 2", size: 1, placed: false, positions: [] },
  { name: "Patrol Boat 3", size: 1, placed: false, positions: [] },
  { name: "Patrol Boat 4", size: 1, placed: false, positions: [] },
];

export const totalShipCells = 20;

export const shipSizes = [
  { size: 4, count: 1 },
  { size: 3, count: 2 },
  { size: 2, count: 3 },
  { size: 1, count: 4 },
];
ENDOFFILE

# ── sounds.js ─────────────────────────────────────────────────────────────────
write_file static/js/sounds.js << 'ENDOFFILE'
// ./static/js/sounds.js
// All sounds synthesized via Web Audio API — zero external dependencies.
let _ctx = null;

function ctx() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

function note(frequency, type, startTime, duration, peakGain = 0.5) {
  const c = ctx();
  const osc  = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

function noiseHit(startTime, duration = 0.18, gainPeak = 0.6) {
  const c = ctx();
  const bufLen = Math.ceil(c.sampleRate * duration);
  const buf    = c.createBuffer(1, bufLen, c.sampleRate);
  const data   = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
  const src    = c.createBufferSource();
  const filter = c.createBiquadFilter();
  const gain   = c.createGain();
  src.buffer = buf;
  filter.type = 'bandpass';
  filter.frequency.value = 400;
  filter.Q.value = 0.8;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);
  gain.gain.setValueAtTime(gainPeak, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  src.start(startTime);
  src.stop(startTime + duration + 0.05);
}

export function playHit() {
  const c = ctx(), t = c.currentTime;
  noiseHit(t, 0.22, 0.7);
  note(120, 'sawtooth', t,       0.25, 0.4);
  note(60,  'sine',     t + 0.05, 0.3, 0.3);
}

export function playMiss() {
  const c = ctx(), t = c.currentTime;
  note(600, 'sine', t,         0.05, 0.25);
  note(300, 'sine', t + 0.04,  0.15, 0.20);
  note(150, 'sine', t + 0.10,  0.20, 0.15);
}

export function playVictory() {
  const c = ctx(), t = c.currentTime;
  [261.63, 329.63, 392.00, 523.25].forEach((freq, i) =>
    note(freq, 'triangle', t + i * 0.12, 0.35, 0.45)
  );
  [523.25, 659.26, 783.99].forEach(freq =>
    note(freq, 'triangle', t + 4 * 0.12, 0.6, 0.35)
  );
}

export function playDefeat() {
  const c = ctx(), t = c.currentTime;
  [392.00, 349.23, 293.66, 261.63, 220.00].forEach((freq, i) =>
    note(freq, 'sine', t + i * 0.18, 0.4, 0.4)
  );
}
ENDOFFILE

# ── connectivity.js ───────────────────────────────────────────────────────────
write_file static/js/connectivity.js << 'ENDOFFILE'
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
ENDOFFILE

# ── game.js ───────────────────────────────────────────────────────────────────
write_file static/js/game.js << 'ENDOFFILE'
// ./static/js/game.js
import { selfId } from './connectivity.js';
import { totalShipCells } from './config.js';
import { playHit, playVictory, playDefeat, playMiss } from './sounds.js';
import { createBoard, selectNextShip, addPlacementListeners, addAttackListeners } from './board.js';

export function startGame(state, statusEl, orientationBtn, resetBtn, rematchBtn) {
  state.gameStarted = true;
  orientationBtn.style.display = "none";
  resetBtn.style.display = "none";
  rematchBtn.style.display = "none";

  const peers = Object.keys(state.room.getPeers());
  if (peers.length !== 1) {
    statusEl.textContent = "Status: Error — must be exactly 2 players.";
    state.gameStarted = false; return;
  }
  const opponentId = peers[0];
  if (selfId === opponentId) {
    statusEl.textContent = "Status: Error — duplicate peer ID. Use a different browser for the second player.";
    state.gameStarted = false; return;
  }
  state.opponentId = opponentId;
  if (selfId < opponentId) {
    state.myTurn = true;
    statusEl.textContent = "Status: Your turn! 🎯";
    statusEl.dataset.statusType = 'myturn';
  } else {
    state.myTurn = false;
    statusEl.textContent = "Status: Opponent's turn…";
    statusEl.dataset.statusType = 'theirturn';
  }
  state.myBoard.flat().forEach(cell => {
    cell.el.removeEventListener("click",     state.placementClickHandler);
    cell.el.removeEventListener("mouseover", state.previewHandler);
    cell.el.removeEventListener("mouseout",  state.clearHandler);
  });
  state.save();
}

export function resetGame(state, myBoardEl, opponentBoardEl, statusEl, readyBtn, rematchBtn, orientationBtn, resetBtn) {
  if (state.roomId) localStorage.removeItem(`battleship-state-${state.roomId}`);
  state.myBoard       = createBoard(myBoardEl);
  state.opponentBoard = createBoard(opponentBoardEl);
  state.shipsToPlace.forEach(ship => { ship.placed = false; ship.positions = []; });
  selectNextShip(state, statusEl);
  state.myHits = 0; state.opponentHits = 0;
  state.ready = false; state.opponentReady = false;
  state.rematchReady = false; state.opponentRematchReady = false;
  state.gameStarted = false; state.sunkOpponentShips = [];
  state.opponentId = null; state.opponentConnected = false;
  readyBtn.style.display = "none"; rematchBtn.style.display = "none";
  rematchBtn.disabled = false; readyBtn.disabled = false;
  orientationBtn.style.display = "block"; resetBtn.style.display = "none";
  const chatLog = document.getElementById('chat-log');
  if (chatLog) chatLog.innerHTML = '';
  addPlacementListeners(state.myBoard, state);
  addAttackListeners(state.opponentBoard, state);
  document.querySelectorAll('.ship-rep.sunk').forEach(el => el.classList.remove('sunk'));
  delete statusEl.dataset.statusType;
  if (state.room) {
    const peers = Object.keys(state.room.getPeers());
    if (peers.length === 1) {
      state.opponentId = peers[0]; state.opponentConnected = true;
      statusEl.textContent = "Status: Connected. Place ships for the next game.";
    } else {
      statusEl.textContent = "Status: Waiting for opponent… Place ships when connected.";
    }
  } else {
    statusEl.textContent = "Status: No room — please reconnect.";
  }
}

export function handleMove(x, y, state, statusEl, rematchBtn) {
  if (!state.gameStarted) return;
  const cell = state.myBoard[y][x];
  if (cell.attacked) return;
  cell.attacked = true;
  let hit = false, surrounds = [], sunkSize;

  if (cell.hasShip) {
    cell.hit = true; cell.el.classList.add("hit");
    hit = true; state.opponentHits++;
    if (!state.isMuted) playHit();
    if ('vibrate' in navigator) navigator.vibrate(200);

    const sunkShip = state.shipsToPlace.find(ship => ship.positions.some(p => p.x === x && p.y === y));
    if (sunkShip) {
      const hitPositions = sunkShip.positions.filter(p => state.myBoard[p.y][p.x].hit);
      const isSunk = hitPositions.length === sunkShip.size;
      if (isSunk) sunkSize = sunkShip.size;
      const surroundSet = new Set();
      const dirs     = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
      const diagDirs = [[-1,-1],[-1,1],[1,-1],[1,1]];
      if (isSunk) {
        sunkShip.positions.forEach(pos => dirs.forEach(([dx,dy]) => {
          const nx=pos.x+dx, ny=pos.y+dy;
          if(nx>=0&&nx<10&&ny>=0&&ny<10&&!state.myBoard[ny][nx].attacked) surroundSet.add(`${nx},${ny}`);
        }));
      } else {
        const isHoriz = hitPositions.every(p=>p.y===hitPositions[0].y);
        const isVert  = hitPositions.every(p=>p.x===hitPositions[0].x);
        const clusterSurrounds = (cluster, fixed, horiz) => {
          const min=cluster[0], max=cluster[cluster.length-1];
          if(cluster.length===1){
            diagDirs.forEach(([dx,dy])=>{
              const nx=horiz?min+dx:fixed+dx, ny=horiz?fixed+dy:min+dy;
              if(nx>=0&&nx<10&&ny>=0&&ny<10&&!state.myBoard[ny][nx].attacked) surroundSet.add(`${nx},${ny}`);
            });
          } else {
            const extSet=new Set();
            if(horiz){ if(min-1>=0) extSet.add(`${min-1},${fixed}`); if(max+1<10) extSet.add(`${max+1},${fixed}`); }
            else     { if(min-1>=0) extSet.add(`${fixed},${min-1}`); if(max+1<10) extSet.add(`${fixed},${max+1}`); }
            for(let v=min;v<=max;v++) dirs.forEach(([dx,dy])=>{
              const nx=horiz?v+dx:fixed+dx, ny=horiz?fixed+dy:v+dy;
              if(nx>=0&&nx<10&&ny>=0&&ny<10&&!state.myBoard[ny][nx].attacked&&!extSet.has(`${nx},${ny}`)) surroundSet.add(`${nx},${ny}`);
            });
          }
        };
        if(isHoriz){ const fy=hitPositions[0].y, xs=hitPositions.map(p=>p.x).sort((a,b)=>a-b); let cur=[xs[0]]; for(let i=1;i<xs.length;i++){ if(xs[i]===xs[i-1]+1) cur.push(xs[i]); else{clusterSurrounds(cur,fy,true);cur=[xs[i]];}} clusterSurrounds(cur,fy,true); }
        if(isVert){  const fx=hitPositions[0].x, ys=hitPositions.map(p=>p.y).sort((a,b)=>a-b); let cur=[ys[0]]; for(let i=1;i<ys.length;i++){ if(ys[i]===ys[i-1]+1) cur.push(ys[i]); else{clusterSurrounds(cur,fx,false);cur=[ys[i]];}} clusterSurrounds(cur,fx,false); }
      }
      surrounds = Array.from(surroundSet).map(k=>{const[sx,sy]=k.split(',');return{x:parseInt(sx),y:parseInt(sy)};});
    }

    if (state.opponentHits === totalShipCells) {
      statusEl.textContent = "Status: You lost! 💀"; statusEl.dataset.statusType = 'lose';
      if (!state.isMuted) playDefeat();
      if ('vibrate' in navigator) navigator.vibrate(500);
      state.gameStarted = false; rematchBtn.style.display = "block";
    }
  } else {
    cell.el.classList.add("miss");
    if (!state.isMuted) playMiss();
  }

  state.sendResult({ type:"result", x, y, hit, surrounds, sunkSize });
  if (!hit) { state.myTurn=true; statusEl.textContent="Status: Your turn! 🎯"; statusEl.dataset.statusType='myturn'; }
  else if (state.opponentHits < totalShipCells) { statusEl.textContent="Status: Opponent's turn…"; statusEl.dataset.statusType='theirturn'; }
  state.save();
}

export function handleResult(data, state, statusEl, rematchBtn) {
  if (!state.gameStarted) return;
  const cell = state.opponentBoard[data.y][data.x].el;
  if (data.hit) {
    cell.classList.add("hit"); state.myHits++;
    if (!state.isMuted) playHit();
    if ('vibrate' in navigator) navigator.vibrate(200);
    if (data.sunkSize) {
      state.sunkOpponentShips.push(data.sunkSize);
      const shipRep = document.querySelector(`.ship-rep[data-size="${data.sunkSize}"]:not(.sunk)`);
      if (shipRep) shipRep.classList.add("sunk");
    }
    data.surrounds.forEach(s => state.opponentBoard[s.y][s.x].el.classList.add("deduced-miss"));
    if (state.myHits === totalShipCells) {
      statusEl.textContent="Status: You win! 🏆"; statusEl.dataset.statusType='win';
      if (!state.isMuted) playVictory();
      if ('vibrate' in navigator) navigator.vibrate(500);
      state.gameStarted=false; rematchBtn.style.display="block";
      state.save(); return;
    }
    state.myTurn=true; statusEl.textContent="Status: Your turn! 🎯"; statusEl.dataset.statusType='myturn';
  } else {
    cell.classList.add("miss");
    state.myTurn=false; statusEl.textContent="Status: Opponent's turn…"; statusEl.dataset.statusType='theirturn';
  }
  state.save();
}
ENDOFFILE

# ── wordle-words-pt.txt ───────────────────────────────────────────────────────
write_file static/js/wordle-words-pt.txt << 'ENDOFFILE'
abrir
acaso
acima
adeus
agora
agudo
ainda
ajuda
algas
alhos
almas
aluga
aluno
amado
amigo
amora
amplo
andar
antes
apoio
arcos
areia
armas
arroz
artes
assar
astro
autor
aviso
banco
barco
beber
bicho
bolsa
bordo
braco
bravo
briga
broto
burro
caixa
calma
campo
canto
capaz
carga
carro
carta
certo
chave
cheio
chuva
cinza
claro
clube
coisa
comum
corpo
corte
costa
crime
culpa
curso
curto
dados
danca
dente
digno
doido
drama
duque
eleto
errar
etapa
exame
falso
farsa
febre
festa
filho
filme
final
forca
forno
forte
fraco
frete
fruta
fundo
furto
garfo
geral
gordo
grade
greve
grupo
guiar
homem
hotel
ideal
igual
impar
jogar
julho
juros
justo
lapso
largo
laser
lavar
lenda
lento
limao
limpo
linho
livre
local
lugar
macho
magro
maior
malha
manga
manha
manto
marca
massa
melao
menor
mente
metro
moeda
molho
morro
morte
multa
mundo
nadar
nariz
negro
nivel
noite
norma
norte
nomes
obras
olhar
ordem
outro
padre
palco
pasta
patio
pausa
pedra
peixe
penas
perto
pilha
plano
poder
polvo
ponte
ponto
porta
porto
pouco
praia
preso
prima
prova
pulso
rapaz
razao
reino
relva
risco
rival
rocha
roubo
ruido
sabor
sacar
saida
salvo
santo
selva
servo
sobre
solar
sorte
suave
sujar
tango
telha
tempo
terra
tipos
tocar
todos
tomar
total
trevo
tribo
turbo
usina
vagao
vagar
valor
valsa
velar
velha
velho
vento
verso
vigor
virar
visao
vital
votar
vozes
ENDOFFILE

# ── wordle-words-it.txt ───────────────────────────────────────────────────────
write_file static/js/wordle-words-it.txt << 'ENDOFFILE'
acqua
amico
amore
anima
asino
avaro
ballo
banco
barca
belva
birra
bocca
bosco
bravo
buono
bugia
cacca
campo
canna
capra
carta
casto
cella
cigno
circa
collo
colpa
colpo
corda
corpo
corsa
corte
costa
costo
croce
cuoco
danza
dardo
dolce
donna
drago
duomo
esame
extra
falco
falso
fango
fauno
fermo
ferro
festa
fiato
fibra
fiore
firma
fisso
fiume
folto
fondo
forma
forte
fosso
freno
frode
fuoco
gamba
gatto
germe
gioco
gioia
gomma
gonna
grano
grido
guida
gusto
isola
ladro
largo
latte
legge
leone
libro
linea
lotta
lungo
luogo
magma
malto
mamma
mango
manzo
mappa
marzo
massa
matto
mondo
monte
morso
morto
mosso
nervo
netto
norma
notte
nozze
opera
padre
palla
panda
pasto
patto
pausa
pazzo
pesce
piano
piede
pieno
pista
pizza
pollo
ponte
porta
porto
posto
prima
prova
ragno
rango
ratto
regno
resto
ritmo
rombo
rosso
salmo
salsa
salto
salvo
samba
santa
santo
scala
scena
segno
senso
servo
sigma
soldo
sopra
sordo
sorte
sotto
spada
spago
spiga
stelo
stile
suono
tacco
tanto
tappo
tardi
tasto
tempo
testa
tordo
torso
turno
vacca
vanga
vento
verbo
verso
vetta
viola
volta
zuppa
ENDOFFILE

# ── battleship.css ────────────────────────────────────────────────────────────
write_file static/css/battleship.css << 'ENDOFFILE'
@import url('https://fonts.googleapis.com/css2?family=Oxanium:wght@400;600;700&family=Share+Tech+Mono&display=swap');

:root {
  --navy-900: #050f1a;
  --navy-800: #091422;
  --navy-700: #0e1f33;
  --navy-600: #1a3a6b;
  --navy-500: #1f4e8c;
  --steel:    #2a4a6e;
  --steel-lt: #4a7aaa;
  --amber:    #f59e0b;
  --amber-lt: #fcd34d;
  --hit-red:  #dc2626;
  --hit-glow: #f87171;
  --miss-blue:#3b82f6;
  --miss-glow:#60a5fa;
  --gray-400: #6b7280;
  --gray-500: #9ca3af;
  --green:    #22c55e;
  --text:     #e2e8f0;
  --text-dim: #94a3b8;
  --radius:   8px;
  --board-cell: 28px;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Oxanium', 'Segoe UI', sans-serif;
  background: var(--navy-900);
  background-image: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.012) 2px, rgba(255,255,255,0.012) 4px);
  color: var(--text);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

header, .site-header {
  display: flex; align-items: center; gap: 1rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(90deg, var(--navy-700), var(--navy-800));
  border-bottom: 2px solid var(--steel);
  box-shadow: 0 2px 12px rgba(0,0,0,0.5);
}

.site-title {
  font-size: 1.5rem; font-weight: 700;
  letter-spacing: 0.15em; text-transform: uppercase;
  color: var(--amber);
  text-shadow: 0 0 20px rgba(245,158,11,0.4);
}

footer {
  text-align: center; padding: 0.75rem;
  background: var(--navy-800);
  border-top: 1px solid var(--steel);
  color: var(--text-dim); font-size: 0.8rem; letter-spacing: 0.05em;
}

main { flex: 1; padding: 1rem; display: flex; flex-direction: column; align-items: center; }

.landing {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; min-height: 60vh; text-align: center; gap: 1.5rem;
}
.landing h1 { font-size: 2.8rem; color: var(--amber); letter-spacing: 0.1em; text-shadow: 0 0 30px rgba(245,158,11,0.3); }
.landing p  { font-size: 1.1rem; color: var(--text-dim); max-width: 500px; }

a.play-button {
  display: inline-block; padding: 0.75rem 2.5rem;
  font-family: 'Oxanium', sans-serif; font-size: 1.1rem; font-weight: 700;
  letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--navy-900); background: var(--amber); text-decoration: none;
  border-radius: var(--radius); box-shadow: 0 0 20px rgba(245,158,11,0.4);
  transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
}
a.play-button:hover { background: var(--amber-lt); box-shadow: 0 0 30px rgba(245,158,11,0.6); transform: translateY(-2px); }

.back-button {
  display: inline-block; padding: 0.4rem 0.9rem;
  background: transparent; color: var(--amber); text-decoration: none;
  border: 1px solid var(--amber); border-radius: var(--radius);
  font-size: 0.85rem; letter-spacing: 0.05em;
  transition: background 0.2s, color 0.2s; flex-shrink: 0;
}
.back-button:hover { background: var(--amber); color: var(--navy-900); }

input, button {
  font-family: 'Oxanium', sans-serif; font-size: 0.9rem;
  padding: 0.45rem 0.9rem; border-radius: var(--radius); border: none; margin: 0.25rem;
}
input {
  background: var(--navy-700); color: var(--text);
  border: 1px solid var(--steel); transition: border-color 0.2s;
}
input:focus { outline: none; border-color: var(--amber); }
button {
  background: var(--navy-600); color: var(--text); cursor: pointer;
  border: 1px solid var(--steel);
  transition: background 0.2s, border-color 0.2s, transform 0.1s; letter-spacing: 0.05em;
}
button:hover { background: var(--navy-500); border-color: var(--amber); transform: translateY(-1px); }
button:active { transform: translateY(0); }
button:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

.controls {
  display: flex; flex-wrap: wrap; justify-content: center;
  align-items: center; gap: 0.4rem; max-width: 900px; width: 100%;
}

#status {
  margin: 0.75rem 0; font-weight: 600; text-align: center;
  font-size: 1rem; letter-spacing: 0.06em;
  padding: 0.5rem 1.25rem; border-radius: var(--radius);
  border: 1px solid var(--steel); background: var(--navy-700);
  max-width: 90vw; transition: background 0.3s, border-color 0.3s, color 0.3s;
}
#status[data-status-type="myturn"]   { background: rgba(245,158,11,0.15); border-color: var(--amber);    color: var(--amber-lt); }
#status[data-status-type="theirturn"]{ background: rgba(30,60,100,0.5);   border-color: var(--steel-lt); color: var(--text-dim); }
#status[data-status-type="win"]      { background: rgba(34,197,94,0.15);  border-color: var(--green);    color: var(--green); }
#status[data-status-type="lose"]     { background: rgba(220,38,38,0.15);  border-color: var(--hit-red);  color: var(--hit-glow); }
#status[data-status-type="good"]     { background: rgba(34,197,94,0.1);   border-color: var(--green);    color: var(--green); }
#status[data-status-type="warning"]  { background: rgba(245,158,11,0.1);  border-color: var(--amber);    color: var(--amber); animation: pulse-warning 1.5s ease-in-out infinite; }
#status[data-status-type="error"]    { background: rgba(220,38,38,0.1);   border-color: var(--hit-red);  color: var(--hit-glow); }

@keyframes pulse-warning { 0%,100%{opacity:1} 50%{opacity:0.6} }

#my-id {
  font-family: 'Share Tech Mono', monospace; font-size: 0.75rem;
  color: var(--steel-lt); background: var(--navy-800);
  padding: 0.2rem 0.6rem; border-radius: 4px;
  border: 1px solid var(--steel); letter-spacing: 0.08em;
}

#boards { display: flex; gap: 3rem; margin-top: 1rem; flex-wrap: wrap; justify-content: center; }
.board-container { display: flex; align-items: flex-start; }
#boards h3 { font-size: 0.75rem; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: var(--text-dim); margin-bottom: 0.5rem; text-align: center; }

.board {
  display: grid;
  grid-template-columns: repeat(10, var(--board-cell));
  grid-template-rows:    repeat(10, var(--board-cell));
  gap: 2px; background: var(--navy-700);
  border: 2px solid var(--steel); border-radius: var(--radius);
  box-shadow: 0 0 18px rgba(74,122,170,0.25), inset 0 0 8px rgba(0,0,0,0.4);
  padding: 4px;
}

.cell {
  background: #0e2035; border: 1px solid #1a3045; border-radius: 3px;
  cursor: pointer; transition: background 0.12s, box-shadow 0.12s; position: relative;
}
.cell:hover { background: var(--navy-600); border-color: var(--steel-lt); }

.ship         { background: #2a5a8a !important; border-color: var(--steel-lt) !important; box-shadow: inset 0 0 4px rgba(100,180,255,0.3); }
.hit          { background: var(--hit-red) !important; border-color: var(--hit-glow) !important; box-shadow: inset 0 0 8px var(--hit-glow), 0 0 6px rgba(220,38,38,0.4); }
.hit::after   { content:'✕'; position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:0.7rem; color:rgba(255,200,200,0.8); pointer-events:none; }
.miss         { background: #0f2a4a !important; border-color: #1e4a7a !important; }
.miss::after  { content:'·'; position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:1.1rem; color:var(--miss-blue); pointer-events:none; }
.deduced-miss { background: #0a1a2e !important; border-color: #111 !important; cursor:default; }
.deduced-miss::after { content:''; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:4px; height:4px; background:var(--gray-400); border-radius:50%; pointer-events:none; }
.preview      { background: rgba(245,158,11,0.2) !important; border-color: var(--amber) !important; }

#targets { width:80px; margin-left:40px; }
.ship-rep { display:flex; flex-direction:row; margin-bottom:8px; }
.mini-cell { width:18px; height:18px; background:var(--steel); border:1px solid var(--steel-lt); border-radius:2px; box-sizing:border-box; transition:background 0.15s; }
.ship-rep.sunk .mini-cell { background:var(--hit-red); border-color:var(--hit-glow); box-shadow:inset 0 0 4px var(--hit-glow); }
.targets-padding { width:120px; flex-shrink:0; }

.share-btn { padding:0.45rem 1rem; background:#166534; color:#bbf7d0; border:1px solid #16a34a; border-radius:var(--radius); cursor:pointer; font-family:'Oxanium',sans-serif; font-size:0.85rem; transition:background 0.2s,transform 0.1s; }
.share-btn:hover { background:#15803d; transform:translateY(-1px); }
.share-btn.copied { background:#1d4ed8; border-color:#3b82f6; color:#bfdbfe; }

.mute-btn { padding:0.45rem 1rem; background:rgba(220,38,38,0.2); color:#fca5a5; border:1px solid var(--hit-red); border-radius:var(--radius); cursor:pointer; font-family:'Oxanium',sans-serif; font-size:0.85rem; transition:background 0.2s; }
.mute-btn:hover  { background:rgba(220,38,38,0.35); }
.mute-btn.muted  { background:rgba(34,197,94,0.15); color:#86efac; border-color:var(--green); }

#chat { margin-top:2rem; width:360px; max-width:90vw; display:flex; flex-direction:column; align-items:stretch; }
#chat-log { background:var(--navy-800); border:1px solid var(--steel); border-radius:var(--radius) var(--radius) 0 0; height:160px; overflow-y:auto; padding:0.6rem 0.75rem; font-size:0.82rem; scrollbar-width:thin; scrollbar-color:var(--steel) var(--navy-800); }
#chat-log p { margin:0.2rem 0; color:var(--text-dim); line-height:1.4; }
#chat-log .chat-sender { color:var(--amber); font-weight:600; }
.chat-row { display:flex; gap:0.3rem; }
#chat-input { flex:1; border-radius:0 0 0 var(--radius); margin:0; }
#send-chat  { border-radius:0 0 var(--radius) 0; margin:0; background:var(--navy-500); padding:0.45rem 0.75rem; font-size:0.85rem; }

#wordle-app { font-family:'Oxanium','Helvetica Neue',Arial,sans-serif; text-align:center; max-width:100vw; margin:0 auto; padding:10px 0; color:var(--text); display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:calc(100vh - 100px); }
#wordle-app h3 { font-size:1.4rem; letter-spacing:0.2em; text-transform:uppercase; color:var(--amber); margin-bottom:0.5rem; text-shadow:0 0 16px rgba(245,158,11,0.3); }
#language-select { margin-bottom:12px; padding:6px 10px; font-size:0.85rem; background:var(--navy-700); color:var(--text); border:1px solid var(--steel); border-radius:var(--radius); font-family:'Oxanium',sans-serif; }
#game-board { display:flex; flex-direction:column; gap:6px; margin-bottom:15px; }
.row { display:flex; gap:6px; justify-content:center; }
.tile { width:62px; height:62px; border:2px solid var(--steel); border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:30px; font-weight:700; text-transform:uppercase; background:var(--navy-800); color:var(--text); transition:transform 0.1s; font-family:'Oxanium',sans-serif; }
.tile.filled { animation:pop 0.1s ease-in-out; border-color:var(--steel-lt); }
.tile.flip   { animation:flip 0.5s ease forwards; }
.correct { background:#166534 !important; border-color:#22c55e !important; color:#dcfce7; }
.present { background:#854d0e !important; border-color:#f59e0b !important; color:#fef3c7; }
.absent  { background:#374151 !important; border-color:#4b5563 !important; }
#keyboard { max-width:100vw; margin:0 auto 10px; }
.keyboard-row { display:flex; justify-content:center; gap:4px; margin-bottom:5px; }
.keyboard-row.second-row { margin-left:18px; }
.key { min-width:40px; height:54px; background:var(--steel); color:var(--text); border:1px solid var(--navy-600); border-radius:5px; font-size:16px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; text-transform:uppercase; transition:background 0.15s,transform 0.1s; font-family:'Oxanium',sans-serif; }
.key:hover   { background:var(--navy-500); transform:translateY(-1px); }
.key.wide    { min-width:58px; font-size:14px; }
.key.correct { background:#166534; border-color:#22c55e; }
.key.present { background:#92400e; border-color:#f59e0b; }
.key.absent  { background:#1f2937; border-color:#374151; color:var(--text-dim); }
#message { margin:10px 0; font-size:1.2rem; font-weight:700; letter-spacing:0.1em; min-height:1.8rem; color:var(--text); }
#message.win  { color:var(--green); text-shadow:0 0 16px rgba(34,197,94,0.5); }
#message.lose { color:var(--hit-glow); }
#reset-btn { margin-top:10px; padding:10px 28px; font-size:0.95rem; background:var(--amber); color:var(--navy-900); border:none; border-radius:var(--radius); cursor:pointer; font-weight:700; letter-spacing:0.08em; transition:background 0.2s,transform 0.1s; }
#reset-btn:hover { background:var(--amber-lt); transform:translateY(-1px); }

@keyframes pop  { 0%{transform:scale(1)} 50%{transform:scale(1.08)} 100%{transform:scale(1)} }
@keyframes flip { 0%{transform:rotateX(0deg)} 49.99%{transform:rotateX(90deg)} 50%{transform:rotateX(270deg)} 100%{transform:rotateX(360deg)} }
@keyframes shake { 0%{transform:translateX(0)} 20%{transform:translateX(-5px)} 40%{transform:translateX(5px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} 100%{transform:translateX(0)} }
.row.shake { animation:shake 0.5s ease-in-out; }

@media (max-width: 768px) {
  :root { --board-cell: calc((90vw - 10px) / 10); }
  .site-title { font-size:1.1rem; }
  .controls { flex-direction:column; align-items:center; }
  .controls button, .controls input { width:80%; margin:0.2rem 0; }
  #boards { flex-direction:column; gap:1.25rem; }
  .board-container { flex-direction:column; align-items:center; }
  #targets { margin-left:0; margin-top:16px; flex-direction:row; flex-wrap:wrap; width:auto; }
  .ship-rep { margin-right:8px; }
  .targets-padding { display:none; }
  #chat { width:90vw; }
  .tile { width:min(62px, calc((100vw - 24px) / 5)); height:min(62px, calc((100vw - 24px) / 5)); font-size:min(28px, 6vw); }
  .keyboard-row { gap:3px; margin-bottom:4px; }
  .keyboard-row.second-row { margin-left:10px; }
  .key { min-width:min(38px, calc((100vw - 20px - 9 * 3px) / 10)); height:min(52px, 13vw); font-size:min(15px, 4vw); }
  .key.wide { min-width:min(56px, calc((100vw - 20px - 8 * 3px) / 9)); font-size:min(13px, 3.2vw); }
}
@media (max-width: 420px) {
  .tile { width:min(54px, calc((100vw - 12px) / 5)); height:min(54px, calc((100vw - 12px) / 5)); }
}
ENDOFFILE

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}All done!${RESET}"
echo ""
echo "  Files written:"
echo "    static/js/config.js         (with your Supabase credentials)"
echo "    static/js/connectivity.js"
echo "    static/js/game.js"
echo "    static/js/sounds.js         (new)"
echo "    static/js/wordle-words-pt.txt"
echo "    static/js/wordle-words-it.txt"
echo "    static/css/battleship.css"
echo ""
echo -e "${YELLOW}  One thing to check in your Supabase dashboard:${RESET}"
echo "  Realtime → make sure Realtime is ENABLED for your project."
echo "  (No tables or schemas needed — the game uses ephemeral channels only.)"
echo ""
echo -e "${CYAN}  When ready, deploy as usual:${RESET}"
echo "    hugo --gc --minify"
echo ""
