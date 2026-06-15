const NOTE_LAYOUT = [
  { key: "a", note: "C", semitone: 0, type: "white" },
  { key: "w", note: "C#", semitone: 1, type: "black" },
  { key: "s", note: "D", semitone: 2, type: "white" },
  { key: "e", note: "D#", semitone: 3, type: "black" },
  { key: "d", note: "E", semitone: 4, type: "white" },
  { key: "f", note: "F", semitone: 5, type: "white" },
  { key: "t", note: "F#", semitone: 6, type: "black" },
  { key: "g", note: "G", semitone: 7, type: "white" },
  { key: "y", note: "G#", semitone: 8, type: "black" },
  { key: "h", note: "A", semitone: 9, type: "white" },
  { key: "u", note: "A#", semitone: 10, type: "black" },
  { key: "j", note: "B", semitone: 11, type: "white" },
  { key: "k", note: "C", semitone: 12, type: "white" },
];

const keyboard = document.querySelector("#keyboard");
const stage = document.querySelector("#stage");
const startGameButton = document.querySelector("#start-game");
const scoreElement = document.querySelector("#score");
const comboElement = document.querySelector("#combo");
const gameStatusElement = document.querySelector("#game-status");
const volumeControl = document.querySelector("#volume");
const octaveControl = document.querySelector("#octave");
const levelControl = document.querySelector("#level");
const songControl = document.querySelector("#song");
const instrumentControl = document.querySelector("#instrument");
const sustainControl = document.querySelector("#sustain");

let audioContext;
let masterGain;
let cathedralDelay;
let cathedralFeedback;
const activeVoices = new Map();
const activePointers = new Map();
const activeEnemies = [];

const HIT_PROGRESS = 0.88;
const MISS_PROGRESS = 1.08;
const LEVELS = {
  apprentice: {
    label: "Apprentice",
    travelTime: 5600,
    noteSpacing: 980,
    phraseGap: 720,
    hitWindow: 0.2,
    scoreMultiplier: 0.8,
  },
  adept: {
    label: "Adept",
    travelTime: 4300,
    noteSpacing: 760,
    phraseGap: 540,
    hitWindow: 0.15,
    scoreMultiplier: 1,
  },
  nightmare: {
    label: "Nightmare",
    travelTime: 3200,
    noteSpacing: 560,
    phraseGap: 420,
    hitWindow: 0.12,
    scoreMultiplier: 1.25,
  },
};
const SONGS = {
  diesIrae: [
    "h", "g", "h", "f", "g", "d", "f", "e",
    "d", "s", "d", "f", "g", "h", "g", "f",
    "h", "g", "h", "f", "g", "d", "s", "a",
    "s", "d", "f", "e", "d", "s", "a", "a",
  ],
  toccata: [
    "h", "u", "h", "g", "f", "e", "d", "s",
    "a", "w", "e", "d", "s", "a", "s", "d",
    "f", "t", "g", "y", "h", "g", "f", "e",
    "d", "f", "h", "k", "j", "h", "g", "f",
  ],
  mountainKing: [
    "a", "s", "d", "f", "g", "d", "g", "f",
    "e", "d", "e", "f", "g", "d", "g", "f",
    "a", "s", "d", "f", "g", "h", "j", "k",
    "j", "h", "g", "f", "e", "d", "s", "a",
  ],
  moonlight: [
    "h", "e", "g", "h", "e", "g", "h", "e",
    "g", "u", "e", "g", "h", "e", "g", "u",
    "j", "d", "g", "j", "d", "g", "h", "d",
    "g", "u", "d", "g", "h", "d", "g", "u",
  ],
  midnightProcessional: [
    "a", "e", "s", "w", "a", "f", "d", "s",
    "g", "y", "h", "g", "f", "e", "d", "s",
    "a", "w", "e", "f", "g", "h", "u", "j",
    "k", "j", "h", "g", "f", "d", "s", "a",
  ],
  bloodMoonMarch: [
    "a", "a", "f", "e", "d", "d", "g", "f",
    "h", "h", "g", "f", "e", "f", "d", "s",
    "a", "s", "d", "f", "h", "g", "f", "d",
    "e", "f", "g", "h", "u", "h", "g", "f",
  ],
  cathedralPanic: [
    "a", "w", "s", "e", "d", "f", "t", "g",
    "y", "h", "u", "j", "k", "j", "u", "h",
    "g", "t", "f", "d", "e", "s", "w", "a",
    "d", "f", "g", "h", "k", "h", "g", "d",
  ],
  vampireRave: [
    "a", "f", "a", "g", "w", "h", "w", "g",
    "s", "t", "s", "h", "e", "j", "e", "h",
    "d", "g", "f", "d", "y", "h", "j", "h",
    "k", "u", "h", "g", "f", "e", "d", "a",
  ],
  finalCoffin: [
    "k", "j", "h", "u", "h", "g", "f", "e",
    "d", "f", "h", "g", "e", "d", "s", "a",
    "a", "w", "e", "f", "g", "y", "h", "u",
    "k", "j", "h", "g", "f", "d", "s", "a",
  ],
};

