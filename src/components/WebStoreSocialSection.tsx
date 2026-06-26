import React from 'react';
import { Plus, Trash2, Globe, Instagram, Youtube, Music2, MessageCircle, Share2, Facebook } from 'lucide-react';
import { WebStoreConfig } from '../types';
import { cardClass, inputClass, labelClass } from '../lib/webstore-constants';


interface Props {
  config: WebStoreConfig;
  updateConfig: (updates: Partial<WebStoreConfig>) => void;
}

export default function WebStoreSocialSection({config, updateConfig}: Props) {
  return (
    
            <div className={cardClass}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-gray-800">📱 Media Sosial</h3>
                <button onClick={() => {
                  const newSocial = [...(config.socialMedia || [])];
                  newSocial.push({ platform: 'instagram', url: '', active: true });
                  updateConfig({ socialMedia: newSocial });
                }} className="px-3 py-2 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all cursor-pointer flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Tambah
                </button>
              </div>
              <p className="text-[10px] text-gray-500">
                Tautan media sosial yang tampil di footer dan landing page Web Store.
              </p>
    
              {(!config.socialMedia || config.socialMedia.length === 0) ? (
                <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl">
                  <Share2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">Belum ada media sosial. Klik "Tambah" untuk menambahkan tautan Instagram, Facebook, YouTube, dll.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(config.socialMedia || []).map((sm, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                        {sm.platform === 'instagram' ? <Instagram className="w-4 h-4 text-pink-600" /> :
                         sm.platform === 'facebook' ? <Facebook className="w-4 h-4 text-blue-600" /> :
                         sm.platform === 'youtube' ? <Youtube className="w-4 h-4 text-red-600" /> :
                         sm.platform === 'tiktok' ? <span className="text-sm">🎵</span> :
                         sm.platform === 'twitter' ? <span className="text-sm">🐦</span> :
                         <Share2 className="w-4 h-4 text-gray-600" />}
                      </div>
                      <select
                        className={`${inputClass} w-32`}
                        value={sm.platform}
                        onChange={e => {
                          const newSocial = [...(config.socialMedia || [])];
                          newSocial[idx] = { ...newSocial[idx], platform: e.target.value };
                          updateConfig({ socialMedia: newSocial });
                        }}
                      >
                        <option value="instagram">📸 Instagram</option>
                        <option value="facebook">👍 Facebook</option>
                        <option value="youtube">▶️ YouTube</option>
                        <option value="tiktok">🎵 TikTok</option>
                        <option value="twitter">🐦 Twitter / X</option>
                        <option value="whatsapp">💬 WhatsApp</option>
                        <option value="telegram">✈️ Telegram</option>
                        <option value="linkedin">💼 LinkedIn</option>
                        <option value="other">🔗 Lainnya</option>
                      </select>
                      <input
                        className={`${inputClass} flex-1`}
                        value={sm.url}
                        onChange={e => {
                          const newSocial = [...(config.socialMedia || [])];
                          newSocial[idx] = { ...newSocial[idx], url: e.target.value };
                          updateConfig({ socialMedia: newSocial });
                        }}
                        placeholder="https://instagram.com/nearbakery"
                      />
                      <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                        <input type="checkbox" checked={sm.active !== false}
                          onChange={e => {
                            const newSocial = [...(config.socialMedia || [])];
                            newSocial[idx] = { ...newSocial[idx], active: e.target.checked };
                            updateConfig({ socialMedia: newSocial });
                          }}
                          className="w-3.5 h-3.5 rounded accent-emerald-600" />
                        <span className="text-[9px] text-gray-500">Aktif</span>
                      </label>
                      <button
                        onClick={() => {
                          const newSocial = (config.socialMedia || []).filter((_, i) => i !== idx);
                          updateConfig({ socialMedia: newSocial });
                        }}
                        className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
  );
}
