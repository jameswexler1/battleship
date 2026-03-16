// ./static/js/sounds.js
// All sounds synthesized via Web Audio API — zero external dependencies.
let _ctx = null;

function ctx() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

function note(frequency, type, startTime, duration, peakGain = 0.5) {
  const c = ctx();
  const osc  = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

function noiseHit(startTime, duration = 0.18, gainPeak = 0.6) {
  const c = ctx();
  const bufLen = Math.ceil(c.sampleRate * duration);
  const buf    = c.createBuffer(1, bufLen, c.sampleRate);
  const data   = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
  const src    = c.createBufferSource();
  const filter = c.createBiquadFilter();
  const gain   = c.createGain();
  src.buffer = buf;
  filter.type = 'bandpass';
  filter.frequency.value = 400;
  filter.Q.value = 0.8;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);
  gain.gain.setValueAtTime(gainPeak, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  src.start(startTime);
  src.stop(startTime + duration + 0.05);
}

export function playHit() {
  const c = ctx(), t = c.currentTime;
  noiseHit(t, 0.22, 0.7);
  note(120, 'sawtooth', t,       0.25, 0.4);
  note(60,  'sine',     t + 0.05, 0.3, 0.3);
}

export function playMiss() {
  const c = ctx(), t = c.currentTime;
  note(600, 'sine', t,         0.05, 0.25);
  note(300, 'sine', t + 0.04,  0.15, 0.20);
  note(150, 'sine', t + 0.10,  0.20, 0.15);
}

export function playVictory() {
  const c = ctx(), t = c.currentTime;
  [261.63, 329.63, 392.00, 523.25].forEach((freq, i) =>
    note(freq, 'triangle', t + i * 0.12, 0.35, 0.45)
  );
  [523.25, 659.26, 783.99].forEach(freq =>
    note(freq, 'triangle', t + 4 * 0.12, 0.6, 0.35)
  );
}

export function playDefeat() {
  const c = ctx(), t = c.currentTime;
  [392.00, 349.23, 293.66, 261.63, 220.00].forEach((freq, i) =>
    note(freq, 'sine', t + i * 0.18, 0.4, 0.4)
  );
}
