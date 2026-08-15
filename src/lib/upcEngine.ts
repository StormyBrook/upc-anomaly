export interface ColorHSLA {
  h: number; // 0 - 360
  s: number; // 0 - 100
  l: number; // 0 - 100
  a: number; // 0 - 1
}

export type TouchMode = "repel" | "attract" | "vortex" | "ripple" | "orbit";

export type ScaleType =
  | "minorPentatonic"
  | "lydian"
  | "phrygian"
  | "harmonicMinor"
  | "wholeTone"
  | "ambientMajor";

export interface AnomalyConfig {
  upc: string;
  hash: number;
  anomalyName: string;
  anomalyClass: string;

  // Visual Dynamics
  colors: {
    bg: string;
    bgHSLA: ColorHSLA;
    primary: ColorHSLA;
    secondary: ColorHSLA;
    accent: ColorHSLA;
    blendMode: "source-over" | "screen" | "additive" | "difference";
  };

  particles: {
    count: number;
    minSize: number;
    maxSize: number;
    flowAngleDegrees: number; // angle of diagonal flow
    speed: number; // base velocity
    gravity: { x: number; y: number };
    turbulence: number; // Perlin noise scale/force
    spinSpeed: number; // triangle rotational velocity
    trailFade: number; // background alpha persistence (1-255, lower = longer trails)
    wireframeRatio: number; // percentage of triangles drawn as wireframe
  };

  // Interaction
  touch: {
    mode: TouchMode;
    radius: number;
    force: number;
  };

  // Audio Synth Parameters
  audio: {
    rootNote: number; // Midi note number (36 - 72)
    rootFreq: number; // Hz
    scale: ScaleType;
    scaleNotes: number[]; // Frequencies in Hz
    osc1Type: OscillatorType;
    osc2Type: OscillatorType;
    cutoffFreq: number; // Filter cutoff in Hz (100 - 4000)
    resonance: number; // Q factor (0.5 - 15)
    lfoRate: number; // Hz (0.1 - 8.0)
    detune: number; // cents (-25 to +25)
    reverbDecay: number; // seconds
    arpeggioBpm: number; // BPM for option 2 rhythmic chimes
  };
}

// Simple FNV-1a hash for deterministic numbers from UPC
export function hashUPC(upc: string): number {
  let hash = 2166136261;
  for (let i = 0; i < upc.length; i++) {
    hash ^= upc.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// Pseudorandom number generator using seeded hash
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  rangeInt(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

const SCALE_INTERVALS: Record<ScaleType, number[]> = {
  minorPentatonic: [0, 3, 5, 7, 10, 12, 15, 17, 19, 22],
  lydian: [0, 2, 4, 6, 7, 9, 11, 12, 14, 16, 18, 19],
  phrygian: [0, 1, 3, 5, 7, 8, 10, 12, 13, 15, 17, 19],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11, 12, 14, 15, 17, 19],
  wholeTone: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18],
  ambientMajor: [0, 2, 4, 7, 9, 11, 12, 14, 16, 19],
};

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const ANOMALY_CLASSES = [
  "Sub-Space Cascade",
  "Quantum Rift",
  "Chronos Drift",
  "Prismatic Shift",
  "Void Resonance",
  "Tachyon Wave",
  "Aether Stream",
  "Entropy Vortex",
  "Singularity Current",
  "Hyper-Dimensional Flow",
];

const CODE_GREEK = ["ALPHA", "BETA", "GAMMA", "DELTA", "SIGMA", "OMEGA", "NEBULA", "ZERO", "NEXUS", "ZENITH"];

export function parseUPCToConfig(upcInput: string): AnomalyConfig {
  const upc = upcInput.trim() || "000000000000";
  const numericHash = hashUPC(upc);
  const rng = new SeededRandom(numericHash);

  const greekIndex = numericHash % CODE_GREEK.length;
  const anomalyClass = ANOMALY_CLASSES[numericHash % ANOMALY_CLASSES.length];
  const shortCode = upc.slice(-4) || "0000";
  const defaultName = `${anomalyClass} [SIG-${CODE_GREEK[greekIndex]}-${shortCode}]`;

  const baseHue = rng.range(0, 360);
  const secondaryHue = (baseHue + rng.range(30, 180)) % 360;
  const accentHue = (baseHue + rng.range(120, 240)) % 360;

  const bgHue = (baseHue + 180) % 360;
  const bgSat = rng.range(10, 35);
  const bgLight = rng.range(2, 8);

  const isReverse = rng.next() > 0.5;
  const baseAngle = isReverse ? rng.range(195, 255) : rng.range(15, 75);

  const touchModes: TouchMode[] = ["repel", "attract", "vortex", "ripple", "orbit"];
  const touchMode = rng.pick(touchModes);

  const scales: ScaleType[] = [
    "minorPentatonic",
    "lydian",
    "phrygian",
    "harmonicMinor",
    "wholeTone",
    "ambientMajor",
  ];
  const scaleType = rng.pick(scales);
  const rootNote = rng.rangeInt(48, 64); // C3 - E4 higher chime scale
  const scaleFrequencies = SCALE_INTERVALS[scaleType].map((interval) =>
    midiToFreq(rootNote + interval)
  );

  const oscTypes: OscillatorType[] = ["sine", "triangle"];

  return {
    upc,
    hash: numericHash,
    anomalyName: defaultName,
    anomalyClass,
    colors: {
      bg: `hsla(${bgHue}, ${bgSat}%, ${bgLight}%, 1)`,
      bgHSLA: { h: bgHue, s: bgSat, l: bgLight, a: 1 },
      primary: { h: baseHue, s: rng.range(65, 95), l: rng.range(50, 75), a: rng.range(0.6, 0.9) },
      secondary: {
        h: secondaryHue,
        s: rng.range(60, 90),
        l: rng.range(45, 70),
        a: rng.range(0.5, 0.85),
      },
      accent: { h: accentHue, s: rng.range(75, 100), l: rng.range(60, 85), a: rng.range(0.7, 0.95) },
      blendMode: rng.pick(["source-over", "screen", "additive"] as const),
    },
    particles: {
      count: rng.rangeInt(300, 650), // Denser count of small particles
      minSize: rng.range(4, 8),      // Much smaller min size
      maxSize: rng.range(18, 38),    // Max size capped
      flowAngleDegrees: baseAngle,
      speed: rng.range(1.5, 5.8),
      gravity: {
        x: rng.range(-0.08, 0.08),
        y: rng.range(0.02, 0.25),
      },
      turbulence: rng.range(0.002, 0.015),
      spinSpeed: rng.range(-0.08, 0.08),
      trailFade: rng.rangeInt(18, 55),
      wireframeRatio: rng.range(0.15, 0.5),
    },
    touch: {
      mode: touchMode,
      radius: rng.range(120, 260),
      force: rng.range(3.0, 8.5),
    },
    audio: {
      rootNote,
      rootFreq: midiToFreq(rootNote),
      scale: scaleType,
      scaleNotes: scaleFrequencies,
      osc1Type: rng.pick(oscTypes),
      osc2Type: rng.pick(oscTypes),
      cutoffFreq: rng.range(400, 3500),
      resonance: rng.range(1.0, 6.0),
      lfoRate: rng.range(0.2, 2.5),
      detune: rng.range(-10, 10),
      reverbDecay: rng.range(1.5, 4.5),
      arpeggioBpm: rng.rangeInt(60, 120),
    },
  };
}
