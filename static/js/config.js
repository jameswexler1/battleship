// ./static/js/config.js
export const iceServers = [
  { urls: 'stun:stun.relay.metered.ca:80' },
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
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

export const config = {
  appId: 'battleship-p2p-game', // Unique app ID to avoid collisions
  trackerUrls: [
    'wss://tracker.btorrent.xyz',
    'wss://tracker.openwebtorrent.com',
    'wss://tracker.webtorrent.dev',
    'wss://tracker.fastcast.nz',
    'wss://tracker.sloppyta.co:443/announce',
    'wss://tracker.novage.com.ua:443/announce'
  ],
  rtcConfig: { iceServers }
};

export const shipsToPlaceTemplate = [
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

export const totalShipCells = 20; // 4 + 3+3 + 2+2+2 + 1+1+1+1

export const hitSound = new Audio('https://therecordist.com/assets/sound/mp3_14/Explosion_Large_Blast_1.mp3');
export const victorySound = new Audio('https://orangefreesounds.com/wp-content/uploads/2023/06/Victory-fanfare-sound-effect.mp3');
export const defeatSound = new Audio('https://freesound.org/data/previews/183/183077_2374229-lq.mp3');

export const shipSizes = [
  { size: 4, count: 1 },
  { size: 3, count: 2 },
  { size: 2, count: 3 },
  { size: 1, count: 4 }
];
