// ./static/js/wordle.js
const WORD_LENGTH = 5;
const MAX_GUESSES = 6;
let secretWord = '';
let currentGuess = [];
let guessCount = 0;
let gameOver = false;
let words = [];
let currentLanguage = 'en';

// Fetch word list for a specific language
async function loadWords(lang) {
  try {
    const response = await fetch(`/js/wordle-words-${lang}.txt`);
    const text = await response.text();
    words = text.split('\n').map(word => word.trim().toUpperCase()).filter(word => word.length === WORD_LENGTH);
    if (words.length === 0) {
      alert('Error loading word list for ' + lang);
    }
    resetGame();
  } catch (error) {
    console.error('Failed to load words for ' + lang + ':', error);
    alert('Error loading word list for ' + lang);
  }
}

// Pick a random secret word
function pickSecretWord() {
  const index = Math.floor(Math.random() * words.length);
  secretWord = words[index];
  console.log('Secret word (for debugging):', secretWord); // Remove in production
}

// Create the game board grid
function createBoard() {
  const board = document.getElementById('game-board');
  board.innerHTML = '';
  for (let i = 0; i < MAX_GUESSES; i++) {
    const row = document.createElement('div');
    row.classList.add('row');
    for (let j = 0; j < WORD_LENGTH; j++) {
      const tile = document.createElement('div');
      tile.classList.add('tile');
      row.appendChild(tile);
    }
    board.appendChild(row);
  }
}

// Create virtual keyboard
function createKeyboard() {
  const keyboard = document.getElementById('keyboard');
  keyboard.innerHTML = '';
  const keys = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫']
  ];
  keys.forEach((rowKeys, rowIndex) => {
    const row = document.createElement('div');
    row.classList.add('keyboard-row');
    if (rowIndex === 1) row.classList.add('second-row');
    rowKeys.forEach(key => {
      const btn = document.createElement('button');
      btn.textContent = key;
      btn.dataset.key = key;
      btn.classList.add('key');
      if (key === 'ENTER' || key === '⌫') {
        btn.classList.add('wide');
      }
      btn.addEventListener('click', () => handleKeyPress(key));
      row.appendChild(btn);
    });
    keyboard.appendChild(row);
  });
}

// Handle key presses (virtual or physical)
function handleKeyPress(key) {
  if (gameOver) return;
  key = key.toUpperCase();
  if (key === 'ENTER') {
    submitGuess();
  } else if (key === 'BACKSPACE' || key === '⌫') {
    currentGuess.pop();
    updateCurrentRow();
  } else if (key.length === 1 && /^[A-Z]$/.test(key) && currentGuess.length < WORD_LENGTH) {
    currentGuess.push(key);
    updateCurrentRow();
  }
}

// Update the current guess row on the board
function updateCurrentRow() {
  const row = document.querySelectorAll('.row')[guessCount];
  const tiles = row.querySelectorAll('.tile');
  tiles.forEach((tile, index) => {
    tile.textContent = currentGuess[index] || '';
    tile.classList.toggle('filled', !!currentGuess[index]);
  });
}

// Submit the guess and evaluate
async function submitGuess() {
  if (currentGuess.length !== WORD_LENGTH) {
    showMessage('Not enough letters');
    shakeRow();
    return;
  }
  const guessStr = currentGuess.join('');
  if (!words.includes(guessStr)) {
    showMessage('Not a valid word');
    shakeRow();
    return;
  }
  await evaluateGuess(guessStr);
  currentGuess = [];
  guessCount++;
  if (guessStr === secretWord) {
    showMessage('You win!', true);
    gameOver = true;
    showResetButton();
  } else if (guessCount === MAX_GUESSES) {
    showMessage(`You lose! The word was ${secretWord}`, true);
    gameOver = true;
    showResetButton();
  }
}

// Shake the current row for invalid input
function shakeRow() {
  const row = document.querySelectorAll('.row')[guessCount];
  row.classList.add('shake');
  setTimeout(() => row.classList.remove('shake'), 600);
}

// Evaluate guess and color tiles + keyboard (with sequential animation)
async function evaluateGuess(guess) {
  const row = document.querySelectorAll('.row')[guessCount];
  const tiles = row.querySelectorAll('.tile');
  const secretArray = secretWord.split('');
  const guessArray = guess.split('');
  const keyMap = {};
  const statuses = [];

  // Determine statuses
  guessArray.forEach((letter, i) => {
    if (letter === secretArray[i]) {
      statuses[i] = 'correct';
      keyMap[letter] = 'correct';
      secretArray[i] = null;
    } else {
      statuses[i] = 'absent'; // Default
    }
  });

  guessArray.forEach((letter, i) => {
    if (statuses[i] !== 'correct') {
      const index = secretArray.indexOf(letter);
      if (index !== -1) {
        statuses[i] = 'present';
        keyMap[letter] = keyMap[letter] || 'present';
        secretArray[index] = null;
      }
    }
  });

  // Animate flips sequentially
  for (let i = 0; i < tiles.length; i++) {
    tiles[i].classList.add('flip');
    setTimeout(() => {
      tiles[i].classList.add(statuses[i]);
    }, 250); // Apply color at midpoint of animation
    await new Promise(resolve => setTimeout(resolve, 250));
  }

  // Update keyboard colors
  Object.keys(keyMap).forEach(letter => {
    const keyBtn = document.querySelector(`.key[data-key="${letter}"]`);
    if (keyBtn && !keyBtn.classList.contains('correct')) {
      keyBtn.classList.add(keyMap[letter]);
    }
  });
}

// Show message
function showMessage(msg, persistent = false) {
  const messageEl = document.getElementById('message');
  messageEl.textContent = msg;
  if (msg.includes('win')) {
    messageEl.classList.add('win');
  } else if (msg.includes('lose')) {
    messageEl.classList.add('lose');
  } else {
    messageEl.classList.remove('win', 'lose');
  }
  if (!persistent) {
    setTimeout(() => {
      messageEl.textContent = '';
      messageEl.classList.remove('win', 'lose');
    }, 2000);
  }
}

// Show reset button
function showResetButton() {
  const resetBtn = document.getElementById('reset-btn');
  resetBtn.style.display = 'block';
}

// Reset game
function resetGame() {
  pickSecretWord();
  createBoard();
  createKeyboard();
  currentGuess = [];
  guessCount = 0;
  gameOver = false;
  document.getElementById('message').textContent = '';
  document.getElementById('message').classList.remove('win', 'lose');
  document.getElementById('reset-btn').style.display = 'none';
}

// Event listeners
document.addEventListener('keydown', (e) => handleKeyPress(e.key));
document.getElementById('reset-btn').addEventListener('click', resetGame);
const langSelect = document.getElementById('language-select');
langSelect.addEventListener('change', (e) => {
  currentLanguage = e.target.value;
  loadWords(currentLanguage);
});

// Init with default language
loadWords(currentLanguage);
