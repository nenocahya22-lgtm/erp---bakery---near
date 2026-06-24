import React from 'react';
import { Store, Upload, Image } from 'lucide-react';
import { WebStoreConfig } from '../types';
import { cardClass, inputClass, labelClass } from '../lib/webstore-constants';


interface Props {
  config: WebStoreConfig;
  updateConfig: (updates: Partial<WebStoreConfig>) => void;
  logoInputRef: React.RefObject<HTMLInputElement | null>;
  handleUploadLogo: () => void;
}

export default function WebStoreIdentitySection({config, updateConfig, logoInputRef, handleUploadLogo}: Props) {
  return (
    
            <div className={cardClass}>
              <h3 className="text-sm font-black text-gray-800">🏪 Identitas Toko & Navbar</h3>
              <p className="text-[10px] text-gray-500">Semua field ini mengatur teks yang muncul di Navbar Web Store.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Nama Brand (Navbar)</label>
                  <input className={inputClass} value={config.navbarBrandText} onChange={e => updateConfig({ navbarBrandText: e.target.value })} placeholder="NEAR BAKERY & CO." />
                </div>
                <div>
                  <label className={labelClass}>Nama Toko</label>
                  <input className={inputClass} value={config.storeName} onChange={e => updateConfig({ storeName: e.target.value })} placeholder="Near Bakery & Co." />
                </div>
                <div>
                  <label className={labelClass}>Slogan (Hero Gold Text)</label>
                  <input className={inputClass} value={config.slogan} onChange={e => updateConfig({ slogan: e.target.value })} placeholder="Artisan Bakery Premium" />
                </div>
                <div>
                  <label className={labelClass}>Logo</label>
                  <div className="flex items-center gap-3">
                    {config.logo ? (
                      <img src={config.logo} alt="Logo" className="w-16 h-16 object-contain rounded-xl border border-gray-200" />
                    ) : (
                      <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center text-gray-400"><Image className="w-6 h-6" /></div>
                    )}
                    <button onClick={() => logoInputRef.current?.click()} className="px-3 py-2 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">Upload Logo</button>
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadLogo} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Search Placeholder</label>
                  <input className={inputClass} value={config.searchPlaceholder} onChange={e => updateConfig({ searchPlaceholder: e.target.value })} placeholder="Cari menu artisan..." />
                </div>
                <div>
                  <label className={labelClass}>Teks "Temukan Toko"</label>
                  <input className={inputClass} value={config.storeLocatorText} onChange={e => updateConfig({ storeLocatorText: e.target.value })} placeholder="Temukan Toko" />
                </div>
              </div>
              <div className="border-t border-gray-100 pt-4 mt-4">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Kontak (tampil di Footer)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>WhatsApp</label>
                    <input className={inputClass} value={config.contactWhatsApp} onChange={e => updateConfig({ contactWhatsApp: e.target.value })} placeholder="6281234567890" />
                  </div>
                  <div>
                    <label className={labelClass}>Email</label>
                    <input className={inputClass} value={config.contactEmail} onChange={e => updateConfig({ contactEmail: e.target.value })} placeholder="hello@nearbakery.com" />
                  </div>
                  <div>
                    <label className={labelClass}>Instagram</label>
                    <input className={inputClass} value={config.contactInstagram} onChange={e => updateConfig({ contactInstagram: e.target.value })} placeholder="@nearbakery" />
                  </div>
                  <div>
                    <label className={labelClass}>Alamat</label>
                    <input className={inputClass} value={config.alamat} onChange={e => updateConfig({ alamat: e.target.value })} placeholder="Jl. Contoh No. 123, Kota" />
                  </div>
                </div>
              </div>
            </div>
  );
}
