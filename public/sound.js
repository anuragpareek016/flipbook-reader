// FlipHTML5-modeled multi-stage realistic paper page-turn sound (100% offline Web Audio)
// Matches the 3-stage acoustic envelope: light lift brush -> crisp edge flick -> airy arc sweep & settle.

class FlipSound {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.flipBuffer = null;
    this.unlocked = false;
  }

  setEnabled(val) {
    this.enabled = !!val;
  }

  unlock() {
    if (this.unlocked && this.ctx?.state === 'running') return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        this.unlocked = true;
      }).catch(() => {});
    } else {
      this.unlocked = true;
    }
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
    if (!this.flipBuffer && this.ctx) {
      this.flipBuffer = this._buildFlipBuffer(this.ctx);
    }
    return this.ctx;
  }

  _buildFlipBuffer(ctx) {
    const sr = ctx.sampleRate;
    const dur = 0.78;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const out = buf.getChannelData(0);

    // Pre-generate textured white/pink noise
    const raw = new Float32Array(len);
    let pink = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      pink = (pink + 0.15 * w) / 1.15;
      raw[i] = w * 0.65 + pink * 0.85;
    }

    // Simple 2-pole state-variable bandpass helper rendered offline into buffer
    let lp1 = 0;
    let bp1 = 0;
    let lp2 = 0;
    let bp2 = 0;

    for (let i = 0; i < len; i++) {
      const t = i / sr;

      // Amplitude envelope modeled on FlipHTML5's 3-phase flipsound profile
      let env = 0;
      if (t < 0.24) {
        // Phase 1: gentle rising paper lift friction
        env = 0.03 + 0.08 * (t / 0.24);
      } else if (t < 0.31) {
        // Phase 2: crisp paper edge snap/flick around 275ms
        const dt = (t - 0.275) / 0.016;
        env = 0.06 + 0.42 * Math.exp(-dt * dt);
      } else if (t < 0.54) {
        // Phase 3: airy page sweep across book
        const u = (t - 0.31) / 0.23;
        env = 0.20 * Math.sin(Math.PI * u) + 0.03;
      } else if (t < 0.78) {
        // Phase 4: soft page landing rustle near 660ms
        const dt = (t - 0.66) / 0.045;
        const tailFade = Math.max(0, 1 - (t - 0.54) / 0.24);
        env = (0.09 * Math.exp(-dt * dt) + 0.025) * tailFade;
      }

      // Sweep center frequency from ~5.6kHz (lift/flick) down to ~2.6kHz (sweep/settle)
      const fc1 = t < 0.33 ? 5400 - 1800 * (t / 0.33) : Math.max(2200, 4800 - 2400 * ((t - 0.33) / 0.40));
      const f1 = 2 * Math.sin((Math.PI * Math.min(fc1, sr * 0.42)) / sr);
      const q1 = 0.62;
      const hp1 = raw[i] - lp1 - q1 * bp1;
      bp1 += f1 * hp1;
      lp1 += f1 * bp1;

      // Secondary crisp paper-fiber overtone (~6.8kHz)
      const f2 = 2 * Math.sin((Math.PI * Math.min(6800, sr * 0.42)) / sr);
      const hp2 = raw[i] - lp2 - 0.8 * bp2;
      bp2 += f2 * hp2;
      lp2 += f2 * bp2;

      const sample = (bp1 * 0.85 + bp2 * 0.35) * env;
      out[i] = Math.max(-0.95, Math.min(0.95, sample));
    }

    return buf;
  }

  playFlip() {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.flipBuffer) return;

    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.flipBuffer;
    src.playbackRate.value = 0.97 + Math.random() * 0.06;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.75, now);

    src.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
  }
}

export const flipSound = new FlipSound();
