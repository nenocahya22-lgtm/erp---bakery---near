import React, { useState, useEffect } from 'react';
import { Lock, FileSpreadsheet, RefreshCw, Layers } from 'lucide-react';

interface AuthScreenProps {
  onLogin: () => void;
  isLoggingIn: boolean;
  onBypassOffline?: () => void;
}

export default function AuthScreen({ onLogin, isLoggingIn, onBypassOffline }: AuthScreenProps) {
  const [currentTime, setCurrentTime] = useState('');

  // Update clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'medium'
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div id="auth-screen-container" className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      
      {/* Decorative Top Accent */}
      <div className="absolute top-0 inset-x-0 h-1.5 bg-emerald-600"></div>

      {/* Main Glass/Card layout */}
      <div className="w-full max-w-md bg-white border border-gray-100 rounded-3xl shadow-xl p-8 space-y-6 text-center transform transition-all hover:shadow-2xl">
        
        {/* Brand Icon & Heading */}
        <div className="space-y-3 flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md animate-pulse-slow">
            <Layers className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Near Bakery & Co. ERP</h2>
            <p className="text-xs text-gray-400 mt-1 font-medium select-none">DATA RESEP DAN HPP PRODUK PERJUALAN</p>
          </div>
        </div>

        {/* Dynamic Display Details */}
        <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-100 space-y-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">Waktu Sistem</span>
          <span className="font-mono text-xs font-semibold text-gray-700 block select-none">
            {currentTime || 'Loading clock...'}
          </span>
        </div>

        {/* Explanation message */}
        <div className="space-y-2 text-xs text-gray-500 leading-relaxed max-w-xs mx-auto">
          <p>
            Gunakan aplikasi ini untuk mengimpor, menghitung, mensimulasikan margin, dan mengedit resep makanan & minuman Anda secara modular bersama Google Sheets.
          </p>
          <p className="text-[11px] text-gray-400 flex items-center justify-center gap-1">
            <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            Keamanan Data: Data terenkripsi aman di Cloud Anda.
          </p>
        </div>

        {/* Google Materials Auth Button Block */}
        <div className="pt-2 flex justify-center">
          <button
            onClick={onLogin}
            disabled={isLoggingIn}
            className="group relative inline-flex items-center justify-center p-0.5 mb-2 mr-2 overflow-hidden text-sm font-medium text-gray-900 rounded-xl focus:ring-4 focus:outline-none focus:ring-emerald-300 transition-transform active:scale-[0.98] cursor-pointer"
          >
            {isLoggingIn ? (
              <div className="inline-flex items-center gap-2 bg-white border border-gray-200 px-5 py-3 rounded-lg text-gray-600 font-semibold text-xs">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                Menghubungkan Auth...
              </div>
            ) : (
              /* Google Sign In Material Button Layout */
              <div className="flex items-center justify-center bg-gray-950 text-white rounded-xl px-5 py-3 hover:bg-gray-900 transition-colors gap-3 border border-gray-800 shadow-sm">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 shrink-0">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
                <span className="text-xs font-bold font-sans tracking-wide">Hubungkan dengan Google</span>
              </div>
            )}
          </button>
        </div>

        {onBypassOffline && (
          <div className="pt-2">
            <button
              onClick={onBypassOffline}
              className="w-full py-3 px-5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition-all border border-emerald-250/70 shadow-2xs cursor-pointer active:scale-[0.99]"
            >
              Mode Demo Offline (Bypass Login Google) →
            </button>
          </div>
        )}

      </div>

      <div className="mt-8 text-[11px] text-gray-400 select-none">
        Powered by Google Workspace Sheets Integration
      </div>
    </div>
  );
}
