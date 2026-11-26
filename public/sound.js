// Realistic offline Web Audio paper page-turn synthesizer
class FlipSound {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.noiseBuffer = null;
  }

  setEnabled(val) {
    this.enabled = !!val;
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
    if (!this.noiseBuffer && this.ctx) {
      const sr = this.ctx.sampleRate;
      const len = Math.floor(sr * 0.35);
      const buf = this.ctx.createBuffer(1, len, sr);
      const data = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        // Soft pink-ish filtered noise for natural paper fiber texture
        last = (last + 0.12 * white) / 1.12;
        data[i] = last * 2.4;
      }
      this.noiseBuffer = buf;
    }
    return this.ctx;
  }

  playFlip() {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;

    const now = ctx.currentTime;

    // Layer 1: crisp sliding paper swish
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1100, now);
    filter.frequency.exponentialRampToValueAtTime(2400, now + 0.08);
    filter.frequency.exponentialRampToValueAtTime(750, now + 0.22);
    filter.Q.value = 1.1;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.045);
    gain.gain.exponentialRampToValueAtTime(0.04, now + 0.14);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
    src.stop(now + 0.25);

    // Layer 2: subtle soft settle thump as page lands
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(115, now + 0.13);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.23);

    const thumpGain = ctx.createGain();
    thumpGain.gain.setValueAtTime(0.0001, now + 0.12);
    thumpGain.gain.linearRampToValueAtTime(0.045, now + 0.15);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

    osc.connect(thumpGain);
    thumpGain.connect(ctx.destination);
    osc.start(now + 0.12);
    osc.stop(now + 0.25);
  }
}

export const flipSound = new FlipSound();
