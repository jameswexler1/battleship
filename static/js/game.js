// ./static/js/game.js
import { selfId } from 'https://esm.run/trystero/torrent';
import { hitSound, victorySound, defeatSound, totalShipCells } from './config.js';
import { allShipsPlaced, createBoard, selectNextShip, addPlacementListeners, addAttackListeners } from './board.js';

export function startGame(state, statusEl, orientationBtn, resetBtn, rematchBtn) {
  state.gameStarted = true;
  orientationBtn.style.display = "none";
  resetBtn.style.display = "none";
  rematchBtn.style.display = "none";
  statusEl.textContent = "Status: Game started!";
  // Dynamically get opponent ID
  const peers = Object.keys(state.room.getPeers());
  if (peers.length !== 1) {
    statusEl.textContent = "Status: Error - Must be exactly 2 players.";
    console.error('Unexpected number of peers:', peers.length);
    state.gameStarted = false;
    return;
  }
  const opponentId = peers[0];
  if (selfId === opponentId) {
    statusEl.textContent = "Status: Error - Duplicate peer ID detected. This usually happens when testing both players in the same browser (peer IDs are persisted in localStorage). Try using different browsers, incognito mode for one player, or clearing localStorage.";
    state.gameStarted = false;
    return;
  }
  state.opponentId = opponentId;
  // Decide who starts: lexicographic by selfId and opponentId
  if (selfId < opponentId) {
    state.myTurn = true;
    statusEl.textContent = "Status: Your turn!";
  } else {
    state.myTurn = false;
    statusEl.textContent = "Status: Opponent's turn...";
  }
  // Remove placement listeners from my board
  state.myBoard.flat().forEach(cell => {
    cell.el.removeEventListener("click", state.placementClickHandler);
    cell.el.removeEventListener("mouseover", state.previewHandler);
    cell.el.removeEventListener("mouseout", state.clearHandler);
  });
  state.save();
}

export function resetGame(state, myBoardEl, opponentBoardEl, statusEl, readyBtn, rematchBtn, orientationBtn, resetBtn) {
  if (state.roomId) {
    localStorage.removeItem(`battleship-state-${state.roomId}`);
  }
  state.myBoard = createBoard(myBoardEl);
  state.opponentBoard = createBoard(opponentBoardEl);
  state.shipsToPlace.forEach(ship => {
    ship.placed = false;
    ship.positions = [];
  });
  selectNextShip(state, statusEl);
  state.myHits = 0;
  state.opponentHits = 0;
  state.ready = false;
  state.opponentReady = false;
  state.rematchReady = false;
  state.opponentRematchReady = false;
  state.gameStarted = false;
  state.sunkOpponentShips = [];
  state.opponentId = null;
  state.opponentConnected = false;
  readyBtn.style.display = "none";
  rematchBtn.style.display = "none";
  rematchBtn.disabled = false;
  readyBtn.disabled = false;
  orientationBtn.style.display = "block";
  resetBtn.style.display = "none";
  // Clear chat log
  const chatLog = document.getElementById('chat-log');
  if (chatLog) chatLog.innerHTML = '';
  // Re-add placement listeners to my board
  addPlacementListeners(state.myBoard, state);
  // Re-add attack listeners to opponent board
  addAttackListeners(state.opponentBoard, state);
  // Reset target list
  document.querySelectorAll('.ship-rep.sunk').forEach(el => el.classList.remove('sunk'));
  // Manually check for connected peers after reset (since room is persistent)
  if (state.room) {
    const peers = Object.keys(state.room.getPeers());
    if (peers.length === 1) {
      state.opponentId = peers[0];
      state.opponentConnected = true;
      statusEl.textContent = "Status: Connected. Place ships for the next game.";
    } else {
      statusEl.textContent = "Status: Waiting for opponent... Place ships when connected.";
    }
  } else {
    statusEl.textContent = "Status: No room. Please reconnect.";
  }
}

