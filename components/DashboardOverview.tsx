
import React, { useState, useMemo } from 'react';
import { Company, SectorData } from '../types';
import MarketTable from './MarketTable';
import { parseFinancialValue } from '../utils';

interface DashboardOverviewProps {
  data: SectorData;
  onSelectCompany: (company: Company) => void;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({ data, onSelectCompany }) => {
  const [yearView, setYearView] = useState<'2025' | '2026'>('2025');
  const companies = (data.companies as Company[]) || [];
  
  const stats = useMemo(() => {
    if (!companies.length) return { avgMult: '0.0', avgUpside: '0' };
    
    const key = yearView === '2025' ? 'evEbitdaForward' : 'evEbitdaNext';
    const sumMult = companies.reduce((acc, c) => acc + ((c as any)[key] || 0), 0);
    
    const upsides = companies.map(c => {
      if (!c.price || !c.targetPrice) return 0;
      return ((c.targetPrice - c.price) / c.price) * 100;
    }).filter(u => u !== 0);
    
    const avgUpside = upsides.length ? (upsides.reduce((a, b) => a + b, 0) / upsides.length).toFixed(1) : '0.0';

    return {
      avgMult: (sumMult / companies.length).toFixed(1),
      avgUpside: avgUpside
    };
  }, [companies, yearView]);

  const topMovers = useMemo(() => {
    return [...companies].sort((a, b) => Math.abs(b.change || 0) - Math.abs(a.change || 0)).slice(0, 3);
  }, [companies]);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700 pb-20">
      
      {/* Grille de Metrics - Épurée */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        
        {/* Multiple OOH */}
        <div className="bg-slate-800 p-5 md:p-6 rounded-3xl border border-slate-700 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Multiple Sectoriel</h3>
            <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-700">
              <button onClick={() => setYearView('2025')} className={`px-3 py-1 text-[8px] font-black rounded-md transition-all ${yearView === '2025' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}>2025E</button>
              <button onClick={() => setYearView('2026')} className={`px-3 py-1 text-[8px] font-black rounded-md transition-all ${yearView === '2026' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}>2026E</button>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl md:text-5xl font-black text-white">{stats.avgMult}x</span>
            <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest">EV/EBITDA Moy.</span>
          </div>
        </div>

        {/* Upside Moyen */}
        <div className="bg-slate-800 p-5 md:p-6 rounded-3xl border border-slate-700 shadow-xl flex flex-col justify-center">
          <h3 className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-4">Potentiel de Hausse</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl md:text-5xl font-black text-emerald-400">+{stats.avgUpside}%</span>
            <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Upside Moyen</span>
          </div>
        </div>
      </div>

      {/* Top Variations et Flash Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-slate-800 p-5 md:p-6 rounded-3xl border border-slate-700 shadow-xl">
          <h3 className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-4">Top Variations</h3>
          <div className="space-y-3">
            {topMovers.map(c => (
              <div key={c.ticker} className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-400">{c.ticker} <span className="text-[8px] opacity-50 ml-1">{c.name}</span></span>
                <span className={(c.change || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {(c.change || 0) >= 0 ? '▲' : '▼'} {Math.abs(c.change || 0).toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-emerald-900/10 p-5 md:p-6 rounded-3xl border border-emerald-500/20 shadow-xl flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Sentiment Marché</span>
          </div>
          <h4 className="text-sm md:text-lg font-bold text-white line-clamp-2 leading-tight">
            {(data.news?.[0]?.title) || "Analyse en cours..."}
          </h4>
          <p className="mt-2 text-slate-500 text-[9px] uppercase font-bold">
             Dernier signal identifié par l'IA
          </p>
        </div>
      </div>

      {/* Market Table */}
      <section>
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-lg md:text-xl font-bold text-white">Cotes Sectorielles</h2>
        </div>
        <MarketTable companies={companies} onSelectCompany={onSelectCompany} />
      </section>

      {/* Flux d'actualités complet en bas */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-bold text-white">Flux d'actualités</h2>
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Dernières 24h</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.news.map((n, idx) => (
            <a 
              key={idx} 
              href={n.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 hover:border-emerald-500/30 transition-all group block"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                  n.tag === 'Acquisition' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-900 text-emerald-400 border-slate-700'
                }`}>
                  {n.tag || 'Market'}
                </span>
                <span className="text-[8px] font-bold text-slate-600 uppercase">{n.source} • {n.time}</span>
              </div>
              <p className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors leading-snug line-clamp-2">{n.title}</p>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
};

export default DashboardOverview;
