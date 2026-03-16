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
