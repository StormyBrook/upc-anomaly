export interface ColorHSLA {
  h: number; // 0 - 360
  s: number; // 0 - 100
  l: number; // 0 - 100
  a: number; // 0 - 1
}

export type TouchMode =
  | "repel"
  | "attract"
  | "vortex"
  | "ripple"
  | "orbit"
  | "blackHole"
  | "shockwave";

export type FlowPattern =
  | "diagonal"
  | "cardinal"
  | "spiralVortex"
  | "radialBurst"
  | "waveFlow"
  | "convergingCore"
  | "sineLissajous"
  | "orbitGravityWell"
  | "helix3D"
  | "quantumTeleport";

export type ShapeArchetype =
  | "triangles"
  | "diamonds"
  | "hexagons"
  | "rings"
  | "crosses"
  | "shards"
  | "stars"
  | "crescents"
  | "concentricRings"
  | "glyphRunes"
  | "mixed";

export type SizePolarity = "microDust" | "monoliths" | "bimodal" | "standard";

export type RarityTier = "COMMON" | "RARE" | "LEGENDARY";

export type ColorThemeName =
  | "Neon Cyberpunk"
  | "Thermal Infrared"
  | "Bioluminescent Deep"
  | "Acid Monochrome"
  | "Solar Flare"
  | "Synthwave Sunset"
  | "Void Prism"
  | "Vaporwave Pastel"
  | "Supernova Core"
  | "Aurora Borealis"
  | "Deep Void Emerald"
  | "Blood Moon"
  | "Cyber Acid Gold"
  | "Hyperdrive White"
  | "Spectral Nebula"
  | "Obsidian Pulse";

export type ScaleType =
  | "minorPentatonic"
  | "lydian"
  | "phrygian"
  | "harmonicMinor"
  | "wholeTone"
  | "ambientMajor"
  | "japaneseInSen"
  | "celticMinor"
  | "egyptianDorian";

export interface ColorPalette {
  name: ColorThemeName;
  bgHSLA: ColorHSLA;
  primary: ColorHSLA;
  secondary: ColorHSLA;
  accent: ColorHSLA;
  gradientSecondary?: ColorHSLA;
  blendMode: "source-over" | "screen" | "additive";
}

export interface AnomalyConfig {
  upc: string;
  hash: number;
  anomalyName: string;
  anomalyClass: string;
  rarityTier: RarityTier;

  // Visual Dynamics
  flowPattern: FlowPattern;
  shapeArchetype: ShapeArchetype;
  colorThemeName: ColorThemeName;
  sizePolarity: SizePolarity;

  colors: {
    bgHSLA: ColorHSLA;
    primary: ColorHSLA;
    secondary: ColorHSLA;
    accent: ColorHSLA;
    gradientSecondary?: ColorHSLA;
    blendMode: "source-over" | "screen" | "additive";
  };

  particles: {
    count: number;
    minSize: number;
    maxSize: number;
    flowAngleDegrees: number;
    speed: number;
    gravity: { x: number; y: number };
    turbulence: number;
    spinSpeed: number;
    trailFade: number;
    wireframeRatio: number;
    waveFrequency?: number;
    waveAmplitude?: number;
    lissajousRatioX?: number;
    lissajousRatioY?: number;
  };

  // Interaction
  touch: {
    mode: TouchMode;
    radius: number;
    force: number;
  };

  // Audio Synth Parameters
  audio: {
    rootNote: number;
    rootFreq: number;
    scale: ScaleType;
    scaleNotes: number[];
    oscType: OscillatorType;
    cutoffFreq: number;
    resonance: number;
    lfoRate: number;
    detune: number;
    reverbDecay: number;
    arpeggioBpm: number;
  };
}

