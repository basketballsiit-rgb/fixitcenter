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
    ctx.lineWidth = 4;
    const size = Math.min(canvas.width, canvas.height) * 0.7;
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
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
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
      <div className="relative rounded-xl overflow-hidden bg-black w-full max-w-lg mx-auto aspect-[4/3] sm:aspect-video min-h-[280px] sm:min-h-[340px] shadow-md border border-slate-700">
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
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white gap-2">
            <Camera className="h-16 w-16 text-white/60" />
            <span className="text-xs text-slate-300">แตะปุ่มด้านล่างเพื่อเปิดกล้อง</span>
          </div>
        )}
        {isScanning && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center">
            <div className="bg-black/75 text-white text-xs px-3.5 py-1.5 rounded-full shadow border border-white/20 animate-pulse">
              🔍 กำลังสแกน... จัด QR Code ให้อยู่ในกรอบ
            </div>
          </div>
        )}
      </div>
      <p className="text-sm text-center text-muted-foreground font-medium">{statusMsg}</p>
      <div className="flex gap-2 justify-center">
        {!isScanning ? (
          <Button onClick={startScanning} className="gap-2 bg-brand-orange hover:bg-orange-600 text-white font-bold py-2.5 px-5 shadow-sm">
            <Camera className="h-4 w-4" />
            เริ่มสแกน QR Code
          </Button>
        ) : (
          <Button variant="destructive" onClick={stopScanning} className="gap-2 font-bold py-2.5 px-5">
            <Square className="h-4 w-4" />
            หยุดสแกน
          </Button>
        )}
      </div>
    </div>
  );
}
