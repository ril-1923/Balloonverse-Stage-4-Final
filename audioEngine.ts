import { loopTargets, masterGain, type LoopInfo, type OneShot } from './audioMixing';

type AC = typeof AudioContext;

/**
 * Procedural sound with the Web Audio API: no audio files, no downloads.
 * Nothing is created until a user gesture calls unlock() while sound is enabled,
 * so browser autoplay rules are respected. Without Web Audio every method is a no-op.
 */
class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private burnerGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private enabled = true;
  private volume = 0.6;
  unlocked = false;

  private get supported(): AC | null {
    if (typeof window === 'undefined') return null;
    const w = window as unknown as { AudioContext?: AC; webkitAudioContext?: AC };
    return w.AudioContext ?? w.webkitAudioContext ?? null;
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    this.applyMaster();
    if (on && this.unlocked && !this.ctx) this.unlock(); // sound was off at the first click; build it now
    else if (this.ctx) {
      if (on && this.unlocked) void this.ctx.resume();
      else if (!on) void this.ctx.suspend();
    }
  }

  setVolume(v: number): void {
    this.volume = v;
    this.applyMaster();
  }

  private applyMaster(): void {
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(masterGain(this.volume, this.enabled), this.ctx.currentTime, 0.03);
  }

  /** Call from a user gesture (click, key press). Safe to call repeatedly. */
  unlock(): void {
    const Ctor = this.supported;
    if (!Ctor) return;
    this.unlocked = true;
    if (!this.enabled) return;
    try {
      if (!this.ctx) this.build(Ctor);
      void this.ctx?.resume();
    } catch {
      /* audio is optional; ignore failures */
    }
  }

  private build(Ctor: AC): void {
    const ctx = new Ctor();
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    const master = ctx.createGain();
    master.gain.value = masterGain(this.volume, this.enabled);
    master.connect(comp).connect(ctx.destination);
    this.master = master;

    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.04 * white) / 1.04; // soft low-pass: warmer than raw white noise
      data[i] = white * 0.5 + last * 6;
    }
    this.noise = buf;

    const loop = (type: BiquadFilterType, freq: number, q: number) => {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = freq;
      filter.Q.value = q;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(filter).connect(gain).connect(master);
      src.start();
      return { filter, gain };
    };
    const b = loop('bandpass', 700, 0.6);
    this.burnerGain = b.gain;
    const w = loop('bandpass', 320, 0.5);
    this.windGain = w.gain;
    this.windFilter = w.filter;
  }

  /** Per-frame update of the continuous burner and wind loops. */
  update(info: LoopInfo): void {
    const ctx = this.ctx;
    if (!ctx || !this.burnerGain || !this.windGain || !this.windFilter) return;
    const t = ctx.currentTime;
    const target = loopTargets(info);
    this.burnerGain.gain.setTargetAtTime(target.burnerGain, t, target.burnerGain > 0 ? 0.05 : 0.25);
    this.windGain.gain.setTargetAtTime(target.windGain, t, 0.4);
    this.windFilter.frequency.setTargetAtTime(target.windFreq, t, 0.5);
  }

  private burst(opts: { when?: number; dur: number; type: BiquadFilterType; from: number; to: number; q?: number; gain: number; attack?: number }): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.noise) return;
    const t0 = ctx.currentTime + (opts.when ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = opts.type;
    f.Q.value = opts.q ?? 0.8;
    f.frequency.setValueAtTime(opts.from, t0);
    f.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), t0 + opts.dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(opts.gain, t0 + (opts.attack ?? 0.02));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t0);
    src.stop(t0 + opts.dur + 0.05);
  }

  private tone(opts: { when?: number; freq: number; to?: number; dur: number; type?: OscillatorType; gain: number }): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime + (opts.when ?? 0);
    const osc = ctx.createOscillator();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(opts.freq, t0);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t0 + opts.dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(opts.gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + opts.dur + 0.05);
  }

  play(sound: OneShot): void {
    if (!this.ctx || !this.enabled || !this.unlocked) return;
    switch (sound) {
      case 'takeoff':
        this.burst({ dur: 1.8, type: 'bandpass', from: 200, to: 1200, q: 0.7, gain: 0.3, attack: 0.25 });
        this.tone({ freq: 70, to: 140, dur: 1.6, type: 'sine', gain: 0.12 });
        break;
      case 'landSoft':
        this.burst({ dur: 0.35, type: 'lowpass', from: 500, to: 120, gain: 0.32 });
        this.tone({ freq: 95, to: 55, dur: 0.35, gain: 0.3 });
        break;
      case 'landHard':
        this.burst({ dur: 0.8, type: 'lowpass', from: 1100, to: 90, gain: 0.7 });
        this.tone({ freq: 75, to: 28, dur: 0.7, gain: 0.55 });
        this.burst({ when: 0.18, dur: 0.4, type: 'bandpass', from: 700, to: 200, gain: 0.25 });
        break;
      case 'mission':
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => this.tone({ when: i * 0.11, freq, dur: 0.42, type: 'triangle', gain: 0.2 }));
        break;
      case 'achievement':
        this.tone({ freq: 880, dur: 0.5, type: 'sine', gain: 0.18 });
        this.tone({ when: 0.12, freq: 1318.5, dur: 0.7, type: 'sine', gain: 0.18 });
        this.tone({ when: 0.24, freq: 1760, dur: 0.8, type: 'triangle', gain: 0.1 });
        break;
      case 'test':
        this.tone({ freq: 660, dur: 0.25, type: 'triangle', gain: 0.22 });
        break;
    }
  }

  suspend(): void {
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
  }

  resume(): void {
    if (this.ctx && this.enabled && this.unlocked && this.ctx.state === 'suspended') void this.ctx.resume();
  }
}

export const audio = new AudioEngine();
