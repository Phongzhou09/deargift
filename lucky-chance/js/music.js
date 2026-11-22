const DEFAULT_MUSIC_URL = "asset/musics/thieu_nien.mp3";
let musicUrl = DEFAULT_MUSIC_URL;
let audioEl = null;
let musicStarted = false;
function getAudio() {
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.loop = true;
    audioEl.preload = "auto";
  }
  return audioEl;
}
function normalizeMusicUrl(value) {
  var _a, _b, _c, _d;
  if (value == null) return null;
  if (typeof value === "string") {
    const url = value.trim();
    return url || null;
  }
  if (typeof value === "object") {
    const url = String(
      (_d = (_c = (_b = (_a = value.url) != null ? _a : value.src) != null ? _b : value.music) != null ? _c : value.musicUrl) != null ? _d : ""
    ).trim();
    return url || null;
  }
  return null;
}
function extractMusicFromPayload(data) {
  var _a, _b, _c, _d, _e;
  return normalizeMusicUrl(
    (_e = (_d = (_c = (_b = (_a = data == null ? void 0 : data.music) != null ? _a : data == null ? void 0 : data.musicUrl) != null ? _b : data == null ? void 0 : data.audio) != null ? _c : data == null ? void 0 : data.audioUrl) != null ? _d : data == null ? void 0 : data.bgMusic) != null ? _e : data == null ? void 0 : data.backgroundMusic
  );
}
function syncAudioSource() {
  const audio = getAudio();
  const resolved = new URL(musicUrl, document.baseURI).href;
  if (audio.src !== resolved) {
    audio.src = musicUrl;
    audio.load();
  }
}
function setMusicUrl(url) {
  const normalized = normalizeMusicUrl(url);
  if (!normalized) return musicUrl;
  musicUrl = normalized;
  syncAudioSource();
  return musicUrl;
}
function prepareMusic() {
  syncAudioSource();
}
function startMusic() {
  const audio = getAudio();
  syncAudioSource();
  musicStarted = true;
  audio.volume = 1;
  return audio.play().catch((err) => {
    var _a;
    console.warn("[LuckyChance] Không phát được nhạc:", (_a = err == null ? void 0 : err.message) != null ? _a : err);
  });
}
function stopMusic() {
  const audio = getAudio();
  audio.pause();
  musicStarted = false;
}
function applyMusicFromPayload(data) {
  const fromServer = extractMusicFromPayload(data);
  if (fromServer) {
    setMusicUrl(fromServer);
    return;
  }
  if (!musicStarted) {
    setMusicUrl(DEFAULT_MUSIC_URL);
  }
}
function resetMusicToDefault() {
  musicUrl = DEFAULT_MUSIC_URL;
  musicStarted = false;
  const audio = getAudio();
  audio.pause();
  audio.currentTime = 0;
  syncAudioSource();
}
prepareMusic();
window.LuckyChanceMusic = {
  startMusic,
  stopMusic,
  setMusicUrl,
  prepareMusic,
  applyMusicFromPayload,
  resetMusicToDefault,
  get musicUrl() {
    return musicUrl;
  },
  get isPlaying() {
    return audioEl ? !audioEl.paused : false;
  },
  get hasStarted() {
    return musicStarted;
  }
};
