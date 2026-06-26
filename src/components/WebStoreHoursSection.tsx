import React from 'react';
import { Clock, Plus, Trash2 } from 'lucide-react';
import { WebStoreConfig } from '../types';
import { cardClass, inputClass, labelClass } from '../lib/webstore-constants';


interface Props {
  config: WebStoreConfig;
  updateConfig: (updates: Partial<WebStoreConfig>) => void;
  showToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function WebStoreHoursSection({config, updateConfig, showToast}: Props) {
  return (
    
            <div className={cardClass}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-gray-800">🕐 Jam Operasional</h3>
                <button onClick={() => {
                  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu', 'Minggu'];
                  const existing = (config.operatingHours || []).map(h => h.day);
                  const missingDay = days.find(d => !existing.includes(d));
                  if (missingDay) {
                    const newHours = [...(config.operatingHours || [])];
                    newHours.push({ day: missingDay, open: '08:00', close: '21:00', isOpen: true });
                    updateConfig({ operatingHours: newHours });
                  } else {
                    showToast('Semua hari sudah terdaftar!', 'info');
                  }
                }} className="px-3 py-2 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all cursor-pointer flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Tambah Hari
                </button>
              </div>
              <p className="text-[10px] text-gray-500">
                Atur jam buka & tutup toko yang tampil di landing page Web Store.
              </p>
    
              {(!config.operatingHours || config.operatingHours.length === 0) ? (
                <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl">
                  <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">Belum ada jam operasional. Klik "Tambah Hari" untuk mengatur jam buka setiap hari.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(config.operatingHours || []).sort((a, b) => {
                    const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu', 'Minggu'];
                    return days.indexOf(a.day) - days.indexOf(b.day);
                  }).map((oh, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${oh.isOpen ? 'bg-emerald-500' : 'bg-red-400'}`} />
                      <span className="text-xs font-bold text-gray-700 w-20 shrink-0">{oh.day}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          className={`${inputClass} w-28`}
                          value={oh.open}
                          onChange={e => {
                            const newHours = [...(config.operatingHours || [])];
                            newHours[idx] = { ...newHours[idx], open: e.target.value };
                            updateConfig({ operatingHours: newHours });
                          }}
                        />
                        <span className="text-xs text-gray-400">—</span>
                        <input
                          type="time"
                          className={`${inputClass} w-28`}
                          value={oh.close}
                          onChange={e => {
                            const newHours = [...(config.operatingHours || [])];
                            newHours[idx] = { ...newHours[idx], close: e.target.value };
                            updateConfig({ operatingHours: newHours });
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-2 ml-auto">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={oh.isOpen}
                            onChange={e => {
                              const newHours = [...(config.operatingHours || [])];
                              newHours[idx] = { ...newHours[idx], isOpen: e.target.checked };
                              updateConfig({ operatingHours: newHours });
                            }}
                            className="w-3.5 h-3.5 rounded accent-emerald-600" />
                          <span className="text-[9px] text-gray-500">{oh.isOpen ? 'Buka' : 'Tutup'}</span>
                        </label>
                        <button
                          onClick={() => {
                            const newHours = (config.operatingHours || []).filter((_, i) => i !== idx);
                            updateConfig({ operatingHours: newHours });
                          }}
                          className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
    
              {/* Quick-add buttons */}
              <div className="border-t border-gray-100 pt-3 mt-3">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">🔄 Set Default Jam</h4>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => {
                    const defaultHours = [
                      { day: 'Senin', open: '08:00', close: '21:00', isOpen: true },
                      { day: 'Selasa', open: '08:00', close: '21:00', isOpen: true },
                      { day: 'Rabu', open: '08:00', close: '21:00', isOpen: true },
                      { day: 'Kamis', open: '08:00', close: '21:00', isOpen: true },
                      { day: "Jum'at", open: '08:00', close: '21:00', isOpen: true },
                      { day: 'Sabtu', open: '09:00', close: '22:00', isOpen: true },
                      { day: 'Minggu', open: '09:00', close: '22:00', isOpen: true },
                    ];
                    updateConfig({ operatingHours: defaultHours });
                  }} className="px-3 py-1.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer">
                    🏪 Setiap Hari (08:00-21:00)
                  </button>
                  <button onClick={() => {
                    const defaultHours = [
                      { day: 'Senin', open: '07:00', close: '22:00', isOpen: true },
                      { day: 'Selasa', open: '07:00', close: '22:00', isOpen: true },
                      { day: 'Rabu', open: '07:00', close: '22:00', isOpen: true },
                      { day: 'Kamis', open: '07:00', close: '22:00', isOpen: true },
                      { day: "Jum'at", open: '07:00', close: '22:00', isOpen: true },
                      { day: 'Sabtu', open: '08:00', close: '23:00', isOpen: true },
                      { day: 'Minggu', open: '08:00', close: '22:00', isOpen: true },
                    ];
                    updateConfig({ operatingHours: defaultHours });
                  }} className="px-3 py-1.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer">
                    ☕ Jam Panjang (07:00-22:00)
                  </button>
                  <button onClick={() => {
                    const defaultHours = [
                      { day: 'Senin', open: '10:00', close: '18:00', isOpen: true },
                      { day: 'Selasa', open: '10:00', close: '18:00', isOpen: true },
                      { day: 'Rabu', open: '10:00', close: '18:00', isOpen: true },
                      { day: 'Kamis', open: '10:00', close: '18:00', isOpen: true },
                      { day: "Jum'at", open: '10:00', close: '18:00', isOpen: true },
                      { day: 'Sabtu', open: '10:00', close: '20:00', isOpen: true },
                      { day: 'Minggu', open: '10:00', close: '18:00', isOpen: false },
                    ];
                    updateConfig({ operatingHours: defaultHours });
                  }} className="px-3 py-1.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer">
                    🔒 Standar (10:00-18:00, Minggu Tutup)
                  </button>
                </div>
              </div>
            </div>
  );
}
