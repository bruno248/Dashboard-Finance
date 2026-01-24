
import React, { useState, useMemo } from 'react';
import { Company, SectorData } from '../types';
import { MarketTable } from './MarketTable';

interface DashboardOverviewProps {
  data: SectorData;
  onSelectCompany: (company: Company) => void;
}

const AIBadge: React.FC = () => (
  <span className="absolute top-4 right-4 text-[8px] font-black text-emerald-700 bg-emerald-400/20 px-2 py-0.5 rounded-full border border-emerald-500/20">
    Données IA
  </span>
);

const SentimentModal: React.FC<{ sentiment: NonNullable<SectorData['sentiment']>, onClose: () => void }> = ({ sentiment, onClose }) => (
  <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
  >
      <div 
          className="bg-slate-800 w-full max-w-2xl rounded-[2rem] border border-slate-700 shadow-2xl p-8 animate-in zoom-in-95"
          onClick={(e) => e.stopPropagation()}
      >
          <div className="flex justify-between items-start mb-6">
              <div>
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></div>
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Analyse IA du Sentiment</span>
                  </div>
                 <h2 className="text-2xl font-black text-white mt-4">{sentiment.label}</h2>
              </div>
              <button onClick={onClose} className="p-2 bg-slate-900 rounded-full text-slate-500 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
          </div>
          <div className="space-y-6 text-slate-300 max-h-[60vh] overflow-y-auto pr-4 no-scrollbar">
              <p className="text-sm leading-relaxed whitespace-pre-line">{sentiment.description}</p>
              {sentiment.keyTakeaways && sentiment.keyTakeaways.length > 0 && (
                  <div>
                      <h4 className="text-emerald-400 text-xs font-black uppercase tracking-widest mb-3">Points Clés</h4>
                      <ul className="space-y-2 list-none p-0">
                          {sentiment.keyTakeaways.map((item, index) => (
                              <li key={index} className="flex items-start gap-3 text-sm">
                                  <span className="text-emerald-500 font-black mt-1">•</span>
                                  <span>{item}</span>
                              </li>
                          ))}
                      </ul>
                  </div>
              )}
          </div>
      </div>
  </div>
);


const DashboardOverview: React.FC<DashboardOverviewProps> = ({ data, onSelectCompany }) => {
  const [yearView, setYearView] = useState<'2025' | '2026'>('2025');
  const [isSentimentModalOpen, setIsSentimentModalOpen] = useState(false);
  const companies = (data.companies as Company[]) || [];
  
  const stats = useMemo(() => {
    if (!companies.length) return { avgMult: '0.0', avgUpside: null, hasUpsideData: false };
    
    const key = yearView === '2025' ? 'evEbitdaForward' : 'evEbitdaNext';
    const validCompaniesForMult = companies.filter(c => (c as any)[key] > 0);
    const sumMult = validCompaniesForMult.reduce((acc, c) => acc + ((c as any)[key] || 0), 0);
    
    const upsides = companies
      .filter(c => c.price && c.targetPrice && c.targetPrice > 0)
      .map(c => ((c.targetPrice! - c.price) / c.price) * 100);
      
    const hasUpsideData = upsides.length > 0;
    const avgUpside = hasUpsideData ? (upsides.reduce((a, b) => a + b, 0) / upsides.length).toFixed(1) : null;

    return {
      avgMult: validCompaniesForMult.length > 0 ? (sumMult / validCompaniesForMult.length).toFixed(1) : '0.0',
      avgUpside: avgUpside,
      hasUpsideData: hasUpsideData,
    };
}, [companies, yearView]);


  const topMovers = useMemo(() => {
    return [...companies].sort((a, b) => Math.abs(b.change || 0) - Math.abs(a.change || 0)).slice(0, 3);
  }, [companies]);

  return (
    <>
      <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700 pb-20">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          
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

          <div className="bg-slate-800 p-5 md:p-6 rounded-3xl border border-slate-700 shadow-xl flex flex-col justify-center">
            <h3 className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-4">Potentiel de Hausse</h3>
            <div className="flex items-baseline gap-2">
              {stats.hasUpsideData ? (
                <span className="text-3xl md:text-5xl font-black text-emerald-400">+{stats.avgUpside}%</span>
              ) : (
                <span className="text-3xl md:text-5xl font-black text-slate-500">N/A</span>
              )}
              <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Upside Moyen</span>
            </div>
          </div>
        </div>

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

          <button
              onClick={() => data.sentiment && setIsSentimentModalOpen(true)}
              disabled={!data.sentiment}
              className="bg-emerald-900/10 p-5 md:p-6 rounded-3xl border border-emerald-500/20 shadow-xl flex flex-col justify-between text-left relative transition-all hover:border-emerald-500/50 disabled:cursor-not-allowed group"
          >
            <div className="flex-1">
                <AIBadge />
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Sentiment Marché</span>
                </div>
                {data.sentiment ? (
                  <>
                    <h4 className="text-sm md:text-lg font-bold text-white leading-tight line-clamp-1">
                      {data.sentiment.label}
                    </h4>
                    <p className="mt-2 text-slate-400 text-xs line-clamp-2">
                      {data.sentiment.description}
                    </p>
                  </>
                ) : (
                   <>
                    <h4 className="text-sm md:text-lg font-bold text-white line-clamp-2 leading-tight">
                      Analyse en cours...
                    </h4>
                    <p className="mt-2 text-slate-500 text-[9px] uppercase font-bold">
                       Le sentiment est en cours d'évaluation.
                    </p>
                  </>
                )}
            </div>
            {data.sentiment && (
              <div className="mt-4 text-emerald-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  Voir l'analyse
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </div>
            )}
          </button>
        </div>

        <section>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-lg md:text-xl font-bold text-white">Cotes Sectorielles (LC)</h2>
          </div>
          <MarketTable companies={companies} onSelectCompany={onSelectCompany} />
        </section>

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
                    n.tag === 'Deals' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-900 text-emerald-400 border-slate-700'
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

      {isSentimentModalOpen && data.sentiment && (
        <SentimentModal
            sentiment={data.sentiment}
            onClose={() => setIsSentimentModalOpen(false)}
        />
      )}
    </>
  );
};

export default DashboardOverview;
