'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught an error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/fixitcenter/dashboard';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white rounded-2xl p-6 shadow-xl border border-rose-200 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center mx-auto text-rose-600">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {this.props.fallbackTitle || 'เกิดข้อผิดพลาดในการโหลดหน้าจอ'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                ระบบได้ตรวจพบข้อผิดพลาด กรุณากดปุ่มลองใหม่อีกครั้ง หรือกลับสู่หน้าหลัก
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-slate-900 text-rose-300 rounded-lg text-left font-mono text-xs overflow-x-auto max-h-36">
                <p className="font-bold text-white mb-1">Error Details:</p>
                <p>{this.state.error.toString()}</p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="text-[10px] text-slate-400 mt-2 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack.slice(0, 300)}...
                  </pre>
                )}
              </div>
            )}

            <div className="flex gap-2 justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleGoHome}
                className="gap-1.5 text-xs"
              >
                <Home className="w-3.5 h-3.5" />
                หน้าหลัก
              </Button>
              <Button
                size="sm"
                onClick={this.handleRetry}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                ลองใหม่อีกครั้ง
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
