import { AnomalyConfig } from "./upcEngine";

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private isInitialized: boolean = false;

  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private subOsc: OscillatorNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private lfo: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;

  private activePitches: number[] = [];
  private currentConfig: AnomalyConfig | null = null;

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
    this.masterGain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.isInitialized = true;
  }

  public updateConfig(config: AnomalyConfig) {
    this.currentConfig = config;
    if (!this.ctx || !this.isInitialized) return;

    // Stop previous oscillators if active
    this.stopSynth();

    const now = this.ctx.currentTime;
    this.activePitches = config.audio.scaleNotes;

    // Filter setup
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.setValueAtTime(config.audio.cutoffFreq, now);
    this.filter.Q.setValueAtTime(config.audio.resonance, now);
    this.filter.connect(this.masterGain!);

    // LFO modulation for filter sweep
    this.lfo = this.ctx.createOscillator();
    this.lfo.type = "sine";
    this.lfo.frequency.setValueAtTime(config.audio.lfoRate, now);

    this.lfoGain = this.ctx.createGain();
    this.lfoGain.gain.setValueAtTime(config.audio.cutoffFreq * 0.4, now);
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.filter.frequency);
    this.lfo.start();

    // Primary drone oscillator
    const rootFreq = config.audio.rootFreq;
    this.osc1 = this.ctx.createOscillator();
    this.osc1.type = config.audio.osc1Type;
    this.osc1.frequency.setValueAtTime(rootFreq, now);

    // Secondary detuned harmonic oscillator
    const fifthFreq = config.audio.scaleNotes[3] || rootFreq * 1.5;
    this.osc2 = this.ctx.createOscillator();
    this.osc2.type = config.audio.osc2Type;
    this.osc2.frequency.setValueAtTime(fifthFreq, now);
    this.osc2.detune.setValueAtTime(config.audio.detune, now);

    // Deep sub-bass oscillator
    this.subOsc = this.ctx.createOscillator();
    this.subOsc.type = "sine";
    this.subOsc.frequency.setValueAtTime(rootFreq / 2, now);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.2, now);

    this.osc1.connect(oscGain);
    this.osc2.connect(oscGain);
    this.subOsc.connect(oscGain);
    oscGain.connect(this.filter);

    this.osc1.start();
    this.osc2.start();
    this.subOsc.start();
  }

  // Trigger a harmonic tone when touching canvas
  public triggerTouchTone(normalizedX: number, normalizedY: number) {
    if (!this.ctx || !this.currentConfig || this.isMuted) return;

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    const noteIndex = Math.floor(normalizedX * (this.activePitches.length - 1));
    const targetFreq = this.activePitches[noteIndex] || this.currentConfig.audio.rootFreq;

    const pluckOsc = this.ctx.createOscillator();
    pluckOsc.type = "sine";
    pluckOsc.frequency.setValueAtTime(targetFreq, now);

    const pluckGain = this.ctx.createGain();
    const volume = 0.15 + (1 - normalizedY) * 0.2;
    pluckGain.gain.setValueAtTime(volume, now);
    pluckGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    pluckOsc.connect(pluckGain);
    if (this.filter) {
      pluckGain.connect(this.filter);
    } else if (this.masterGain) {
      pluckGain.connect(this.masterGain);
    }

    pluckOsc.start(now);
    pluckOsc.stop(now + 1.25);
  }

  public setTouchPan(normalizedX: number, normalizedY: number) {
    if (!this.ctx || !this.filter || !this.currentConfig) return;
    const cutoff = this.currentConfig.audio.cutoffFreq * (0.5 + normalizedY * 1.5);
    this.filter.frequency.setTargetAtTime(cutoff, this.ctx.currentTime, 0.05);
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.15, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public stopSynth() {
    try {
      if (this.osc1) {
        this.osc1.stop();
        this.osc1.disconnect();
      }
      if (this.osc2) {
        this.osc2.stop();
        this.osc2.disconnect();
      }
      if (this.subOsc) {
        this.subOsc.stop();
        this.subOsc.disconnect();
      }
      if (this.lfo) {
        this.lfo.stop();
        this.lfo.disconnect();
      }
    } catch {
      // Ignore if already stopped
    }
  }

  public dispose() {
    this.stopSynth();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.isInitialized = false;
  }
}