let game = {
  running: false,
  startTime: 0,
  nextNoteIndex: 0,
  score: 0,
  combo: 0,
  animationFrame: 0,
  level: LEVELS.apprentice,
  song: SONGS.midnightProcessional,
};

const INSTRUMENTS = {
  harpsichord: {
    name: "Harpsichord",
    release: 0.18,
    sustainRelease: 0.35,
    partials: [
      { type: "sawtooth", ratio: 1, gain: 0.48, detune: 0 },
      { type: "square", ratio: 2, gain: 0.18, detune: 3 },
      { type: "triangle", ratio: 3, gain: 0.1, detune: -4 },
    ],
    envelope: { attack: 0.004, decay: 0.09, sustain: 0.08 },
    destination: "dry",
  },
  churchOrgan: {
    name: "Church organ",
    release: 0.45,
    sustainRelease: 1.7,
    partials: [
      { type: "sine", ratio: 0.5, gain: 0.2, detune: 0 },
      { type: "sine", ratio: 1, gain: 0.42, detune: -2 },
      { type: "triangle", ratio: 2, gain: 0.24, detune: 2 },
      { type: "sine", ratio: 3, gain: 0.1, detune: 0 },
    ],
    envelope: { attack: 0.055, decay: 0.18, sustain: 0.88 },
    destination: "dry",
  },
  cathedral: {
    name: "Gothic cathedral",
    release: 1.4,
    sustainRelease: 3.2,
    partials: [
      { type: "sine", ratio: 0.5, gain: 0.24, detune: -6 },
      { type: "triangle", ratio: 1, gain: 0.36, detune: 0 },
      { type: "sine", ratio: 1.5, gain: 0.14, detune: 7 },
      { type: "sawtooth", ratio: 2, gain: 0.09, detune: -3 },
    ],
    envelope: { attack: 0.11, decay: 0.34, sustain: 0.78 },
    destination: "cathedral",
  },
  warmPiano: {
    name: "Warm piano",
    release: 0.28,
    sustainRelease: 1.1,
    partials: [
      { type: "triangle", ratio: 1, gain: 0.52, detune: 0 },
      { type: "sine", ratio: 2, gain: 0.18, detune: -2 },
      { type: "triangle", ratio: 3, gain: 0.08, detune: 2 },
    ],
    envelope: { attack: 0.015, decay: 0.18, sustain: 0.52 },
    destination: "dry",
  },
};

function ensureAudio() {
  if (audioContext) {
    if (audioContext.state === "suspended") audioContext.resume();
    return;
  }

  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  audioContext = new AudioEngine();
  masterGain = audioContext.createGain();
  masterGain.gain.value = Number(volumeControl.value);
  masterGain.connect(audioContext.destination);

  cathedralDelay = audioContext.createDelay(1.2);
  cathedralFeedback = audioContext.createGain();
  const cathedralWet = audioContext.createGain();

  cathedralDelay.delayTime.value = 0.38;
  cathedralFeedback.gain.value = 0.42;
  cathedralWet.gain.value = 0.28;

  cathedralDelay.connect(cathedralFeedback);
  cathedralFeedback.connect(cathedralDelay);
  cathedralDelay.connect(cathedralWet);
  cathedralWet.connect(masterGain);
}

