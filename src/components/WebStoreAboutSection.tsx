import React from 'react';
import { Info, Image } from 'lucide-react';
import { WebStoreConfig } from '../types';
import { cardClass, inputClass, labelClass } from '../lib/webstore-constants';


interface Props {
  config: WebStoreConfig;
  updateConfig: (updates: Partial<WebStoreConfig>) => void;
  loadImageAsBase64?: (file: File) => Promise<string>;
  showToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function WebStoreAboutSection({config, updateConfig, loadImageAsBase64, showToast}: Props) {
  return (
    
            <div className={cardClass}>
              <h3 className="text-sm font-black text-gray-800">ℹ️ Tentang Toko</h3>
              <p className="text-[10px] text-gray-500">
                Informasi tentang toko yang tampil di halaman landing page Web Store. 
                Ceritakan sejarah, misi, dan nilai-nilai Near Bakery.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={labelClass}>Judul Section</label>
                  <input className={inputClass} value={config.aboutTitle} onChange={e => updateConfig({ aboutTitle: e.target.value })} placeholder="Tentang Near Bakery" />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Deskripsi</label>
                  <textarea className={`${inputClass} h-24 resize-none`} value={config.aboutDescription} onChange={e => updateConfig({ aboutDescription: e.target.value })} placeholder="Near Bakery & Co. adalah bakery artisan yang berdedikasi menyajikan roti sourdough alami, croissant renyah, dan kue premium dengan bahan-bahan terbaik sejak 2025. Setiap produk kami buat dengan cinta dan resep turun-temurun." />
                </div>
                <div>
                  <label className={labelClass}>Misi</label>
                  <textarea className={`${inputClass} h-20 resize-none`} value={config.aboutMission} onChange={e => updateConfig({ aboutMission: e.target.value })} placeholder="Menghadirkan roti & pastry berkualitas tinggi dengan bahan alami, tanpa pengawet, dan penuh cinta." />
                </div>
                <div>
                  <label className={labelClass}>Visi</label>
                  <textarea className={`${inputClass} h-20 resize-none`} value={config.aboutVision} onChange={e => updateConfig({ aboutVision: e.target.value })} placeholder="Menjadi bakery artisan terdepan di Indonesia yang dikenal akan kualitas, inovasi, dan kehangatan." />
                </div>
                <div>
                  <label className={labelClass}>Gambar Section About</label>
                  <div className="flex items-center gap-3">
                    {config.aboutImage ? (
                      <img src={config.aboutImage} alt="About" className="w-20 h-20 object-cover rounded-xl border border-gray-200" />
                    ) : (
                      <div className="w-20 h-20 bg-slate-100 rounded-xl flex items-center justify-center text-gray-400"><Image className="w-6 h-6" /></div>
                    )}
                    <label className="px-3 py-2 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">
                      Upload Gambar
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const b64 = await loadImageAsBase64(file);
                          updateConfig({ aboutImage: b64 });
                          showToast('Gambar About berhasil diupload!', 'success');
                        }
                      }} />
                    </label>
                  </div>
                </div>
              </div>
            </div>
  );
}
