// Page-turn sound player supporting selectable MP3 presets and offline 3-stage Web Audio paper synthesis.

export const SOUND_PRESETS = [
  { id: 'uppbeat-book', label: 'Soft Book', fullName: 'Soft Book Page (Tomas Herudek)', url: '/assets/flipsound-uppbeat.mp3', gain: 0.88 },
  { id: 'small-page', label: 'Crisp Flip', fullName: 'Small Page Flip', url: '/assets/flipsound.mp3', gain: 0.84 },
  { id: 'classic-synth', label: 'Paper Synth', fullName: 'Classic 3-Stage Paper Synth', url: null, gain: 0.75 },
];

export const DEFAULT_SOUND_PRESET = 'uppbeat-book';

class FlipSound {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.presetId = DEFAULT_SOUND_PRESET;
    this.bufferCache = new Map();
    this.loadingPromises = new Map();
    this.unlocked = false;
    this.lastPlayedMs = 0;
  }

  getPresets() {
    return SOUND_PRESETS;
  }

  getPresetInfo(id = this.presetId) {
    return SOUND_PRESETS.find((p) => p.id === id) || SOUND_PRESETS[0];
  }

  setEnabled(val) {
    this.enabled = !!val;
  }

  setPreset(id) {
    const valid = SOUND_PRESETS.some((p) => p.id === id);
    this.presetId = valid ? id : DEFAULT_SOUND_PRESET;
    if (this.ctx) {
      this._ensurePresetLoaded(this.presetId);
    }
  }

  unlock() {
    if (this.unlocked && this.ctx?.state === 'running') {
      this._ensurePresetLoaded(this.presetId);
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
    this._ensurePresetLoaded(this.presetId);
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
    this._ensurePresetLoaded(this.presetId);
    return this.ctx;
  }

  _buildSynthBuffer(ctx) {
    const sr = ctx.sampleRate;
    const dur = 0.78;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const out = buf.getChannelData(0);

    const raw = new Float32Array(len);
    let pink = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      pink = (pink + 0.15 * w) / 1.15;
      raw[i] = w * 0.65 + pink * 0.85;
    }

    let lp1 = 0;
    let bp1 = 0;
    let lp2 = 0;
    let bp2 = 0;

    for (let i = 0; i < len; i++) {
      const t = i / sr;
      let env = 0;
      if (t < 0.24) {
        env = 0.03 + 0.08 * (t / 0.24);
      } else if (t < 0.31) {
        const dt = (t - 0.275) / 0.016;
        env = 0.06 + 0.42 * Math.exp(-dt * dt);
      } else if (t < 0.54) {
        const u = (t - 0.31) / 0.23;
        env = 0.20 * Math.sin(Math.PI * u) + 0.03;
      } else if (t < 0.78) {
        const dt = (t - 0.66) / 0.045;
        const tailFade = Math.max(0, 1 - (t - 0.54) / 0.24);
        env = (0.09 * Math.exp(-dt * dt) + 0.025) * tailFade;
      }

      const fc1 = t < 0.33 ? 5400 - 1800 * (t / 0.33) : Math.max(2200, 4800 - 2400 * ((t - 0.33) / 0.40));
      const f1 = 2 * Math.sin((Math.PI * Math.min(fc1, sr * 0.42)) / sr);
      const hp1 = raw[i] - lp1 - 0.62 * bp1;
      bp1 += f1 * hp1;
      lp1 += f1 * bp1;

      const f2 = 2 * Math.sin((Math.PI * Math.min(6800, sr * 0.42)) / sr);
      const hp2 = raw[i] - lp2 - 0.8 * bp2;
      bp2 += f2 * hp2;
      lp2 += f2 * bp2;

      const sample = (bp1 * 0.85 + bp2 * 0.35) * env;
      out[i] = Math.max(-0.95, Math.min(0.95, sample));
    }

    return buf;
  }

  _ensurePresetLoaded(id) {
    if (!this.ctx || this.bufferCache.has(id) || this.loadingPromises.has(id)) return;
    const preset = this.getPresetInfo(id);
    if (!preset.url) {
      this.bufferCache.set(id, this._buildSynthBuffer(this.ctx));
      return;
    }

    const p = fetch(preset.url)
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .then((bytes) => (bytes && this.ctx ? this.ctx.decodeAudioData(bytes.slice(0)) : null))
      .then((decoded) => {
        if (decoded) this.bufferCache.set(id, decoded);
      })
      .catch(() => {})
      .finally(() => {
        this.loadingPromises.delete(id);
      });

    this.loadingPromises.set(id, p);
  }

  playFlip(force = false) {
    if (!this.enabled && !force) return;
    const nowMs = performance.now();
    if (!force && nowMs - this.lastPlayedMs < 72) return;
    this.lastPlayedMs = nowMs;

    const ctx = this.ensureContext();
    const preset = this.getPresetInfo(this.presetId);
    const buffer = this.bufferCache.get(preset.id);

    if (ctx && buffer) {
      const now = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = 0.98 + Math.random() * 0.04;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(preset.gain ?? 0.84, now);

      src.connect(gain);
      gain.connect(ctx.destination);
      src.start(now);
      return;
    }

    if (preset.url) {
      try {
        const el = new Audio(preset.url);
        el.volume = preset.gain ?? 0.84;
        el.play().catch(() => {});
      } catch {
        // ignore
      }
    }
  }
}

export const flipSound = new FlipSound();
