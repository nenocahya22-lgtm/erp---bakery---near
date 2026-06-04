import React, { useState, useEffect } from 'react';
import { Lock, User, Eye, EyeOff, ShieldCheck, HelpCircle } from 'lucide-react';

interface OwnerLoginProps {
  onLoginSuccess: () => void;
}

export default function OwnerLogin({ onLoginSuccess }: OwnerLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [systemTime, setSystemTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setSystemTime(now.toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'medium'
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (cleanUser === 'owner' && (cleanPass === 'owner 123' || cleanPass === 'owner123' || cleanPass.toLowerCase() === 'owner')) {
      localStorage.setItem('owner_authenticated', 'true');
      localStorage.setItem('owner_authenticated_at', new Date().toISOString());
      setError('');
      onLoginSuccess();
    } else {
      setError('Username atau Sandi salah! Hubungi administrator jika Anda lupa kata sandi.');
    }
  };

  return (
    <div id="owner-login-container" className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      
      {/* Dynamic Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-72 h-72 rounded-full bg-emerald-650 opacity-10 blur-3xl"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 rounded-full bg-emerald-500 opacity-10 blur-3xl"></div>

      {/* Main Glassmorphic Panel */}
      <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl p-8 space-y-6 relative z-10">
        
        {/* Brand Header */}
        <div className="text-center space-y-3 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-xl shadow-emerald-900/20">
            <Lock className="w-8 h-8 stroke-2" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight uppercase">Near Bakery & Co. ERP</h1>
            <p className="text-[11px] text-emerald-400 font-bold tracking-widest mt-1">OWNER LOCK PRIVACY PORTAL</p>
          </div>
        </div>

        {/* Live system metadata */}
        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 text-center space-y-1">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Satelit Waktu Server</span>
          <span className="font-mono text-xs font-semibold text-emerald-500 block">{systemTime || 'Sinkronisasi...'}</span>
        </div>

        {/* Alert Feedback Error */}
        {error && (
          <div className="bg-rose-950/40 border border-rose-800/60 p-3 rounded-xl text-rose-300 text-xs font-semibold leading-relaxed text-center">
            {error}
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Username</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                placeholder="Masukkan username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-900/70 border border-slate-800 rounded-xl font-medium text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all font-sans"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Kata Sandi (Password)</label>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
                className="w-full pl-10 pr-10 py-3 bg-slate-900/70 border border-slate-800 rounded-xl font-medium text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-white cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all shadow-md active:scale-[0.98] cursor-pointer"
          >
            Masuk Portal ERP
          </button>
        </form>

      </div>

      <div className="mt-8 text-[11px] text-gray-600 select-none flex items-center gap-1.5">
        <span>Sistem ERP Integrasi Terlindungi SSL</span>
      </div>
    </div>
  );
}
