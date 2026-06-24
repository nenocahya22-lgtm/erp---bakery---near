import React from 'react';
import { Link, Mail, Phone } from 'lucide-react';
import { WebStoreConfig } from '../types';
import { cardClass, inputClass, labelClass } from '../lib/webstore-constants';


interface Props {
  config: WebStoreConfig;
  updateConfig: (updates: Partial<WebStoreConfig>) => void;
}

export default function WebStoreFooterSection({config, updateConfig}: Props) {
  return (
    
            <div className={cardClass}>
              <h3 className="text-sm font-black text-gray-800">📋 Footer Web Store</h3>
              <p className="text-[10px] text-gray-500">Atur teks footer, copyright, dan tautan.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Copyright Text</label>
                  <input className={inputClass} value={config.footerCopyright} onChange={e => updateConfig({ footerCopyright: e.target.value })} placeholder="© 2026 Near Bakery & Co." />
                </div>
                <div>
                  <label className={labelClass}>Footer Links (dipisah koma)</label>
                  <input className={inputClass} value={Array.isArray(config.footerLinks) ? config.footerLinks.join(', ') : ''} onChange={e => updateConfig({ footerLinks: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="Menu, Rewards, Gift Cards" />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Checkout Footer Text</label>
                  <input className={inputClass} value={config.checkoutFooterText} onChange={e => updateConfig({ checkoutFooterText: e.target.value })} placeholder="Near Bakery & Co. — Kualitas Terjamin" />
                </div>
              </div>
            </div>
  );
}
