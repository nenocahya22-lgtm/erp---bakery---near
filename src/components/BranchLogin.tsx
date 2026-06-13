import React, { useState, useEffect } from 'react';
import { Cabang } from '../types';
import { Lock, User, Eye, EyeOff, Building2, ArrowLeft } from 'lucide-react';
import { verifyPassword } from '../lib/password';

interface BranchLoginProps {
  cabangList: Cabang[];
  onLoginSuccess: (cabang: Cabang) => void;
  onBackToOwner: () => void;
}

export default function BranchLogin({ cabangList, onLoginSuccess, onBackToOwner }: BranchLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [systemTime, setSystemTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      setSystemTime(new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'medium' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    const found = cabangList.find(c => c.username.toLowerCase() === cleanUser && c.isActive);

    if (found) {
      // Verifikasi password dengan PBKDF2 (atau legacy SHA-256)
      const passwordMatch = await verifyPassword(cleanPass, found.password);

      if (passwordMatch) {
        localStorage.setItem('branch_authenticated', JSON.stringify({ id: found.id, nama: found.nama }));
        localStorage.setItem('branch_authenticated_at', new Date().toISOString());
        setError('');
        onLoginSuccess(found);
        return;
      }
    }

    setError('Username atau Password salah! Atau akun cabang belum aktif.');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-72 h-72 rounded-full bg-emerald-650 opacity-10 blur-3xl"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 rounded-full bg-emerald-500 opacity-10 blur-3xl"></div>

      <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl p-8 space-y-6 relative z-10">
        <div className="text-center space-y-3 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-xl shadow-emerald-900/20">
            <Building2 className="w-8 h-8 stroke-2" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight uppercase">Login Cabang</h1>
            <p className="text-[11px] text-emerald-400 font-bold tracking-widest mt-1">OUTLET STAFF PORTAL</p>
          </div>
        </div>

        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 text-center space-y-1">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">System Time</span>
          <span className="font-mono text-xs font-semibold text-emerald-500 block">{systemTime}</span>
        </div>

        {error && (
          <div className="bg-rose-950/40 border border-rose-800/60 p-3 rounded-xl text-rose-300 text-xs font-semibold text-center">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Username Cabang</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                <User className="w-4 h-4" />
              </span>
              <input type="text" required placeholder="Username cabang"
                value={username} onChange={e => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-900/70 border border-slate-800 rounded-xl font-medium text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                <Lock className="w-4 h-4" />
              </span>
              <input type={showPassword ? 'text' : 'password'} required placeholder="Password"
                value={password} onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-slate-900/70 border border-slate-800 rounded-xl font-medium text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all font-mono" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-white cursor-pointer">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button type="submit"
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all shadow-md active:scale-[0.98] cursor-pointer">
            Masuk Portal Cabang
          </button>
        </form>

        <div className="border-t border-slate-800 pt-4">
          <button onClick={onBackToOwner}
            className="w-full py-2 text-center text-[10px] font-bold text-gray-500 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5">
            <ArrowLeft className="w-3 h-3" /> Login sebagai Owner
          </button>
        </div>
      </div>

      <div className="mt-8 text-[11px] text-gray-600 select-none">
        <span>© Near Bakery & Co. ERP — Outlet Management System</span>
      </div>
    </div>
  );
}
