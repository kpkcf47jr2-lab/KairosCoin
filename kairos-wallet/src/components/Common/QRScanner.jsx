// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — QR Scanner Component
//  Camera-based QR code reader using jsQR
// ═══════════════════════════════════════════════════════

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, SwitchCamera, Zap } from 'lucide-react';
import jsQR from 'jsqr';

export default function QRScanner({ isOpen, onClose, onScan, title = 'Escanear QR' }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [hasFlash, setHasFlash] = useState(false);
  const [flashOn, setFlashOn] = useState(false);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Check flash capability
      const track = stream.getVideoTracks()[0];
      const caps = track.getCapabilities?.();
      setHasFlash(!!caps?.torch);

      // Start scanning
      const scan = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });
          if (code?.data) {
            onScan(code.data);
            stopCamera();
            onClose();
            return;
          }
        }
        animFrameRef.current = requestAnimationFrame(scan);
      };
      
      // Wait for video to be ready, then start scanning
      videoRef.current.onloadedmetadata = () => {
        animFrameRef.current = requestAnimationFrame(scan);
      };
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Permiso de cámara denegado. Habilítalo en ajustes del navegador.');
      } else if (err.name === 'NotFoundError') {
        setError('No se encontró cámara en este dispositivo.');
      } else {
        setError('Error al acceder la cámara: ' + err.message);
      }
    }
  }, [facingMode, onScan, onClose, stopCamera]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    }
    return () => stopCamera();
  }, [isOpen, startCamera, stopCamera]);

  const toggleCamera = () => {
    setFacingMode(f => f === 'environment' ? 'user' : 'environment');
  };

  const toggleFlash = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      await track.applyConstraints({ advanced: [{ torch: !flashOn }] });
      setFlashOn(!flashOn);
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/80 z-10 absolute top-0 left-0 right-0">
          <button onClick={() => { stopCamera(); onClose(); }} className="p-2 rounded-xl bg-white/10">
            <X size={20} className="text-white" />
          </button>
          <h2 className="text-white font-semibold text-sm">{title}</h2>
          <div className="flex gap-2">
            {hasFlash && (
              <button onClick={toggleFlash} className={`p-2 rounded-xl ${flashOn ? 'bg-kairos-500/30' : 'bg-white/10'}`}>
                <Zap size={18} className={flashOn ? 'text-kairos-400' : 'text-white'} />
              </button>
            )}
            <button onClick={toggleCamera} className="p-2 rounded-xl bg-white/10">
              <SwitchCamera size={18} className="text-white" />
            </button>
          </div>
        </div>

        {/* Camera view */}
        <div className="flex-1 relative overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Scan overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Darkened borders */}
            <div className="absolute inset-0 bg-black/50" />
            {/* Clear center square */}
            <div className="relative w-64 h-64">
              <div className="absolute inset-0 bg-transparent" style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }} />
              {/* Corner indicators */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-kairos-400 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-kairos-400 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-kairos-400 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-kairos-400 rounded-br-lg" />
              {/* Scan line animation */}
              <motion.div
                animate={{ y: [0, 248, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-kairos-400 to-transparent"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 px-8">
              <div className="text-center">
                <Camera size={48} className="text-dark-500 mx-auto mb-4" />
                <p className="text-dark-300 text-sm mb-4">{error}</p>
                <button
                  onClick={startCamera}
                  className="kairos-button px-6 py-2 text-sm"
                >
                  Reintentar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom hint */}
        <div className="px-4 py-4 bg-black/80 text-center">
          <p className="text-dark-400 text-xs">Apunta la cámara al código QR</p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
