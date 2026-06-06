import React, { useState } from 'react';
import { Thermometer, Droplets, Gauge } from 'lucide-react';

export default function DoughTemperatureTab() {
  const [roomTemp, setRoomTemp] = useState(28); // suhu ruangan °C
  const [flourTemp, setFlourTemp] = useState(26); // suhu tepung °C
  const [mixerFriction, setMixerFriction] = useState(12); // faktor gesekan mixer °C
  const [targetDoughTemp, setTargetDoughTemp] = useState(26); // suhu target adonan °C

  // Desired Water Temperature = (Target Dough Temp × 3) - (Room Temp + Flour Temp + Mixer Friction)
  const desiredWaterTemp = (targetDoughTemp * 3) - (roomTemp + flourTemp + mixerFriction);

  // If water temp is below room temperature, we need ice to cool it down
  const needsIce = desiredWaterTemp < roomTemp;
  const needsWarmWater = desiredWaterTemp > roomTemp + 2;

  // Ice calculation based on thermodynamic principles:
  // Ratio of ice = (T_tap - T_water) / (80 + T_tap)
  // Assume T_tap is roomTemp. Latent heat of fusion of ice is 80.
  const totalLiquid = 1000; // Assume 1L total water
  const icePercent = needsIce ? Math.max(0, Math.min(0.6, (roomTemp - desiredWaterTemp) / (80 + roomTemp))) : 0;
  const iceAmount = Math.round(totalLiquid * icePercent);
  const coldWaterAmount = totalLiquid - iceAmount;

  const formatTemp = (t: number) => `${t.toFixed(1)}°C`;

  const getHydrationAdvice = () => {
    if (desiredWaterTemp < roomTemp - 5) return '❄️ Gunakan ES BATU untuk menurunkan suhu air';
    if (desiredWaterTemp > roomTemp + 2) return '🔥 Gunakan AIR HANGAT untuk menaikkan suhu air';
    if (desiredWaterTemp >= roomTemp - 5 && desiredWaterTemp <= roomTemp + 2) return '✅ Suhu air ideal — gunakan air biasa';
    return '💧 Sesuaikan sedikit, masih dalam batas toleransi';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Thermometer className="w-6 h-6 text-emerald-600" /> Dough Temperature Control
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Hitung suhu air ideal berdasarkan suhu ruangan, tepung, dan gesekan mixer — jaga kualitas fermentasi ragi.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* KIRI: Input */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2">Parameter Suhu</h3>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-gray-700">Suhu Ruangan</span>
                <span className="font-mono font-bold">{formatTemp(roomTemp)}</span>
              </div>
              <input type="range" min="15" max="40" step="0.5" value={roomTemp}
                onChange={(e) => setRoomTemp(parseFloat(e.target.value))}
                className="w-full accent-emerald-600" />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-gray-700">Suhu Tepung</span>
                <span className="font-mono font-bold">{formatTemp(flourTemp)}</span>
              </div>
              <input type="range" min="15" max="40" step="0.5" value={flourTemp}
                onChange={(e) => setFlourTemp(parseFloat(e.target.value))}
                className="w-full accent-emerald-600" />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-gray-700">Faktor Gesekan Mixer</span>
                <span className="font-mono font-bold">{formatTemp(mixerFriction)}</span>
              </div>
              <input type="range" min="0" max="30" step="0.5" value={mixerFriction}
                onChange={(e) => setMixerFriction(parseFloat(e.target.value))}
                className="w-full accent-amber-600" />
              <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
                <span>Spiral: 8-12°C</span><span>Planet: 10-15°C</span><span>Manual: 0-5°C</span>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3">
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-gray-700 font-bold">Suhu Target Adonan</span>
                <span className="font-mono font-bold text-emerald-700">{formatTemp(targetDoughTemp)}</span>
              </div>
              <input type="range" min="20" max="32" step="0.5" value={targetDoughTemp}
                onChange={(e) => setTargetDoughTemp(parseFloat(e.target.value))}
                className="w-full accent-emerald-600" />
              <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
                <span>Roti Manis: 24-26°C</span><span>Artisan: 25-27°C</span><span>Danish: 26-28°C</span>
              </div>
            </div>
          </div>
        </div>

        {/* KANAN: Hasil */}
        <div className="lg:col-span-7 space-y-4">
          {/* Result Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Hasil Perhitungan</h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className={`p-4 rounded-xl border ${
                desiredWaterTemp >= 20 && desiredWaterTemp <= 28
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-amber-50 border-amber-200'
              }`}>
                <span className="text-[10px] uppercase font-bold text-gray-500 block">Suhu Air Ideal</span>
                <span className={`text-3xl font-black font-mono ${
                  desiredWaterTemp >= 20 && desiredWaterTemp <= 28
                    ? 'text-emerald-700' : 'text-amber-700'
                }`}>
                  {formatTemp(desiredWaterTemp)}
                </span>
              </div>
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <span className="text-[10px] uppercase font-bold text-gray-500 block">Prediksi Suhu Adonan</span>
                <span className="block text-sm font-mono font-bold text-blue-800 mt-1">
                  (Ruangan {formatTemp(roomTemp)} + Tepung {formatTemp(flourTemp)} + Gesekan {formatTemp(mixerFriction)}) / 3
                </span>
                <span className="block font-mono font-black text-blue-700 mt-1 text-lg">
                  = {formatTemp((roomTemp + flourTemp + mixerFriction) / 3)}
                </span>
              </div>
            </div>

            {/* Ice recommendation */}
            {needsIce && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <Droplets className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-blue-800 block mb-1">❄️ Gunakan Es Batu</span>
                  <span className="text-blue-700">
                    Untuk mencapai suhu air {formatTemp(desiredWaterTemp)} (sangat dingin), gunakan 
                    <strong> {iceAmount} gram es batu</strong> + <strong>{coldWaterAmount} ml air dingin</strong> 
                    (dari total {totalLiquid} ml air).
                  </span>
                </div>
              </div>
            )}

            {needsWarmWater && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
                <Thermometer className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-orange-800 block mb-1">🔥 Gunakan Air Hangat</span>
                  <span className="text-orange-700">
                    Suhu air ideal cukup tinggi ({formatTemp(desiredWaterTemp)}). Hangatkan air hingga suhu tersebut 
                    sebelum dicampur ke adonan.
                  </span>
                </div>
              </div>
            )}

            {!needsIce && !needsWarmWater && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                <Gauge className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-emerald-800 block mb-1">✅ Suhu Air Ideal</span>
                  <span className="text-emerald-700">
                    Suhu air {formatTemp(desiredWaterTemp)} dalam rentang ideal. Gunakan air biasa tanpa perlu es atau pemanasan.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Formula Card */}
          <div className="bg-slate-50 p-4 rounded-xl border border-gray-100 text-xs">
            <span className="font-bold text-gray-700 block mb-1">📐 Rumus:</span>
            <code className="block bg-white p-2 rounded border border-gray-200 font-mono text-[11px]">
              Suhu Air Ideal = (Target Adonan × 3) - (Suhu Ruangan + Suhu Tepung + Faktor Mixer)
            </code>
            <code className="block bg-white p-2 rounded border border-gray-200 font-mono text-[11px] mt-1">
              = ({formatTemp(targetDoughTemp)} × 3) - ({formatTemp(roomTemp)} + {formatTemp(flourTemp)} + {formatTemp(mixerFriction)})
            </code>
            <code className="block bg-white p-2 rounded border border-gray-200 font-mono text-[11px] mt-1 text-emerald-700 font-bold">
              = {formatTemp(desiredWaterTemp)}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
