'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn, assetUrl } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { Toaster } from '@/components/ui/toaster';
import {
  LayoutDashboard, ClipboardList, Wrench, ShieldCheck,
  Monitor, LogOut, Menu, X, ChevronRight, Wrench as WrenchIcon,
  Settings, Globe, Utensils
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/notifications/notification-bell';

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'แดชบอร์ด', labelEn: 'Dashboard' },
  { href: '/registration', icon: ClipboardList, label: 'ลงทะเบียนงานซ่อม', labelEn: 'Registration' },
  { href: '/kitchen', icon: Utensils, label: 'ครัวอาชีวะ (สถิติ)', labelEn: 'Relief Kitchen' },
  { href: '/workspace', icon: Wrench, label: 'พื้นที่ทำงานช่าง', labelEn: 'Workspace' },
  { href: '/queue-board', icon: Monitor, label: 'กระดานคิว TV', labelEn: 'Queue Board' },
  { href: '/admin', icon: Settings, label: 'ระบบจัดการ (Admin)', labelEn: 'Admin Console', adminOnly: true },
];

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'ผู้ดูแลระบบ',
  SUPERVISOR: 'หัวหน้าช่าง',
  TECHNICIAN: 'ช่างซ่อม',
  REGISTRAR: 'เจ้าหน้าที่รับแจ้ง',
  VIEWER: 'ผู้รับชม',
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-slate-50/50">
        <img
          src={assetUrl('/logo.png')}
          alt="FixIt Center"
          width={44}
          height={44}
          style={{ maxHeight: '44px', width: 'auto' }}
          className="h-11 w-auto object-contain shrink-0 bg-white p-1 rounded-lg border border-slate-200 shadow-sm"
        />
        <div className="min-w-0">
          <p className="font-extrabold text-sm leading-tight text-brand-navy truncate">FixIt Center</p>
          <p className="text-[11px] text-brand-orange font-bold leading-tight truncate">ศูนย์ซ่อมสร้างเพื่อชุมชน</p>
          <p className="text-[10px] text-slate-500 truncate">วิทยาลัยสารพัดช่างน่าน</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <Link
          href="/"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-orange-50 hover:text-brand-orange transition-colors group mb-2 border border-slate-200/80 bg-slate-50/70"
        >
          <Globe className="h-4 w-4 text-brand-orange shrink-0" />
          <span className="flex-1 text-xs font-semibold">หน้าพอร์ทัลหลัก</span>
        </Link>

        {NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === 'ADMIN').map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group',
                isActive
                  ? 'bg-orange-50 text-brand-orange font-bold border-l-4 border-brand-orange pl-2'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <item.icon className={cn('h-5 w-5 shrink-0', isActive ? 'text-brand-orange' : 'text-slate-400 group-hover:text-slate-600')} />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="h-4 w-4 text-brand-orange" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer: user info + logout */}
      <div className="p-3 border-t bg-slate-50/50">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white border mb-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
            {user?.name?.[0] || user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-slate-800">{user?.name || user?.username}</p>
            <p className="text-[11px] text-blue-600 font-semibold">
              {ROLE_LABELS[user?.role || ''] || user?.role}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          ออกจากระบบ
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white flex flex-col shadow-xl">
            <div className="flex justify-end p-3 border-b">
              <button onClick={() => setSidebarOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarContent />
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar for Desktop and Mobile */}
        <header className="flex items-center justify-between px-4 py-2.5 bg-white border-b shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-600">
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-800 hidden sm:inline">ระบบบริหารจัดการศูนย์ FixIt Center</span>
              <span className="font-extrabold text-sm text-slate-800 sm:hidden">FixIt Center</span>
              <span className="text-[11px] px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full font-bold">น่าน</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </div>
      </main>

      <Toaster />
    </div>
  );
}