export function handleMove(x, y, state, statusEl, rematchBtn) {
  if (!state.gameStarted) return;
  const cell = state.myBoard[y][x];
  if (cell.attacked) return; // Should not happen
  cell.attacked = true;
  let hit = false;
  let surrounds = [];
  let sunkSize = undefined;
  if (cell.hasShip) {
    cell.hit = true;
    cell.el.classList.add("hit");
    hit = true;
    state.opponentHits++;
    if (!state.isMuted) hitSound.play().catch(() => {});
    if ('vibrate' in navigator) {
      navigator.vibrate(200);
    }
    const hitPos = { x, y };
    const sunkShip = state.shipsToPlace.find(ship => ship.positions.some(p => p.x === hitPos.x && p.y === hitPos.y));
    if (sunkShip) {
      const hitPositions = sunkShip.positions.filter(p => state.myBoard[p.y][p.x].hit);
      const hitCount = hitPositions.length;
      const isSunk = hitCount === sunkShip.size;
      if (isSunk) {
        sunkSize = sunkShip.size;
      }
      const surroundSet = new Set();
      const dirs = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
      const diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
      if (isSunk) {
        // Mark all around the entire ship
        sunkShip.positions.forEach(pos => {
          dirs.forEach(([dx, dy]) => {
            const nx = pos.x + dx;
            const ny = pos.y + dy;
            if (nx >= 0 && nx < 10 && ny >= 0 && ny < 10 && !state.myBoard[ny][nx].attacked) {
              surroundSet.add(`${nx},${ny}`);
            }
          });
        });
      } else {
        // Not sunk, determine direction from hit positions
        const isHorizontal = hitPositions.every(p => p.y === hitPositions[0].y);
        const isVertical = hitPositions.every(p => p.x === hitPositions[0].x);
        let clusters = [];
        if (isHorizontal) {
          const y = hitPositions[0].y;
          const hitXs = hitPositions.map(p => p.x).sort((a, b) => a - b);
          let currentCluster = [hitXs[0]];
          for (let i = 1; i < hitXs.length; i++) {
            if (hitXs[i] === hitXs[i - 1] + 1) {
              currentCluster.push(hitXs[i]);
            } else {
              clusters.push(currentCluster);
              currentCluster = [hitXs[i]];
            }
          }
          clusters.push(currentCluster);
          clusters.forEach(cluster => {
            const clusterSize = cluster.length;
            const minX = cluster[0];
            const maxX = cluster[cluster.length - 1];
            if (clusterSize === 1) {
              // Mark only 4 diagonals
              diagDirs.forEach(([dx, dy]) => {
                const nx = minX + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < 10 && ny >= 0 && ny < 10 && !state.myBoard[ny][nx].attacked) {
                  surroundSet.add(`${nx},${ny}`);
                }
              });
            } else {
              // Mark all adjacent except the two extensions
              const extSet = new Set();
              const ext1 = minX - 1;
              if (ext1 >= 0) extSet.add(`${ext1},${y}`);
              const ext2 = maxX + 1;
              if (ext2 < 10) extSet.add(`${ext2},${y}`);
              for (let cx = minX; cx <= maxX; cx++) {
                dirs.forEach(([dx, dy]) => {
                  const nx = cx + dx;
                  const ny = y + dy;
                  if (nx >= 0 && nx < 10 && ny >= 0 && ny < 10 && !state.myBoard[ny][nx].attacked && !extSet.has(`${nx},${ny}`)) {
                    surroundSet.add(`${nx},${ny}`);
                  }
                });
              }
            }
          });
        } else if (isVertical) {
          const x = hitPositions[0].x;
          const hitYs = hitPositions.map(p => p.y).sort((a, b) => a - b);
          let currentCluster = [hitYs[0]];
          for (let i = 1; i < hitYs.length; i++) {
            if (hitYs[i] === hitYs[i - 1] + 1) {
              currentCluster.push(hitYs[i]);
            } else {
              clusters.push(currentCluster);
              currentCluster = [hitYs[i]];
            }
          }
          clusters.push(currentCluster);
          clusters.forEach(cluster => {
            const clusterSize = cluster.length;
            const minY = cluster[0];
            const maxY = cluster[cluster.length - 1];
            if (clusterSize === 1) {
              // Mark only 4 diagonals
              diagDirs.forEach(([dx, dy]) => {
                const nx = x + dx;
                const ny = minY + dy;
                if (nx >= 0 && nx < 10 && ny >= 0 && ny < 10 && !state.myBoard[ny][nx].attacked) {
                  surroundSet.add(`${nx},${ny}`);
                }
              });
            } else {
              // Mark all adjacent except the two extensions
              const extSet = new Set();
              const ext1 = minY - 1;
              if (ext1 >= 0) extSet.add(`${x},${ext1}`);
              const ext2 = maxY + 1;
              if (ext2 < 10) extSet.add(`${x},${ext2}`);
              for (let cy = minY; cy <= maxY; cy++) {
                dirs.forEach(([dx, dy]) => {
                  const nx = x + dx;
                  const ny = cy + dy;
                  if (nx >= 0 && nx < 10 && ny >= 0 && ny < 10 && !state.myBoard[ny][nx].attacked && !extSet.has(`${nx},${ny}`)) {
                    surroundSet.add(`${nx},${ny}`);
                  }
                });
              }
            }
          });
        }
      }
      surrounds = Array.from(surroundSet).map(key => {
        const [sx, sy] = key.split(',');
        return { x: parseInt(sx), y: parseInt(sy) };
      });
    }
    if (state.opponentHits === totalShipCells) {
      statusEl.textContent = "Status: You lost!";
      if (!state.isMuted) defeatSound.play().catch(() => {});
      if ('vibrate' in navigator) {
        navigator.vibrate(500);
      }
      state.gameStarted = false;
      rematchBtn.style.display = "block";
    }
  } else {
    cell.el.classList.add("miss");
  }
  // Send result
  console.log('Sending result:', { type: "result", x, y, hit, surrounds, sunkSize });
  state.sendResult({ type: "result", x, y, hit, surrounds, sunkSize });
  if (!hit) {
    state.myTurn = true;
    statusEl.textContent = "Status: Your turn!";
  } else if (state.opponentHits < totalShipCells) {
    statusEl.textContent = "Status: Opponent's turn..."; // Opponent hit, so they continue (only if not game over)
  }
  state.save();
}

