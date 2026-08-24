'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth.store';

const loginSchema = z.object({
  username: z.string().min(1, 'กรุณากรอกชื่อผู้ใช้'),
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
});
type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      clearError();
      await login({
        username: data.username.trim(),
        password: data.password.trim(),
      });
      router.push('/dashboard');
    } catch {
      // error is set in store
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-navy-dark via-brand-navy to-[#0f3460] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient lights */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-brand-orange/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Back to portal link */}
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-orange-200 hover:text-white transition-colors bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            กลับหน้าพอร์ทัลหลัก
          </Link>
        </div>

        {/* Logo & Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/95 shadow-xl mb-3">
            <img
              src="/logo.png"
              alt="FixIt Center Logo"
              width={80}
              height={80}
              style={{ maxHeight: '80px', width: 'auto' }}
              className="h-20 w-auto object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">FixIt Center</h1>
          <p className="text-brand-orange font-semibold text-sm mt-0.5">ศูนย์ซ่อมสร้างเพื่อชุมชน</p>
          <p className="text-xs text-slate-300">วิทยาลัยสารพัดช่างน่าน</p>
        </div>

        <Card className="shadow-2xl border-0 bg-white">
          <CardHeader className="pb-4 pt-6">
            <CardTitle className="text-xl text-brand-navy font-bold">เข้าสู่ระบบ</CardTitle>
            <CardDescription>กรอกชื่อผู้ใช้และรหัสผ่านเพื่อเข้าใช้งาน</CardDescription>
          </CardHeader>
          <CardContent className="pb-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Error alert */}
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-700 font-medium">ชื่อผู้ใช้</Label>
                <Input
                  id="username"
                  placeholder="กรอกชื่อผู้ใช้"
                  autoComplete="username"
                  className="focus-visible:ring-brand-orange"
                  {...register('username')}
                />
                {errors.username && (
                  <p className="text-xs text-red-500">{errors.username.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 font-medium">รหัสผ่าน</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="กรอกรหัสผ่าน"
                    autoComplete="current-password"
                    className="pr-10 focus-visible:ring-brand-orange"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base bg-brand-orange hover:bg-brand-orange-dark text-white font-bold shadow-md transition-all mt-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    กำลังเข้าสู่ระบบ...
                  </span>
                ) : (
                  'เข้าสู่ระบบ'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-300/80 mt-6">
          ศูนย์ซ่อมสร้างเพื่อชุมชน (FixIt Center) วิทยาลัยสารพัดช่างน่าน &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
