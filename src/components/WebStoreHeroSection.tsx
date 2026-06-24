import React from 'react';
import { Image } from 'lucide-react';
import { WebStoreConfig } from '../types';
import { cardClass, inputClass, labelClass } from '../lib/webstore-constants';


interface Props {
  config: WebStoreConfig;
  updateConfig: (updates: Partial<WebStoreConfig>) => void;
}

export default function WebStoreHeroSection({config, updateConfig}: Props) {
  return (
    
            <div className={cardClass}>
              <h3 className="text-sm font-black text-gray-800">🖼️ Hero Banner</h3>
              <p className="text-[10px] text-gray-500">Sesuaikan banner utama Web Store — teks gold, judul, deskripsi, badge, dan tombol.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Teks Gold (Tagline)</label>
                  <input className={inputClass} value={config.heroTagline} onChange={e => updateConfig({ heroTagline: e.target.value })} placeholder="Artisan Bakery Premium" />
                </div>
                <div>
                  <label className={labelClass}>Judul Utama</label>
                  <input className={inputClass} value={config.heroTitle} onChange={e => updateConfig({ heroTitle: e.target.value })} placeholder="Roti & Pastry Hangat..." />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Deskripsi</label>
                  <textarea className={`${inputClass} h-16 resize-none`} value={config.heroDescription} onChange={e => updateConfig({ heroDescription: e.target.value })} placeholder="Nikmati keaslian cita rasa Sourdough alami..." />
                </div>
                <div>
                  <label className={labelClass}>Teks Tombol CTA</label>
                  <input className={inputClass} value={config.heroBtnText} onChange={e => updateConfig({ heroBtnText: e.target.value })} placeholder="Daftar & Pesan Sekarang" />
                </div>
                <div>
                  <label className={labelClass}>Background Color</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={config.heroBgColor} onChange={e => updateConfig({ heroBgColor: e.target.value })} className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer" />
                    <input className={inputClass} value={config.heroBgColor} onChange={e => updateConfig({ heroBgColor: e.target.value })} placeholder="#1E3932" />
                  </div>
                </div>
              </div>
              
              {/* Badge Premium */}
              <div className="border-t border-gray-100 pt-4 mt-4">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Badge Premium (lingkaran di hero)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>Baris 1</label>
                    <input className={inputClass} value={config.heroBadgeText1} onChange={e => updateConfig({ heroBadgeText1: e.target.value })} placeholder="100% ALAMI" />
                  </div>
                  <div>
                    <label className={labelClass}>Baris 2</label>
                    <input className={inputClass} value={config.heroBadgeText2} onChange={e => updateConfig({ heroBadgeText2: e.target.value })} placeholder="Ragi Alami" />
                  </div>
                  <div>
                    <label className={labelClass}>Baris 3</label>
                    <input className={inputClass} value={config.heroBadgeText3} onChange={e => updateConfig({ heroBadgeText3: e.target.value })} placeholder="TANPA PENGAWET" />
                  </div>
                </div>
              </div>
    
              {/* Mini Preview */}
              <div className="mt-4 p-6 rounded-2xl text-white relative overflow-hidden" style={{background: config.heroBgColor || '#1E3932'}}>
                <div className="relative z-10 space-y-2">
                  <span className="text-[#cba258] font-semibold text-xs tracking-widest uppercase">{config.heroTagline || 'Artisan Bakery Premium'}</span>
                  <h4 className="text-2xl font-black">{config.heroTitle || 'Roti & Pastry Hangat'}</h4>
                  <p className="text-sm text-white/70 max-w-md">{config.heroDescription || 'Nikmati keaslian cita rasa...'}</p>
                  <button className="mt-1 px-5 py-2 bg-white hover:bg-gray-100 text-emerald-800 text-xs font-bold rounded-full transition-all">
                    {config.heroBtnText || 'Daftar & Pesan Sekarang'}
                  </button>
                </div>
                {/* Badge lingkaran di pojok */}
                <div className="absolute bottom-4 right-4 flex gap-2 z-10">
                  {[config.heroBadgeText1 || '100% ALAMI', config.heroBadgeText2 || 'Ragi Alami', config.heroBadgeText3 || 'TANPA PENGAWET'].map((text, i) => (
                    <div key={i}
                      className={`rounded-full flex items-center justify-center text-center leading-tight font-bold shadow-lg ${
                        (config.badgeCircleSize || 'md') === 'sm' ? 'w-12 h-12 text-[7px]' :
                        (config.badgeCircleSize || 'md') === 'lg' ? 'w-20 h-20 text-[9px]' :
                        'w-16 h-16 text-[8px]'
                      }`}
                      style={{
                        backgroundColor: config.badgeCircleBgColor || '#1E3932',
                        color: config.badgeCircleTextColor || '#cba258',
                        border: `${config.badgeCircleBorderWidth ?? 2}px solid ${config.badgeCircleBorderColor || '#cba258'}`,
                      }}
                    >
                      {text.split(' ').map((word, wi) => (
                        <span key={wi} className="block leading-tight">{word}</span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
  );
}