function frequencyFor(semitone, octave) {
  const midiNumber = (octave + 1) * 12 + semitone;
  return 440 * 2 ** ((midiNumber - 69) / 12);
}

function noteTime(index, level = currentLevel()) {
  const phrase = Math.floor(index / 8);
  const beat = index % 8;
  const phraseGap = phrase * level.phraseGap;
  const swing = beat === 3 || beat === 7 ? level.noteSpacing * 0.22 : 0;
  return index * level.noteSpacing + phraseGap + swing;
}

function currentLevel() {
  return LEVELS[levelControl.value] || LEVELS.apprentice;
}

function currentSong() {
  return SONGS[songControl.value] || SONGS.midnightProcessional;
}

function playNote(layoutItem) {
  ensureAudio();

  const id = layoutItem.key;
  if (activeVoices.has(id)) return;

  const now = audioContext.currentTime;
  const octave = Number(octaveControl.value);
  const frequency = frequencyFor(layoutItem.semitone, octave);
  const instrument = INSTRUMENTS[instrumentControl.value] || INSTRUMENTS.harpsichord;
  const voiceGain = audioContext.createGain();
  const oscillators = instrument.partials.map((partial) => {
    const oscillator = audioContext.createOscillator();
    const partialGain = audioContext.createGain();

    oscillator.type = partial.type;
    oscillator.frequency.setValueAtTime(frequency * partial.ratio, now);
    oscillator.detune.setValueAtTime(partial.detune, now);
    partialGain.gain.setValueAtTime(partial.gain, now);

    oscillator.connect(partialGain);
    partialGain.connect(voiceGain);
    oscillator.start(now);

    return oscillator;
  });

  const { attack, decay, sustain } = instrument.envelope;
  voiceGain.gain.setValueAtTime(0.0001, now);
  voiceGain.gain.exponentialRampToValueAtTime(0.85, now + attack);
  voiceGain.gain.exponentialRampToValueAtTime(sustain, now + attack + decay);

  voiceGain.connect(masterGain);

  if (instrument.destination === "cathedral") {
    voiceGain.connect(cathedralDelay);
  }

  activeVoices.set(id, { oscillators, gain: voiceGain, instrument });
  setKeyActive(id, true);
}

function stopNote(layoutItem) {
  const voice = activeVoices.get(layoutItem.key);
  if (!voice) return;

  const now = audioContext.currentTime;
  const release = sustainControl.checked ? voice.instrument.sustainRelease : voice.instrument.release;

  voice.gain.gain.cancelScheduledValues(now);
  voice.gain.gain.setValueAtTime(Math.max(voice.gain.gain.value, 0.0001), now);
  voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + release);
  voice.oscillators.forEach((oscillator) => oscillator.stop(now + release + 0.03));

  activeVoices.delete(layoutItem.key);
  setKeyActive(layoutItem.key, false);
}

function setKeyActive(key, isActive) {
  const button = keyboard.querySelector(`[data-key="${key}"]`);
  if (button) button.classList.toggle("active", isActive);
}

function getLayoutItem(key) {
  return NOTE_LAYOUT.find((item) => item.key === key.toLowerCase());
}

function isTypingInControl(event) {
  const tagName = event.target.tagName;
  return tagName === "INPUT" || tagName === "SELECT" || tagName === "TEXTAREA" || event.target.isContentEditable;
}

function stopAllNotes() {
  for (const item of NOTE_LAYOUT) stopNote(item);
}

function layoutForKey(key) {
  return NOTE_LAYOUT.find((item) => item.key === key);
}

function lanePosition(item) {
  if (item.type === "black") {
    const blackPositions = {
      "C#": 12.5,
      "D#": 25,
      "F#": 50,
      "G#": 62.5,
      "A#": 75,
    };
    return blackPositions[item.note];
  }

  const whiteKeys = NOTE_LAYOUT.filter((note) => note.type === "white");
  const whiteIndex = whiteKeys.findIndex((note) => note.key === item.key);
  return ((whiteIndex + 0.5) / whiteKeys.length) * 100;
}

