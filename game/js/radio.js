// Port Solano — procedural radio: three synth stations, no audio files.
// A 16-step sequencer schedules bass + lead notes ahead of the playhead.
function midi(m) { return 440 * Math.pow(2, (m - 69) / 12); }

const STATIONS = [
  {
    name: 'SOL FM', bpm: 96, root: 45, wave: 'sawtooth',
    bass: [0, 0, 12, 0, 10, 0, 7, 0, 0, 0, 12, 0, 8, 0, 10, 7],
    lead: [0, 0, 0, 69, 0, 0, 72, 0, 0, 76, 0, 0, 74, 0, 72, 0],
  },
  {
    name: 'BAY BEATS', bpm: 112, root: 41, wave: 'square',
    bass: [0, 0, 0, 7, 0, 10, 0, 0, 0, 0, 12, 0, 0, 7, 10, 0],
    lead: [0, 64, 0, 0, 67, 0, 0, 69, 0, 0, 72, 0, 71, 0, 69, 0],
  },
  {
    name: 'PIER CLASSICS', bpm: 72, root: 48, wave: 'triangle',
    bass: [0, 0, 0, 0, 7, 0, 0, 0, 5, 0, 0, 0, 3, 0, 0, 0],
    lead: [72, 0, 0, 76, 0, 0, 79, 0, 0, 0, 77, 0, 76, 0, 74, 0],
  },
];

export class Radio {
  constructor(engine) {
    this.engine = engine;
    this.station = -1; // -1 = off
    this.step = 0;
    this.nextTime = 0;
    this.playing = false;
  }
  currentName() {
    return this.station < 0 ? 'RADIO OFF' : '♪ ' + STATIONS[this.station].name;
  }
  toggle() {
    this.station = (this.station + 1) % (STATIONS.length + 1) - 1;
    if (this.station >= STATIONS.length) this.station = -1;
    this.step = 0;
    const ctx = this.engine.ctx;
    if (ctx) this.nextTime = ctx.currentTime + 0.05;
    this.playing = this.station >= 0;
    return this.currentName();
  }
  start() {
    if (this.station < 0) this.toggle();
    this.playing = true;
    const ctx = this.engine.ctx;
    if (ctx) this.nextTime = ctx.currentTime + 0.05;
  }
  note(freq, at, dur, type, vol) {
    const ctx = this.engine.ctx;
    if (!ctx) return;
    try {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.linearRampToValueAtTime(vol, at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(g); g.connect(this.engine.master);
      o.start(at); o.stop(at + dur + 0.05);
    } catch (e) {}
  }
  hat(at) {
    const ctx = this.engine.ctx;
    if (!ctx) return;
    try {
      const len = 0.03;
      const buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6000;
      const g = ctx.createGain(); g.gain.value = 0.05;
      src.connect(f); f.connect(g); g.connect(this.engine.master);
      src.start(at);
    } catch (e) {}
  }
  scheduleStep(st, at) {
    const dur = (60 / st.bpm / 2) * 0.92;
    const bassNote = st.bass[this.step % 16];
    if (bassNote !== undefined) {
      this.note(midi(st.root + bassNote), at, dur, st.wave, 0.16);
    }
    const leadNote = st.lead[this.step % 16];
    if (leadNote) {
      this.note(midi(leadNote), at, dur * 1.4, 'sine', 0.07);
      this.note(midi(leadNote + 12), at, dur * 1.2, 'sine', 0.03);
    }
    if (this.step % 2 === 0) this.hat(at);
    if (this.step % 8 === 4) this.hat(at + dur / 2);
  }
  update() {
    const ctx = this.engine.ctx;
    if (!this.playing || this.station < 0 || !ctx || !this.engine.enabled) return;
    const st = STATIONS[this.station];
    const stepDur = 60 / st.bpm / 2;
    if (this.nextTime < ctx.currentTime) this.nextTime = ctx.currentTime + 0.05;
    while (this.nextTime < ctx.currentTime + 0.18) {
      this.scheduleStep(st, this.nextTime);
      this.nextTime += stepDur;
      this.step = (this.step + 1) % 16;
    }
  }
}