export function hashUPC(upc: string): number {
  let hash = 2166136261;
  for (let i = 0; i < upc.length; i++) {
    hash ^= upc.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

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
  japaneseInSen: [0, 1, 5, 7, 10, 12, 13, 17, 19, 22],
  celticMinor: [0, 2, 3, 5, 7, 9, 10, 12, 14, 15, 17],
  egyptianDorian: [0, 2, 3, 6, 7, 9, 10, 12, 14, 15, 18],
};

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const COLOR_PALETTES: ColorPalette[] = [
  {
    name: "Neon Cyberpunk",
    bgHSLA: { h: 260, s: 80, l: 4, a: 1 },
    primary: { h: 180, s: 100, l: 55, a: 0.85 },
    secondary: { h: 320, s: 95, l: 60, a: 0.8 },
    accent: { h: 280, s: 100, l: 65, a: 0.9 },
    gradientSecondary: { h: 220, s: 100, l: 60, a: 0.8 },
    blendMode: "screen",
  },
  {
    name: "Thermal Infrared",
    bgHSLA: { h: 230, s: 90, l: 3, a: 1 },
    primary: { h: 0, s: 100, l: 55, a: 0.9 },
    secondary: { h: 40, s: 100, l: 50, a: 0.85 },
    accent: { h: 60, s: 100, l: 65, a: 0.95 },
    gradientSecondary: { h: 15, s: 100, l: 60, a: 0.85 },
    blendMode: "additive",
  },
  {
    name: "Bioluminescent Deep",
    bgHSLA: { h: 195, s: 75, l: 4, a: 1 },
    primary: { h: 160, s: 90, l: 50, a: 0.85 },
    secondary: { h: 190, s: 85, l: 55, a: 0.8 },
    accent: { h: 140, s: 95, l: 65, a: 0.9 },
    gradientSecondary: { h: 175, s: 90, l: 60, a: 0.8 },
    blendMode: "screen",
  },
  {
    name: "Acid Monochrome",
    bgHSLA: { h: 110, s: 40, l: 2, a: 1 },
    primary: { h: 105, s: 100, l: 50, a: 0.9 },
    secondary: { h: 100, s: 80, l: 75, a: 0.75 },
    accent: { h: 115, s: 100, l: 85, a: 0.95 },
    gradientSecondary: { h: 90, s: 100, l: 60, a: 0.8 },
    blendMode: "source-over",
  },
  {
    name: "Solar Flare",
    bgHSLA: { h: 20, s: 80, l: 3, a: 1 },
    primary: { h: 35, s: 100, l: 55, a: 0.85 },
    secondary: { h: 15, s: 95, l: 50, a: 0.8 },
    accent: { h: 50, s: 100, l: 65, a: 0.95 },
    gradientSecondary: { h: 45, s: 100, l: 60, a: 0.85 },
    blendMode: "additive",
  },
  {
    name: "Synthwave Sunset",
    bgHSLA: { h: 280, s: 85, l: 4, a: 1 },
    primary: { h: 330, s: 95, l: 60, a: 0.85 },
    secondary: { h: 25, s: 95, l: 55, a: 0.8 },
    accent: { h: 290, s: 90, l: 70, a: 0.9 },
    gradientSecondary: { h: 350, s: 95, l: 65, a: 0.85 },
    blendMode: "screen",
  },
  {
    name: "Void Prism",
    bgHSLA: { h: 0, s: 0, l: 2, a: 1 },
    primary: { h: 200, s: 100, l: 65, a: 0.85 },
    secondary: { h: 45, s: 100, l: 60, a: 0.85 },
    accent: { h: 300, s: 100, l: 70, a: 0.9 },
    gradientSecondary: { h: 160, s: 100, l: 65, a: 0.85 },
    blendMode: "additive",
  },
  {
    name: "Vaporwave Pastel",
    bgHSLA: { h: 240, s: 50, l: 5, a: 1 },
    primary: { h: 175, s: 75, l: 65, a: 0.85 },
    secondary: { h: 300, s: 70, l: 70, a: 0.8 },
    accent: { h: 210, s: 80, l: 75, a: 0.9 },
    gradientSecondary: { h: 280, s: 75, l: 70, a: 0.8 },
    blendMode: "screen",
  },
  {
    name: "Supernova Core",
    bgHSLA: { h: 270, s: 90, l: 3, a: 1 },
    primary: { h: 220, s: 100, l: 60, a: 0.85 },
    secondary: { h: 10, s: 100, l: 55, a: 0.85 },
    accent: { h: 50, s: 100, l: 75, a: 0.95 },
    gradientSecondary: { h: 180, s: 100, l: 65, a: 0.85 },
    blendMode: "additive",
  },
  {
    name: "Aurora Borealis",
    bgHSLA: { h: 210, s: 85, l: 4, a: 1 },
    primary: { h: 150, s: 100, l: 55, a: 0.9 },
    secondary: { h: 185, s: 95, l: 60, a: 0.85 },
    accent: { h: 270, s: 90, l: 70, a: 0.95 },
    gradientSecondary: { h: 130, s: 100, l: 65, a: 0.85 },
    blendMode: "screen",
  },
  {
    name: "Deep Void Emerald",
    bgHSLA: { h: 160, s: 90, l: 2, a: 1 },
    primary: { h: 145, s: 100, l: 50, a: 0.9 },
    secondary: { h: 170, s: 90, l: 60, a: 0.85 },
    accent: { h: 80, s: 100, l: 70, a: 0.95 },
    gradientSecondary: { h: 155, s: 100, l: 65, a: 0.85 },
    blendMode: "screen",
  },
  {
    name: "Blood Moon",
    bgHSLA: { h: 350, s: 90, l: 3, a: 1 },
    primary: { h: 355, s: 100, l: 50, a: 0.9 },
    secondary: { h: 25, s: 100, l: 55, a: 0.85 },
    accent: { h: 330, s: 90, l: 65, a: 0.95 },
    gradientSecondary: { h: 10, s: 100, l: 60, a: 0.85 },
    blendMode: "additive",
  },
  {
    name: "Cyber Acid Gold",
    bgHSLA: { h: 50, s: 80, l: 3, a: 1 },
    primary: { h: 55, s: 100, l: 55, a: 0.9 },
    secondary: { h: 85, s: 95, l: 60, a: 0.85 },
    accent: { h: 30, s: 100, l: 65, a: 0.95 },
    gradientSecondary: { h: 65, s: 100, l: 65, a: 0.85 },
    blendMode: "additive",
  },
  {
    name: "Hyperdrive White",
    bgHSLA: { h: 220, s: 20, l: 4, a: 1 },
    primary: { h: 0, s: 0, l: 95, a: 0.95 },
    secondary: { h: 190, s: 100, l: 75, a: 0.85 },
    accent: { h: 310, s: 100, l: 80, a: 0.95 },
    gradientSecondary: { h: 210, s: 90, l: 85, a: 0.85 },
    blendMode: "additive",
  },
  {
    name: "Spectral Nebula",
    bgHSLA: { h: 290, s: 80, l: 3, a: 1 },
    primary: { h: 260, s: 100, l: 65, a: 0.9 },
    secondary: { h: 340, s: 95, l: 65, a: 0.85 },
    accent: { h: 170, s: 100, l: 70, a: 0.95 },
    gradientSecondary: { h: 220, s: 100, l: 70, a: 0.85 },
    blendMode: "screen",
  },
  {
    name: "Obsidian Pulse",
    bgHSLA: { h: 0, s: 0, l: 1, a: 1 },
    primary: { h: 0, s: 0, l: 85, a: 0.9 },
    secondary: { h: 210, s: 100, l: 55, a: 0.85 },
    accent: { h: 0, s: 100, l: 60, a: 0.95 },
    gradientSecondary: { h: 180, s: 100, l: 60, a: 0.85 },
    blendMode: "source-over",
  },
];

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
  "Celestial Monolith",
  "Lissajous Convergence",
  "Helix Helix Warp",
  "Orbit Gravity Matrix",
];

