"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { parseUPCToConfig, AnomalyConfig } from "@/lib/upcEngine";
import { AudioEngine } from "@/lib/audioEngine";
import { ScannerModal } from "@/components/ScannerModal";
import {
  Volume2,
  VolumeX,
  Camera,
  Download,
  Info,
  Sliders,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Globe,
  Key,
  Layers,
  Compass,
  Palette,
  Shuffle,
  Zap,
} from "lucide-react";

const GenerativeCanvas = dynamic(
  () => import("@/components/GenerativeCanvas").then((mod) => mod.GenerativeCanvas),
  { ssr: false }
);

const SAMPLE_UPCS = [
  { code: "000000000017", label: "Legendary Void Orbit" },       // LEGENDARY Void Prism
  { code: "000000000000", label: "Lissajous Infrared Bimodal" }, // Thermal Infrared Lissajous
  { code: "000000000002", label: "Spectral 3D Helix Dust" },    // 3D Helix Spectral Nebula
  { code: "000000000003", label: "Solar Flare Crescent Wave" },  // Solar Flare
  { code: "000000000004", label: "Blood Moon Star Stream" },    // Blood Moon Stars
  { code: "000000000015", label: "Quantum Acid Monolith" },     // Quantum Teleport Monoliths
  { code: "000000000020", label: "Cyber Gold Lissajous Shard" },// Cyber Acid Gold
  { code: "000000000011", label: "Aurora Borealis Core" },       // Aurora Borealis
  { code: "000000000021", label: "Legendary Acid Spark" },       // LEGENDARY Acid Monochrome MicroDust
  { code: "012000163173", label: "Pepsi Cola Classic" },         // Real Product Barcode
];

