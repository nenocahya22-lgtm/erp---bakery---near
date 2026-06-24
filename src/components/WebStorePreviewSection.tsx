import React from 'react';
import { X, Smartphone, Monitor } from 'lucide-react';
import { WebStoreConfig } from '../types';
import { cardClass, inputClass, labelClass } from '../lib/webstore-constants';


interface Props {
  showPreview: boolean;
  setShowPreview: (v: any) => void;
  config: WebStoreConfig;
  products: any[];
  cabangList: any[];
}

export default function WebStorePreviewSection({showPreview, setShowPreview, config, products, cabangList}: Props) {
  return (
    
            <div className={cardClass}>
              <h3 className="text-sm font-black text-gray-800">👁️ Preview Web Store</h3>
              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-lg">
                <div className="max-w-sm mx-auto bg-white min-h-[600px]">
                  {/* Header */}
                  <div className="p-4 flex items-center gap-3 border-b border-gray-100" style={{ background: config.colorBrandGreen || '#006241' }}>
                    {config.logo ? (
                      <img src={config.logo} alt="" className="w-10 h-10 object-contain rounded-lg bg-white p-1" />
                    ) : (
                      <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-white font-bold">{(config.navbarBrandText || 'N').charAt(0)}</div>
                    )}
                    <div className="text-white">
                      <h3 className="text-sm font-bold">{config.navbarBrandText || 'NEAR BAKERY & CO.'}</h3>
                      <p className="text-[9px] opacity-80">{config.slogan || 'Artisan Bakery Premium'}</p>
                    </div>
                  </div>
                  {/* Hero */}
                  <div className="relative h-52 flex items-center justify-center text-center overflow-hidden" style={{ background: config.heroBgColor || '#1E3932' }}>
                    <div className="relative z-10 p-4 space-y-1">
                      <span className="text-[#cba258] text-[9px] tracking-widest uppercase font-semibold">{config.heroTagline || 'Artisan Bakery Premium'}</span>
                      <h2 className="text-lg font-black text-white">{config.heroTitle || 'Roti & Pastry Hangat'}</h2>
                      <p className="text-[10px] text-white/70 max-w-xs mx-auto">{config.heroDescription || 'Nikmati keaslian cita rasa...'}</p>
                      <button className="mt-2 px-5 py-1.5 text-[10px] font-bold rounded-full text-white shadow-sm" style={{ background: config.colorGold || '#cba258' }}>
                        {config.heroBtnText || 'Daftar & Pesan Sekarang'}
                      </button>
                    </div>
                    {/* Badge Premium Circles */}
                    <div className="absolute bottom-2 right-2 flex gap-1">
                      {[config.heroBadgeText1 || '100% ALAMI', config.heroBadgeText2 || 'Ragi Alami', config.heroBadgeText3 || 'TANPA PENGAWET'].map((text, i) => (
                        <div key={i}
                          className={`rounded-full flex items-center justify-center text-center leading-tight font-bold shadow-sm ${
                            (config.badgeCircleSize || 'md') === 'sm' ? 'w-10 h-10 text-[6px]' :
                            (config.badgeCircleSize || 'md') === 'lg' ? 'w-16 h-16 text-[8px]' :
                            'w-12 h-12 text-[7px]'
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
                  {/* Category Circles Preview */}
                  <div className="px-4 pt-3 pb-2 overflow-x-auto">
                    <div className={`flex items-center ${
                      (config.categoryCircleGap || 'normal') === 'tight' ? 'gap-2' :
                      (config.categoryCircleGap || 'normal') === 'loose' ? 'gap-5' :
                      'gap-3'
                    }`}>
                      {(config.categories || []).slice(0, 5).map((cat, idx) => (
                        <div key={idx} className="flex flex-col items-center gap-0.5">
                          <div
                            className={`rounded-full flex items-center justify-center text-base font-bold shadow-sm border ${
                              (config.categoryCircleSize || 'md') === 'sm' ? 'w-9 h-9 text-sm' :
                              (config.categoryCircleSize || 'md') === 'lg' ? 'w-14 h-14 text-xl' :
                              'w-11 h-11 text-lg'
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
                          <span className="text-[7px] font-bold text-gray-500 text-center max-w-[50px] truncate">{cat.split(' ')[0]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Products */}
                  <div className="p-4">
                    <h3 className="text-xs font-bold text-gray-800 mb-3">{config.productGridTitle || 'Pilihan Hari Ini'}</h3>
                    {config.madeToOrder && config.preOrderLabel && (
                      <p className="text-[8px] text-amber-700 font-bold mb-2 -mt-2">{config.preOrderLabel}</p>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      {config.products.filter(p => p.active).slice(0, 4).map(p => (
                        <div key={p.productName} className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                          <div className="relative w-full h-20 rounded-lg bg-white border border-slate-100 flex items-center justify-center overflow-hidden">
                            {p.displayImage ? <img src={p.displayImage} alt={p.productName} className="w-full h-full object-cover" /> : <ShoppingBag className="w-6 h-6 text-slate-300" />}
                            {config.madeToOrder && (
                              <span className="absolute top-1 left-1 text-[6px] font-black uppercase bg-amber-600 text-white px-1 py-0.5 rounded-sm leading-tight">{config.preOrderBadge || 'MADE-TO-ORDER'}</span>
                            )}
                          </div>
                          <p className="text-[10px] font-bold text-gray-800 mt-1.5 truncate">{p.productName}</p>
                          {(() => {
                            const cp = (calculatedProducts || []).find(c => c.namaProduk === p.productName);
                            return cp ? <p className="text-[9px] text-emerald-700 font-bold">{formatCurrency(cp.hargaJualPerPorsi)}</p> : null;
                          })()}
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Payment methods preview */}
                  <div className="px-4 pb-4">
                    <h3 className="text-[10px] font-bold text-gray-600 mb-2">💳 Metode Pembayaran</h3>
                    <div className="space-y-1.5">
                      {(config.paymentMethods || []).filter(p => p.active).slice(0, 3).map(pm => (
                        <div key={pm.id} className="flex items-center gap-2 text-[10px] text-gray-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          {pm.type === 'transfer_bank' ? '🏦' : pm.type === 'ewallet' ? '📱' : '💰'}
                          <span>{pm.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Footer */}
                  <div className="p-4 text-center text-[9px] text-gray-400 border-t border-gray-100" style={{ background: (config.colorBrandGreen || '#006241') + '08' }}>
                    <a href={`https://wa.me/${config.contactWhatsApp}`} className="text-emerald-600 font-bold block mb-1">WhatsApp: {config.contactWhatsApp}</a>
                    <p>{config.contactEmail} | {config.contactInstagram}</p>
                    <p className="mt-2">{config.footerCopyright || '© 2026 Near Bakery & Co. — Artisan Bakery Premium'}</p>
                  </div>
                </div>
              </div>
            </div>
  );
}
