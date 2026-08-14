import { AnomalyConfig } from "./upcEngine";

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = true; // Default muted until user explicitly toggles
  private isInitialized: boolean = false;

  private filter: BiquadFilterNode | null = null;
  private activePitches: number[] = [];
  private currentConfig: AnomalyConfig | null = null;
  private lastChimeTime: number = 0;

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
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.25, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.isInitialized = true;
  }

  public updateConfig(config: AnomalyConfig) {
    this.currentConfig = config;
    if (!this.ctx || !this.isInitialized) return;

    const now = this.ctx.currentTime;
    this.activePitches = config.audio.scaleNotes;

    // Filter setup
    if (!this.filter) {
      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = "lowpass";
      this.filter.connect(this.masterGain!);
    }
    this.filter.frequency.setValueAtTime(config.audio.cutoffFreq, now);
    this.filter.Q.setValueAtTime(config.audio.resonance, now);
  }

  // Trigger particle event sound (e.g. particle edge wrap or flow acceleration)
  public triggerParticleChime(pitchRatio: number, intensity: number = 1.0) {
    if (!this.ctx || !this.currentConfig || this.isMuted) return;

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    // Throttle chimes slightly so sound remains pleasant & crisp
    if (now - this.lastChimeTime < 0.08) return;
    this.lastChimeTime = now;

    const pitches = this.activePitches.length > 0 ? this.activePitches : [220, 330, 440];
    const pitchIndex = Math.floor(Math.min(Math.max(pitchRatio, 0), 0.99) * pitches.length);
    const targetFreq = pitches[pitchIndex] || this.currentConfig.audio.rootFreq;

    const osc = this.ctx.createOscillator();
    osc.type = this.currentConfig.audio.osc1Type === "square" ? "triangle" : this.currentConfig.audio.osc1Type;
    osc.frequency.setValueAtTime(targetFreq, now);

    const gain = this.ctx.createGain();
    const vol = Math.min(0.08 * intensity, 0.25);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.6);

    osc.connect(gain);
    if (this.filter) {
      gain.connect(this.filter);
    } else if (this.masterGain) {
      gain.connect(this.masterGain);
    }

    osc.start(now);
    osc.stop(now + 0.65);
  }

  // Trigger a harmonic tone when touching canvas (ONLY when unmuted)
  public triggerTouchTone(normalizedX: number, normalizedY: number) {
    if (!this.ctx || !this.currentConfig || this.isMuted) return;

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    const pitches = this.activePitches.length > 0 ? this.activePitches : [220, 330, 440];
    const noteIndex = Math.floor(Math.min(Math.max(normalizedX, 0), 0.99) * pitches.length);
    const targetFreq = pitches[noteIndex] || this.currentConfig.audio.rootFreq;

    const pluckOsc = this.ctx.createOscillator();
    pluckOsc.type = "sine";
    pluckOsc.frequency.setValueAtTime(targetFreq, now);

    const pluckGain = this.ctx.createGain();
    const volume = 0.12 + (1 - normalizedY) * 0.18;
    pluckGain.gain.setValueAtTime(volume, now);
    pluckGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    pluckOsc.connect(pluckGain);
    if (this.filter) {
      pluckGain.connect(this.filter);
    } else if (this.masterGain) {
      pluckGain.connect(this.masterGain);
    }

    pluckOsc.start(now);
    pluckOsc.stop(now + 0.95);
  }

  public setTouchPan(normalizedX: number, normalizedY: number) {
    if (!this.ctx || !this.filter || !this.currentConfig || this.isMuted) return;
    const cutoff = this.currentConfig.audio.cutoffFreq * (0.5 + normalizedY * 1.5);
    this.filter.frequency.setTargetAtTime(cutoff, this.ctx.currentTime, 0.05);
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (!this.isInitialized) {
      this.init();
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.25, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public dispose() {
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.isInitialized = false;
  }
}
