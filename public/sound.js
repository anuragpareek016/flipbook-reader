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

/* ---------- 100% Offline Procedural Web Audio Ambient Focus Soundscape ---------- */
export const AMBIENT_PRESETS = [
  { id: 'off', label: 'Off' },
  { id: 'rain', label: 'Soft Rain' },
  { id: 'fireplace', label: 'Fireplace' },
  { id: 'library', label: 'Quiet Library' },
];

class AmbientSoundscape {
  constructor() {
    this.ctx = null;
    this.presetId = 'off';
    this.volume = 30; // 0..100
    this.masterGain = null;
    this.buffers = null;
    this.activeScene = null;
    this.suspendTimer = null;
  }

  getPresetInfo(id = this.presetId) {
    return AMBIENT_PRESETS.find((p) => p.id === id) || AMBIENT_PRESETS[0];
  }

  _targetLinearGain() {
    const v = Math.max(0, Math.min(100, Number(this.volume) || 0));
    if (this.presetId === 'off' || v <= 0) return 0;
    return Math.pow(v / 100, 1.45) * 0.44;
  }

  _ensureContext() {
    if (this.ctx && this.ctx.state === 'closed') {
      this._teardownScene(true);
      this.ctx = null;
      this.masterGain = null;
      this.buffers = null;
    }
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0;
      this.masterGain.connect(this.ctx.destination);
    }
    if (!this.buffers) {
      this.buffers = this._buildNoiseBuffers(this.ctx);
    }
    return this.ctx;
  }

  _buildNoiseBuffers(ctx) {
    const sr = ctx.sampleRate || 44100;
    const durSec = 4;
    const len = Math.floor(sr * durSec);
    const fadeLen = Math.floor(sr * 0.18);

    const makeStereoLoop = (genChannel) => {
      const buf = ctx.createBuffer(2, len, sr);
      for (let ch = 0; ch < 2; ch++) {
        const raw = new Float32Array(len + fadeLen);
        genChannel(raw);
        const out = buf.getChannelData(ch);
        for (let i = 0; i < len; i++) {
          if (i < fadeLen) {
            const t = i / fadeLen;
            const wIn = Math.sin(t * Math.PI * 0.5);
            const wOut = Math.cos(t * Math.PI * 0.5);
            out[i] = raw[i] * wIn + raw[len + i] * wOut;
          } else {
            out[i] = raw[i];
          }
        }
      }
      return buf;
    };

    const pink = makeStereoLoop((arr) => {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < arr.length; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.96900 * b2 + w * 0.1538520;
        b3 = 0.86650 * b3 + w * 0.3104856;
        b4 = 0.55000 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.0168980;
        arr[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.045;
        b6 = w * 0.115926;
      }
    });

    const brown = makeStereoLoop((arr) => {
      let last = 0;
      for (let i = 0; i < arr.length; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        arr[i] = last * 1.45;
      }
    });

    const crackleLen = Math.floor(sr * 0.045);
    const crackle = ctx.createBuffer(1, crackleLen, sr);
    const cData = crackle.getChannelData(0);
    for (let i = 0; i < crackleLen; i++) {
      const t = i / crackleLen;
      const env = Math.exp(-t * 14);
      cData[i] = (Math.random() * 2 - 1) * env;
    }

    return { pink, brown, crackle };
  }

  _teardownScene(immediate = false) {
    const scene = this.activeScene;
    this.activeScene = null;
    if (!scene) return;
    if (scene.timers) {
      for (const id of scene.timers) clearTimeout(id);
      scene.timers.length = 0;
    }
    scene.alive = false;
    const cleanNodes = () => {
      for (const n of scene.stopNodes || []) {
        try { n.stop(); } catch {}
      }
      for (const n of scene.nodes || []) {
        try { n.disconnect(); } catch {}
      }
    };
    if (!immediate && scene.gain && this.ctx && this.ctx.state === 'running') {
      try {
        const now = this.ctx.currentTime;
        scene.gain.gain.cancelScheduledValues(now);
        scene.gain.gain.setTargetAtTime(0, now, 0.045);
        setTimeout(cleanNodes, 180);
        return;
      } catch {
        // fallback immediate cleanup
      }
    }
    cleanNodes();
  }

  _startScene(presetId) {
    this._teardownScene(false);
    if (presetId === 'off') return;
    const ctx = this._ensureContext();
    if (!ctx || !this.masterGain || !this.buffers) return;

    clearTimeout(this.suspendTimer);
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const sceneGain = ctx.createGain();
    sceneGain.gain.setValueAtTime(0.0001, now);
    sceneGain.gain.setTargetAtTime(1.0, now, 0.14);
    sceneGain.connect(this.masterGain);

    const scene = {
      id: presetId,
      alive: true,
      gain: sceneGain,
      nodes: [sceneGain],
      stopNodes: [],
      timers: [],
    };
    this.activeScene = scene;

    const scheduleRand = (minMs, maxMs, fn) => {
      const tick = () => {
        if (!scene.alive || this.activeScene !== scene) return;
        if (ctx.state === 'running') fn();
        const wait = minMs + Math.random() * (maxMs - minMs);
        const tid = setTimeout(tick, wait);
        scene.timers.push(tid);
      };
      const tid = setTimeout(tick, minMs + Math.random() * (maxMs - minMs) * 0.5);
      scene.timers.push(tid);
    };

    const addNoiseLoop = (buf, filterType, freq, q = 0.7, level = 0.6) => {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.playbackRate.value = 0.97 + Math.random() * 0.06;

      const flt = ctx.createBiquadFilter();
      flt.type = filterType;
      flt.frequency.value = freq;
      flt.Q.value = q;

      const g = ctx.createGain();
      g.gain.value = level;

      src.connect(flt);
      flt.connect(g);
      g.connect(sceneGain);
      src.start(now);

      scene.stopNodes.push(src);
      scene.nodes.push(src, flt, g);
      return { src, flt, g };
    };

    if (presetId === 'rain') {
      const body = addNoiseLoop(this.buffers.pink, 'lowpass', 1250, 0.55, 0.62);
      const wash = addNoiseLoop(this.buffers.brown, 'bandpass', 420, 0.6, 0.55);

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.085;
      const lfoAmt = ctx.createGain();
      lfoAmt.gain.value = 210;
      lfo.connect(lfoAmt);
      lfoAmt.connect(body.flt.frequency);
      lfo.start(now);
      scene.stopNodes.push(lfo);
      scene.nodes.push(lfo, lfoAmt, wash.flt);

      // Gentle raindrop micro-patters
      scheduleRand(160, 420, () => {
        const drop = ctx.createBufferSource();
        drop.buffer = this.buffers.crackle;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 1400 + Math.random() * 2100;
        bp.Q.value = 3.2;
        const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        if (pan) pan.pan.value = (Math.random() - 0.5) * 1.4;
        const dg = ctx.createGain();
        const t = ctx.currentTime;
        const amp = 0.03 + Math.random() * 0.065;
        dg.gain.setValueAtTime(0.0001, t);
        dg.gain.linearRampToValueAtTime(amp, t + 0.004);
        dg.gain.exponentialRampToValueAtTime(0.0001, t + 0.042);

        drop.connect(bp);
        if (pan) {
          bp.connect(pan);
          pan.connect(dg);
        } else {
          bp.connect(dg);
        }
        dg.connect(sceneGain);
        drop.onended = () => {
          try { drop.disconnect(); bp.disconnect(); pan?.disconnect(); dg.disconnect(); } catch {}
        };
        drop.start(t);
      });
    } else if (presetId === 'fireplace') {
      const rumble = addNoiseLoop(this.buffers.brown, 'lowpass', 195, 0.9, 0.85);
      const glow = addNoiseLoop(this.buffers.pink, 'bandpass', 520, 0.75, 0.16);

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.13;
      const lfoAmt = ctx.createGain();
      lfoAmt.gain.value = 42;
      lfo.connect(lfoAmt);
      lfoAmt.connect(rumble.flt.frequency);
      lfo.start(now);
      scene.stopNodes.push(lfo);
      scene.nodes.push(lfo, lfoAmt, glow.g);

      // Subtle cozy wood crackles & ember pops
      scheduleRand(260, 1250, () => {
        const popCount = Math.random() < 0.28 ? 2 : 1;
        for (let k = 0; k < popCount; k++) {
          const delay = k * (0.04 + Math.random() * 0.09);
          const pop = ctx.createBufferSource();
          pop.buffer = this.buffers.crackle;
          const hp = ctx.createBiquadFilter();
          hp.type = 'bandpass';
          hp.frequency.value = 1800 + Math.random() * 2800;
          hp.Q.value = 2.2;
          const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
          if (pan) pan.pan.value = (Math.random() - 0.5) * 0.85;
          const pg = ctx.createGain();
          const t = ctx.currentTime + delay;
          const amp = 0.05 + Math.random() * 0.11;
          pg.gain.setValueAtTime(0.0001, t);
          pg.gain.linearRampToValueAtTime(amp, t + 0.002);
          pg.gain.exponentialRampToValueAtTime(0.0001, t + 0.024 + Math.random() * 0.02);

          pop.connect(hp);
          if (pan) {
            hp.connect(pan);
            pan.connect(pg);
          } else {
            hp.connect(pg);
          }
          pg.connect(sceneGain);
          pop.onended = () => {
            try { pop.disconnect(); hp.disconnect(); pan?.disconnect(); pg.disconnect(); } catch {}
          };
          pop.start(t);
        }
      });
    } else if (presetId === 'library') {
      addNoiseLoop(this.buffers.brown, 'lowpass', 250, 0.5, 0.52);
      addNoiseLoop(this.buffers.pink, 'bandpass', 430, 0.9, 0.12);

      // Ultra-soft distant study room air / subtle page whisper
      scheduleRand(3200, 7200, () => {
        const rustle = ctx.createBufferSource();
        rustle.buffer = this.buffers.pink;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 950 + Math.random() * 750;
        bp.Q.value = 1.6;
        const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        if (pan) pan.pan.value = (Math.random() - 0.5) * 1.1;
        const rg = ctx.createGain();
        const t = ctx.currentTime;
        const dur = 0.18 + Math.random() * 0.16;
        rg.gain.setValueAtTime(0.0001, t);
        rg.gain.linearRampToValueAtTime(0.028 + Math.random() * 0.02, t + dur * 0.35);
        rg.gain.exponentialRampToValueAtTime(0.0001, t + dur);

        rustle.connect(bp);
        if (pan) {
          bp.connect(pan);
          pan.connect(rg);
        } else {
          bp.connect(rg);
        }
        rg.connect(sceneGain);
        rustle.onended = () => {
          try { rustle.disconnect(); bp.disconnect(); pan?.disconnect(); rg.disconnect(); } catch {}
        };
        rustle.start(t, Math.random() * 2.5, dur + 0.05);
      });
    }

    this._applyMasterGain();
  }

  _applyMasterGain() {
    if (!this.ctx || !this.masterGain) return;
    try {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(this._targetLinearGain(), now, 0.06);
    } catch {
      // ignore gain update errors
    }
  }

  setPreset(id) {
    const nextId = AMBIENT_PRESETS.some((p) => p.id === id) ? id : 'off';
    const prevId = this.presetId;
    this.presetId = nextId;
    if (nextId === 'off') {
      this._applyMasterGain();
      this._teardownScene(false);
      clearTimeout(this.suspendTimer);
      this.suspendTimer = setTimeout(() => {
        if (this.presetId === 'off' && this.ctx && this.ctx.state === 'running') {
          this.ctx.suspend().catch(() => {});
        }
      }, 220);
      return;
    }
    if (!this.activeScene || prevId !== nextId) {
      this._startScene(nextId);
    } else {
      this._applyMasterGain();
    }
  }

  setVolume(vol) {
    const v = Math.max(0, Math.min(100, Math.round(Number(vol) || 0)));
    this.volume = v;
    this._applyMasterGain();
  }

  unlock() {
    if (this.presetId === 'off') return;
    if (!this.activeScene) {
      this._startScene(this.presetId);
    } else if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }
}

export const ambientSound = new AmbientSoundscape();
