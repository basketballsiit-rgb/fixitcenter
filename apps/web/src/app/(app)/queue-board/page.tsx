'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Maximize2,
  Minimize2,
  RefreshCw,
  Building2,
  Wrench,
  Package,
  CheckCircle2,
  Clock,
  Radio,
  Tv,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Volume2,
  VolumeX,
  Users,
} from 'lucide-react';
import { queueApi, centerApi, type QueueBoardData, type Center } from '@/lib/api';
import { getSocket, joinRoom } from '@/lib/socket';
import { useQueueStore, type QueueTicket } from '@/store/queue.store';
import { useAuthStore } from '@/store/auth.store';
import { Badge } from '@/components/ui/badge';
import { assetUrl } from '@/lib/utils';

const TRADE_CONFIG = [
  {
    key: 'ELECTRICAL' as const,
    label: 'แผนกช่างไฟฟ้า',
    labelEn: 'ELECTRICAL',
    prefix: 'E',
    bg: 'bg-gradient-to-b from-amber-950/90 via-slate-900 to-slate-950',
    headerBg: 'bg-gradient-to-r from-amber-600 to-amber-500',
    ticketBg: 'bg-amber-500/15',
    textColor: 'text-amber-300',
    activeColor: 'text-amber-400',
    border: 'border-amber-500/60',
    glowColor: 'shadow-amber-500/20',
  },
  {
    key: 'ELECTRONICS' as const,
    label: 'แผนกช่างอิเล็กทรอนิกส์',
    labelEn: 'ELECTRONICS',
    prefix: 'X',
    bg: 'bg-gradient-to-b from-blue-950/90 via-slate-900 to-slate-950',
    headerBg: 'bg-gradient-to-r from-blue-600 to-blue-500',
    ticketBg: 'bg-blue-500/15',
    textColor: 'text-blue-300',
    activeColor: 'text-blue-400',
    border: 'border-blue-500/60',
    glowColor: 'shadow-blue-500/20',
  },
  {
    key: 'AUTOMOTIVE' as const,
    label: 'แผนกช่างยนต์',
    labelEn: 'AUTOMOTIVE',
    prefix: 'A',
    bg: 'bg-gradient-to-b from-emerald-950/90 via-slate-900 to-slate-950',
    headerBg: 'bg-gradient-to-r from-emerald-600 to-emerald-500',
    ticketBg: 'bg-emerald-500/15',
    textColor: 'text-emerald-300',
    activeColor: 'text-emerald-400',
    border: 'border-emerald-500/60',
    glowColor: 'shadow-emerald-500/20',
  },
];

const STATUS_MAP: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  REPAIRING: { label: 'กำลังดำเนินการซ่อม', bg: 'bg-amber-500/20 border-amber-400', text: 'text-amber-300', icon: Wrench },
  DIAGNOSING: { label: 'กำลังตรวจเช็ค/วินิจฉัย', bg: 'bg-blue-500/20 border-blue-400', text: 'text-blue-300', icon: Clock },
  WAITING_PARTS: { label: 'รออะไหล่', bg: 'bg-orange-500/20 border-orange-400', text: 'text-orange-300', icon: Package },
  QC_PENDING: { label: 'รอตรวจคุณภาพ', bg: 'bg-purple-500/20 border-purple-400', text: 'text-purple-300', icon: Clock },
  COMPLETED: { label: '🎉 ซ่อมเสร็จ (พร้อมรับเครื่อง)', bg: 'bg-emerald-500/30 border-emerald-400', text: 'text-emerald-300', icon: CheckCircle2 },
  PENDING: { label: 'รอดำเนินการ', bg: 'bg-slate-700/50 border-slate-600', text: 'text-slate-300', icon: Clock },
};

