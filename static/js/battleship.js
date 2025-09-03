import {joinRoom, selfId} from 'https://esm.run/trystero/torrent';
const myBoardEl = document.getElementById("my-board");
const opponentBoardEl = document.getElementById("opponent-board");
const statusEl = document.getElementById("status");
const myIdEl = document.getElementById("my-id");
const connectBtn = document.getElementById("connect-btn");
const readyBtn = document.getElementById("ready-btn");
const opponentInput = document.getElementById("opponent-id");
const resetBtn = document.createElement("button"); // New reset button for ship placement
resetBtn.textContent = "Reset Ships";
resetBtn.style.display = "none";
const orientationBtn = document.createElement("button");
orientationBtn.textContent = "Toggle Orientation (Horizontal)";
orientationBtn.addEventListener("click", () => {
  orientation = orientation === "horizontal" ? "vertical" : "horizontal";
  orientationBtn.textContent = `Toggle Orientation (${orientation.charAt(0).toUpperCase() + orientation.slice(1)})`;
});
const rematchBtn = document.createElement("button");
rematchBtn.textContent = "Rematch";
rematchBtn.style.display = "none";
// Insert buttons after readyBtn (before boards for better visibility)
readyBtn.parentNode.insertBefore(orientationBtn, readyBtn.nextSibling);
readyBtn.parentNode.insertBefore(resetBtn, orientationBtn.nextSibling);
readyBtn.parentNode.insertBefore(rematchBtn, resetBtn.nextSibling);
let myTurn = false;
let myBoard = [];
let opponentBoard = [];
let shipsToPlace = [
  { name: "Battleship", size: 4, placed: false, positions: [] },
  { name: "Cruiser 1", size: 3, placed: false, positions: [] },
  { name: "Cruiser 2", size: 3, placed: false, positions: [] },
  { name: "Destroyer 1", size: 2, placed: false, positions: [] },
  { name: "Destroyer 2", size: 2, placed: false, positions: [] },
  { name: "Destroyer 3", size: 2, placed: false, positions: [] },
  { name: "Patrol Boat 1", size: 1, placed: false, positions: [] },
  { name: "Patrol Boat 2", size: 1, placed: false, positions: [] },
  { name: "Patrol Boat 3", size: 1, placed: false, positions: [] },
  { name: "Patrol Boat 4", size: 1, placed: false, positions: [] }
];
let currentShip = null;
let orientation = "horizontal"; // Default orientation
let ready = false;
let opponentReady = false;
let rematchReady = false;
let opponentRematchReady = false;
let gameStarted = false;
let myHits = 0;
let opponentHits = 0;
const totalShipCells = 20; // 4 + 3+3 + 2+2+2 + 1+1+1+1
const hitSound = new Audio('https://therecordist.com/assets/sound/mp3_14/Explosion_Large_Blast_1.mp3');
const victorySound = new Audio('https://orangefreesounds.com/wp-content/uploads/2023/06/Victory-fanfare-sound-effect.mp3');
const defeatSound = new Audio('https://freesound.org/data/previews/183/183077_2374229-lq.mp3');
// Auto-fill and join if ?room=xxx in URL (for shareable links)
const urlParams = new URLSearchParams(window.location.search);
const roomParam = urlParams.get('room');
if (roomParam) {
  opponentInput.value = roomParam;
  connectBtn.click(); // Auto-join
}
// Move status between boards on mobile
function adjustStatusPosition() {
  if (window.innerWidth <= 768) {
    const yourBoardDiv = document.querySelector('#boards > div:first-child');
    if (yourBoardDiv && !yourBoardDiv.nextSibling.isEqualNode(statusEl)) {
      yourBoardDiv.after(statusEl);
    }
  } else {
    const controlsDiv = document.querySelector('main > div:first-child');
    if (controlsDiv && !controlsDiv.nextSibling.isEqualNode(statusEl)) {
      controlsDiv.after(statusEl);
    }
  }
}
window.addEventListener('resize', adjustStatusPosition);
adjustStatusPosition(); // Initial check
// Create 10x10 grids
function createBoard(el, isMyBoard) {
  const grid = [];
  el.innerHTML = ""; // Clear existing cells
  for (let y = 0; y < 10; y++) {
    const row = [];
    for (let x = 0; x < 10; x++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      cell.dataset.x = x;
      cell.dataset.y = y;
      if (isMyBoard) {
        cell.addEventListener("click", (e) => placeShipAttempt(e.target));
        cell.addEventListener("mouseover", (e) => previewShip(e.target));
        cell.addEventListener("mouseout", clearPreview);
      } else {
        cell.addEventListener("click", () => {
          if (myTurn && gameStarted && room && !cell.classList.contains("hit") && !cell.classList.contains("miss") && !cell.classList.contains("deduced-miss")) {
            sendMove({ type: "move", x, y });
            myTurn = false;
            statusEl.textContent = "Status: Waiting for opponent...";
          }
        });
      }
      el.appendChild(cell);
      row.push({ hasShip: false, hit: false, attacked: false, el: cell });
    }
    grid.push(row);
  }
  return grid;
}
// Preview ship placement
function previewShip(cell) {
  if (!currentShip || gameStarted) return;
  const x = parseInt(cell.dataset.x);
  const y = parseInt(cell.dataset.y);
  clearPreview();
  if (canPlaceShip(x, y, currentShip.size, orientation)) {
    highlightCells(x, y, currentShip.size, orientation, "preview");
  }
}
// Clear preview highlights
function clearPreview() {
  document.querySelectorAll(".preview").forEach(el => el.classList.remove("preview"));
}
// Attempt to place ship on click
function placeShipAttempt(cell) {
  if (!currentShip || gameStarted) return;
  const x = parseInt(cell.dataset.x);
  const y = parseInt(cell.dataset.y);
  if (canPlaceShip(x, y, currentShip.size, orientation)) {
    placeShip(x, y, currentShip.size, orientation);
    currentShip.placed = true;
    selectNextShip();
    if (allShipsPlaced()) {
      readyBtn.style.display = "block";
      resetBtn.style.display = "block";
      statusEl.textContent = "All ships placed! Click 'I'm Ready' when ready.";
    }
  }
}
// Check if ship can be placed (no overlap, in bounds, no adjacent ships)
function canPlaceShip(startX, startY, size, orient) {
  // Check bounds and overlap
  for (let i = 0; i < size; i++) {
    const x = orient === "horizontal" ? startX + i : startX;
    const y = orient === "horizontal" ? startY : startY + i;
    if (x >= 10 || y >= 10 || myBoard[y][x].hasShip) {
      return false;
    }
  }
  // Check no adjacent ships (including diagonally)
  if (hasAdjacentShip(startX, startY, size, orient)) {
    return false;
  }
  return true;
}
// Check for adjacent ships
function hasAdjacentShip(startX, startY, size, orient) {
  const dirs = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  for (let i = 0; i < size; i++) {
    const cx = orient === "horizontal" ? startX + i : startX;
    const cy = orient === "horizontal" ? startY : startY + i;
    for (let [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx >= 0 && nx < 10 && ny >= 0 && ny < 10 && myBoard[ny][nx].hasShip) {
        return true;
      }
    }
  }
  return false;
}
// Place the ship
function placeShip(startX, startY, size, orient) {
  currentShip.positions = [];
  for (let i = 0; i < size; i++) {
    const x = orient === "horizontal" ? startX + i : startX;
    const y = orient === "horizontal" ? startY : startY + i;
    myBoard[y][x].hasShip = true;
    myBoard[y][x].el.classList.add("ship");
    currentShip.positions.push({ x, y });
  }
}
// Highlight cells for preview
function highlightCells(startX, startY, size, orient, className) {
  for (let i = 0; i < size; i++) {
    const x = orient === "horizontal" ? startX + i : startX;
    const y = orient === "horizontal" ? startY : startY + i;
    if (x < 10 && y < 10) {
      myBoard[y][x].el.classList.add(className);
    }
  }
}
// Select next unplaced ship
function selectNextShip() {
  currentShip = shipsToPlace.find(ship => !ship.placed);
  if (currentShip) {
    statusEl.textContent = `Place ${currentShip.name} (${currentShip.size} cells)`;
  } else {
    statusEl.textContent = "All ships placed!";
  }
}
// Check if all ships are placed
function allShipsPlaced() {
  return shipsToPlace.every(ship => ship.placed);
}
// Reset ship placement
resetBtn.addEventListener("click", () => {
  myBoard = createBoard(myBoardEl, true);
  shipsToPlace.forEach(ship => {
    ship.placed = false;
    ship.positions = [];
  });
  selectNextShip();
  readyBtn.style.display = "none";
  resetBtn.style.display = "none";
});
// Initialize boards
myBoard = createBoard(myBoardEl, true);
opponentBoard = createBoard(opponentBoardEl, false);
selectNextShip();
readyBtn.style.display = "none";
// Your Metered iceServers array with credentials
const iceServers = [
  {
    urls: "stun:stun.relay.metered.ca:80",
  },
  {
    urls: "turn:global.relay.metered.ca:80",
    username: "4a2277c3086875e0dd39eec5",
    credential: "vzFuqmL2yuT2t5N5",
  },
  {
    urls: "turn:global.relay.metered.ca:80?transport=tcp",
    username: "4a2277c3086875e0dd39eec5",
    credential: "vzFuqmL2yuT2t5N5",
  },
  {
    urls: "turn:global.relay.metered.ca:443",
    username: "4a2277c3086875e0dd39eec5",
    credential: "vzFuqmL2yuT2t5N5",
  },
  {
    urls: "turns:global.relay.metered.ca:443?transport=tcp",
    username: "4a2277c3086875e0dd39eec5",
    credential: "vzFuqmL2yuT2t5N5",
  },
];
const config = {
  appId: 'battleship-p2p-game', // Unique app ID to avoid collisions
  rtcConfig: { iceServers }
};
let room = null;
let sendReady, getReady, sendMove, getMove, sendResult, getResult, sendRematch, getRematch;
// Generate Room ID button logic (added)
const generateBtn = document.getElementById("generate-room");
const controlsDiv = document.querySelector('main > div:first-child'); // The div with input/buttons
generateBtn.addEventListener("click", () => {
  const roomId = crypto.randomUUID();
  opponentInput.value = roomId;
  connectBtn.click(); // Auto-join the generated room
  // Create shareable link and append to controls
  const shareP = document.createElement('p');
  shareP.innerHTML = `Share this link: <a href="${window.location.origin}${window.location.pathname}?room=${roomId}">Join Game</a>`;
  controlsDiv.appendChild(shareP);
});
// Connect (Join Room) button
connectBtn.addEventListener("click", () => {
  const roomId = opponentInput.value.trim();
  if (!roomId) {
    statusEl.textContent = "Status: Enter or generate a Room ID first.";
    return;
  }
  statusEl.textContent = "Status: Joining room...";
  console.log('Joining room:', roomId);
  room = joinRoom(config, roomId);
  // Setup actions for data exchange
  [sendReady, getReady] = room.makeAction('ready');
  [sendMove, getMove] = room.makeAction('move');
  [sendResult, getResult] = room.makeAction('result');
  [sendRematch, getRematch] = room.makeAction('rematch');
  // Listen for opponent joining (for status update)
  room.onPeerJoin(peerId => {
    console.log('Opponent joined:', peerId);
    statusEl.textContent = "Status: Connected. Place ships...";
    if (ready) {
      sendReady({ type: "ready" });
    }
  });
  // Handle incoming data
  getReady((data, peerId) => {
    console.log('Received ready from:', peerId);
    opponentReady = true;
    statusEl.textContent = "Status: Opponent is ready!";
    if (ready) startGame();
  });
  getMove((data, peerId) => {
    console.log('Received move:', data);
    if (!gameStarted) return;
    handleMove(data.x, data.y);
  });
  getResult((data, peerId) => {
    console.log('Received result:', data);
    if (!gameStarted) return;
    handleResult(data);
  });
  getRematch((data, peerId) => {
    console.log('Received rematch request from:', peerId);
    opponentRematchReady = true;
    statusEl.textContent = "Opponent wants a rematch!";
    if (rematchReady) resetGame();
  });
  // Handle disconnects
  room.onPeerLeave(peerId => {
    statusEl.textContent = "Status: Opponent disconnected.";
    console.log('Opponent left:', peerId);
    gameStarted = false;
  });
  // Set my ID (Trystero's selfId)
  myIdEl.textContent = selfId;
});
// Ready button
readyBtn.addEventListener("click", () => {
  if (!allShipsPlaced()) return;
  ready = true;
  readyBtn.disabled = true;
  if (room) {
    console.log('Sending ready');
    sendReady({ type: "ready" });
    statusEl.textContent = "Status: You are ready! Waiting for opponent...";
  } else {
    statusEl.textContent = "Status: Join a room first.";
    ready = false;
    readyBtn.disabled = false;
    return;
  }
  if (opponentReady) startGame();
});
// Rematch button
rematchBtn.addEventListener("click", () => {
  rematchReady = true;
  rematchBtn.disabled = true;
  if (room) {
    console.log('Sending rematch');
    sendRematch({ type: "rematch" });
    statusEl.textContent = "Waiting for opponent to accept rematch...";
  } else {
    statusEl.textContent = "Status: Join a room first.";
    rematchReady = false;
    rematchBtn.disabled = false;
    return;
  }
  if (opponentRematchReady) resetGame();
});
function startGame() {
  gameStarted = true;
  orientationBtn.style.display = "none";
  resetBtn.style.display = "none";
  rematchBtn.style.display = "none";
  statusEl.textContent = "Status: Game started!";
  // Dynamically get opponent ID
  const peers = Object.keys(room.getPeers());
  if (peers.length !== 1) {
    statusEl.textContent = "Status: Error - Must be exactly 2 players.";
    console.error('Unexpected number of peers:', peers.length);
    gameStarted = false;
    return;
  }
  const opponentId = peers[0];
  if (selfId === opponentId) {
    statusEl.textContent = "Status: Error - Duplicate peer ID detected. This usually happens when testing both players in the same browser (peer IDs are persisted in localStorage). Try using different browsers, incognito mode for one player, or clearing localStorage.";
    gameStarted = false;
    return;
  }
  // Decide who starts: lexicographic by selfId and opponentId
  if (selfId < opponentId) {
    myTurn = true;
    statusEl.textContent = "Status: Your turn!";
  } else {
    myTurn = false;
    statusEl.textContent = "Status: Opponent's turn...";
  }
  // Remove placement listeners from my board
  myBoard.flat().forEach(cell => {
    cell.el.removeEventListener("click", placeShipAttempt);
    cell.el.removeEventListener("mouseover", previewShip);
    cell.el.removeEventListener("mouseout", clearPreview);
  });
}
function resetGame() {
  myBoard = createBoard(myBoardEl, true);
  opponentBoard = createBoard(opponentBoardEl, false);
  shipsToPlace.forEach(ship => {
    ship.placed = false;
    ship.positions = [];
  });
  selectNextShip();
  myHits = 0;
  opponentHits = 0;
  ready = false;
  opponentReady = false;
  rematchReady = false;
  opponentRematchReady = false;
  gameStarted = false;
  readyBtn.style.display = "none";
  rematchBtn.style.display = "none";
  rematchBtn.disabled = false;
  readyBtn.disabled = false;
  orientationBtn.style.display = "block";
  resetBtn.style.display = "none";
  statusEl.textContent = "Place your ships for the next game.";
  // Re-add placement listeners to my board
  myBoard.flat().forEach(cell => {
    cell.el.addEventListener("click", placeShipAttempt);
    cell.el.addEventListener("mouseover", previewShip);
    cell.el.addEventListener("mouseout", clearPreview);
  });
}
function handleMove(x, y) {
  if (!gameStarted) return;
  const cell = myBoard[y][x];
  if (cell.attacked) return; // Should not happen
  cell.attacked = true;
  let hit = false;
  let surrounds = [];
  if (cell.hasShip) {
    cell.hit = true;
    cell.el.classList.add("hit");
    hit = true;
    opponentHits++;
    hitSound.play().catch(() => {});
    if ('vibrate' in navigator) {
      navigator.vibrate(200);
    }
    if (opponentHits === totalShipCells) {
      statusEl.textContent = "Status: You lost!";
      defeatSound.play().catch(() => {});
      if ('vibrate' in navigator) {
        navigator.vibrate(500);
      }
      gameStarted = false;
      rematchBtn.style.display = "block";
    } else {
      // Calculate deduced misses around this hit
      const hitPos = { x, y };
      const sunkShip = shipsToPlace.find(ship => ship.positions.some(p => p.x === hitPos.x && p.y === hitPos.y));
      if (sunkShip) {
        const unhitPositions = sunkShip.positions.filter(p => !myBoard[p.y][p.x].hit);
        const surroundSet = new Set();
        const dirs = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
        dirs.forEach(([dx, dy]) => {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < 10 && ny >= 0 && ny < 10 &&
              !myBoard[ny][nx].attacked &&
              !unhitPositions.some(p => p.x === nx && p.y === ny)) {
            surroundSet.add(`${nx},${ny}`);
          }
        });
        surrounds = Array.from(surroundSet).map(key => {
          const [sx, sy] = key.split(',');
          return { x: parseInt(sx), y: parseInt(sy) };
        });
      }
    }
  } else {
    cell.el.classList.add("miss");
  }
  // Send result
  console.log('Sending result:', { type: "result", x, y, hit, surrounds });
  sendResult({ type: "result", x, y, hit, surrounds });
  if (!hit) {
    myTurn = true;
    statusEl.textContent = "Status: Your turn!";
  } else if (opponentHits < totalShipCells) {
    statusEl.textContent = "Status: Opponent's turn..."; // Opponent hit, so they continue (only if not game over)
  }
}
function handleResult(data) {
  if (!gameStarted) return;
  const cell = opponentBoard[data.y][data.x].el; // Note: opponentBoard uses .el
  if (data.hit) {
    cell.classList.add("hit");
    myHits++;
    hitSound.play().catch(() => {});
    if ('vibrate' in navigator) {
      navigator.vibrate(200);
    }
    if (myHits === totalShipCells) {
      statusEl.textContent = "Status: You win!";
      victorySound.play().catch(() => {});
      if ('vibrate' in navigator) {
        navigator.vibrate(500);
      }
      gameStarted = false;
      rematchBtn.style.display = "block";
      return;
    }
    data.surrounds.forEach(s => {
      const sCell = opponentBoard[s.y][s.x].el;
      sCell.classList.add("deduced-miss");
    });
    myTurn = true;
    statusEl.textContent = "Status: Your turn!"; // Hit, continue
  } else {
    cell.classList.add("miss");
    myTurn = false;
    statusEl.textContent = "Status: Opponent's turn..."; // Miss, opponent's turn
  }
}
