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
} from "lucide-react";
import confetti from "canvas-confetti";

const GenerativeCanvas = dynamic(
  () => import("@/components/GenerativeCanvas").then((mod) => mod.GenerativeCanvas),
  { ssr: false }
);

const DEFAULT_UPC = "042600000008";

export default function Home() {
  const [upc, setUpc] = useState<string>(DEFAULT_UPC);
  const [inputUpc, setInputUpc] = useState<string>("");
  const [showManualInput, setShowManualInput] = useState<boolean>(false);
  const [config, setConfig] = useState<AnomalyConfig>(() => parseUPCToConfig(DEFAULT_UPC));
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [productName, setProductName] = useState<string | null>(null);
  const [isLookupLoading, setIsLookupLoading] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioEngineRef = useRef<AudioEngine | null>(null);

  useEffect(() => {
    audioEngineRef.current = new AudioEngine();
    return () => {
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

      try {
        confetti({
          particleCount: 25,
          spread: 60,
          origin: { y: 0.8 },
          colors: [
            `hsl(${newConfig.colors.primary.h}, 80%, 60%)`,
            `hsl(${newConfig.colors.secondary.h}, 80%, 60%)`,
          ],
        });
      } catch {
        // Ignore if confetti fails
      }
    },
    [fetchProductMetadata]
  );

  useEffect(() => {
    fetchProductMetadata(DEFAULT_UPC);
  }, [fetchProductMetadata]);

  // Canvas interaction callbacks
  const handleCanvasPan = (nx: number, ny: number) => {
    if (audioEngineRef.current && !isMuted) {
      audioEngineRef.current.setTouchPan(nx, ny);
    }
  };

  const handleParticleCollision = (pitchRatio: number, size: number) => {
    if (audioEngineRef.current && !isMuted) {
      audioEngineRef.current.triggerFingerCollision(pitchRatio, size);
    }
  };

  // Toggle audio
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

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black font-sans">
      <GenerativeCanvas
        config={config}
        onCanvasPan={handleCanvasPan}
        onParticleCollision={handleParticleCollision}
        canvasRefOut={canvasRef}
      />

      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 md:p-6 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0.85), rgba(0,0,0,0.4), transparent)",
        }}
      >
        <div className="flex items-center space-x-3 pointer-events-auto">
          <div className="p-2 rounded-xl bg-zinc-900/90 border border-zinc-700/60 backdrop-blur-md shadow-lg flex items-center justify-center text-cyan-400">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-mono tracking-wider text-zinc-100 font-bold uppercase drop-shadow-md">
              ANOMALY // VISUALIZER
            </h1>
            <p className="text-[11px] font-mono text-zinc-400 tracking-tight">
              SCAN SPACE BETWEEN CODES
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 pointer-events-auto">
          <button
            onClick={toggleAudio}
            className={`p-3 rounded-full border backdrop-blur-md transition-all duration-300 flex items-center justify-center shadow-lg ${
              !isMuted
                ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-cyan-500/20"
                : "bg-zinc-900/90 border-zinc-700/60 text-zinc-400 hover:text-zinc-200"
            }`}
            title={isMuted ? "Unmute Rhythmic Chimes" : "Mute Sound"}
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
      </header>

      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-lg pointer-events-none">
        <div className="bg-zinc-950/90 border border-zinc-800/90 backdrop-blur-xl rounded-2xl p-4 shadow-2xl text-center pointer-events-auto transition-all duration-300 hover:border-zinc-700">
          <div className="flex items-center justify-center space-x-2 text-[10px] font-mono uppercase tracking-widest text-cyan-400 mb-1">
            <Globe className="w-3.5 h-3.5" />
            <span>
              {isLookupLoading ? "SCANNING DATABASE..." : productName ? "DETECTED SUBJECT" : "ANOMALY DESIGNATION"}
            </span>
          </div>

          <h2 className="text-base md:text-lg font-mono font-bold text-zinc-100 truncate px-2">
            {productName || config.anomalyName}
          </h2>

          <div className="mt-2 flex items-center justify-center space-x-2 font-mono text-[11px] text-zinc-400">
            <span className="px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-300">
              UPC: {upc}
            </span>
            <span className="px-2 py-0.5 rounded bg-zinc-800/80 text-cyan-300/90 capitalize">
              PHYSICS: {config.touch.mode}
            </span>
          </div>
        </div>
      </div>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center space-y-3 w-full max-w-sm px-4">
        <button
          onClick={() => setIsScannerOpen(true)}
          style={{
            background: "linear-gradient(135deg, #06b6d4, #4f46e5)",
            color: "#000000",
            boxShadow: "0 10px 25px -5px rgba(6, 182, 212, 0.4)",
          }}
          className="w-full py-4 px-6 rounded-2xl font-mono font-bold text-sm tracking-wider uppercase flex items-center justify-center space-x-3 transition-all transform active:scale-95 cursor-pointer hover:brightness-110"
        >
          <Camera className="w-5 h-5 text-black" />
          <span>SCAN UPC BARCODE</span>
        </button>

        <div className="flex items-center space-x-2 w-full justify-center">
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
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md bg-zinc-950/95 border border-zinc-800 backdrop-blur-2xl rounded-2xl p-5 shadow-2xl text-xs font-mono text-zinc-300 animate-in fade-in slide-in-from-bottom-4 duration-200">
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
              <div className="text-zinc-500 mb-0.5">FLOW ANGLE</div>
              <div className="text-zinc-200 font-bold">{config.particles.flowAngleDegrees.toFixed(1)}°</div>
            </div>
            <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800">
              <div className="text-zinc-500 mb-0.5">PARTICLE SPEED</div>
              <div className="text-zinc-200 font-bold">{config.particles.speed.toFixed(2)} px/f</div>
            </div>
            <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800">
              <div className="text-zinc-500 mb-0.5">GRAVITY VECTOR</div>
              <div className="text-zinc-200 font-bold">
                X:{config.particles.gravity.x.toFixed(2)} Y:{config.particles.gravity.y.toFixed(2)}
              </div>
            </div>
            <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800">
              <div className="text-zinc-500 mb-0.5">TOUCH FIELD</div>
              <div className="text-zinc-200 font-bold uppercase">{config.touch.mode}</div>
            </div>
            <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800">
              <div className="text-zinc-500 mb-0.5">SONIC HARMONICS</div>
              <div className="text-zinc-200 font-bold capitalize">{config.audio.scale}</div>
            </div>
            <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800">
              <div className="text-zinc-500 mb-0.5">SYNTH TEMPO</div>
              <div className="text-zinc-200 font-bold">{config.audio.arpeggioBpm} BPM</div>
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
