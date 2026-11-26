// Page-turn sound player using /assets/flipsound.mp3 decoded into Web Audio for <1ms polyphonic playback.

const SOUND_URL = '/assets/flipsound.mp3';

class FlipSound {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.audioBuffer = null;
    this.rawBytesPromise = null;
    this.decoding = false;
    this.unlocked = false;
  }

  setEnabled(val) {
    this.enabled = !!val;
  }

  unlock() {
    if (this.unlocked && this.ctx?.state === 'running') {
      this._ensureBufferLoaded();
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        this.unlocked = true;
      }).catch(() => {});
    } else {
      this.unlocked = true;
    }
    this._ensureBufferLoaded();
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this._ensureBufferLoaded();
    return this.ctx;
  }

  _fetchBytes() {
    if (!this.rawBytesPromise) {
      this.rawBytesPromise = fetch(SOUND_URL)
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .catch(() => null);
    }
    return this.rawBytesPromise;
  }

  async _ensureBufferLoaded() {
    if (this.audioBuffer || this.decoding || !this.ctx) return;
    this.decoding = true;
    try {
      const bytes = await this._fetchBytes();
      if (!bytes || !this.ctx) return;
      // Copy ArrayBuffer because decodeAudioData detaches the buffer
      const copy = bytes.slice(0);
      this.audioBuffer = await this.ctx.decodeAudioData(copy);
    } catch {
      // ignore decode failures and fall back to HTMLAudioElement
    } finally {
      this.decoding = false;
    }
  }

  playFlip() {
    if (!this.enabled) return;
    const ctx = this.ensureContext();

    if (ctx && this.audioBuffer) {
      const now = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = this.audioBuffer;
      src.playbackRate.value = 0.98 + Math.random() * 0.04;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.9, now);

      src.connect(gain);
      gain.connect(ctx.destination);
      src.start(now);
      return;
    }

    // Immediate fallback if MP3 buffer is still decoding on first flip
    try {
      const el = new Audio(SOUND_URL);
      el.volume = 0.9;
      el.play().catch(() => {});
    } catch {
      // ignore
    }
  }
}

export const flipSound = new FlipSound();
