
import React, { useState, useMemo } from 'react';
import { Company, SectorData } from '../types';
import { parseFinancialValue } from '../utils';

interface ScreenerPageProps {
  data: SectorData;
  onSelectCompany: (company: Company) => void;
}

const ScreenerPage: React.FC<ScreenerPageProps> = ({ data, onSelectCompany }) => {
  const [minMargin, setMinMargin] = useState(10);
  const [maxEvEbitda, setMaxEvEbitda] = useState(25);
  const [minCap, setMinCap] = useState(0); 

  const companies = (data.companies as Company[]) || [];

  const filteredResults = useMemo(() => {
    return companies.filter(c => {
      const margin = c.ebitdaMargin2024 || 0;
      const multiple = c.evEbitdaForward || c.evEbitda || 0; // Priorité au Forward
      const mktCap = parseFinancialValue(c.marketCap);

      return margin >= minMargin && 
             (multiple > 0 ? multiple <= maxEvEbitda : true) && 
             mktCap >= minCap;
    }).sort((a, b) => (b.ebitdaMargin2024 || 0) - (a.ebitdaMargin2024 || 0));
  }, [companies, minMargin, maxEvEbitda, minCap]);

  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in duration-700">
      <aside className="w-full lg:w-80 space-y-8 bg-slate-800 p-8 rounded-[2rem] border border-slate-700 shadow-2xl h-fit sticky top-8">
        <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-6">Filtres Stratégiques</h3>
        <div className="space-y-10">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-300">Marge EBITDA Min.</label>
              <span className="text-xs font-black text-emerald-400">{minMargin}%</span>
            </div>
            <input type="range" min="0" max="50" value={minMargin} onChange={e => setMinMargin(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-300">EV/EBITDA Max.</label>
              <span className="text-xs font-black text-emerald-400">{maxEvEbitda}x</span>
            </div>
            <input type="range" min="5" max="40" step="0.5" value={maxEvEbitda} onChange={e => setMaxEvEbitda(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
          </div>
          <div className="space-y-4">
            <label className="text-xs font-bold text-slate-300 block mb-3">Market Cap Min.</label>
            <div className="flex gap-2">
              {[0, 500, 2000, 5000].map(val => (
                <button key={val} onClick={() => setMinCap(val)} className={`flex-1 py-2 rounded-xl text-[9px] font-black border transition-all ${minCap === val ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>
                  {val === 0 ? 'ALL' : `${val >= 1000 ? val/1000 + 'B' : val + 'M'}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredResults.map((c) => (
          <div key={c.id} onClick={() => onSelectCompany(c)} className="bg-slate-800 p-8 rounded-[2.5rem] border border-slate-700 hover:border-emerald-500 transition-all cursor-pointer group flex flex-col shadow-xl">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center border border-slate-700 text-sm font-black text-emerald-400">{c.ticker.substring(0, 3)}</div>
                <div>
                  <h4 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">{c.name}</h4>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{c.ticker}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-700/50">
                <span className="text-[9px] font-black text-slate-600 block mb-1">MARGE</span>
                <span className="text-sm font-black text-white">{c.ebitdaMargin2024?.toFixed(1)}%</span>
              </div>
              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-700/50">
                <span className="text-[9px] font-black text-slate-600 block mb-1">EV/EBITDA</span>
                <span className="text-sm font-black text-white">{c.evEbitdaForward?.toFixed(1)}x</span>
              </div>
              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-700/50">
                <span className="text-[9px] font-black text-slate-600 block mb-1">MKT CAP</span>
                <span className="text-sm font-black text-white">{c.marketCap}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScreenerPage;