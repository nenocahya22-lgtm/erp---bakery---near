import React from 'react';
import { Palette, Type, Image } from 'lucide-react';
import { WebStoreConfig } from '../types';
import { cardClass, inputClass, labelClass } from '../lib/webstore-constants';


interface Props {
  config: WebStoreConfig;
  updateConfig: (updates: Partial<WebStoreConfig>) => void;
}

export default function WebStoreThemeSection({config, updateConfig}: Props) {
  return (
    
            <div className={cardClass}>
              <h3 className="text-sm font-black text-gray-800">🎨 Tema & Warna</h3>
              <p className="text-[10px] text-gray-500">Sesuaikan warna Web Store — cocokkan dengan warna brand Near Bakery & Co.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className={labelClass}>Brand Green (Nav, Tombol)</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={config.colorBrandGreen} onChange={e => updateConfig({ colorBrandGreen: e.target.value })} className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer" />
                    <input className={inputClass} value={config.colorBrandGreen} onChange={e => updateConfig({ colorBrandGreen: e.target.value })} placeholder="#006241" />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Green Accent (Tombol)</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={config.colorGreenAccent} onChange={e => updateConfig({ colorGreenAccent: e.target.value })} className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer" />
                    <input className={inputClass} value={config.colorGreenAccent} onChange={e => updateConfig({ colorGreenAccent: e.target.value })} placeholder="#00754A" />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>House Green (Hero BG)</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={config.colorHouseGreen} onChange={e => updateConfig({ colorHouseGreen: e.target.value })} className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer" />
                    <input className={inputClass} value={config.colorHouseGreen} onChange={e => updateConfig({ colorHouseGreen: e.target.value })} placeholder="#1E3932" />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Gold (Aksen Emas)</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={config.colorGold} onChange={e => updateConfig({ colorGold: e.target.value })} className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer" />
                    <input className={inputClass} value={config.colorGold} onChange={e => updateConfig({ colorGold: e.target.value })} placeholder="#cba258" />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Canvas Warm (BG Halaman)</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={config.colorCanvasWarm} onChange={e => updateConfig({ colorCanvasWarm: e.target.value })} className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer" />
                    <input className={inputClass} value={config.colorCanvasWarm} onChange={e => updateConfig({ colorCanvasWarm: e.target.value })} placeholder="#f2f0eb" />
                  </div>
                </div>
              </div>
              {/* Swatch Preview */}
              <div className="mt-4 p-4 rounded-2xl flex items-center gap-4" style={{background: config.colorCanvasWarm || '#f2f0eb'}}>
                <div className="w-12 h-12 rounded-xl" style={{background: config.colorBrandGreen || '#006241'}} />
                <div className="w-12 h-12 rounded-xl" style={{background: config.colorGreenAccent || '#00754A'}} />
                <div className="w-12 h-12 rounded-xl" style={{background: config.colorHouseGreen || '#1E3932'}} />
                <div className="w-12 h-12 rounded-xl" style={{background: config.colorGold || '#cba258'}} />
                <div className="w-12 h-12 rounded-xl border border-gray-200" style={{background: config.colorCanvasWarm || '#f2f0eb'}} />
                <span className="text-xs text-gray-500 ml-2">Brand Green · Green Accent · House Green · Gold · Canvas Warm</span>
              </div>
            </div>
  );
}