function updateScoreboard(status = "") {
  if (scoreElement) scoreElement.textContent = game.score;
  if (comboElement) comboElement.textContent = game.combo;
  if (status && gameStatusElement) gameStatusElement.textContent = status;
}

function startGame() {
  const level = currentLevel();
  const song = currentSong();
  ensureAudio();
  resetGame();
  game.running = true;
  game.level = level;
  game.song = song;
  game.startTime = performance.now() + 700;
  startGameButton.textContent = "Restart";
  updateScoreboard(`${level.label}`);
  game.animationFrame = requestAnimationFrame(updateGame);
}

function resetGame() {
  cancelAnimationFrame(game.animationFrame);
  activeEnemies.splice(0).forEach((enemy) => enemy.element.remove());
  game = {
    running: false,
    startTime: 0,
    nextNoteIndex: 0,
    score: 0,
    combo: 0,
    animationFrame: 0,
    level: currentLevel(),
    song: currentSong(),
  };
  updateScoreboard("Ready");
}

function updateGame(now) {
  if (!game.running) return;

  const elapsed = now - game.startTime;

  while (game.nextNoteIndex < game.song.length && elapsed >= noteTime(game.nextNoteIndex, game.level)) {
    spawnEnemy(game.song[game.nextNoteIndex], game.nextNoteIndex, game.level);
    game.nextNoteIndex += 1;
  }

  for (let index = activeEnemies.length - 1; index >= 0; index -= 1) {
    const enemy = activeEnemies[index];
    enemy.progress = (elapsed - enemy.spawnTime) / enemy.level.travelTime;

    if (enemy.progress > MISS_PROGRESS) {
      missEnemy(enemy, index);
      continue;
    }

    renderEnemy(enemy);
  }

  if (game.nextNoteIndex >= game.song.length && activeEnemies.length === 0) {
    finishGame();
    return;
  }

  game.animationFrame = requestAnimationFrame(updateGame);
}

function spawnEnemy(key, index, level) {
  const item = layoutForKey(key);
  const element = document.createElement("div");
  const kind = index % 3 === 1 ? "red-bat" : "bat";

  element.className = `enemy ${kind}`;
  element.dataset.key = key;
  element.innerHTML = `${enemySprite(kind)}<span class="enemy-note">${item.note}</span>`;
  stage.append(element);

  activeEnemies.push({
    key,
    item,
    element,
    spawnTime: noteTime(index, level),
    level,
    progress: 0,
    defeated: false,
  });
}

function enemySprite(kind) {
  return `
    <svg class="enemy-sprite bat-sprite" viewBox="0 0 96 64" aria-hidden="true">
      <path class="bat-shadow" d="M12 31h10v-7h12v8h8v-9h12v9h8v-8h12v7h10v10H72v8H60v-7H36v7H24v-8H12z" />
      <path class="bat-wing bat-wing-left" d="M4 24h14v-8h14v8h8v20H28v8H14v-8H4z" />
      <path class="bat-wing bat-wing-right" d="M92 24H78v-8H64v8h-8v20h12v8h14v-8h10z" />
      <path class="bat-body" d="M36 18h8v-8h8v8h8v8h8v24h-8v8H36v-8h-8V26h8z" />
      <path class="${kind === "red-bat" ? "bat-face bat-red-eyes" : "bat-face"}" d="M40 30h6v6h-6zM50 30h6v6h-6z" />
      <path class="bat-fangs" d="M43 42h4v6h-4zM49 42h4v6h-4z" />
    </svg>
  `;
}

function renderEnemy(enemy) {
  const eased = enemy.progress * enemy.progress;
  const y = 8 + eased * 84;
  const scale = 0.38 + enemy.progress * 0.9;

  enemy.element.style.setProperty("--x", `${lanePosition(enemy.item)}%`);
  enemy.element.style.setProperty("--y", `${y}%`);
  enemy.element.style.setProperty("--scale", scale);
  enemy.element.style.opacity = Math.max(0.25, Math.min(1, enemy.progress + 0.18));
}