const CODE_GREEK = ["ALPHA", "BETA", "GAMMA", "DELTA", "SIGMA", "OMEGA", "NEBULA", "ZERO", "NEXUS", "ZENITH"];

export function parseUPCToConfig(upcInput: string): AnomalyConfig {
  const upc = upcInput.trim() || "000000000000";
  const numericHash = hashUPC(upc);
  const rng = new SeededRandom(numericHash);

  // Rarity Tier Determination (5% LEGENDARY, 25% RARE, 70% COMMON)
  const rarityVal = rng.range(0, 100);
  let rarityTier: RarityTier = "COMMON";
  if (rarityVal > 95) {
    rarityTier = "LEGENDARY";
  } else if (rarityVal > 70) {
    rarityTier = "RARE";
  }

  const greekIndex = numericHash % CODE_GREEK.length;
  const anomalyClass = ANOMALY_CLASSES[numericHash % ANOMALY_CLASSES.length];
  const shortCode = upc.slice(-4) || "0000";
  const defaultName = `${anomalyClass} [SIG-${CODE_GREEK[greekIndex]}-${shortCode}]`;

  // Flow Pattern Assignment
  const flowPatterns: FlowPattern[] = [
    "diagonal",
    "cardinal",
    "spiralVortex",
    "radialBurst",
    "waveFlow",
    "convergingCore",
    "sineLissajous",
    "orbitGravityWell",
    "helix3D",
    "quantumTeleport",
  ];
  const flowPattern = rng.pick(flowPatterns);

  // Shape Archetype Assignment
  const shapeArchetypes: ShapeArchetype[] = [
    "triangles",
    "diamonds",
    "hexagons",
    "rings",
    "crosses",
    "shards",
    "stars",
    "crescents",
    "concentricRings",
    "glyphRunes",
    "mixed",
  ];
  const shapeArchetype = rng.pick(shapeArchetypes);

  // Size Polarity
  const polarities: SizePolarity[] = ["microDust", "monoliths", "bimodal", "standard"];
  const sizePolarity = rng.pick(polarities);

  // Curated Color Palette Theme Assignment
  const palette = rng.pick(COLOR_PALETTES);

  const flowAngleDegrees = rng.range(0, 360);

  // Particle count and sizing based on polarity & rarity
  let count = rng.rangeInt(240, 480);
  let minSize = rng.range(4, 9);
  let maxSize = rng.range(18, 38);

  if (sizePolarity === "microDust") {
    count = rng.rangeInt(650, 1100);
    minSize = 2;
    maxSize = 7;
  } else if (sizePolarity === "monoliths") {
    count = rng.rangeInt(90, 180);
    minSize = 28;
    maxSize = 75;
  } else if (sizePolarity === "bimodal") {
    count = rng.rangeInt(350, 650);
    minSize = 3;
    maxSize = 52;
  }

  if (rarityTier === "LEGENDARY") {
    count = Math.floor(count * 1.35);
  }

  const speed = rng.range(1.4, 5.0);

  // Audio Scale
  const scales: ScaleType[] = [
    "minorPentatonic",
    "lydian",
    "phrygian",
    "harmonicMinor",
    "wholeTone",
    "ambientMajor",
    "japaneseInSen",
    "celticMinor",
    "egyptianDorian",
  ];
  const scaleType = rng.pick(scales);
  const rootNote = rng.rangeInt(46, 64);
  const scaleFrequencies = SCALE_INTERVALS[scaleType].map((interval) =>
    midiToFreq(rootNote + interval)
  );

  const oscTypes: OscillatorType[] = ["sine", "triangle", "sawtooth", "square"];
  const touchModes: TouchMode[] = [
    "repel",
    "attract",
    "vortex",
    "ripple",
    "orbit",
    "blackHole",
    "shockwave",
  ];

  const normalizedSpeedRatio = (speed - 1.4) / (5.0 - 1.4);
  const arpeggioBpm = Math.round(65 + normalizedSpeedRatio * 105);

  return {
    upc,
    hash: numericHash,
    anomalyName: defaultName,
    anomalyClass,
    rarityTier,
    flowPattern,
    shapeArchetype,
    colorThemeName: palette.name,
    sizePolarity,
    colors: {
      bgHSLA: palette.bgHSLA,
      primary: palette.primary,
      secondary: palette.secondary,
      accent: palette.accent,
      gradientSecondary: palette.gradientSecondary,
      blendMode: palette.blendMode,
    },
    particles: {
      count,
      minSize,
      maxSize,
      flowAngleDegrees,
      speed,
      gravity: {
        x: rng.range(-0.08, 0.08),
        y: rng.range(-0.08, 0.15),
      },
      turbulence: rng.range(0.002, 0.012),
      spinSpeed: rng.range(-0.07, 0.07),
      trailFade: rng.rangeInt(55, 120),
      wireframeRatio: rng.range(0.15, 0.5),
      waveFrequency: rng.range(0.02, 0.07),
      waveAmplitude: rng.range(2.0, 7.0),
      lissajousRatioX: rng.rangeInt(2, 5),
      lissajousRatioY: rng.rangeInt(3, 7),
    },
    touch: {
      mode: rng.pick(touchModes),
      radius: rng.range(120, 260),
      force: rng.range(3.0, 8.5),
    },
    audio: {
      rootNote,
      rootFreq: midiToFreq(rootNote),
      scale: scaleType,
      scaleNotes: scaleFrequencies,
      oscType: rng.pick(oscTypes),
      cutoffFreq: rng.range(400, 3500),
      resonance: rng.range(1.0, 6.0),
      lfoRate: rng.range(0.2, 2.5),
      detune: rng.range(-10, 10),
      reverbDecay: rng.range(1.5, 4.5),
      arpeggioBpm,
    },
  };
}
