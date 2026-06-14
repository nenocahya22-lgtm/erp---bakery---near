import React, { useState, useEffect } from 'react';
import { Lock, User, Eye, EyeOff, ShieldCheck, HelpCircle, KeyRound, Save, X } from 'lucide-react';
import { hashPassword, verifyPassword, isPbkdf2Hash, bytesToHex } from '../lib/password';

interface OwnerLoginProps {
  onLoginSuccess: () => void;
}

// Default password hash untuk "owner123" (SHA-256 legacy — akan upgrade ke PBKDF2 saat login)
const DEFAULT_PASSWORD_HASH = '43a0d17178a9d26c9e0fe9a74b0b45e38d32f27aed887a008a54bf6e033bf7b9';

function getStoredPasswordHash(): string {
  try {
    const saved = localStorage.getItem('owner_password_hash');
    return saved || DEFAULT_PASSWORD_HASH;
  } catch {
    return DEFAULT_PASSWORD_HASH;
  }
}

function setStoredPasswordHash(hash: string): void {
  try {
    localStorage.setItem('owner_password_hash', hash);
  } catch (e) {
    console.error('Gagal menyimpan password hash:', e);
  }
}

async function checkPassword(inputPassword: string): Promise<boolean> {
  const storedHash = getStoredPasswordHash();
  const isValid = await verifyPassword(inputPassword, storedHash);

  // Upgrade SHA-256 legacy ke PBKDF2
  if (isValid && !isPbkdf2Hash(storedHash)) {
    const newHash = await hashPassword(inputPassword);
    setStoredPasswordHash(newHash);
  }

  return isValid;
}

// ─── RATE LIMITING ───
const MAX_LOGIN_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 menit
let loginAttempts: { count: number; windowStart: number } = { count: 0, windowStart: Date.now() };

function checkRateLimit(): boolean {
  const now = Date.now();
  if (now - loginAttempts.windowStart > RATE_LIMIT_WINDOW_MS) {
    loginAttempts = { count: 0, windowStart: now };
  }
  loginAttempts.count++;
  return loginAttempts.count <= MAX_LOGIN_ATTEMPTS;
}

