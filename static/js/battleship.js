// ./static/js/battleship.js
import { shipsToPlaceTemplate, shipSizes, totalShipCells } from './config.js';
import { adjustStatusPosition, adjustLayout, createTargetsEl, wrapBoards, addStyles, createMuteBtn } from './ui.js';
import { initBoard, createBoard, placeShipAttempt, previewShip, clearPreview, selectNextShip, addPlacementListeners, addAttackListeners } from './board.js';
import { initConnectivity } from './connectivity.js';
import { startGame, resetGame, handleMove, handleResult } from './game.js';
import { allShipsPlaced } from './board.js';

const myBoardEl = document.getElementById("my-board");
const opponentBoardEl = document.getElementById("opponent-board");
const statusEl = document.getElementById("status");
const myIdEl = document.getElementById("my-id");
const connectBtn = document.getElementById("connect-btn");
const readyBtn = document.getElementById("ready-btn");
const opponentInput = document.getElementById("opponent-id");
const generateBtn = document.getElementById("generate-room");
const resetBtn = document.createElement("button");
resetBtn.textContent = "Reset Ships";
const orientationBtn = document.createElement("button");
orientationBtn.textContent = "Toggle Orientation (Horizontal)";
orientationBtn.addEventListener("click", () => {
  state.orientation = state.orientation === "horizontal" ? "vertical" : "horizontal";
  orientationBtn.textContent = `Toggle Orientation (${state.orientation.charAt(0).toUpperCase() + state.orientation.slice(1)})`;
});
const rematchBtn = document.createElement("button");
rematchBtn.textContent = "Rematch";
// Insert buttons after readyBtn (before boards for better visibility)
readyBtn.parentNode.insertBefore(orientationBtn, readyBtn.nextSibling);
readyBtn.parentNode.insertBefore(resetBtn, orientationBtn.nextSibling);
readyBtn.parentNode.insertBefore(rematchBtn, resetBtn.nextSibling);
let state = {
  myTurn: false,
  myBoard: [],
  opponentBoard: [],
  shipsToPlace: shipsToPlaceTemplate.map(ship => ({ ...ship })),
  currentShip: null,
  orientation: "horizontal",
  ready: false,
  opponentReady: false,
  rematchReady: false,
  opponentRematchReady: false,
  gameStarted: false,
  myHits: 0,
  opponentHits: 0,
  isMuted: false,
  room: null,
  sendReady: null,
  getReady: null,
  sendMove: null,
  getMove: null,
  sendResult: null,
  getResult: null,
  sendRematch: null,
  getRematch: null,
  sendChat: null,
  getChat: null,
  sunkOpponentShips: [],
  opponentConnected: false,
  opponentId: null,
  roomId: null
};
state.placementClickHandler = (e) => placeShipAttempt(e.target, state, statusEl, readyBtn, resetBtn);
state.previewHandler = (e) => previewShip(e.target, state);
state.clearHandler = () => clearPreview();
state.attackClickHandler = (e) => {
  const cell = e.target;
  const x = parseInt(cell.dataset.x);
  const y = parseInt(cell.dataset.y);
  if (state.myTurn && state.gameStarted && state.room && state.opponentConnected && !cell.classList.contains('hit') && !cell.classList.contains('miss') && !cell.classList.contains('deduced-miss')) {
    state.sendMove({ type: "move", x, y });
    state.myTurn = false;
    statusEl.textContent = "Status: Waiting for opponent...";
  }
};
const controlsDiv = document.querySelector('main > div:first-child');
controlsDiv.classList.add('controls');
addStyles();
window.addEventListener('resize', () => adjustStatusPosition(statusEl));
adjustStatusPosition(statusEl);
adjustLayout();
const targetsEl = createTargetsEl(shipSizes);
wrapBoards(myBoardEl, opponentBoardEl, targetsEl);
createMuteBtn(controlsDiv, state);
initBoard(myBoardEl, opponentBoardEl, state, statusEl, readyBtn, resetBtn, orientationBtn, rematchBtn);
resetBtn.addEventListener("click", () => {
  state.myBoard = createBoard(myBoardEl);
  addPlacementListeners(state.myBoard, state);
  state.shipsToPlace.forEach(ship => {
    ship.placed = false;
    ship.positions = [];
  });
  selectNextShip(state, statusEl);
  readyBtn.style.display = "none";
  resetBtn.style.display = "none";
});
function serializeState(state) {
  return {
    shipsToPlace: state.shipsToPlace.map(ship => ({ name: ship.name, size: ship.size, placed: ship.placed, positions: ship.positions })),
    myHits: state.myHits,
    opponentHits: state.opponentHits,
    myTurn: state.myTurn,
    ready: state.ready,
    opponentReady: state.opponentReady,
    gameStarted: state.gameStarted,
    isMuted: state.isMuted,
    orientation: state.orientation,
    sunkOpponentShips: state.sunkOpponentShips,
    opponentId: state.opponentId,
    myBoardCells: state.myBoard.map(row => row.map(cell => ({ hasShip: cell.hasShip, hit: cell.hit, attacked: cell.attacked }))),
    opponentBoardCells: state.opponentBoard.map(row => row.map(cell => ({ hit: cell.el.classList.contains('hit'), miss: cell.el.classList.contains('miss'), deducedMiss: cell.el.classList.contains('deduced-miss') }))),
  };
}
function saveState(theState) {
  if (theState.roomId) {
    localStorage.setItem(`battleship-state-${theState.roomId}`, JSON.stringify(serializeState(theState)));
  }
}
function loadAndApplyState(roomId, theState, myBoardEl, opponentBoardEl, statusEl, readyBtn, resetBtn, orientationBtn, rematchBtn) {
  const saved = localStorage.getItem(`battleship-state-${roomId}`);
  if (!saved) return false;
  const data = JSON.parse(saved);
  theState.shipsToPlace = data.shipsToPlace.map(ship => ({ ...ship, positions: ship.positions.map(p => ({ ...p })) }));
  theState.myHits = data.myHits;
  theState.opponentHits = data.opponentHits;
  theState.myTurn = data.myTurn;
  theState.ready = data.ready;
  theState.opponentReady = data.opponentReady;
  theState.gameStarted = data.gameStarted;
  theState.isMuted = data.isMuted;
  theState.orientation = data.orientation;
  theState.sunkOpponentShips = data.sunkOpponentShips;
  theState.opponentId = data.opponentId;
  // Rebuild boards
  theState.myBoard = createBoard(myBoardEl);
  data.myBoardCells.forEach((row, y) => {
    row.forEach((c, x) => {
      theState.myBoard[y][x].hasShip = c.hasShip;
      theState.myBoard[y][x].hit = c.hit;
      theState.myBoard[y][x].attacked = c.attacked;
      if (c.hasShip) theState.myBoard[y][x].el.classList.add('ship');
      if (c.hit) theState.myBoard[y][x].el.classList.add('hit');
      if (c.attacked && !c.hit) theState.myBoard[y][x].el.classList.add('miss');
    });
  });
  theState.opponentBoard = createBoard(opponentBoardEl);
  data.opponentBoardCells.forEach((row, y) => {
    row.forEach((c, x) => {
      const el = theState.opponentBoard[y][x].el;
      if (c.hit) el.classList.add('hit');
      if (c.miss) el.classList.add('miss');
      if (c.deducedMiss) el.classList.add('deduced-miss');
    });
  });
  addAttackListeners(theState.opponentBoard, theState);
  // Apply sunk ships to targets
  theState.sunkOpponentShips.forEach(size => {
    const shipRep = document.querySelector(`.ship-rep[data-size="${size}"]:not(.sunk)`);
    if (shipRep) shipRep.classList.add('sunk');
  });
  // Handle UI based on state
  if (theState.myHits === totalShipCells || theState.opponentHits === totalShipCells) {
    theState.gameStarted = false;
    orientationBtn.style.display = "none";
    resetBtn.style.display = "none";
    readyBtn.style.display = "none";
    readyBtn.disabled = true;
    rematchBtn.style.display = "block";
    statusEl.textContent = theState.myHits === totalShipCells ? "You win! Waiting for rematch..." : "You lost! Waiting for rematch...";
  } else if (theState.gameStarted) {
    orientationBtn.style.display = "none";
    resetBtn.style.display = "none";
    readyBtn.style.display = "none";
    readyBtn.disabled = true;
    statusEl.textContent = "Waiting for opponent to reconnect...";
  } else {
    addPlacementListeners(theState.myBoard, theState);
    selectNextShip(theState, statusEl);
    orientationBtn.style.display = "block";
    rematchBtn.style.display = "none";
    readyBtn.disabled = false;
    if (allShipsPlaced(theState)) {
      readyBtn.style.display = "block";
      resetBtn.style.display = "block";
    } else {
      readyBtn.style.display = "none";
      resetBtn.style.display = "none";
    }
  }
  return true;
}
state.save = () => saveState(state);
state.loadAndApply = (roomId) => loadAndApplyState(roomId, state, myBoardEl, opponentBoardEl, statusEl, readyBtn, resetBtn, orientationBtn, rematchBtn);
initConnectivity(generateBtn, connectBtn, opponentInput, myIdEl, statusEl, controlsDiv, readyBtn, rematchBtn, state, () => startGame(state, statusEl, orientationBtn, resetBtn, rematchBtn), () => resetGame(state, myBoardEl, opponentBoardEl, statusEl, readyBtn, rematchBtn, orientationBtn, resetBtn), (x, y) => handleMove(x, y, state, statusEl, rematchBtn), (data) => handleResult(data, state, statusEl, rematchBtn));
