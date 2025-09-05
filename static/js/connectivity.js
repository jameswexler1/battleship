// ./static/js/connectivity.js
import { joinRoom, selfId } from 'https://esm.run/trystero/torrent';
import { config } from './config.js';
import { allShipsPlaced } from './board.js';

export function initConnectivity(generateBtn, connectBtn, opponentInput, myIdEl, statusEl, controlsDiv, readyBtn, rematchBtn, state, startGame, resetGame, handleMove, handleResult) {
  myIdEl.textContent = selfId;
  generateBtn.addEventListener("click", () => {
    if (state.room || state.opponentConnected || state.gameStarted) {
      if (!confirm("This will end the current game and start a new one. Continue?")) {
        return;
      }
      if (state.room) {
        state.room.leave();
        state.room = null;
      }
      resetGame();
    }
    const roomId = crypto.randomUUID();
    // Update the URL with the room ID without reloading
    window.history.pushState({}, '', `${window.location.pathname}?room=${roomId}`);
    opponentInput.value = roomId;
    connectBtn.click(); // Auto-join the generated room
  });
  connectBtn.addEventListener("click", () => {
    const roomId = opponentInput.value.trim();
    if (!roomId) {
      statusEl.textContent = "Status: Enter or generate a Room ID first.";
      return;
    }
    // If the button is in "Reconnect" mode, reload the page instead of attempting to rejoin
    if (connectBtn.textContent === 'Reconnect') {
      location.reload();
      return;
    }
    // Remove existing share button if any
    const existingShareBtn = document.getElementById('share-game-btn');
    if (existingShareBtn) {
      existingShareBtn.remove();
    }
    // Create styled share button
    const shareBtn = document.createElement('button');
    shareBtn.id = 'share-game-btn';
    shareBtn.textContent = 'Share Game Link';
    shareBtn.classList.add('share-btn');
    const link = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    shareBtn.addEventListener('click', async () => {
      if (navigator.share) {
        try {
          await navigator.share({ title: 'Join my Battleship Game!', text: 'Click to join the game:', url: link });
        } catch (err) {
          console.error('Share failed:', err);
        }
      } else {
        try {
          await navigator.clipboard.writeText(link);
          shareBtn.textContent = 'Copied!';
          shareBtn.classList.add('copied');
          setTimeout(() => {
            shareBtn.textContent = 'Share Game Link';
            shareBtn.classList.remove('copied');
          }, 2000);
        } catch (err) {
          console.error('Copy failed:', err);
        }
      }
    });
    controlsDiv.appendChild(shareBtn);
    if (roomId === state.roomId && state.room) {
      // Already in this room, just refresh peers and status
      const peers = Object.keys(state.room.getPeers());
      const peersLength = peers.length;
      if (state.gameStarted) {
        if (peersLength === 1) {
          state.opponentConnected = true;
          state.opponentId = peers[0];
          statusEl.textContent = state.myTurn ? "Status: Your turn!" : "Status: Opponent's turn...";
        } else {
          statusEl.textContent = "Status: Waiting for opponent to reconnect...";
        }
      } else {
        if (peersLength === 1) {
          state.opponentConnected = true;
          state.opponentId = peers[0];
          statusEl.textContent = "Status: Connected. Place ships...";
        } else {
          statusEl.textContent = "Status: Room joined. Waiting for opponent...";
        }
      }
      toggleConnectUI(false);
      return;
    }
    state.roomId = roomId;
    const loaded = state.loadAndApply(roomId);
    statusEl.textContent = "Status: Joining room...";
    console.log('Joining room:', roomId);
    if (state.room) {
      state.room.leave();
    }
    state.room = joinRoom(config, roomId);
    // Setup actions for data exchange
    [state.sendReady, state.getReady] = state.room.makeAction('ready');
    [state.sendMove, state.getMove] = state.room.makeAction('move');
    [state.sendResult, state.getResult] = state.room.makeAction('result');
    [state.sendRematch, state.getRematch] = state.room.makeAction('rematch');
    [state.sendChat, state.getChat] = state.room.makeAction('chat');
    // Listen for opponent joining (for status update)
    state.room.onPeerJoin(peerId => {
      console.log('Opponent joined:', peerId);
      const peers = Object.keys(state.room.getPeers());
      if (peers.length > 1) {
        statusEl.textContent = "Error: Too many players in room.";
        return;
      }
      state.opponentId = peerId;
      state.opponentConnected = true;
      if (state.gameStarted) {
        statusEl.textContent = state.myTurn ? "Status: Your turn!" : "Status: Opponent's turn...";
      } else {
        statusEl.textContent = "Status: Connected. Place ships...";
        if (state.ready) {
          state.sendReady({ type: "ready" });
        }
      }
      toggleConnectUI(false);
      state.save();
    });
    // Handle incoming data
    state.getReady((data, peerId) => {
      console.log('Received ready from:', peerId);
      state.opponentReady = true;
      statusEl.textContent = "Status: Opponent is ready!";
      if (state.ready) startGame();
      state.save();
    });
    state.getMove((data, peerId) => {
      console.log('Received move:', data);
      if (!state.gameStarted) return;
      handleMove(data.x, data.y);
    });
    state.getResult((data, peerId) => {
      console.log('Received result:', data);
      if (!state.gameStarted) return;
      handleResult(data);
    });
    state.getRematch((data, peerId) => {
      console.log('Received rematch request from:', peerId);
      state.opponentRematchReady = true;
      statusEl.textContent = "Opponent wants a rematch!";
      if (state.rematchReady) resetGame();
    });
    state.getChat((msg, peerId) => {
      console.log('Received chat:', msg);
      const chatLog = document.getElementById('chat-log');
      const p = document.createElement('p');
      p.textContent = `Opponent: ${msg}`;
      chatLog.appendChild(p);
      chatLog.scrollTop = chatLog.scrollHeight;
    });
    // Handle disconnects
    state.room.onPeerLeave(peerId => {
      state.opponentConnected = false;
      statusEl.textContent = "Status: Opponent disconnected. Waiting for reconnect...";
      console.log('Opponent left:', peerId);
      // Do not set gameStarted = false
      toggleConnectUI(true);
    });
    // Set my ID (Trystero's selfId)
    myIdEl.textContent = selfId;
    // Setup chat send
    const chatInput = document.getElementById('chat-input');
    const sendChatBtn = document.getElementById('send-chat');
    sendChatBtn.addEventListener('click', () => {
      if (!state.opponentConnected) return;
      const msg = chatInput.value.trim();
      if (msg && state.room) {
        state.sendChat(msg);
        const chatLog = document.getElementById('chat-log');
        const p = document.createElement('p');
        p.textContent = `You: ${msg}`;
        chatLog.appendChild(p);
        chatLog.scrollTop = chatLog.scrollHeight;
        chatInput.value = '';
      }
    });
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendChatBtn.click();
      }
    });
    // Update status after joining
    const peers = Object.keys(state.room.getPeers());
    const peersLength = peers.length;
    if (state.gameStarted) {
      if (peersLength === 1) {
        state.opponentConnected = true;
        state.opponentId = peers[0];
        statusEl.textContent = state.myTurn ? "Status: Your turn!" : "Status: Opponent's turn...";
        toggleConnectUI(false);
      } else {
        statusEl.textContent = "Status: Waiting for opponent to reconnect...";
        toggleConnectUI(true);
      }
    } else {
      if (peersLength === 1) {
        state.opponentConnected = true;
        state.opponentId = peers[0];
        statusEl.textContent = "Status: Connected. Place ships...";
        toggleConnectUI(false);
      } else {
        statusEl.textContent = "Status: Room joined. Waiting for opponent...";
        toggleConnectUI(true);
      }
      if (loaded) {
        selectNextShip(state, statusEl);
      }
    }
  });
  readyBtn.addEventListener("click", () => {
    if (!allShipsPlaced(state)) return;
    state.ready = true;
    readyBtn.disabled = true;
    if (state.room) {
      console.log('Sending ready');
      state.sendReady({ type: "ready" });
      statusEl.textContent = "Status: You are ready! Waiting for opponent...";
      state.save();
    } else {
      statusEl.textContent = "Status: Join a room first.";
      state.ready = false;
      readyBtn.disabled = false;
      return;
    }
    if (state.opponentReady) startGame();
  });
  rematchBtn.addEventListener("click", () => {
    state.rematchReady = true;
    rematchBtn.disabled = true;
    if (state.room) {
      console.log('Sending rematch');
      state.sendRematch({ type: "rematch" });
      statusEl.textContent = "Waiting for opponent to accept rematch...";
    } else {
      statusEl.textContent = "Status: Join a room first.";
      state.rematchReady = false;
      rematchBtn.disabled = false;
      return;
    }
    if (state.opponentRematchReady) resetGame();
  });
  // Auto-fill and join if ?room=xxx in URL
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room');
  if (roomParam) {
    opponentInput.value = roomParam;
    connectBtn.click(); // Auto-join
  }
  // Function to toggle connect UI
  const toggleConnectUI = (isDisconnected) => {
    if (isDisconnected) {
      connectBtn.textContent = 'Reconnect';
      connectBtn.style.display = 'inline-block';
      opponentInput.style.display = 'inline-block';
    } else {
      connectBtn.style.display = 'none';
      opponentInput.style.display = 'none';
    }
  };
  // Initial state: show as disconnected
  toggleConnectUI(true);
}
