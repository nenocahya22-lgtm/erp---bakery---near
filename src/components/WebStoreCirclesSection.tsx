import React from 'react';
import { Palette } from 'lucide-react';
import { WebStoreConfig } from '../types';
import { cardClass, inputClass, labelClass } from '../lib/webstore-constants';


interface Props {
  config: WebStoreConfig;
  updateConfig: (updates: Partial<WebStoreConfig>) => void;
}

export default function WebStoreCirclesSection({config, updateConfig}: Props) {
  return (
    
            <div className={cardClass}>
              <h3 className="text-sm font-black text-gray-800 flex items-center gap-2">
                <Palette className="w-5 h-5 text-purple-600" />
                🔄 Badge & Circle Styling
              </h3>
              <p className="text-[10px] text-gray-500">
                Atur tampilan <strong>badge premium lingkaran</strong> di hero dan <strong>icon kategori</strong> Web Store.
                Semua perubahan langsung terlihat di preview.
              </p>
    
              {/* ─── BADGE PREMIUM ─── */}
              <div className="bg-gradient-to-br from-amber-50 to-white rounded-2xl border border-amber-200 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-sm">🏅</span>
                  <div>
                    <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">Badge Premium (Lingkaran Hero)</h4>
                    <p className="text-[9px] text-amber-700">3 lingkaran di hero: "100% ALAMI", "Ragi Alami", "TANPA PENGAWET"</p>
                  </div>
                </div>
    
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className={labelClass}>Warna Latar Badge</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={config.badgeCircleBgColor || '#1E3932'}
                        onChange={e => updateConfig({ badgeCircleBgColor: e.target.value })}
                        className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer shrink-0" />
                      <input className={`${inputClass} flex-1 font-mono text-[10px]`}
                        value={config.badgeCircleBgColor || '#1E3932'}
                        onChange={e => updateConfig({ badgeCircleBgColor: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Warna Teks Badge</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={config.badgeCircleTextColor || '#cba258'}
                        onChange={e => updateConfig({ badgeCircleTextColor: e.target.value })}
                        className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer shrink-0" />
                      <input className={`${inputClass} flex-1 font-mono text-[10px]`}
                        value={config.badgeCircleTextColor || '#cba258'}
                        onChange={e => updateConfig({ badgeCircleTextColor: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Warna Border Badge</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={config.badgeCircleBorderColor || '#cba258'}
                        onChange={e => updateConfig({ badgeCircleBorderColor: e.target.value })}
                        className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer shrink-0" />
                      <input className={`${inputClass} flex-1 font-mono text-[10px]`}
                        value={config.badgeCircleBorderColor || '#cba258'}
                        onChange={e => updateConfig({ badgeCircleBorderColor: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Ketebalan Border</label>
                    <div className="flex items-center gap-1.5">
                      {[0, 1, 2, 3, 4, 5].map(n => (
                        <button key={n}
                          onClick={() => updateConfig({ badgeCircleBorderWidth: n })}
                          className={`w-8 h-8 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            (config.badgeCircleBorderWidth ?? 2) === n
                              ? 'bg-amber-600 text-white shadow-md'
                              : 'bg-white border border-gray-200 text-gray-500 hover:bg-amber-50'
                          }`}
                        >
                          {n}px
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
    
                <div>
                  <label className={labelClass}>Ukuran Badge</label>
                  <div className="flex items-center gap-2">
                    {[
                      { value: 'sm', label: 'Kecil', desc: '60px' },
                      { value: 'md', label: 'Sedang', desc: '80px' },
                      { value: 'lg', label: 'Besar', desc: '100px' },
                    ].map(s => (
                      <button key={s.value}
                        onClick={() => updateConfig({ badgeCircleSize: s.value as any })}
                        className={`flex-1 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          (config.badgeCircleSize || 'md') === s.value
                            ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-amber-50'
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-lg mb-1">{s.value === 'sm' ? '●' : s.value === 'md' ? '⬤' : '🟤'}</div>
                          <div>{s.label}</div>
                          <div className="text-[9px] opacity-70">{s.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
    
                {/* ─── PREVIEW BADGE ─── */}
                <div className="mt-3 p-4 rounded-xl bg-slate-900 flex items-center justify-center gap-4">
                  {[config.heroBadgeText1 || '100% ALAMI', config.heroBadgeText2 || 'Ragi Alami', config.heroBadgeText3 || 'TANPA PENGAWET'].map((text, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div
                        className={`rounded-full flex items-center justify-center text-center leading-tight font-bold shadow-lg ${
                          (config.badgeCircleSize || 'md') === 'sm' ? 'w-14 h-14 text-[8px]' :
                          (config.badgeCircleSize || 'md') === 'lg' ? 'w-24 h-24 text-[10px]' :
                          'w-20 h-20 text-[9px]'
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
                      <span className="text-[8px] text-gray-400">#{i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
    
              {/* ─── KATEGORI CIRCLE ─── */}
              <div className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl border border-emerald-200 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center text-sm">🎯</span>
                  <div>
                    <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">Kategori Circle (Icon Bulat)</h4>
                    <p className="text-[9px] text-emerald-700">Icon kategori berbentuk lingkaran — muncul di slider Web Store</p>
                  </div>
                </div>
    
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>Warna Latar Circle</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={config.categoryCircleBgColor || '#f0ebe3'}
                        onChange={e => updateConfig({ categoryCircleBgColor: e.target.value })}
                        className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer shrink-0" />
                      <input className={`${inputClass} flex-1 font-mono text-[10px]`}
                        value={config.categoryCircleBgColor || '#f0ebe3'}
                        onChange={e => updateConfig({ categoryCircleBgColor: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Warna Icon / Emoji</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={config.categoryCircleTextColor || '#006241'}
                        onChange={e => updateConfig({ categoryCircleTextColor: e.target.value })}
                        className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer shrink-0" />
                      <input className={`${inputClass} flex-1 font-mono text-[10px]`}
                        value={config.categoryCircleTextColor || '#006241'}
                        onChange={e => updateConfig({ categoryCircleTextColor: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Warna Border Circle</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={config.categoryCircleBorderColor || '#d4c9b8'}
                        onChange={e => updateConfig({ categoryCircleBorderColor: e.target.value })}
                        className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer shrink-0" />
                      <input className={`${inputClass} flex-1 font-mono text-[10px]`}
                        value={config.categoryCircleBorderColor || '#d4c9b8'}
                        onChange={e => updateConfig({ categoryCircleBorderColor: e.target.value })} />
                    </div>
                  </div>
                </div>
    
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Ukuran Circle</label>
                    <div className="flex items-center gap-2">
                      {[
                        { value: 'sm', label: 'Kecil', icon: '●' },
                        { value: 'md', label: 'Sedang', icon: '⬤' },
                        { value: 'lg', label: 'Besar', icon: '🟤' },
                      ].map(s => (
                        <button key={s.value}
                          onClick={() => updateConfig({ categoryCircleSize: s.value as any })}
                          className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            (config.categoryCircleSize || 'md') === s.value
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                              : 'bg-white border-gray-200 text-gray-600 hover:bg-emerald-50'
                          }`}
                        >
                          {s.icon} {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Jarak Antar Circle</label>
                    <div className="flex items-center gap-2">
                      {[
                        { value: 'tight', label: 'Rapat', emoji: '◼◼◼' },
                        { value: 'normal', label: 'Normal', emoji: '◼ ◼ ◼' },
                        { value: 'loose', label: 'Renggang', emoji: '◼  ◼  ◼' },
                      ].map(g => (
                        <button key={g.value}
                          onClick={() => updateConfig({ categoryCircleGap: g.value as any })}
                          className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            (config.categoryCircleGap || 'normal') === g.value
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                              : 'bg-white border-gray-200 text-gray-600 hover:bg-emerald-50'
                          }`}
                        >
                          <span className="tracking-[0.1em]">{g.emoji}</span>
                          <span className="block text-[9px]">{g.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
    
                {/* ─── PREVIEW KATEGORI CIRCLE ─── */}
                <div className="mt-3 p-4 rounded-xl bg-[#f2f0eb] flex items-center justify-center" style={{background: config.colorCanvasWarm || '#f2f0eb'}}>
                  <div className={`flex items-center ${
                    (config.categoryCircleGap || 'normal') === 'tight' ? 'gap-2' :
                    (config.categoryCircleGap || 'normal') === 'loose' ? 'gap-6' :
                    'gap-4'
                  }`}>
                    {(config.categories || []).length === 0 ? (
                      <span className="text-[10px] text-gray-400">Belum ada kategori. Tambah di tab 📂 Kategori.</span>
                    ) : (
                      (config.categories || []).slice(0, 5).map((cat, idx) => (
                        <div key={idx} className="flex flex-col items-center gap-1.5">
                          <div
                            className={`rounded-full flex items-center justify-center text-lg font-bold shadow-sm border ${
                              (config.categoryCircleSize || 'md') === 'sm' ? 'w-12 h-12 text-base' :
                              (config.categoryCircleSize || 'md') === 'lg' ? 'w-20 h-20 text-2xl' :
                              'w-16 h-16 text-xl'
                            }`}
                            style={{
                              backgroundColor: config.categoryCircleBgColor || '#f0ebe3',
                              color: config.categoryCircleTextColor || '#006241',
                              borderColor: config.categoryCircleBorderColor || '#d4c9b8',
                            }}
                          >
                            {(config.categoryIcons || {})[cat] === 'wheat' ? '🌾' :
                             (config.categoryIcons || {})[cat] === 'croissant' ? '🥐' :
                             (config.categoryIcons || {})[cat] === 'cake' ? '🎂' :
                             (config.categoryIcons || {})[cat] === 'cookie' ? '🍪' :
                             (config.categoryIcons || {})[cat] === 'coffee' ? '☕' : '📦'}
                          </div>
                          <span className="text-[9px] font-bold text-gray-600 text-center max-w-[70px] truncate">{cat.split(' ')[0]}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
    
              {/* Tombol Reset ke Default */}
              <div className="border-t border-gray-100 pt-3 flex gap-3">
                <button
                  onClick={() => updateConfig({
                    badgeCircleBgColor: '#1E3932',
                    badgeCircleTextColor: '#cba258',
                    badgeCircleBorderColor: '#cba258',
                    badgeCircleBorderWidth: 2,
                    badgeCircleSize: 'md',
                    categoryCircleBgColor: '#f0ebe3',
                    categoryCircleTextColor: '#006241',
                    categoryCircleBorderColor: '#d4c9b8',
                    categoryCircleSize: 'md',
                    categoryCircleGap: 'normal',
                  })}
                  className="px-3 py-1.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
                >
                  Reset ke Default
                </button>
              </div>
            </div>
  );
}