export default function OwnerLogin({ onLoginSuccess }: OwnerLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [systemTime, setSystemTime] = useState('');
  const [showChangePass, setShowChangePass] = useState(false);
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passMsg, setPassMsg] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

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

  // Verifikasi session saat mount
  React.useEffect(() => {
    const sessionValid = sessionStorage.getItem('owner_authenticated') === 'true';
    const localValid = localStorage.getItem('owner_authenticated') === 'true';
    const sessionToken = localStorage.getItem('owner_session_token');
    
    if (localValid && !sessionValid) {
      localStorage.removeItem('owner_authenticated');
      localStorage.removeItem('owner_authenticated_at');
      localStorage.removeItem('owner_session_token');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Rate limiting check
    if (!checkRateLimit()) {
      const waitSeconds = Math.ceil((RATE_LIMIT_WINDOW_MS - (Date.now() - loginAttempts.windowStart)) / 1000);
      setError(`Terlalu banyak percobaan login. Coba lagi dalam ${waitSeconds} detik.`);
      return;
    }
    
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (cleanUser === 'owner') {
      const isValid = await checkPassword(cleanPass);
      
      if (isValid) {
        // Reset rate limit on success
        loginAttempts = { count: 0, windowStart: Date.now() };
        // Generate session token dari SHA-256 password
        const encoder = new TextEncoder();
        const data = encoder.encode(cleanPass + 'near-bakery-session');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const sessionToken = bytesToHex(new Uint8Array(hashBuffer));
        sessionStorage.setItem('owner_authenticated', 'true');
        sessionStorage.setItem('owner_authenticated_at', new Date().toISOString());
        sessionStorage.setItem('owner_session_id', crypto.randomUUID());
        localStorage.setItem('owner_authenticated', 'true');
        localStorage.setItem('owner_authenticated_at', new Date().toISOString());
        localStorage.setItem('owner_session_token', sessionToken.substring(0, 16));
        setError('');
        onLoginSuccess();
      } else {
        setError('Username atau Sandi salah! Hubungi administrator jika Anda lupa kata sandi.');
      }
    } else {
      setError('Username atau Sandi salah! Hubungi administrator jika Anda lupa kata sandi.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg('');

    if (!oldPass.trim() || !newPass.trim() || !confirmPass.trim()) {
      setPassMsg('Semua field harus diisi!');
      return;
    }

    const isValid = await checkPassword(oldPass.trim());
    if (!isValid) {
      setPassMsg('Password lama salah!');
      return;
    }

    if (newPass.trim().length < 6) {
      setPassMsg('Password baru minimal 6 karakter!');
      return;
    }

    if (newPass.trim() !== confirmPass.trim()) {
      setPassMsg('Konfirmasi password baru tidak cocok!');
      return;
    }

    const newHash = await hashPassword(newPass.trim());
    setStoredPasswordHash(newHash);
    setPassMsg('✅ Password berhasil diubah!');
    setTimeout(() => {
      setShowChangePass(false);
      setPassword(newPass.trim());
      setOldPass('');
      setNewPass('');
      setConfirmPass('');
      setPassMsg('');
    }, 2000);
  };

  return (
    <div id="owner-login-container" className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      
      <div className="absolute top-[-20%] left-[-10%] w-72 h-72 rounded-full bg-emerald-650 opacity-10 blur-3xl"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 rounded-full bg-emerald-500 opacity-10 blur-3xl"></div>

      <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl p-8 space-y-6 relative z-10">
        
        <div className="text-center space-y-3 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-xl shadow-emerald-900/20">
            <Lock className="w-8 h-8 stroke-2" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight uppercase">Near Bakery & Co. ERP</h1>
            <p className="text-[11px] text-emerald-400 font-bold tracking-widest mt-1">OWNER LOCK PRIVACY PORTAL</p>
          </div>
        </div>

        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 text-center space-y-1">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Satelit Waktu Server</span>
          <span className="font-mono text-xs font-semibold text-emerald-500 block">{systemTime || 'Sinkronisasi...'}</span>
        </div>

        {error && (
          <div className="bg-rose-950/40 border border-rose-800/60 p-3 rounded-xl text-rose-300 text-xs font-semibold leading-relaxed text-center">
            {error}
          </div>
        )}

        {!showChangePass ? (
          <>
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

            <div className="border-t border-slate-800 pt-4">
              <button
                onClick={() => setShowChangePass(true)}
                className="w-full py-2 text-center text-[10px] font-bold text-gray-500 hover:text-emerald-400 hover:bg-slate-800/50 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <KeyRound className="w-3 h-3" /> Ganti Password Owner
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="w-4 h-4" /> Ganti Password
              </h3>
              <button
                onClick={() => { setShowChangePass(false); setPassMsg(''); setOldPass(''); setNewPass(''); setConfirmPass(''); }}
                className="text-gray-500 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {passMsg && (
              <div className={`p-3 rounded-xl text-xs font-semibold text-center ${
                passMsg.includes('✅') ? 'bg-emerald-950/40 border border-emerald-800/60 text-emerald-300' : 'bg-rose-950/40 border border-rose-800/60 text-rose-300'
              }`}>
                {passMsg}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Password Lama</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                    <Lock className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type={showOldPass ? 'text' : 'password'}
                    required
                    value={oldPass}
                    onChange={(e) => setOldPass(e.target.value)}
                    placeholder="Password lama"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-900/70 border border-slate-800 rounded-xl font-medium text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPass(!showOldPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-white cursor-pointer"
                  >
                    {showOldPass ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Password Baru</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                    <KeyRound className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-900/70 border border-slate-800 rounded-xl font-medium text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-white cursor-pointer"
                  >
                    {showNewPass ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Konfirmasi Password Baru</label>
                <input
                  type="password"
                  required
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="Ketik ulang password baru"
                  className="w-full px-3 py-2.5 bg-slate-900/70 border border-slate-800 rounded-xl font-medium text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all shadow-md active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" /> Simpan Password Baru
              </button>
            </form>
          </div>
        )}

      </div>

      <div className="mt-8 text-[11px] text-gray-600 select-none flex items-center gap-1.5">
        <span>Sistem ERP Integrasi Terlindungi SSL</span>
      </div>
    </div>
  );
}
