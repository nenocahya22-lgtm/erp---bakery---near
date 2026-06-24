import React from 'react';
import { Building2, Globe } from 'lucide-react';
import { WebStoreConfig } from '../types';
import { cardClass, inputClass, labelClass } from '../lib/webstore-constants';


interface Props {
  config: WebStoreConfig;
  updateConfig: (updates: Partial<WebStoreConfig>) => void;
  cabangList: any[];
  handleRegisterSubdomain: () => void;
}

export default function WebStoreBranchSection({config, updateConfig, cabangList, handleRegisterSubdomain}: Props) {
  return (
    
            <div className={cardClass}>
              <h3 className="text-sm font-black text-gray-800">🏛️ Konfigurasi Cabang & Subdomain</h3>
              <p className="text-[10px] text-gray-500">
                Setiap cabang bisa memiliki web store sendiri dengan subdomain berbeda. Atur di sini.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>ID Cabang</label>
                  <select className={inputClass} value={config.cabangId || 'pusat'} onChange={e => updateConfig({ cabangId: e.target.value })}>
                    <option value="pusat">Pusat</option>
                    {(cabangList || []).map(c => (
                      <option key={c.id} value={c.id}>{c.nama} ({c.id})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Subdomain</label>
                  <div className="flex items-center gap-2">
                    <input className={inputClass} value={config.branchSubdomain} onChange={e => updateConfig({ branchSubdomain: e.target.value })} placeholder="cabang-a" />
                    <span className="text-[9px] text-gray-400">.nearbakery.com</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleRegisterSubdomain} className="px-4 py-2 text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all cursor-pointer">
                  Daftarkan Subdomain
                </button>
                <button onClick={async () => {
                  const subs = await getAllSubdomains();
                  if (subs.length === 0) {
                    showToast('Belum ada subdomain terdaftar.', 'info');
                  } else {
                    showToast(`Subdomain: ${subs.map(s => `${s.subdomain} → ${s.cabangNama}`).join(', ')}`, 'info');
                  }
                }} className="px-4 py-2 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer">
                  Lihat Semua Subdomain
                </button>
              </div>
              {cabangList && cabangList.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-[10px] font-bold text-gray-600 mb-2">Daftar Cabang Tersedia:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {cabangList.filter(c => c.isActive).map(c => (
                      <div key={c.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <p className="text-[11px] font-bold text-gray-700">{c.nama}</p>
                          <p className="text-[9px] text-gray-400">{c.alamat}</p>
                        </div>
                        <button onClick={() => {
                          updateConfig({ cabangId: c.id, branchSubdomain: c.id.toLowerCase().replace(/[^a-z0-9]/g, '-'), storeName: `Near Bakery - ${c.nama}` });
                          showToast(`Beralih ke cabang: ${c.nama}`, 'success');
                        }} className="ml-auto px-2 py-1 text-[9px] font-bold bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 cursor-pointer">
                          Pilih
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
  );
}
