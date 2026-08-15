import { AnomalyConfig } from "./upcEngine";

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private isInitialized: boolean = false;

  private filter: BiquadFilterNode | null = null;
  private activePitches: number[] = [];
  private currentConfig: AnomalyConfig | null = null;

  private arpeggioTimer: number | null = null;
  private arpeggioStep: number = 0;
  private lastCollisionTime: number = 0;

  public init() {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }
      return;
    }

    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass();

    this.masterGain = this.ctx.createGain();
    // Significantly increased master gain for crisp, audible sound
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.65, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.isInitialized = true;
  }

  public updateConfig(config: AnomalyConfig) {
    this.currentConfig = config;
    if (!this.ctx || !this.isInitialized) return;

    const now = this.ctx.currentTime;
    this.activePitches = config.audio.scaleNotes;

    if (!this.filter) {
      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = "lowpass";
      this.filter.connect(this.masterGain!);
    }
    // Set filter cutoff frequency to be higher and Q lower for richer, clearer tone
    const openCutoff = Math.max(config.audio.cutoffFreq, 1800);
    this.filter.frequency.setValueAtTime(openCutoff, now);
    this.filter.Q.setValueAtTime(2.0, now);

    this.startArpeggioScheduler();
  }

  private startArpeggioScheduler() {
    this.stopArpeggioScheduler();
    if (this.isMuted) return;

    const bpm = this.currentConfig?.audio.arpeggioBpm || 85;
    const intervalMs = (60 / bpm) * 1000 * 0.65;

    this.arpeggioTimer = window.setInterval(() => {
      if (this.isMuted || !this.ctx || !this.currentConfig) return;

      if (Math.random() > 0.45) return;

      const now = this.ctx.currentTime;
      const pitches = this.activePitches.length > 0 ? this.activePitches : [261, 329, 392, 523];
      this.arpeggioStep = (this.arpeggioStep + Math.floor(Math.random() * 3) + 1) % pitches.length;
      const freq = pitches[this.arpeggioStep];

      const osc = this.ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);

      const gain = this.ctx.createGain();
      // Increased chime oscillator volume
      const vol = 0.18 + Math.random() * 0.12;
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc.connect(gain);
      if (this.filter) {
        gain.connect(this.filter);
      } else {
        gain.connect(this.masterGain!);
      }

      osc.start(now);
      osc.stop(now + 1.25);
    }, intervalMs);
  }

  private stopArpeggioScheduler() {
    if (this.arpeggioTimer !== null) {
      clearInterval(this.arpeggioTimer);
      this.arpeggioTimer = null;
    }
  }

  public triggerFingerCollision(pitchRatio: number, particleSize: number) {
    if (this.isMuted) return;

    if (!this.isInitialized) {
      this.init();
    }

    if (!this.ctx || !this.currentConfig) return;

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    if (now - this.lastCollisionTime < 0.15) return;
    this.lastCollisionTime = now;

    const pitches = this.activePitches.length > 0 ? this.activePitches : [261, 329, 392, 523, 659];
    const pitchIndex = Math.floor(Math.min(Math.max(pitchRatio, 0), 0.99) * pitches.length);
    const targetFreq = pitches[pitchIndex] || this.currentConfig.audio.rootFreq;

    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    const pitchModifier = 1 + (15 / Math.max(particleSize, 4)) * 0.08;
    osc.frequency.setValueAtTime(targetFreq * pitchModifier, now);

    const gain = this.ctx.createGain();
    // Increased collision sound volume
    const volume = 0.22 + Math.min(particleSize / 50, 0.2);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    osc.connect(gain);
    if (this.filter) {
      gain.connect(this.filter);
    } else {
      gain.connect(this.masterGain!);
    }

    osc.start(now);
    osc.stop(now + 0.95);
  }

  public setTouchPan(normalizedX: number, normalizedY: number) {
    if (!this.ctx || !this.filter || !this.currentConfig || this.isMuted) return;
    const baseCutoff = Math.max(this.currentConfig.audio.cutoffFreq, 1800);
    const cutoff = baseCutoff * (0.6 + normalizedY * 1.8);
    this.filter.frequency.setTargetAtTime(cutoff, this.ctx.currentTime, 0.05);
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (!this.isInitialized) {
      this.init();
    }

    if (this.isMuted) {
      this.stopArpeggioScheduler();
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }
    } else {
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setValueAtTime(0.65, this.ctx.currentTime);
      }
      if (this.currentConfig) {
        this.updateConfig(this.currentConfig);
      }
    }

    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public dispose() {
    this.stopArpeggioScheduler();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.isInitialized = false;
  }
}
