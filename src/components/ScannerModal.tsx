"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Camera, RefreshCw, X, AlertCircle } from "lucide-react";

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "upc-reader-container";

  const handleClose = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.error("Error stopping scanner on close:", err);
      }
    }
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch((e) => console.error(e));
      }
      return;
    }

    setError(null);
    const html5QrCode = new Html5Qrcode(containerId);
    scannerRef.current = html5QrCode;

    const config = {
      fps: 15,
      qrbox: { width: 280, height: 160 },
      formatsToSupport: [
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
      ],
    };

    html5QrCode
      .start(
        { facingMode: facingMode },
        config,
        async (decodedText) => {
          onScanSuccess(decodedText);
          await handleClose();
        },
        () => {
          // Scanning frame fail - expected while searching
        }
      )
      .catch((err) => {
        console.error("Camera access error:", err);
        setError("Camera permission denied or camera not found. Please grant permission.");
      });

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch((err) => console.error(err));
      }
    };
  }, [isOpen, facingMode, onScanSuccess, handleClose]);

  if (!isOpen) return null;

  const toggleCamera = () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().then(() => {
        setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
      }).catch(() => {
        setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
      });
    } else {
      setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-700/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/90">
          <div className="flex items-center space-x-2 text-cyan-400">
            <Camera className="w-5 h-5 animate-pulse" />
            <span className="font-mono text-sm tracking-widest uppercase font-bold text-zinc-100">
              SCAN BARCODE / UPC
            </span>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport */}
        <div className="relative w-full aspect-square bg-black flex items-center justify-center overflow-hidden">
          <div id={containerId} className="w-full h-full" />

          {error && (
            <div className="absolute inset-0 bg-zinc-950/90 flex flex-col items-center justify-center p-6 text-center">
              <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
              <p className="text-zinc-200 text-sm font-sans mb-4">{error}</p>
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-mono tracking-wider rounded-lg text-zinc-200 transition-colors"
              >
                CLOSE
              </button>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between text-xs font-mono text-zinc-400">
          <span>Align UPC barcode inside crosshairs</span>
          <button
            onClick={toggleCamera}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>FLIP</span>
          </button>
        </div>
      </div>
    </div>
  );
};
