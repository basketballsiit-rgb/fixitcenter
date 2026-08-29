'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Wifi, WifiOff, Monitor } from 'lucide-react';

interface SmartCardData {
  nationalId: string;
  firstName: string;
  lastName: string;
  address?: string;
}

interface SmartCardReaderProps {
  onDataReceived: (data: SmartCardData) => void;
  onScanPhoto?: () => void;
  onUploadPhoto?: () => void;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'simulating' | 'error';

const MOCK_CARD_DATA: SmartCardData[] = [
  { nationalId: '1559900123456', firstName: 'สมชาย', lastName: 'ใจดี', address: '99/1 หมู่ 2 ต.ในเวียง อ.เมืองน่าน จ.น่าน' },
  { nationalId: '3550100789012', firstName: 'สมหญิง', lastName: 'รักไทย', address: '12 หมู่ 4 ต.ผาสิงห์ อ.เมืองน่าน จ.น่าน' },
  { nationalId: '3550400567890', firstName: 'วิชัย', lastName: 'พัฒนา', address: '45/3 หมู่ 1 ต.ดู่ใต้ อ.เมืองน่าน จ.น่าน' },
];

export function SmartCardReader({ onDataReceived, onScanPhoto, onUploadPhoto }: SmartCardReaderProps) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [logs, setLogs] = useState<string[]>(['[System] Smart Card Reader พร้อมใช้งาน']);
  const [isSimulating, setIsSimulating] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('th-TH');
    setLogs((prev) => [...prev.slice(-19), `[${time}] ${msg}`]);
  };

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const connectReader = () => {
    setStatus('connecting');
    addLog('กำลังเชื่อมต่อ Smart Card Reader daemon...');

    try {
      wsRef.current = new WebSocket('ws://localhost:9999');

      wsRef.current.onopen = () => {
        setStatus('connected');
        addLog('เชื่อมต่อ Smart Card Reader สำเร็จ');
      };

      wsRef.current.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          addLog(`อ่านบัตรสำเร็จ: ${data.firstName} ${data.lastName}`);
          onDataReceived(data);
        } catch {
          addLog('ข้อมูลบัตรไม่ถูกต้อง');
        }
      };

      wsRef.current.onerror = () => {
        setStatus('simulating');
        setIsSimulating(true);
        addLog('ไม่พบ Reader hardware — เปลี่ยนเป็นโหมดจำลอง (Simulator)');
      };

      wsRef.current.onclose = () => {
        if (status === 'connected') {
          setStatus('disconnected');
          addLog('การเชื่อมต่อถูกตัด');
        }
      };
    } catch {
      setStatus('simulating');
      setIsSimulating(true);
      addLog('โหมดจำลอง Smart Card พร้อมใช้งาน');
    }
  };

  const disconnect = () => {
    wsRef.current?.close();
    wsRef.current = null;
    setStatus('disconnected');
    setIsSimulating(false);
    addLog('ยกเลิกการเชื่อมต่อ');
  };

  const simulateCardTap = () => {
    if (!isSimulating) return;
    addLog('กำลังอ่านบัตรประชาชน...');
    setTimeout(() => {
      const randomCard = MOCK_CARD_DATA[Math.floor(Math.random() * MOCK_CARD_DATA.length)];
      addLog(`✓ อ่านบัตรสำเร็จ: ${randomCard.firstName} ${randomCard.lastName}`);
      onDataReceived(randomCard);
    }, 1500);
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'connected':
        return <Badge variant="success" className="gap-1"><Wifi className="h-3 w-3" />เชื่อมต่อแล้ว</Badge>;
      case 'simulating':
        return <Badge variant="warning" className="gap-1"><Monitor className="h-3 w-3" />โหมดจำลอง</Badge>;
      case 'connecting':
        return <Badge variant="info" className="gap-1 animate-pulse"><Wifi className="h-3 w-3" />กำลังเชื่อมต่อ...</Badge>;
      default:
        return <Badge variant="outline" className="gap-1"><WifiOff className="h-3 w-3" />ไม่ได้เชื่อมต่อ</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-blue-600" />
          <span className="font-medium">Smart Card Reader & กล้องสแกน OCR</span>
        </div>
        {getStatusBadge()}
      </div>

      <div className="flex gap-2 flex-wrap">
        {status === 'disconnected' || status === 'error' ? (
          <Button onClick={connectReader} size="sm" className="gap-2">
            <Wifi className="h-4 w-4" />
            เชื่อมต่อ Reader
          </Button>
        ) : (
          <Button onClick={disconnect} size="sm" variant="outline" className="gap-2">
            <WifiOff className="h-4 w-4" />
            ตัดการเชื่อมต่อ
          </Button>
        )}
        {isSimulating && (
          <Button onClick={simulateCardTap} size="sm" variant="secondary" className="gap-2">
            <CreditCard className="h-4 w-4" />
            จำลองแตะบัตร
          </Button>
        )}
        {onScanPhoto && (
          <Button onClick={onScanPhoto} size="sm" variant="outline" className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50">
            📷 สแกนบัตรด้วยกล้อง (OCR)
          </Button>
        )}
        {onUploadPhoto && (
          <Button onClick={onUploadPhoto} size="sm" variant="outline" className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50">
            📁 ถ่ายรูป/อัปโหลดภาพบัตร
          </Button>
        )}
      </div>

      {/* Terminal log */}
      <div className="bg-gray-900 rounded-md p-3 h-32 overflow-y-auto font-mono text-xs text-green-400">
        {logs.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}