export default function Home() {
  const [sampleIndex, setSampleIndex] = useState<number>(0);
  const [upc, setUpc] = useState<string>(SAMPLE_UPCS[0].code);
  const [inputUpc, setInputUpc] = useState<string>("");
  const [showManualInput, setShowManualInput] = useState<boolean>(false);
  const [config, setConfig] = useState<AnomalyConfig>(() => parseUPCToConfig(SAMPLE_UPCS[0].code));
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [productName, setProductName] = useState<string | null>(null);
  const [isLookupLoading, setIsLookupLoading] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioEngineRef = useRef<AudioEngine | null>(null);

  useEffect(() => {
    audioEngineRef.current = new AudioEngine();
    audioEngineRef.current.init();
    audioEngineRef.current.updateConfig(config);

    const unlockAudio = () => {
      if (audioEngineRef.current) {
        audioEngineRef.current.init();
      }
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
    };

    window.addEventListener("click", unlockAudio);
    window.addEventListener("touchstart", unlockAudio);

    return () => {
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
      audioEngineRef.current?.dispose();
    };
  }, []);

  const fetchProductMetadata = useCallback(async (code: string) => {
    setIsLookupLoading(true);
    try {
      const res = await fetch(`/api/lookup?upc=${encodeURIComponent(code)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.found && data.productName) {
          setProductName(data.productName);
        } else {
          setProductName(null);
        }
      } else {
        setProductName(null);
      }
    } catch {
      setProductName(null);
    } finally {
      setIsLookupLoading(false);
    }
  }, []);

  const handleUPCChange = useCallback(
    (newUPC: string) => {
      const cleanUPC = newUPC.trim();
      if (!cleanUPC) return;
      setUpc(cleanUPC);
      const newConfig = parseUPCToConfig(cleanUPC);
      setConfig(newConfig);

      if (audioEngineRef.current) {
        audioEngineRef.current.updateConfig(newConfig);
      }

      fetchProductMetadata(cleanUPC);
    },
    [fetchProductMetadata]
  );

  useEffect(() => {
    fetchProductMetadata(SAMPLE_UPCS[0].code);
  }, [fetchProductMetadata]);

  const handleCycleSample = () => {
    const nextIdx = (sampleIndex + 1) % SAMPLE_UPCS.length;
    setSampleIndex(nextIdx);
    const sample = SAMPLE_UPCS[nextIdx];
    handleUPCChange(sample.code);
  };

  const isMutedRef = useRef(isMuted);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const handleCanvasPan = useCallback((nx: number, ny: number) => {
    if (audioEngineRef.current && !isMutedRef.current) {
      audioEngineRef.current.setTouchPan(nx, ny);
    }
  }, []);

  const handleParticleCollision = useCallback((pitchRatio: number, size: number) => {
    if (audioEngineRef.current && !isMutedRef.current) {
      audioEngineRef.current.triggerFingerCollision(pitchRatio, size);
    }
  }, []);

  const toggleAudio = () => {
    if (!audioEngineRef.current) return;
    const muted = audioEngineRef.current.toggleMute();
    setIsMuted(muted);
    if (!muted) {
      audioEngineRef.current.updateConfig(config);
    }
  };

  const handleDownloadImage = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `UPC-ANOMALY-${upc}-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUpc.trim()) {
      handleUPCChange(inputUpc);
      setInputUpc("");
      setShowManualInput(false);
    }
  };

  const displayName = productName
    ? `${productName} // ${config.anomalyClass}`
    : config.anomalyName;

  const preventCanvasPropagation = (e: React.PointerEvent | React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
  };

  const getRarityBadgeStyle = (tier: string) => {
    if (tier === "LEGENDARY") {
      return "bg-amber-500/20 text-amber-300 border-amber-400/80 shadow-[0_0_12px_rgba(245,158,11,0.5)]";
    } else if (tier === "RARE") {
      return "bg-indigo-500/20 text-indigo-300 border-indigo-400/80 shadow-[0_0_10px_rgba(129,140,248,0.4)]";
    }
    return "bg-zinc-800/80 text-zinc-300 border-zinc-700/50";
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black font-sans">
      <GenerativeCanvas
        config={config}
        onCanvasPan={handleCanvasPan}
        onParticleCollision={handleParticleCollision}
        canvasRefOut={canvasRef}
      />

      {/* Top Controls (Mute & Download) */}
      <div
        onPointerDown={preventCanvasPropagation}
        onTouchStart={preventCanvasPropagation}
        className="fixed top-4 right-4 z-50 flex items-center space-x-2 pointer-events-auto"
      >
        <button
          onClick={toggleAudio}
          className={`p-3 rounded-full border backdrop-blur-md transition-all duration-300 flex items-center justify-center shadow-lg ${
            !isMuted
              ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-cyan-500/20"
              : "bg-zinc-900/90 border-zinc-700/60 text-zinc-400 hover:text-zinc-200"
          }`}
          title={isMuted ? "Unmute Sound" : "Mute Sound"}
        >
          {!isMuted ? <Volume2 className="w-5 h-5 animate-pulse" /> : <VolumeX className="w-5 h-5" />}
        </button>

        <button
          onClick={handleDownloadImage}
          className="p-3 rounded-full bg-zinc-900/90 border border-zinc-700/60 text-zinc-300 hover:text-white backdrop-blur-md transition-all shadow-lg hover:bg-zinc-800"
          title="Download PNG Frame"
        >
          <Download className="w-5 h-5" />
        </button>
      </div>

      {/* Designation Bar shifted to top */}
      <div
        onPointerDown={preventCanvasPropagation}
        onTouchStart={preventCanvasPropagation}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-lg pointer-events-none"
      >
        <div className="bg-zinc-950/90 border border-zinc-800/90 backdrop-blur-xl rounded-2xl p-4 shadow-2xl text-center pointer-events-auto transition-all duration-300 hover:border-zinc-700">
          <div className="flex items-center justify-center space-x-2 text-[10px] font-mono uppercase tracking-widest text-cyan-400 mb-1">
            <Globe className="w-3.5 h-3.5" />
            <span>
              {isLookupLoading ? "SCANNING DATABASE..." : productName ? "DETECTED SUBJECT" : "ANOMALY DESIGNATION"}
            </span>
          </div>

          <h2 className="text-base md:text-lg font-mono font-bold text-zinc-100 truncate px-2">
            {displayName}
          </h2>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 font-mono text-[10px]">
            <span className="px-2.5 py-1 rounded-md bg-zinc-800/90 text-zinc-200 font-bold border border-zinc-700/50">
              UPC: {upc}
            </span>
            <span
              className={`px-2.5 py-1 rounded-md font-bold border flex items-center gap-1 ${getRarityBadgeStyle(
                config.rarityTier
              )}`}
            >
              <Zap className="w-3 h-3" />
              {config.rarityTier}
            </span>
          </div>
        </div>
      </div>

      <div
        onPointerDown={preventCanvasPropagation}
        onTouchStart={preventCanvasPropagation}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center space-y-3 w-full max-w-sm px-4"
      >
        <button
          onClick={() => setIsScannerOpen(true)}
          style={{
            background: "linear-gradient(135deg, #06b6d4, #4f46e5)",
            color: "#000000",
            boxShadow: "0 10px 25px -5px rgba(6, 182, 212, 0.4)",
          }}
          className="w-full py-3.5 px-6 rounded-2xl font-mono font-bold text-sm tracking-wider uppercase flex items-center justify-center space-x-3 transition-all transform active:scale-95 cursor-pointer hover:brightness-110"
        >
          <Camera className="w-5 h-5 text-black" />
          <span>SCAN UPC BARCODE</span>
        </button>

        <div className="flex items-center space-x-2 w-full justify-center">
          <button
            onClick={handleCycleSample}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-cyan-950/80 border border-cyan-800/80 backdrop-blur-md text-xs font-mono text-cyan-300 hover:text-white hover:bg-cyan-900/80 transition-colors cursor-pointer shadow-lg"
            title="Switch through 10 sample UPC codes"
          >
            <Shuffle className="w-3.5 h-3.5 text-cyan-400 animate-spin-once" />
            <span>SAMPLE #{sampleIndex + 1}/10</span>
          </button>

          <button
            onClick={() => setShowManualInput(!showManualInput)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-zinc-950/90 border border-zinc-800 backdrop-blur-md text-xs font-mono text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            <Key className="w-3.5 h-3.5 text-cyan-400" />
            <span>ENTER CODE</span>
          </button>

          <button
            onClick={() => setIsDetailsOpen(!isDetailsOpen)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-zinc-950/90 border border-zinc-800 backdrop-blur-md text-xs font-mono text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span>SPECS</span>
            {isDetailsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>

        {showManualInput && (
          <form
            onSubmit={handleManualSubmit}
            className="w-full bg-zinc-950/95 border border-zinc-800 rounded-xl p-3 backdrop-blur-2xl flex items-center space-x-2 animate-in fade-in duration-200"
          >
            <input
              type="text"
              value={inputUpc}
              onChange={(e) => setInputUpc(e.target.value)}
              placeholder="e.g. 012000000133"
              className="flex-1 bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-1.5 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
              autoFocus
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              LOAD
            </button>
          </form>
        )}
      </div>

      {isDetailsOpen && (
        <div
          onPointerDown={preventCanvasPropagation}
          onTouchStart={preventCanvasPropagation}
          className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md bg-zinc-950/95 border border-zinc-800 backdrop-blur-2xl rounded-2xl p-5 shadow-2xl text-xs font-mono text-zinc-300 animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
            <span className="text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-4 h-4" /> REVEALED ANOMALY SPECS
            </span>
            <button
              onClick={() => setIsDetailsOpen(false)}
              className="text-zinc-500 hover:text-zinc-200"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800">
              <div className="text-zinc-500 mb-0.5 flex items-center gap-1">
                <Compass className="w-3 h-3 text-cyan-400" /> MOTION DYNAMICS
              </div>
              <div className="text-zinc-200 font-bold uppercase">{config.flowPattern}</div>
            </div>
            <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800">
              <div className="text-zinc-500 mb-0.5 flex items-center gap-1">
                <Layers className="w-3 h-3 text-indigo-400" /> SHAPE ARCHETYPE
              </div>
              <div className="text-zinc-200 font-bold uppercase">{config.shapeArchetype}</div>
            </div>
            <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800">
              <div className="text-zinc-500 mb-0.5 flex items-center gap-1">
                <Palette className="w-3 h-3 text-purple-400" /> COLOR PALETTE
              </div>
              <div className="text-zinc-200 font-bold">{config.colorThemeName}</div>
            </div>
            <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800">
              <div className="text-zinc-500 mb-0.5">SIZE POLARITY</div>
              <div className="text-zinc-200 font-bold uppercase">{config.sizePolarity}</div>
            </div>
            <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800">
              <div className="text-zinc-500 mb-0.5">TOUCH FIELD</div>
              <div className="text-zinc-200 font-bold uppercase">{config.touch.mode}</div>
            </div>
            <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800">
              <div className="text-zinc-500 mb-0.5">SYNTH TIMBRE</div>
              <div className="text-zinc-200 font-bold uppercase">{config.audio.oscType}</div>
            </div>
          </div>
        </div>
      )}

      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleUPCChange}
      />
    </main>
  );
}
