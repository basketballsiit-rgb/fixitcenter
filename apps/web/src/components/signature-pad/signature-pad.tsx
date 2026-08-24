'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, RotateCcw } from 'lucide-react';

interface SignaturePadProps {
  onSave: (dataBase64: string) => void;
  label: string;
  height?: number;
  initialValue?: string;
}

export function SignaturePad({ onSave, label, height = 180, initialValue }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSig, setHasSig] = useState(!!initialValue);
  const [saved, setSaved] = useState(!!initialValue);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Responsive width adjustment
    const width = container.clientWidth || 360;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (initialValue) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = initialValue;
    }
  };

  useEffect(() => {
    initCanvas();
    window.addEventListener('resize', initCanvas);
    return () => window.removeEventListener('resize', initCanvas);
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);
    setSaved(false);
    lastPos.current = getPos(e, canvas);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    if (lastPos.current) {
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
    }
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
    setHasSig(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    lastPos.current = null;
    // Auto-save on stroke finish
    const canvas = canvasRef.current;
    if (canvas && hasSig) {
      const dataUrl = canvas.toDataURL('image/png');
      onSave(dataUrl);
      setSaved(true);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSig(false);
    setSaved(false);
    onSave('');
  };

  const handleManualSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSig) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
    setSaved(true);
  };

  return (
    <div ref={containerRef} className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
        <span>{label}</span>
        {saved && hasSig && (
          <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> บันทึกแล้ว
          </span>
        )}
      </div>

      <div className="border-2 border-slate-300 rounded-lg overflow-hidden bg-white shadow-inner relative touch-none">
        <canvas
          ref={canvasRef}
          className="w-full cursor-crosshair block touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasSig && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-300 text-sm font-medium">
            ✍️ แตะหรือลากเพื่อเซ็นชื่อ
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          className="text-xs h-8 gap-1 text-slate-600 hover:text-red-600"
        >
          <RotateCcw className="w-3 h-3" />
          ล้างลายเซ็น
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleManualSave}
          disabled={!hasSig}
          className={`text-xs h-8 gap-1.5 font-semibold transition-all ${
            saved
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {saved ? '✓ บันทึกลายเซ็นแล้ว' : 'บันทึกลายเซ็น'}
        </Button>
      </div>
    </div>
  );
}
