import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  componentStack: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, componentStack: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    // Log error details ke localStorage untuk debug
    try {
      const errorLog = {
        name: error.name,
        message: error.message,
        stack: (error.stack || '').substring(0, 2000),
        time: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent.substring(0, 100),
      };
      localStorage.setItem('error_boundary_log', JSON.stringify(errorLog));
    } catch {}

    return { hasError: true, error, componentStack: '' };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);

    // Simpan componentStack di state untuk ditampilkan
    this.setState({ componentStack: errorInfo.componentStack || '' });

    // Log ke localStorage
    try {
      const existing = localStorage.getItem('error_logs');
      const logs = existing ? JSON.parse(existing) : [];
      logs.push({
        name: error.name,
        message: error.message,
        stack: (error.stack || '').substring(0, 1000),
        componentStack: errorInfo.componentStack || '',
        time: new Date().toISOString(),
      });
      if (logs.length > 10) logs.shift();
      localStorage.setItem('error_logs', JSON.stringify(logs));
    } catch {}
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const error = this.state.error;
      const isHookError = error?.message?.includes('#310') || error?.message?.includes('310');

      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 max-w-xl w-full text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-rose-600/20 border border-rose-800/30 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-rose-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-wider">
                {this.props.fallbackTitle || 'Terjadi Kesalahan'}
              </h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Maaf, terjadi kesalahan yang tidak terduga. Silakan muat ulang atau kembali.
              </p>
              {isHookError && (
                <p className="text-[10px] text-amber-400 mt-2 font-mono bg-slate-900 rounded-xl p-2">
                  🔧 Hook Error — kemungkinan masalah komponen. Tim teknis sedang memperbaiki.
                </p>
              )}
            </div>
            {error && (
              <details className="text-left bg-slate-900 rounded-xl p-3 max-h-64 overflow-y-auto cursor-pointer">
                <summary className="text-[10px] font-bold text-slate-400 hover:text-white">
                  🛠 Detail Error (klik untuk lihat)
                </summary>
                <div className="text-[9px] font-mono break-all mt-2 whitespace-pre-wrap space-y-2">
                  <div>
                    <span className="text-slate-500 block text-[8px] font-bold uppercase">Error Name:</span>
                    <span className="text-rose-300">{error.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[8px] font-bold uppercase">Error Message:</span>
                    <span className="text-rose-300">{error.message}</span>
                  </div>
                  {this.state.componentStack && (
                    <div>
                      <span className="text-amber-400 block text-[8px] font-bold uppercase">📍 Komponen yang crash:</span>
                      <span className="text-amber-200">
                        {this.state.componentStack.split('\n').slice(0, 5).join('\n')}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500 block text-[8px] font-bold uppercase">Stack Trace:</span>
                    <span className="text-slate-400 text-[8px]">
                      {(error.stack || 'Tidak tersedia').split('\n').slice(0, 5).join('\n')}
                    </span>
                  </div>
                </div>
              </details>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Muat Ulang
              </button>
              <button
                onClick={this.handleRetry}
                className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Coba Lagi
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
