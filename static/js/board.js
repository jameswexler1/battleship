// ./static/js/board.js
export function createBoard(el) {
  const grid = [];
  el.innerHTML = ""; // Clear existing cells
  for (let y = 0; y < 10; y++) {
    const row = [];
    for (let x = 0; x < 10; x++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      cell.dataset.x = x;
      cell.dataset.y = y;
      el.appendChild(cell);
      row.push({ hasShip: false, hit: false, attacked: false, el: cell });
    }
    grid.push(row);
  }
  return grid;
}

export function addPlacementListeners(board, state) {
  board.flat().forEach(cell => {
    cell.el.addEventListener("click", state.placementClickHandler);
    cell.el.addEventListener("mouseover", state.previewHandler);
    cell.el.addEventListener("mouseout", state.clearHandler);
  });
}

export function addAttackListeners(board, state) {
  board.flat().forEach(cell => {
    cell.el.addEventListener("click", state.attackClickHandler);
  });
}

// Preview ship placement
export function previewShip(cell, state) {
  if (!state.currentShip || state.gameStarted) return;
  const x = parseInt(cell.dataset.x);
  const y = parseInt(cell.dataset.y);
  clearPreview();
  if (canPlaceShip(x, y, state.currentShip.size, state.orientation, state)) {
    highlightCells(x, y, state.currentShip.size, state.orientation, "preview", state);
  }
}

// Clear preview highlights
export function clearPreview() {
  document.querySelectorAll(".preview").forEach(el => el.classList.remove("preview"));
}

// Attempt to place ship on click
export function placeShipAttempt(cell, state, statusEl, readyBtn, resetBtn) {
  if (!state.currentShip || state.gameStarted) return;
  const x = parseInt(cell.dataset.x);
  const y = parseInt(cell.dataset.y);
  if (canPlaceShip(x, y, state.currentShip.size, state.orientation, state)) {
    placeShip(x, y, state.currentShip.size, state.orientation, state);
    state.currentShip.placed = true;
    selectNextShip(state, statusEl);
    if (allShipsPlaced(state)) {
      readyBtn.style.display = "block";
      resetBtn.style.display = "block";
      statusEl.textContent = "All ships placed! Click 'I'm Ready' when ready.";
    }
    state.save();
  }
}

// Check if ship can be placed (no overlap, in bounds, no adjacent ships)
export function canPlaceShip(startX, startY, size, orient, state) {
  // Check bounds and overlap
  for (let i = 0; i < size; i++) {
    const x = orient === "horizontal" ? startX + i : startX;
    const y = orient === "horizontal" ? startY : startY + i;
    if (x >= 10 || y >= 10 || state.myBoard[y][x].hasShip) {
      return false;
    }
  }
  // Check no adjacent ships (including diagonally)
  if (hasAdjacentShip(startX, startY, size, orient, state)) {
    return false;
  }
  return true;
}

// Check for adjacent ships
export function hasAdjacentShip(startX, startY, size, orient, state) {
  const dirs = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  for (let i = 0; i < size; i++) {
    const cx = orient === "horizontal" ? startX + i : startX;
    const cy = orient === "horizontal" ? startY : startY + i;
    for (let [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx >= 0 && nx < 10 && ny >= 0 && ny < 10 && state.myBoard[ny][nx].hasShip) {
        return true;
      }
    }
  }
  return false;
}

// Place the ship
export function placeShip(startX, startY, size, orient, state) {
  state.currentShip.positions = [];
  for (let i = 0; i < size; i++) {
    const x = orient === "horizontal" ? startX + i : startX;
    const y = orient === "horizontal" ? startY : startY + i;
    state.myBoard[y][x].hasShip = true;
    state.myBoard[y][x].el.classList.add("ship");
    state.currentShip.positions.push({ x, y });
  }
}

// Highlight cells for preview
export function highlightCells(startX, startY, size, orient, className, state) {
  for (let i = 0; i < size; i++) {
    const x = orient === "horizontal" ? startX + i : startX;
    const y = orient === "horizontal" ? startY : startY + i;
    if (x < 10 && y < 10) {
      state.myBoard[y][x].el.classList.add(className);
    }
  }
}

// Select next unplaced ship
export function selectNextShip(state, statusEl) {
  state.currentShip = state.shipsToPlace.find(ship => !ship.placed);
  if (state.currentShip) {
    statusEl.textContent = `Place ${state.currentShip.name} (${state.currentShip.size} cells)`;
  } else {
    statusEl.textContent = "All ships placed!";
  }
}

// Check if all ships are placed
export function allShipsPlaced(state) {
  return state.shipsToPlace.every(ship => ship.placed);
}

export function initBoard(myBoardEl, opponentBoardEl, state, statusEl, readyBtn, resetBtn, orientationBtn, rematchBtn) {
  state.myBoard = createBoard(myBoardEl);
  addPlacementListeners(state.myBoard, state);
  state.opponentBoard = createBoard(opponentBoardEl);
  addAttackListeners(state.opponentBoard, state);
  selectNextShip(state, statusEl);
  readyBtn.style.display = "none";
  resetBtn.style.display = "none";
  orientationBtn.style.display = "block";
  rematchBtn.style.display = "none";
}
