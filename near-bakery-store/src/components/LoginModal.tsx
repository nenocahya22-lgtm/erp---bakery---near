/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, LogIn, UserCheck, Store, ShieldAlert, Check, HelpCircle, Info } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const LoginModal: React.FC = () => {
  const {
    isLoginModalOpen,
    setLoginModalOpen,
    loginWithGoogle,
    loginDemoUser,
    isLoading
  } = useStore();

  if (!isLoginModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs transition-all animate-fade-in">
      <div 
        id="login-modal-box"
        className="relative bg-white w-full max-w-md rounded-3xl border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header decoration */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-6 text-white text-left relative shrink-0">
          <button 
            onClick={() => setLoginModalOpen(false)}
            className="absolute top-5 right-5 text-emerald-100 hover:text-white p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title="Tutup"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-amber-400 text-stone-900 font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
              Akses Dapur
            </span>
            <span className="text-white/80 font-sans text-xs">• Near Bakery Portal</span>
          </div>
          <h3 className="text-xl font-serif font-bold text-white">Sign In & Autentikasi</h3>
          <p className="text-xs text-emerald-100 mt-1 font-light font-sans max-w-[90%]">
            Masuk untuk menyimpan pesanan, melakukan live chat dengan baker, dan memberikan ulasan cita rasa roti.
          </p>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Method 1: Google Login (Official & Real) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="h-4 w-1 bg-emerald-600 rounded-full" />
              <h4 className="text-xs font-extrabold text-stone-500 uppercase tracking-wider font-sans">
                Metode Utama (Akun Google)
              </h4>
            </div>

            <button
              onClick={loginWithGoogle}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-stone-50 text-stone-800 border-2 border-stone-200 py-3 px-4 rounded-xl text-sm font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                <g transform="matrix(1, 0, 0, 1, 0, 0)">
                  <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.58h3.3c1.92,-1.77 3.02,-4.38 3.02,-7.38c0,-0.66 -0.06,-1.3 -0.16,-1.98z" fill="#4285F4" />
                  <path d="M12,20.62c2.43,0 4.47,-0.8 5.96,-2.19l-3.3,-2.58c-0.9,0.6 -2.07,0.97 -3.3,0.97c-2.34,0 -4.33,-1.58 -5.03,-3.7H2.9v2.58c1.5,2.98 4.56,4.92 8.1,4.92z" fill="#34A853" />
                  <path d="M6.97,13.12a6.01,6.01 0 0 1 0,-1.82V8.72H2.9a10.02,10.02 0 0 0 0,6.98l4.07,-2.58z" fill="#FBBC05" />
                  <path d="M12,6.38c1.32,0 2.5,0.45 3.44,1.35l2.58,-2.58C16.46,3.68 14.43,2.9 12,2.9C8.46,2.9 5.4,4.84 3.9,7.82l4.07,2.58c0.7,-2.12 2.69,-3.7 5.03,-3.7z" fill="#EA4335" />
                </g>
              </svg>
              <span>Masuk dengan Google</span>
            </button>
            <p className="text-[10px] text-stone-400 pl-1 leading-snug">
              * Menggunakan sistem autentikasi Google Firebase resmi yang aman.
            </p>
          </div>

          {/* Iframe Notice alert box */}
          <div className="bg-amber-50/70 border border-amber-200/50 rounded-2xl p-4 flex items-start gap-3">
            <ShieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h5 className="text-[11px] font-bold text-amber-900 uppercase tracking-wide">
                Mengalami kendala pop-up login?
              </h5>
              <p className="text-[10px] text-amber-800 leading-relaxed font-sans">
                Aplikasi ini berjalan dalam frame simulasi (<strong>iframe</strong>) AI Studio. Beberapa browser memblokir pop-up/cookies keamanan.
                Jika pop-up tertutup, Anda bisa <strong>mengizinkan pop-up</strong> browser, <strong>membuka di tab baru</strong>, atau langsung gunakan pilihan <strong>Akun Demo</strong> di bawah.
              </p>
            </div>
          </div>

          <div className="border-t border-stone-150 relative my-1">
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-[10px] uppercase font-bold text-stone-400 tracking-wider">
              ATAU
            </span>
          </div>

          {/* Method 2: Demo Sandbox Logins (Highly Robust Alternative) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="h-4 w-1 bg-amber-500 rounded-full" />
              <h4 className="text-xs font-extrabold text-stone-500 uppercase tracking-wider font-sans">
                Akses Instan Sandbox (Akun Demo)
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Buyer Demo */}
              <button
                onClick={() => {
                  loginDemoUser('buyer');
                  setLoginModalOpen(false);
                }}
                disabled={isLoading}
                className="flex flex-col items-center justify-center p-4 bg-[#F9F8F6] hover:bg-emerald-50 border border-stone-200 hover:border-emerald-300 rounded-2xl text-center group transition-all duration-200 cursor-pointer text-left"
              >
                <div className="bg-emerald-100 text-emerald-800 p-2.5 rounded-full mb-2 group-hover:scale-105 transition-all">
                  <UserCheck size={16} />
                </div>
                <span className="font-sans font-bold text-stone-900 text-xs">Akun Pembeli</span>
                <span className="text-[9px] text-stone-400 mt-1">Coba beli roti & chat</span>
              </button>

              {/* Seller Admin Demo */}
              <button
                onClick={() => {
                  loginDemoUser('seller');
                  setLoginModalOpen(false);
                }}
                disabled={isLoading}
                className="flex flex-col items-center justify-center p-4 bg-[#F9F8F6] hover:bg-amber-50 border border-stone-200 hover:border-amber-300 rounded-2xl text-center group transition-all duration-200 cursor-pointer text-left"
              >
                <div className="bg-amber-100 text-amber-800 p-2.5 rounded-full mb-2 group-hover:scale-105 transition-all">
                  <Store size={16} />
                </div>
                <span className="font-sans font-bold text-stone-900 text-xs">Akun Baker Admin</span>
                <span className="text-[9px] text-stone-400 mt-1">Kelola menu & pesanan</span>
              </button>
            </div>
          </div>

        </div>

        {/* Footer info lock */}
        <div className="bg-stone-50 px-6 py-4 border-t border-stone-100 text-center shrink-0 flex items-center justify-center gap-1.5">
          <Info size={11} className="text-stone-405" />
          <span className="text-[9px] text-stone-400 font-medium">
            Data Anda tersimpan secara persisten & aman di Firestore.
          </span>
        </div>
      </div>
    </div>
  );
};
