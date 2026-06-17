import React, { useState } from 'react';
import { Cabang } from '../types';
import { hashPassword as pbkdf2Hash } from '../lib/password';
import { Building2, Search, Plus, Trash2, Edit2, X, KeyRound, Users, Eye, EyeOff } from 'lucide-react';

interface DataPusatCabangSectionProps {
  cabangList: Cabang[];
  onAddCabang: (c: Cabang) => void;
  onEditCabang: (id: string, c: Cabang) => void;
  onDeleteCabang: (id: string) => void;
}

export default function DataPusatCabangSection({
  cabangList, onAddCabang, onEditCabang, onDeleteCabang,
}: DataPusatCabangSectionProps) {
  const [showCabangModal, setShowCabangModal] = useState(false);
  const [editingCabang, setEditingCabang] = useState<Cabang | null>(null);
  const [cabangNama, setCabangNama] = useState('');
  const [cabangAlamat, setCabangAlamat] = useState('');
  const [cabangUsername, setCabangUsername] = useState('');
  const [cabangPassword, setCabangPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [cabangSearch, setCabangSearch] = useState('');

  const hashPassword = async (password: string): Promise<string> => {
    return pbkdf2Hash(password);
  };

  const openAddCabang = () => {
    setEditingCabang(null);
    setCabangNama(''); setCabangAlamat(''); setCabangUsername(''); setCabangPassword('');
    setShowCabangModal(true);
  };

  const openEditCabang = (c: Cabang) => {
    setEditingCabang(c);
    setCabangNama(c.nama); setCabangAlamat(c.alamat); setCabangUsername(c.username);
    setCabangPassword('');
    setShowCabangModal(true);
  };

  const handleSaveCabang = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cabangNama.trim() || !cabangUsername.trim()) return;
    if (!editingCabang && !cabangPassword.trim()) return;

    let hashedPassword: string;
    if (cabangPassword.trim()) {
      hashedPassword = await hashPassword(cabangPassword.trim());
    } else if (editingCabang) {
      hashedPassword = editingCabang.password;
    } else {
      return;
    }

    const cabang: Cabang = {
      id: editingCabang?.id || `cab-${Date.now()}`,
      nama: cabangNama.trim(),
      alamat: cabangAlamat.trim(),
      username: cabangUsername.trim().toLowerCase(),
      password: hashedPassword,
      isActive: editingCabang?.isActive ?? true,
      createdAt: editingCabang?.createdAt || new Date().toISOString(),
    };

    if (editingCabang) {
      onEditCabang(editingCabang.id, cabang);
    } else {
      onAddCabang(cabang);
    }
    setShowCabangModal(false);
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input type="text" placeholder="Cari cabang..." value={cabangSearch}
              onChange={e => setCabangSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500" />
          </div>
          <button onClick={openAddCabang}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> Daftar Cabang Baru
          </button>
        </div>

        {cabangList.filter(c => c.nama.toLowerCase().includes(cabangSearch.toLowerCase())).length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8">Belum ada cabang terdaftar.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b bg-gray-50 text-[10px] font-bold text-gray-500 uppercase">
                  <th className="px-4 py-3">Cabang</th>
                  <th className="px-4 py-3">Alamat</th>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Password</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cabangList.filter(c => c.nama.toLowerCase().includes(cabangSearch.toLowerCase())).map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">{c.nama}</td>
                    <td className="px-4 py-3 text-gray-500">{c.alamat || '—'}</td>
                    <td className="px-4 py-3 font-mono text-gray-700">{c.username}</td>
                    <td className="px-4 py-3 font-mono text-gray-400">{'•'.repeat(c.password.length)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {c.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEditCabang(c)}
                          className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-gray-100 cursor-pointer"
                          title="Edit Cabang">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { showConfirm({ title: "Hapus Cabang", message: `Hapus cabang "${c.nama}"?`, confirmLabel: "Hapus", cancelLabel: "Batal", variant: "danger", onConfirm: () => onDeleteCabang(c.id), }); }}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100 cursor-pointer"
                          title="Hapus Cabang">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 bg-blue-50/50 border-t border-blue-100">
          <p className="text-[11px] text-blue-800 font-medium flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5" />
            Setiap cabang memiliki login sendiri: staff cabang bisa login dengan <strong>Username</strong> dan <strong>Password</strong> di atas untuk mengakses modul POS, Minta Barang, SO, dan Waste cabang mereka.
          </p>
        </div>
      </div>

      {/* ─── MODAL CABANG ─── */}
      {showCabangModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-900">
                {editingCabang ? 'Edit Cabang' : '🏪 Daftar Cabang Baru'}
              </h3>
              <button onClick={() => setShowCabangModal(false)} className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveCabang} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Nama Cabang</label>
                <input type="text" required placeholder="Contoh: Cabang A — Jl. Merdeka"
                  value={cabangNama} onChange={e => setCabangNama(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Alamat</label>
                <textarea placeholder="Alamat lengkap cabang" rows={2}
                  value={cabangAlamat} onChange={e => setCabangAlamat(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Username Login</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-gray-400">
                      <Users className="w-3.5 h-3.5" />
                    </span>
                    <input type="text" required placeholder="username"
                      value={cabangUsername} onChange={e => setCabangUsername(e.target.value)}
                      className="w-full pl-8 text-xs border border-gray-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-gray-400">
                      <KeyRound className="w-3.5 h-3.5" />
                    </span>
                    <input type={showPass ? 'text' : 'password'} required placeholder="password"
                      value={cabangPassword} onChange={e => setCabangPassword(e.target.value)}
                      className="w-full pl-8 pr-8 text-xs border border-gray-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono" />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer">
                      {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowCabangModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-xl cursor-pointer">Batal</button>
                <button type="submit"
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer">
                  {editingCabang ? 'Simpan' : 'Daftarkan Cabang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
