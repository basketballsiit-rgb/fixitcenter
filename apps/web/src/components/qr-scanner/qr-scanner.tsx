'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { Button } from '@/components/ui/button';
import { Camera, Square } from 'lucide-react';

interface QRScannerProps {
  onScan: (token: string) => void;
  onError?: (error: string) => void;
}

export function QRScanner({ onScan, onError }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [statusMsg, setStatusMsg] = useState('กดปุ่มเพื่อเริ่มสแกน');

  const stopScanning = useCallback(() => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
    setStatusMsg('หยุดสแกนแล้ว');
  }, []);

  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Draw scanning overlay
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3;
    const size = Math.min(canvas.width, canvas.height) * 0.6;
    const x = (canvas.width - size) / 2;
    const y = (canvas.height - size) / 2;
    ctx.strokeRect(x, y, size, size);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });
    if (code) {
      setStatusMsg(`✓ พบ QR Code: ${code.data.slice(0, 20)}...`);
      stopScanning();
      onScan(code.data);
      return;
    }
    animRef.current = requestAnimationFrame(scanFrame);
  }, [onScan, stopScanning]);

  const startScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsScanning(true);
      setStatusMsg('กำลังสแกน... เล็งกล้องไปที่ QR Code');
      animRef.current = requestAnimationFrame(scanFrame);
    } catch (err) {
      const msg = 'ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตการใช้กล้อง';
      setStatusMsg(msg);
      onError?.(msg);
    }
  };

  useEffect(() => {
    return () => { stopScanning(); };
  }, [stopScanning]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative rounded-lg overflow-hidden bg-black aspect-video max-w-md mx-auto w-full">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
        />
        {!isScanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <Camera className="h-16 w-16 text-white/50" />
          </div>
        )}
        {isScanning && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center">
            <div className="bg-black/60 text-white text-xs px-3 py-1 rounded-full animate-pulse">
              กำลังสแกน...
            </div>
          </div>
        )}
      </div>
      <p className="text-sm text-center text-muted-foreground">{statusMsg}</p>
      <div className="flex gap-2 justify-center">
        {!isScanning ? (
          <Button onClick={startScanning} className="gap-2">
            <Camera className="h-4 w-4" />
            เริ่มสแกน QR Code
          </Button>
        ) : (
          <Button variant="destructive" onClick={stopScanning} className="gap-2">
            <Square className="h-4 w-4" />
            หยุดสแกน
          </Button>
        )}
      </div>
    </div>
  );
}