function tryHitEnemy(key) {
  if (!game.running) return;

  let bestEnemy = null;
  let bestDistance = Infinity;

  for (const enemy of activeEnemies) {
    if (enemy.key !== key || enemy.defeated) continue;

    const distance = Math.abs(enemy.progress - HIT_PROGRESS);
    if (distance < enemy.level.hitWindow && distance < bestDistance) {
      bestEnemy = enemy;
      bestDistance = distance;
    }
  }

  if (!bestEnemy) {
    const hasEnemyInHitZone = activeEnemies.some((enemy) => Math.abs(enemy.progress - HIT_PROGRESS) < enemy.level.hitWindow);
    if (hasEnemyInHitZone) {
      game.combo = 0;
      updateScoreboard("Miss");
    } else {
      updateScoreboard(game.level.label);
    }
    return;
  }

  defeatEnemy(bestEnemy, bestDistance);
}

function defeatEnemy(enemy, distance) {
  const index = activeEnemies.indexOf(enemy);
  if (index === -1) return;

  enemy.defeated = true;
  activeEnemies.splice(index, 1);
  enemy.element.classList.add("defeated");
  window.setTimeout(() => enemy.element.remove(), 180);

  game.combo += 1;
  game.score += Math.round((100 + game.combo * 12 + (enemy.level.hitWindow - distance) * 500) * enemy.level.scoreMultiplier);
  stage.classList.remove("flash");
  void stage.offsetWidth;
  stage.classList.add("flash");
  updateScoreboard("Hit");
}

function missEnemy(enemy, index) {
  activeEnemies.splice(index, 1);
  enemy.element.remove();
  game.combo = 0;
  updateScoreboard("Miss");
}

function finishGame() {
  game.running = false;
  cancelAnimationFrame(game.animationFrame);
  startGameButton.textContent = "Start";
  updateScoreboard("Complete");
}

function handlePianoInput(item) {
  playNote(item);
  tryHitEnemy(item.key);
}

function buildKeyboard() {
  const whiteKeys = NOTE_LAYOUT.filter((item) => item.type === "white");
  const blackKeys = NOTE_LAYOUT.filter((item) => item.type === "black");

  for (const item of whiteKeys) {
    keyboard.append(createKey(item));
  }

  for (const item of blackKeys) {
    keyboard.append(createKey(item));
  }
}

function createKey(item) {
  const button = document.createElement("button");
  button.className = `key ${item.type}`;
  button.type = "button";
  button.dataset.key = item.key;
  button.dataset.noteName = item.note;
  button.setAttribute("aria-label", `${item.note}, keyboard key ${item.key.toUpperCase()}`);
  button.innerHTML = `
    <span class="key-label">
      <span class="note">${item.note}</span>
      <span class="computer-key">${item.key.toUpperCase()}</span>
    </span>
  `;

  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    activePointers.set(event.pointerId, item);
    handlePianoInput(item);
  });

  button.addEventListener("pointerup", (event) => {
    const pointerItem = activePointers.get(event.pointerId);
    if (pointerItem) stopNote(pointerItem);
    activePointers.delete(event.pointerId);
  });

  button.addEventListener("pointercancel", (event) => {
    const pointerItem = activePointers.get(event.pointerId);
    if (pointerItem) stopNote(pointerItem);
    activePointers.delete(event.pointerId);
  });

  return button;
}

volumeControl.addEventListener("input", () => {
  if (masterGain) {
    masterGain.gain.value = Number(volumeControl.value);
  }
});

startGameButton.addEventListener("click", startGame);

levelControl.addEventListener("change", () => {
  if (!game.running) updateScoreboard(currentLevel().label);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    stopAllNotes();
    return;
  }

  if (isTypingInControl(event)) return;
  if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;

  const item = getLayoutItem(event.key);
  if (!item) return;

  event.preventDefault();
  handlePianoInput(item);
});

document.addEventListener("keyup", (event) => {
  if (isTypingInControl(event)) return;

  const item = getLayoutItem(event.key);
  if (!item) return;

  event.preventDefault();
  stopNote(item);
});

window.addEventListener("blur", () => {
  stopAllNotes();
});

buildKeyboard();