export default function QueueBoardPage() {
  const { board, setQueueBoard } = useQueueStore();
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const queryCenterId = searchParams.get('centerId');

  const [centers, setCenters] = useState<Center[]>([]);
  const [centerId, setCenterId] = useState<string>(queryCenterId || user?.centerId || 'ALL');
  const [centerName, setCenterName] = useState<string>('ศูนย์ซ่อมสร้างเพื่อชุมชน FixIt Center');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [carouselIndices, setCarouselIndices] = useState<{ [tradeKey: string]: number }>({
    ELECTRICAL: 0,
    ELECTRONICS: 0,
    AUTOMOTIVE: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // Audio Synthesis & Thai Voice Caller
  const playChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const now = audioCtx.currentTime;

      // Two-tone pleasant chime
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.18); // A5

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.85);
    } catch {
      // AudioContext might be blocked until user interaction
    }
  }, []);

  const speakAnnouncement = useCallback(
    (text: string) => {
      if (!isSoundEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
      try {
        playChime();
        setTimeout(() => {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'th-TH';
          utterance.rate = 0.95;
          utterance.pitch = 1.05;
          window.speechSynthesis.speak(utterance);
        }, 450);
      } catch (e) {
        console.warn('Speech synthesis error:', e);
      }
    },
    [isSoundEnabled, playChime]
  );

  // Load Centers
  useEffect(() => {
    centerApi.getAll().then((r) => {
      const list = Array.isArray(r.data) ? r.data : [];
      setCenters(list);
      if (!centerId && user?.centerId) {
        setCenterId(user.centerId);
      }
    }).catch(() => {});
  }, [centerId, user]);

  const fetchBoard = useCallback(async () => {
    try {
      const res = await queueApi.getBoard(centerId || 'ALL');
      const data: any = res.data;
      const rawBoard = data?.queues || data || {};
      if (data?.centerName) {
        setCenterName(data.centerName);
      }
      setQueueBoard({
        ELECTRICAL: rawBoard.ELECTRICAL || [],
        ELECTRONICS: rawBoard.ELECTRONICS || [],
        AUTOMOTIVE: rawBoard.AUTOMOTIVE || [],
        KITCHEN: rawBoard.KITCHEN || [],
      });
    } catch (err) {
      console.error('Failed to fetch queue board:', err);
    } finally {
      setLoading(false);
    }
  }, [centerId, setQueueBoard]);

  // Initial fetch and 3-second auto-sync for TV board
  useEffect(() => {
    fetchBoard();
    const interval = setInterval(fetchBoard, 3000);
    return () => clearInterval(interval);
  }, [fetchBoard]);

  // Carousel timer: rotate active tickets every 4 seconds when multiple jobs are active
  useEffect(() => {
    const timer = setInterval(() => {
      setCarouselIndices((prev) => {
        const next = { ...prev };
        for (const trade of TRADE_CONFIG) {
          const tickets = board[trade.key] ?? [];
          const active = tickets.filter((t) =>
            ['REPAIRING', 'DIAGNOSING', 'WAITING_PARTS', 'QC_PENDING', 'COMPLETED'].includes(t.status)
          );
          if (active.length > 1) {
            next[trade.key] = ((prev[trade.key] ?? 0) + 1) % active.length;
          } else {
            next[trade.key] = 0;
          }
        }
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [board]);

  // WebSocket real-time updates & multi-technician voice notifications
  useEffect(() => {
    const socket = getSocket();
    if (centerId && centerId !== 'ALL') {
      joinRoom(`center:${centerId}`);
      joinRoom(`queue:${centerId}`);
    }

    const handleUpdate = () => {
      fetchBoard();
    };

    const handleStatus = (data: any) => {
      fetchBoard();
      if (data?.queueNumber && data?.status) {
        const qChar = data.queueNumber.charAt(0).toUpperCase();
        const tradeName = qChar === 'E' ? 'แผนกช่างไฟฟ้า' : qChar === 'X' ? 'แผนกช่างอิเล็กทรอนิกส์' : 'แผนกช่างยนต์';

        if (data.status === 'DIAGNOSING' || data.status === 'REPAIRING') {
          speakAnnouncement(`ขอเชิญหมายเลขคิว ${data.queueNumber} ที่ ${tradeName} ค่ะ`);
        } else if (data.status === 'COMPLETED') {
          speakAnnouncement(`หมายเลขคิว ${data.queueNumber} ซ่อมเสร็จเรียบร้อยแล้วค่ะ กรุณาติดต่อรับเครื่องคืน`);
        }
      }
    };

    socket.on('queue:update', (data: QueueBoardData) => { setQueueBoard(data); });
    socket.on('order:status', handleStatus);
    socket.on('order:new', handleUpdate);
    socket.on('notification:new', handleUpdate);

    return () => {
      socket.off('queue:update');
      socket.off('order:status');
      socket.off('order:new');
      socket.off('notification:new');
    };
  }, [centerId, fetchBoard, setQueueBoard, speakAnnouncement]);

  // Clock tick
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const currentDate = currentTime.toLocaleDateString('th-TH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const currentTimeStr = currentTime.toLocaleTimeString('th-TH', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  if (loading && Object.values(board).every((arr) => arr.length === 0)) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white text-2xl animate-pulse font-bold flex items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
          กำลังเชื่อมต่อกระดานคิว FixIt Center...
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-gray-950 text-white flex flex-col select-none"
      style={{ fontFamily: 'Sarabun, sans-serif' }}
    >
      {/* Top TV Header */}
      <div className="bg-slate-900 border-b border-amber-500/40 px-6 py-2.5 shrink-0 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src={assetUrl('/logo.png')}
              alt="FixIt Center"
              className="h-12 w-auto object-contain bg-white/95 p-1 rounded-xl shadow-md"
            />
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                FixIt Center <span className="text-amber-400 text-base sm:text-lg font-bold">กระดานแสดงคิวงานซ่อม (Live Queue Board)</span>
              </h1>
              <div className="flex items-center gap-3 mt-0.5">
                <p className="text-orange-200 text-xs font-semibold">วิทยาลัยสารพัดช่างน่าน</p>
                
                {/* Center Selector */}
                <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-0.5 rounded-lg border border-slate-700">
                  <Building2 className="h-3.5 w-3.5 text-amber-400" />
                  <select
                    value={centerId}
                    onChange={(e) => setCenterId(e.target.value)}
                    className="bg-transparent text-xs text-white font-bold outline-none cursor-pointer"
                  >
                    <option value="ALL" className="bg-slate-900 text-white">
                      🌐 ภาพรวมทุกศูนย์บริการ (All Centers)
                    </option>
                    {centers.map((c) => (
                      <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                        ศูนย์: {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800">
                  <Radio className="w-3 h-3 animate-ping" /> Real-time Live
                </span>
                <span className="flex items-center gap-1 text-[11px] text-blue-300 font-medium px-2 py-0.5 rounded-full bg-blue-950/60 border border-blue-800">
                  <Users className="w-3 h-3 text-blue-400" /> รองรับช่างหลายคนพร้อมกัน
                </span>
              </div>
            </div>
          </div>

          <div className="text-right flex items-center gap-3 sm:gap-5">
            {/* Audio Voice Toggle */}
            <button
              onClick={() => {
                const nextState = !isSoundEnabled;
                setIsSoundEnabled(nextState);
                if (nextState) {
                  playChime();
                  speakAnnouncement('เปิดระบบเสียงเรียกคิวเรียบร้อยแล้วค่ะ');
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm ${
                isSoundEnabled
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-400 shadow-emerald-900/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
              }`}
              title={isSoundEnabled ? 'ปิดเสียงเรียกคิว' : 'เปิดเสียงเรียกคิวอัตโนมัติ'}
            >
              {isSoundEnabled ? (
                <>
                  <Volume2 className="w-4 h-4 text-white animate-pulse" />
                  <span className="hidden md:inline">เสียงเรียกคิว: เปิด</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-slate-400" />
                  <span className="hidden md:inline">เสียงเรียกคิว: ปิด</span>
                </>
              )}
            </button>

            <div>
              <p className="text-slate-400 text-xs font-medium">{currentDate}</p>
              <p className="text-2xl sm:text-3xl font-mono font-black text-amber-400 drop-shadow">{currentTimeStr}</p>
            </div>

            <button
              onClick={toggleFullscreen}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors border border-slate-700"
              title="เต็มจอ (Fullscreen)"
            >
              {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* 3 Core Trades Queue Display */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-5 p-5 min-h-0">
        {TRADE_CONFIG.map((trade) => {
          const tickets = board[trade.key] ?? [];

          // Sort priority: REPAIRING > DIAGNOSING > WAITING_PARTS > COMPLETED > PENDING
          const priorityScore = (st: string) => {
            if (st === 'REPAIRING') return 5;
            if (st === 'DIAGNOSING') return 4;
            if (st === 'WAITING_PARTS') return 3;
            if (st === 'COMPLETED') return 2;
            return 1;
          };

          const activeTickets = tickets
            .filter((t) => ['REPAIRING', 'DIAGNOSING', 'WAITING_PARTS', 'QC_PENDING', 'COMPLETED'].includes(t.status))
            .sort((a, b) => priorityScore(b.status) - priorityScore(a.status));

          const pendingTickets = tickets.filter((t) => t.status === 'PENDING');

          // Active carousel index
          const activeIndex = (carouselIndices[trade.key] ?? 0) % Math.max(1, activeTickets.length);
          const currentServingTicket = activeTickets[activeIndex] || activeTickets[0];

          return (
            <div
              key={trade.key}
              className={`${trade.bg} rounded-2xl border-2 ${trade.border} shadow-2xl flex flex-col overflow-hidden`}
            >
              {/* Trade Column Header */}
              <div className={`${trade.headerBg} px-4 py-3 text-center shadow-md flex items-center justify-between`}>
                <div className="text-left">
                  <p className="text-white font-black text-lg sm:text-xl tracking-wide drop-shadow-sm leading-tight">
                    {trade.label}
                  </p>
                  <p className="text-white/80 text-[11px] font-mono font-bold tracking-widest">{trade.labelEn}</p>
                </div>
                <Badge className="bg-black/40 text-white font-mono text-xs px-2 py-0.5 border border-white/20">
                  {tickets.length} คิว
                </Badge>
              </div>

              {/* Top Section: NOW SERVING (กำลังให้บริการ / ซ่อม / เสร็จแล้ว) */}
              <div className="p-4 text-center border-b border-white/10 shrink-0 bg-slate-950/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/70 text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                    <Tv className="w-3.5 h-3.5 text-amber-400" />
                    กำลังให้บริการ / NOW SERVING
                  </span>
                  {activeTickets.length > 1 && (
                    <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-700/60 animate-pulse">
                      คิว {activeIndex + 1} จาก {activeTickets.length} (วนอัตโนมัติ)
                    </span>
                  )}
                </div>

                {currentServingTicket ? (
                  <div
                    className={`${trade.ticketBg} border-2 ${
                      currentServingTicket.status === 'COMPLETED' ? 'border-emerald-400' : trade.border
                    } rounded-2xl py-4 px-3 shadow-lg transition-all duration-300 relative group`}
                  >
                    {/* Carousel Nav buttons if multiple */}
                    {activeTickets.length > 1 && (
                      <>
                        <button
                          onClick={() =>
                            setCarouselIndices((prev) => ({
                              ...prev,
                              [trade.key]: (activeIndex - 1 + activeTickets.length) % activeTickets.length,
                            }))
                          }
                          className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors"
                          title="คิวก่อนหน้า"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            setCarouselIndices((prev) => ({
                              ...prev,
                              [trade.key]: (activeIndex + 1) % activeTickets.length,
                            }))
                          }
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors"
                          title="คิวถัดไป"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {/* Single-line Queue Number (No Wrap) */}
                    <div className="flex items-center justify-center overflow-hidden px-4">
                      <p
                        className={`text-5xl sm:text-6xl lg:text-7xl font-black ${
                          currentServingTicket.status === 'COMPLETED' ? 'text-emerald-400' : trade.activeColor
                        } tracking-normal font-mono drop-shadow-md whitespace-nowrap inline-block leading-none py-1`}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        {currentServingTicket.queueNumber}
                      </p>
                    </div>
                    
                    {/* Status Badge & Device Category */}
                    <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
                      {STATUS_MAP[currentServingTicket.status] && (
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-xs ${
                            STATUS_MAP[currentServingTicket.status].bg
                          } ${STATUS_MAP[currentServingTicket.status].text}`}
                        >
                          {React.createElement(STATUS_MAP[currentServingTicket.status].icon, { className: 'w-3.5 h-3.5 shrink-0' })}
                          {STATUS_MAP[currentServingTicket.status].label}
                        </span>
                      )}
                      {currentServingTicket.deviceCategory && (
                        <span className="text-xs text-white/80 font-medium px-2 py-0.5 bg-black/40 rounded-md border border-white/10">
                          {currentServingTicket.deviceCategory} {currentServingTicket.deviceBrand ? `(${currentServingTicket.deviceBrand})` : ''}
                        </span>
                      )}
                    </div>

                    {/* Indicator dots for carousel */}
                    {activeTickets.length > 1 && (
                      <div className="flex items-center justify-center gap-1 mt-2.5">
                        {activeTickets.map((_, dotIdx) => (
                          <span
                            key={dotIdx}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              dotIdx === activeIndex ? 'w-5 bg-amber-400' : 'w-1.5 bg-white/30'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-white/20 rounded-2xl py-6 px-4 bg-slate-900/40">
                    <p className="text-slate-500 text-4xl font-mono font-bold leading-none">—</p>
                    <p className="text-slate-400 text-xs font-medium mt-1">ไม่มีคิวที่กำลังซ่อมในขณะนี้</p>
                  </div>
                )}

                {/* Compact List of All In-Progress Tickets in this Trade */}
                {activeTickets.length > 1 && (
                  <div className="mt-2.5 text-left bg-slate-900/70 rounded-xl p-2 border border-white/10">
                    <p className="text-[10px] font-bold text-slate-400 mb-1">คิวทั้งหมดที่กำลังซ่อมในแผนกนี้:</p>
                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                      {activeTickets.map((t, idx) => {
                        const st = STATUS_MAP[t.status];
                        const isCurrent = idx === activeIndex;
                        return (
                          <div
                            key={idx}
                            onClick={() =>
                              setCarouselIndices((prev) => ({ ...prev, [trade.key]: idx }))
                            }
                            className={`cursor-pointer flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-bold border transition-colors ${
                              isCurrent
                                ? 'bg-amber-500/30 border-amber-400 text-amber-300 ring-1 ring-amber-400'
                                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            <span>{t.queueNumber}</span>
                            <span className={`text-[10px] ${st?.text || 'text-slate-400'}`}>
                              ({st?.label ? st.label.replace('🎉 ', '').replace('กำลังดำเนินการ', '') : t.status})
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Section: NEXT WAITING QUEUES (คิวรอถัดไป) */}
              <div className="p-3.5 flex-1 flex flex-col min-h-0">
                <p className="text-white/60 text-xs font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>คิวรอถัดไป / NEXT WAITING</span>
                  <span className="text-[11px] font-mono text-amber-400 font-bold">
                    {pendingTickets.length} คิวรอ
                  </span>
                </p>

                <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
                  {pendingTickets.length === 0 ? (
                    <div className="h-full min-h-[70px] flex items-center justify-center text-slate-500 text-xs italic bg-slate-950/20 rounded-xl border border-dashed border-white/5">
                      ไม่มีคิวรอเรียก
                    </div>
                  ) : (
                    pendingTickets.slice(0, 8).map((ticket, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-900/80 border border-white/10 hover:border-white/30 rounded-xl px-3.5 py-2 flex items-center justify-between transition-colors shadow-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-xs font-mono font-bold w-5">#{idx + 1}</span>
                          <span className="text-xl font-black text-white font-mono tracking-wider whitespace-nowrap">
                            {ticket.queueNumber}
                          </span>
                        </div>
                        {ticket.deviceCategory && (
                          <span className="text-xs text-slate-400 truncate max-w-[140px] text-right">
                            {ticket.deviceCategory}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column Footer Counter */}
              <div className="bg-slate-900/95 border-t border-white/10 px-4 py-2 text-center text-xs text-slate-400 flex items-center justify-between font-mono shrink-0">
                <span>กำลังดำเนินการ: <strong className="text-white">{activeTickets.length}</strong></span>
                <span>รอเรียก: <strong className="text-amber-400">{pendingTickets.length}</strong></span>
                <span>รวม: <strong className="text-emerald-400">{tickets.length}</strong></span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Sticky Marquee / Notice for Pickup */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border-t border-emerald-500/40 px-6 py-2 flex items-center justify-between text-xs text-slate-300 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            คิวที่ขึ้นสถานะ <strong className="text-emerald-400">&ldquo;ซ่อมเสร็จ (พร้อมรับเครื่อง)&rdquo;</strong> สามารถติดต่อรับเครื่องคืนได้ที่จุดลงทะเบียน และเมื่อรับเครื่องเรียบร้อยแล้วระบบจะปิดงานและนำคิวออกจากหน้าจออัตโนมัติ
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
          ศูนย์ซ่อมสร้างเพื่อชุมชน (FixIt Center) วิทยาลัยสารพัดช่างน่าน
        </span>
      </div>
    </div>
  );
}
