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
    this.rawBytesCache = new Map();
    this.rawFetchPromises = new Map();
    this.loadingPromises = new Map();
    this.htmlAudioPool = new Map();
    this.htmlAudioCursors = new Map();
    this.blobUrlCache = new Map();
    this.unlocked = false;
    this.lastPlayedMs = 0;
    this.lastPlayWallMs = 0;
    this.lastPlayCtxTime = 0;
    this.ctxResetCooldownUntil = 0;
  }

  _hasNativeBridge() {
    return typeof window !== 'undefined' && Boolean(window.webkit?.messageHandlers?.flipbook);
  }

  _postNative(action, payload = {}) {
    try {
      const handler = window.webkit?.messageHandlers?.flipbook;
      if (!handler) return false;
      handler.postMessage({ action, ...payload });
      return true;
    } catch {
      return false;
    }
  }

  getPresets() {
    return SOUND_PRESETS;
  }

  getPresetInfo(id = this.presetId) {
    return SOUND_PRESETS.find((p) => p.id === id) || SOUND_PRESETS[0];
  }

  setEnabled(val) {
    this.enabled = !!val;
    if (this.enabled) {
      this.prefetch();
    }
  }

  setPreset(id) {
    const valid = SOUND_PRESETS.some((p) => p.id === id);
    this.presetId = valid ? id : DEFAULT_SOUND_PRESET;
    this.prefetch();
  }

  prefetch(id = this.presetId) {
    const preset = this.getPresetInfo(id);
    if (this._hasNativeBridge()) {
      this._postNative('prepareSound', { preset: preset.id });
      return;
    }
    if (preset.url) {
      this._fetchRawPreset(preset).then((bytes) => {
        if (bytes) this._ensureHtmlAudioPool(preset, bytes);
      });
      this._ensureHtmlAudioPool(preset, this.rawBytesCache.get(preset.id) || null);
    }
    if (this.ctx && this.ctx.state !== 'closed') {
      this._ensurePresetLoaded(preset.id);
    }
  }

  _ensureHtmlAudioPool(preset, bytes = null) {
    if (!preset.url) return [];
    let srcUrl = this.blobUrlCache.get(preset.id);
    if (!srcUrl && bytes) {
      try {
        srcUrl = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
        this.blobUrlCache.set(preset.id, srcUrl);
      } catch {
        srcUrl = preset.url;
      }
    }
    const effectiveUrl = srcUrl || preset.url;
    let pool = this.htmlAudioPool.get(preset.id);
    if (!pool) {
      pool = [];
      for (let i = 0; i < 3; i++) {
        const el = new Audio(effectiveUrl);
        el.preload = 'auto';
        pool.push(el);
      }
      this.htmlAudioPool.set(preset.id, pool);
    } else if (srcUrl) {
      for (const el of pool) {
        if (!el.src.startsWith('blob:')) {
          el.src = srcUrl;
          el.load();
        }
      }
    }
    return pool;
  }

  _fetchRawPreset(preset) {
    if (!preset.url) return Promise.resolve(null);
    if (this.rawBytesCache.has(preset.id)) {
      return Promise.resolve(this.rawBytesCache.get(preset.id));
    }
    if (this.rawFetchPromises.has(preset.id)) {
      return this.rawFetchPromises.get(preset.id);
    }
    const p = fetch(preset.url)
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .then((bytes) => {
        if (bytes) this.rawBytesCache.set(preset.id, bytes);
        return bytes || null;
      })
      .catch(() => null)
      .finally(() => {
        this.rawFetchPromises.delete(preset.id);
      });
    this.rawFetchPromises.set(preset.id, p);
    return p;
  }

  _resetContext() {
    if (this.ctx) {
      const old = this.ctx;
      this.ctx = null;
      if (old.state !== 'closed') {
        try {
          old.close()?.catch?.(() => {});
        } catch {
          // ignore close failure
        }
      }
    }
    this.bufferCache.clear();
    this.loadingPromises.clear();
    this.unlocked = false;
    this.lastPlayWallMs = 0;
    this.lastPlayCtxTime = 0;
  }

  _resumeContext(ctx) {
    if (!ctx || ctx.state === 'running' || ctx.state === 'closed') {
      return Promise.resolve(ctx?.state === 'running');
    }
    return ctx.resume()
      .then(() => {
        const running = this.ctx === ctx && ctx.state === 'running';
        if (running) this.unlocked = true;
        return running;
      })
      .catch(() => false);
  }

  unlock() {
    this.prefetch();
    if (this._hasNativeBridge()) {
      this._postNative('prepareSound', { preset: this.presetId });
      this.unlocked = true;
      return;
    }
    if (this.ctx && this.ctx.state === 'running') {
      this.unlocked = true;
      return;
    }
    const ctx = this.ensureContext({ recreateIfDead: true });
    if (!ctx) return;
    if (ctx.state === 'running') {
      this.unlocked = true;
    } else {
      this._resumeContext(ctx).then((ok) => {
        if (!ok && this.ctx === ctx && (ctx.state === 'interrupted' || ctx.state === 'closed')) {
          this._resetContext();
        }
      });
    }
  }

  ensureContext({ recreateIfDead = false } = {}) {
    if (this.ctx) {
      if (this.ctx.state === 'closed') {
        this._resetContext();
      } else if (recreateIfDead && this.ctx.state === 'interrupted') {
        this._resetContext();
      }
    }
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      const ctx = new AudioCtx();
      this.ctx = ctx;
      ctx.addEventListener?.('statechange', () => {
        if (this.ctx !== ctx) return;
        if (ctx.state === 'running') {
          this.unlocked = true;
        } else if (ctx.state === 'closed') {
          this._resetContext();
        } else {
          this.unlocked = false;
        }
      });
    }
    if (this.ctx.state !== 'running') {
      this._resumeContext(this.ctx);
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
    if (!this.ctx || this.ctx.state === 'closed' || this.bufferCache.has(id) || this.loadingPromises.has(id)) return;
    const ctxRef = this.ctx;
    const preset = this.getPresetInfo(id);
    if (!preset.url) {
      this.bufferCache.set(id, this._buildSynthBuffer(ctxRef));
      return;
    }

    const p = this._fetchRawPreset(preset)
      .then((bytes) => (bytes && this.ctx === ctxRef && ctxRef.state !== 'closed'
        ? ctxRef.decodeAudioData(bytes.slice(0))
        : null))
      .then((decoded) => {
        if (decoded && this.ctx === ctxRef) {
          this.bufferCache.set(id, decoded);
        }
      })
      .catch(() => {})
      .finally(() => {
        this.loadingPromises.delete(id);
      });

    this.loadingPromises.set(id, p);
  }

  _playWebAudioBuffer(ctx, buffer, preset, nowMs) {
    try {
      const now = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = 0.98 + Math.random() * 0.04;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(preset.gain ?? 0.84, now);

      src.connect(gain);
      gain.connect(ctx.destination);
      src.onended = () => {
        try { src.disconnect(); } catch {}
        try { gain.disconnect(); } catch {}
      };
      src.start(now);

      this.lastPlayWallMs = nowMs;
      this.lastPlayCtxTime = now;
      return true;
    } catch {
      return false;
    }
  }

  _playSynthFallback(activeCtx, preset) {
    if (!activeCtx || activeCtx.state !== 'running') return false;
    const synthBuf = this.bufferCache.get('classic-synth') || this._buildSynthBuffer(activeCtx);
    this.bufferCache.set('classic-synth', synthBuf);
    return this._playWebAudioBuffer(activeCtx, synthBuf, preset, performance.now());
  }

  _playHtmlFallback(preset) {
    if (!preset.url) return false;
    try {
      const pool = this._ensureHtmlAudioPool(preset, this.rawBytesCache.get(preset.id) || null);
      if (!pool.length) return false;
      const idx = this.htmlAudioCursors.get(preset.id) || 0;
      const el = pool[idx % pool.length];
      this.htmlAudioCursors.set(preset.id, (idx + 1) % pool.length);
      el.volume = preset.gain ?? 0.84;
      try {
        el.currentTime = 0;
      } catch {
        // ignore if metadata not yet seekable
      }
      el.play().catch(() => {
        try {
          const fallbackUrl = this.blobUrlCache.get(preset.id) || preset.url;
          const fresh = new Audio(fallbackUrl);
          fresh.volume = preset.gain ?? 0.84;
          fresh.play().catch(() => {
            this._playSynthFallback(this.ctx, preset);
          });
        } catch {
          this._playSynthFallback(this.ctx, preset);
        }
      });
      return true;
    } catch {
      return false;
    }
  }

  playFlip(force = false) {
    if (!this.enabled && !force) return;
    const nowMs = performance.now();
    if (!force && nowMs - this.lastPlayedMs < 72) return;
    this.lastPlayedMs = nowMs;

    const preset = this.getPresetInfo(this.presetId);

    // Native macOS app bridge plays via AppKit AVAudioPlayer pool (immune to WKWebView audio sleep/suspend)
    if (this._postNative('playSound', { preset: preset.id, volume: preset.gain ?? 0.84 })) {
      return;
    }

    let ctx = this.ensureContext();

    // Recover automatically if CoreAudio hardware clock froze after sleep/route switch
    if (
      ctx &&
      ctx.state === 'running' &&
      this.lastPlayWallMs > 0 &&
      nowMs - this.lastPlayWallMs > 280 &&
      ctx.currentTime <= this.lastPlayCtxTime + 0.001 &&
      nowMs >= this.ctxResetCooldownUntil
    ) {
      this.ctxResetCooldownUntil = nowMs + 1500;
      this._resetContext();
      ctx = this.ensureContext();
      if (this._playHtmlFallback(preset)) return;
    }

    const playReadyBuffer = (activeCtx) => {
      if (!activeCtx || activeCtx.state !== 'running') return false;
      let buffer = this.bufferCache.get(preset.id);
      if (!buffer && !preset.url) {
        buffer = this._buildSynthBuffer(activeCtx);
        this.bufferCache.set(preset.id, buffer);
      }
      if (buffer) {
        return this._playWebAudioBuffer(activeCtx, buffer, preset, performance.now());
      }
      if (this._playHtmlFallback(preset)) {
        return true;
      }
      return this._playSynthFallback(activeCtx, preset);
    };

    if (ctx && ctx.state === 'running') {
      if (playReadyBuffer(ctx)) return;
    }

    if (ctx) {
      if (!this.unlocked && preset.url) {
        this._resumeContext(ctx).then((running) => {
          if (!running && this.ctx === ctx && (ctx.state === 'interrupted' || ctx.state === 'closed')) {
            this._resetContext();
          }
        });
        if (this._playHtmlFallback(preset)) return;
      }

      let settled = false;
      const fallbackTimer = setTimeout(() => {
        if (settled) return;
        settled = true;
        this._playHtmlFallback(preset);
      }, 28);

      this._resumeContext(ctx).then((running) => {
        if (settled) return;
        settled = true;
        clearTimeout(fallbackTimer);
        if (running && this.ctx === ctx) {
          if (!playReadyBuffer(ctx)) {
            this._playHtmlFallback(preset);
          }
        } else {
          if (ctx.state === 'interrupted' || ctx.state === 'closed') {
            this._resetContext();
          }
          this._playHtmlFallback(preset);
        }
      });
      return;
    }

    this._playHtmlFallback(preset);
  }
}

export const flipSound = new FlipSound();
