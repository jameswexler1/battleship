// ./static/js/ui.js
export function adjustStatusPosition(statusEl) {
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
  adjustLayout();
}

export function adjustLayout() {
  const isMobile = window.innerWidth <= 768;
  const padding = document.querySelector('.targets-padding');
  if (padding) {
    padding.style.display = isMobile ? 'none' : 'block';
  }
  const targetsEl = document.getElementById('targets');
  if (targetsEl) {
    targetsEl.style.marginLeft = isMobile ? '0' : '40px';
    targetsEl.style.marginTop = isMobile ? '40px' : '0';
  }
}

export function createTargetsEl(shipSizes) {
  const targetsEl = document.createElement("div");
  targetsEl.id = "targets";
  targetsEl.style.width = "80px";
  shipSizes.forEach(group => {
    for (let i = 0; i < group.count; i++) {
      const rep = document.createElement("div");
      rep.classList.add("ship-rep");
      rep.dataset.size = group.size;
      for (let j = 0; j < group.size; j++) {
        const mini = document.createElement("div");
        mini.classList.add("mini-cell");
        rep.appendChild(mini);
      }
      targetsEl.appendChild(rep);
    }
  });
  return targetsEl;
}

export function wrapBoards(myBoardEl, opponentBoardEl, targetsEl) {
  const myContainer = myBoardEl.parentNode;
  const opponentContainer = opponentBoardEl.parentNode;
  const myBoardContainer = document.createElement("div");
  myBoardContainer.classList.add("board-container");
  myContainer.insertBefore(myBoardContainer, myBoardEl);
  myBoardContainer.appendChild(myBoardEl);
  const opponentBoardContainer = document.createElement("div");
  opponentBoardContainer.classList.add("board-container");
  opponentContainer.insertBefore(opponentBoardContainer, opponentBoardEl);
  opponentBoardContainer.appendChild(opponentBoardEl);
  opponentBoardContainer.appendChild(targetsEl);
  // Add padding to my board for balance
  const padding = document.createElement("div");
  padding.classList.add("targets-padding");
  padding.style.width = "120px";
  padding.style.flexShrink = "0";
  myBoardContainer.insertBefore(padding, myBoardEl);
}

export function addStyles() {
  const style = document.createElement("style");
  style.textContent = `
.board-container {
  display: flex;
  align-items: flex-start;
}
@media (max-width: 768px) {
  .board-container {
    flex-direction: column;
    align-items: center;
  }
}
.ship-rep {
  display: flex;
  margin-bottom: 10px;
}
.mini-cell {
  width: 20px;
  height: 20px;
  background: lightblue;
  border: 1px solid #1f3a5f;
  box-sizing: border-box;
  transition: background 0.15s;
}
.ship-rep.sunk .mini-cell {
  background: #dc2626;
  box-shadow: inset 0 0 6px #f87171;
}
.controls {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
}
@media (max-width: 768px) {
  .controls {
    flex-direction: column;
    align-items: center;
  }
  .controls button, .controls input {
    width: 80%;
    margin: 0.3rem 0;
  }
}
.share-btn {
  padding: 10px 20px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
}
.share-btn:hover {
  background-color: #45a049;
}
.share-btn.copied {
  background-color: #2196F3;
  text-content: "Copied!";
}
.mute-btn {
  padding: 8px 16px;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}
.mute-btn:hover {
  background-color: #d32f2f;
}
.mute-btn.muted {
  background-color: #4CAF50;
}
.mute-btn.muted:hover {
  background-color: #45a049;
}
`;
  document.head.appendChild(style);
}

export function createMuteBtn(controlsDiv, state) {
  const muteBtn = document.createElement("button");
  muteBtn.textContent = "Mute Sounds";
  muteBtn.classList.add("mute-btn");
  muteBtn.addEventListener("click", () => {
    state.isMuted = !state.isMuted;
    muteBtn.textContent = state.isMuted ? "Unmute Sounds" : "Mute Sounds";
    muteBtn.classList.toggle("muted", state.isMuted);
  });
  controlsDiv.appendChild(muteBtn);
}
