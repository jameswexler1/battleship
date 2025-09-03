\
    (() => {
      // Configuration
      const GRID_SIZE = 10;
      const SHIPS = [5,4,3,3,2]; // classic set

      // DOM helpers
      const $ = (sel) => document.querySelector(sel);
      const log = (msg) => { const el = $('#log'); if (!el) return; const t = new Date().toLocaleTimeString(); el.textContent += `[${t}] ${msg}\n`; el.scrollTop = el.scrollHeight; };

      // UI elements
      const myIdInp = $('#myId');
      const peerIdInp = $('#peerId');
      const connectBtn = $('#connectBtn');
      const copyBtn = $('#copyId');
      const statusEl = $('#status');
      const myBoardEl = $('#myBoard');
      const opBoardEl = $('#opBoard');
      const randomBtn = $('#randomizeBtn');
      const readyBtn = $('#readyBtn');
      const resetBtn = $('#resetBtn');
      const turnEl = $('#turnIndicator');

      // Game state
      const state = {
        peer: null,
        conn: null,
        myId: null,
        ready: false,
        opReady: false,
        myTurn: false,
        myBoard: createMatrix(GRID_SIZE, GRID_SIZE, 0), // 0 empty, 1 ship, 2 hit, 3 miss
        opBoard: createMatrix(GRID_SIZE, GRID_SIZE, 0), // we track hits/misses only
        ships: [], // list of ship coordinates for me
        sunkCount: 0,
        opSunkCount: 0,
      };

      // Build boards
      function buildBoards() {
        myBoardEl.style.setProperty('--size', GRID_SIZE);
        opBoardEl.style.setProperty('--size', GRID_SIZE);
        myBoardEl.innerHTML = '';
        opBoardEl.innerHTML = '';

        for (let y=0; y<GRID_SIZE; y++) {
          for (let x=0; x<GRID_SIZE; x++) {
            const c1 = document.createElement('div'); c1.className = 'cell'; c1.dataset.x = x; c1.dataset.y = y; c1.dataset.board = 'me';
            myBoardEl.appendChild(c1);
            const c2 = document.createElement('div'); c2.className = 'cell'; c2.dataset.x = x; c2.dataset.y = y; c2.dataset.board = 'op';
            c2.addEventListener('click', onFireCell);
            opBoardEl.appendChild(c2);
          }
        }
        updateTargetability();
      }

      function createMatrix(w,h,val=0){ return Array.from({length:h},()=>Array.from({length:w},()=>val)); }

      function clearBoards() {
        state.myBoard = createMatrix(GRID_SIZE, GRID_SIZE, 0);
        state.opBoard = createMatrix(GRID_SIZE, GRID_SIZE, 0);
        state.ships = [];
        state.sunkCount = 0; state.opSunkCount = 0;
        Array.from(myBoardEl.children).forEach(c=>c.className='cell');
        Array.from(opBoardEl.children).forEach(c=>c.className='cell');
        turnEl.textContent = 'Turn: —';
      }

      function randomPlacement() {
        clearBoards();
        const b = state.myBoard;
        for (const len of SHIPS) placeShipRandom(b, len);
        // Paint ships
        for (let y=0;y<GRID_SIZE;y++) for (let x=0;x<GRID_SIZE;x++) if (b[y][x]===1) cellAt(myBoardEl,x,y).classList.add('ship');
        log('Ships randomized.');
      }

      function placeShipRandom(board, len, maxTries=400){
        for(let t=0;t<maxTries;t++){
          const horiz = Math.random()<0.5;
          const x0 = Math.floor(Math.random()*(GRID_SIZE-(horiz?len:0)));
          const y0 = Math.floor(Math.random()*(GRID_SIZE-(horiz?0:len)));
          let ok = true; const coords=[];
          for(let i=0;i<len;i++){
            const x=x0+(horiz?i:0), y=y0+(horiz?0:i);
            if(board[y][x]!==0){ ok=false; break; }
            // avoid adjacency: check neighbors
            for(let yy=Math.max(0,y-1); yy<=Math.min(GRID_SIZE-1,y+1); yy++)
              for(let xx=Math.max(0,x-1); xx<=Math.min(GRID_SIZE-1,x+1); xx++)
                if(board[yy][xx]===1){ ok=false; }
            coords.push([x,y]);
          }
          if(ok){ for(const [x,y] of coords) board[y][x]=1; state.ships.push(coords); return true; }
        }
        return false;
      }

      function cellAt(container,x,y){ return container.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`); }

      function setStatus(txt){ statusEl.textContent = 'Status: ' + txt; }

      // Turn assignment: deterministic by lexicographic order of peer IDs so both sides agree.
      function decideFirstTurn(myId, opId){ return myId < opId; }

      // Messaging helpers
      function send(type, payload={}){
        if(!state.conn || state.conn.open!==True) {
            // In browser JS, True is undefined. Ensure boolean is lowercase.
        }
      }
      // fix boolean typo at runtime by redefining:
      function sendMsg(type, payload={}){
        if(!state.conn || state.conn.open!==true) return;
        state.conn.send({ type, payload });
      }

      // Firing handler
      function onFireCell(e){
        if(!state.ready || !state.opReady){ log('Both players must be Ready.'); return; }
        if(!state.myTurn){ log('Not your turn.'); return; }
        const x = Number(e.currentTarget.dataset.x), y = Number(e.currentTarget.dataset.y);
        // Prevent re-firing same cell
        if(state.opBoard[y][x]===2 || state.opBoard[y][x]===3){ log('Already fired at this cell.'); return; }
        sendMsg('move', { x, y });
        state.myTurn = false; updateTurnUI();
      }

      function updateTurnUI(){ turnEl.textContent = 'Turn: ' + (state.myTurn ? 'Yours' : 'Opponent'); updateTargetability(); }
      function updateTargetability(){
        Array.from(opBoardEl.children).forEach(c=>{
          if(state.myTurn && state.ready && state.opReady && state.conn?.open){
            c.classList.add('target');
          } else {
            c.classList.remove('target');
          }
        });
      }

      // Apply an incoming shot on my board
      function applyShot(x,y){
        const b = state.myBoard; let result = 'miss';
        if(b[y][x]===1){ b[y][x]=2; result='hit';
          cellAt(myBoardEl,x,y).classList.add('hit');
        } else if (b[y][x]===0) {
          b[y][x]=3; cellAt(myBoardEl,x,y).classList.add('miss');
        } else {
          // already shot here -> counts as miss to avoid cheating loop
          result='miss';
        }
        // Check sunk
        if(result==='hit'){ if(checkSunkAt(x,y)) { result='sunk'; state.sunkCount++; } }
        return result;
      }

      function checkSunkAt(x,y){
        for(const ship of state.ships){
          if(ship.some(([sx,sy])=>sx===x && sy===y)){
            return ship.every(([sx,sy])=> state.myBoard[sy][sx]===2);
          }
        }
        return false;
      }

      function handleMoveResult(x,y,result){
        const c = cellAt(opBoardEl,x,y);
        if(result==='hit' || result==='sunk'){ state.opBoard[y][x]=2; c.classList.remove('target'); c.classList.add('hit'); if(result==='sunk'){ state.opSunkCount++; }
        } else { state.opBoard[y][x]=3; c.classList.remove('target'); c.classList.add('miss'); }
      }

      function checkVictory(){
        const totalShips = SHIPS.length; // counting ships sunk
        if(state.opSunkCount>=totalShips){ setStatus('You win!'); log('You win!'); return true; }
        if(state.sunkCount>=totalShips){ setStatus('You lose.'); log('You lose.'); return true; }
        return false;
      }

      // Connection setup
      function initPeer(){
        setStatus('Connecting to PeerJS…');
        const peer = new Peer(undefined, {
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478?transport=udp' }
            ]
          }
        });

        state.peer = peer;

        peer.on('open', (id) => { state.myId = id; myIdInp.value = id; setStatus('Share your ID or connect to an opponent.'); log('Peer open: ' + id); });
        peer.on('error', (err) => { setStatus('Peer error: ' + err.type); log('Peer error: ' + err); });
        peer.on('disconnected', () => { setStatus('Disconnected. Trying to reconnect…'); log('Peer disconnected.'); peer.reconnect(); });
        peer.on('close', () => { setStatus('Peer closed.'); log('Peer closed.'); });

        // Incoming connection
        peer.on('connection', (conn) => {
          if(state.conn && state.conn.open){ conn.close(); return; } // allow single opponent
          attachConn(conn);
        });
      }

      function attachConn(conn){
        state.conn = conn;
        setStatus('Connecting…');

        conn.on('open', () => {
          setStatus('Connected to opponent.');
          log('Data channel open.');
          sendMsg('hello', { id: state.myId });
          updateTargetability();
        });

        conn.on('data', (msg) => {
          const { type, payload } = msg || {};
          if(type==='hello'){ log('Opponent hello: ' + (payload?.id||'')); }
          else if(type==='ready'){ state.opReady = true; log('Opponent is Ready.'); onBothReady(); }
          else if(type==='move'){
            const {x,y} = payload;
            const result = applyShot(x,y);
            sendMsg('result', { x,y,result });
            if(checkVictory()) return;
            state.myTurn = true; updateTurnUI();
          }
          else if(type==='result'){
            const {x,y,result} = payload;
            handleMoveResult(x,y,result);
            if(checkVictory()) return;
          }
          else if(type==='reset'){
            doReset(false);
          }
        });

        conn.on('close', () => { setStatus('Connection closed.'); log('Connection closed.'); updateTargetability(); });
        conn.on('error', (e) => { setStatus('Connection error.'); log('Conn error: ' + e); });
      }

      // UI listeners
      connectBtn?.addEventListener('click', () => {
        const pid = (peerIdInp.value||'').trim();
        if(!pid){ alert('Enter opponent Peer ID'); return; }
        if(!state.peer){ alert('Peer not ready'); return; }
        const conn = state.peer.connect(pid, { reliable: true });
        attachConn(conn);
      });

      copyBtn?.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(myIdInp.value||''); copyBtn.textContent='Copied!'; setTimeout(()=>copyBtn.textContent='Copy',1000); }
        catch(e){ alert('Copy failed.'); }
      });

      randomBtn?.addEventListener('click', randomPlacement);

      readyBtn?.addEventListener('click', () => {
        if(!state.conn || !state.conn.open){ alert('Connect to an opponent first.'); return; }
        if(state.ready){ log('Already Ready.'); return; }
        if(state.ships.length===0){ randomPlacement(); }
        state.ready = true; readyBtn.disabled = true; log('You are Ready.'); setStatus('Waiting for opponent to be Ready…');
        sendMsg('ready', {});
        onBothReady();
      });

      resetBtn?.addEventListener('click', () => {
        doReset(true);
      });

      function doReset(informPeer){
        state.ready=false; state.opReady=false; readyBtn.disabled=false;
        clearBoards(); randomPlacement();
        setStatus('Game reset.');
        if(informPeer) sendMsg('reset', {});
        updateTargetability();
      }

      function onBothReady(){
        if(state.ready && state.opReady){
          const iStart = decideFirstTurn(state.myId, state.conn.peer);
          state.myTurn = iStart;
          updateTurnUI();
          setStatus('Both Ready. Game start.' + (iStart ? ' You go first.' : ' Opponent goes first.'));
          log('Both Ready. ' + (iStart? 'You start.':'Opponent starts.'));
          updateTargetability();
        }
      }

      // Boot
      buildBoards();
      randomPlacement();
      initPeer();
    })();