export function handleResult(data, state, statusEl, rematchBtn) {
  if (!state.gameStarted) return;
  const cell = state.opponentBoard[data.y][data.x].el; // Note: opponentBoard uses .el
  if (data.hit) {
    cell.classList.add("hit");
    state.myHits++;
    if (!state.isMuted) hitSound.play().catch(() => {});
    if ('vibrate' in navigator) {
      navigator.vibrate(200);
    }
    if (data.sunkSize) {
      state.sunkOpponentShips.push(data.sunkSize);
      const shipRep = document.querySelector(`.ship-rep[data-size="${data.sunkSize}"]:not(.sunk)`);
      if (shipRep) {
        shipRep.classList.add("sunk");
      }
    }
    data.surrounds.forEach(s => {
      const sCell = state.opponentBoard[s.y][s.x].el;
      sCell.classList.add("deduced-miss");
    });
    if (state.myHits === totalShipCells) {
      statusEl.textContent = "Status: You win!";
      if (!state.isMuted) victorySound.play().catch(() => {});
      if ('vibrate' in navigator) {
        navigator.vibrate(500);
      }
      state.gameStarted = false;
      rematchBtn.style.display = "block";
      return;
    }
    state.myTurn = true;
    statusEl.textContent = "Status: Your turn!"; // Hit, continue
  } else {
    cell.classList.add("miss");
    state.myTurn = false;
    statusEl.textContent = "Status: Opponent's turn..."; // Miss, opponent's turn
  }
  state.save();
}
