// Port Solano — synthesized WebAudio sounds. No audio files.
export class AudioEngine {
  constructor() {
    this.ctx = null; this.master = null; this.engineOsc = null;
    this.engineGain = null; this.sirenNodes = null; this.enabled = true;
  }
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return true; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 50;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'lowpass'; filt.frequency.value = 420;
      this.engineOsc.connect(filt); filt.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engineOsc.start();
      return true;
    } catch (e) { return false; }
  }
  setEngine(speedNorm, driving) {
    if (!this.ctx || !this.engineOsc) return;
    const t = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(46 + speedNorm * 150, t, 0.08);
    this.engineGain.gain.setTargetAtTime(driving ? 0.05 + speedNorm * 0.06 : 0.0, t, 0.1);
  }
  blip(freq, dur, type, vol) {
    if (!this.ctx || !this.enabled) return;
    try {
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type || 'sine'; o.frequency.value = freq || 660;
      g.gain.setValueAtTime(vol || 0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + (dur || 0.12));
      o.connect(g); g.connect(this.master); o.start(t); o.stop(t + (dur || 0.12) + 0.02);
    } catch (e) {}
  }
  pickup() { this.blip(880, 0.1, 'sine', 0.3); setTimeout(() => this.blip(1320, 0.16, 'sine', 0.3), 90); }
  cash() { this.blip(988, 0.09, 'triangle', 0.3); setTimeout(() => this.blip(1319, 0.2, 'triangle', 0.3), 80); }
  click() { this.blip(1200, 0.05, 'square', 0.12); }
  horn() {
    if (!this.ctx || !this.enabled) return;
    try {
      const t = this.ctx.currentTime;
      [370, 466].forEach((f) => {
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = 'square'; o.frequency.value = f;
        g.gain.setValueAtTime(0.12, t); g.gain.setValueAtTime(0.12, t + 0.28);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
        o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.35);
      });
    } catch (e) {}
  }
  doorSlam() {
    if (!this.ctx || !this.enabled) return;
    try {
      const t = this.ctx.currentTime, len = 0.09;
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.5);
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300;
      const g = this.ctx.createGain(); g.gain.value = 0.7;
      src.connect(f); f.connect(g); g.connect(this.master); src.start(t);
      this.blip(90, 0.08, 'sine', 0.4);
    } catch (e) {}
  }
  skid() {
    // tyre squeal on hard cornering; throttled so it cannot spam
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    if (this.lastSkid && now - this.lastSkid < 0.9) return;
    this.lastSkid = now;
    try {
      const t = now, len = 0.4;
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) * 0.5;
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 2;
      const g = this.ctx.createGain(); g.gain.value = 0.16;
      src.connect(f); f.connect(g); g.connect(this.master); src.start(t);
    } catch (e) {}
  }
  punch() {
    if (!this.ctx || !this.enabled) return;
    try {
      const t = this.ctx.currentTime, len = 0.12;
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
      const g = this.ctx.createGain(); g.gain.value = 0.5;
      src.connect(f); f.connect(g); g.connect(this.master); src.start(t);
    } catch (e) {}
  }
  shot() {
    if (!this.ctx || !this.enabled) return;
    try {
      const t = this.ctx.currentTime, len = 0.18;
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 900;
      const g = this.ctx.createGain(); g.gain.value = 0.6;
      src.connect(f); f.connect(g); g.connect(this.master); src.start(t);
    } catch (e) {}
  }
  siren(on) {
    if (!this.ctx) return;
    try {
      if (on && !this.sirenNodes) {
        const o = this.ctx.createOscillator(), g = this.ctx.createGain(), lfo = this.ctx.createOscillator();
        o.type = 'triangle'; o.frequency.value = 750; g.gain.value = 0.045;
        lfo.type = 'square'; lfo.frequency.value = 0.6;
        const lg = this.ctx.createGain(); lg.gain.value = 260;
        lfo.connect(lg); lg.connect(o.frequency);
        o.connect(g); g.connect(this.master); o.start(); lfo.start();
        this.sirenNodes = { o, g, lfo };
      } else if (!on && this.sirenNodes) {
        const s = this.sirenNodes; this.sirenNodes = null;
        try { s.o.stop(); s.lfo.stop(); } catch (e) {}
        s.g.disconnect();
      }
    } catch (e) {}
  }
}
