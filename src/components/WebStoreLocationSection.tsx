import React from 'react';
import { MapPin, Phone, Globe } from 'lucide-react';
import { WebStoreConfig } from '../types';
import { cardClass, inputClass, labelClass } from '../lib/webstore-constants';


interface Props {
  config: WebStoreConfig;
  updateConfig: (updates: Partial<WebStoreConfig>) => void;
}

export default function WebStoreLocationSection({config, updateConfig}: Props) {
  return (
    
            <div className={cardClass}>
              <h3 className="text-sm font-black text-gray-800">📍 Lokasi & Maps</h3>
              <p className="text-[10px] text-gray-500">
                Atur informasi lokasi toko yang tampil di landing page Web Store. 
                Pengunjung bisa melihat peta dan alamat lengkap.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={labelClass}>Alamat Lengkap</label>
                  <textarea className={`${inputClass} h-16 resize-none`} value={config.locationAddress} onChange={e => updateConfig({ locationAddress: e.target.value })} placeholder="Jl. Contoh No. 123, Kelurahan, Kecamatan, Kota, Provinsi" />
                </div>
                <div>
                  <label className={labelClass}>Latitude (Google Maps)</label>
                  <input className={inputClass} value={config.locationLat?.toString() || ''} onChange={e => updateConfig({ locationLat: parseFloat(e.target.value) || 0 })} placeholder="-6.2088" />
                </div>
                <div>
                  <label className={labelClass}>Longitude (Google Maps)</label>
                  <input className={inputClass} value={config.locationLng?.toString() || ''} onChange={e => updateConfig({ locationLng: parseFloat(e.target.value) || 0 })} placeholder="106.8456" />
                </div>
                <div>
                  <label className={labelClass}>URL Google Maps (embed/link)</label>
                  <input className={inputClass} value={config.locationGoogleMapsUrl} onChange={e => updateConfig({ locationGoogleMapsUrl: e.target.value })} placeholder="https://maps.google.com/?q=..." />
                </div>
                <div>
                  <label className={labelClass}>Gambar Peta / Toko</label>
                  <div className="flex items-center gap-3">
                    {config.locationImage ? (
                      <img src={config.locationImage} alt="Location" className="w-20 h-20 object-cover rounded-xl border border-gray-200" />
                    ) : (
                      <div className="w-20 h-20 bg-slate-100 rounded-xl flex items-center justify-center text-gray-400"><MapPin className="w-6 h-6" /></div>
                    )}
                    <label className="px-3 py-2 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">
                      Upload Gambar
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const b64 = await loadImageAsBase64(file);
                          updateConfig({ locationImage: b64 });
                          showToast('Gambar lokasi berhasil diupload!', 'success');
                        }
                      }} />
                    </label>
                  </div>
                </div>
              </div>
    
              {/* Preview map */}
              {config.locationLat && config.locationLng && (
                <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-[9px] text-gray-500 mb-1">🔄 Preview koordinat — embed map akan tampil di Web Store:</p>
                  <div className="w-full h-32 rounded-lg bg-slate-200 flex items-center justify-center">
                    <div className="text-center">
                      <MapPin className="w-8 h-8 text-emerald-600 mx-auto" />
                      <p className="text-[10px] text-gray-500 mt-1">{config.locationLat}, {config.locationLng}</p>
                      <p className="text-[9px] text-gray-400">{config.locationAddress || 'Alamat belum diisi'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
  );
}
