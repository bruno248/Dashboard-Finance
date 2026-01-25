
import React, { useState, useMemo } from 'react';
import { Company, SectorData, NewsTag } from '../types';
import { MarketTable } from './MarketTable';
import Modal from './Modal';
import SectorBenchmark from './SectorBenchmark';

interface DashboardOverviewProps {
  data: SectorData;
  onSelectCompany: (company: Company) => void;
}

const AIBadge: React.FC = () => (
  <span className="absolute top-4 right-4 text-[8px] font-black text-emerald-700 bg-emerald-400/20 px-2 py-0.5 rounded-full border border-emerald-500/20">
    Données IA
  </span>
);

const SentimentModal: React.FC<{ sentiment: NonNullable<SectorData['sentiment']>, isOpen: boolean, onClose: () => void }> = ({ sentiment, isOpen, onClose }) => (
  <Modal isOpen={isOpen} onClose={onClose}>
    <div 
        className="bg-slate-800 w-full max-w-lg md:max-w-2xl rounded-2xl md:rounded-[2rem] border border-slate-700 shadow-2xl p-4 md:p-8 animate-in zoom-in-95"
    >
        <div className="flex justify-between items-start mb-6">
            <div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full md:animate-pulse shadow-[0_0_10px_#10b981]"></div>
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Analyse IA du Sentiment</span>
                </div>
                <h2 className="text-lg md:text-2xl font-black text-white mt-4">{sentiment.label}</h2>
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
  </Modal>
);

const getTagStyle = (tag: NewsTag) => {
    switch (tag?.toLowerCase()) {
      case 'deals': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'digital': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'earnings': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'corporate': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'regulation': return 'bg-rose-500/10 text-rose-300 border-rose-500/30';
      case 'market':
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
};

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
      <div className="space-y-4 md:space-y-8 animate-in fade-in duration-700 pb-20">
        
        {/* STATS CARDS & WIDGETS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-6">
          <div className="bg-slate-800 p-4 md:p-6 rounded-xl md:rounded-3xl border border-slate-700 shadow-xl h-full">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Multiple Sectoriel</h3>
              <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-700">
                <button onClick={() => setYearView('2025')} className={`px-3 py-1 text-[8px] font-black rounded-md transition-all ${yearView === '2025' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}>2025E</button>
                <button onClick={() => setYearView('2026')} className={`px-3 py-1 text-[8px] font-black rounded-md transition-all ${yearView === '2026' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}>2026E</button>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl md:text-5xl font-black text-white">{stats.avgMult}x</span>
              <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest">EV/EBITDA Moy.</span>
            </div>
          </div>

          <div className="bg-slate-800 p-4 md:p-6 rounded-xl md:rounded-3xl border border-slate-700 shadow-xl flex flex-col justify-center h-full">
            <h3 className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-3">Potentiel de Hausse</h3>
            <div className="flex items-baseline gap-2">
              {stats.hasUpsideData ? (
                <span className="text-2xl md:text-5xl font-black text-emerald-400">+{stats.avgUpside}%</span>
              ) : (
                <span className="text-2xl md:text-5xl font-black text-slate-500">N/A</span>
              )}
              <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Upside Moyen</span>
            </div>
          </div>

          <div className="bg-slate-800 p-4 md:p-6 rounded-xl md:rounded-3xl border border-slate-700 shadow-xl h-full">
            <h3 className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-4">Top Variations</h3>
            <div className="space-y-3">
              {topMovers.map(c => (
                <div key={c.ticker} className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-400">{c.ticker} <span className="text-[8px] opacity-50 ml-1 hidden sm:inline">{c.name}</span></span>
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
              className="w-full h-full bg-emerald-900/10 p-4 md:p-6 rounded-xl md:rounded-3xl border border-emerald-500/20 shadow-xl flex flex-col justify-between text-left relative transition-all hover:border-emerald-500/50 disabled:cursor-not-allowed group"
          >
            <div className="flex-1">
                <AIBadge />
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full md:animate-pulse"></span>
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

        {/* MAIN LAYOUT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <section className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-base md:text-xl font-bold text-white">Cotes Sectorielles (LC)</h2>
            </div>
            <MarketTable companies={companies} onSelectCompany={onSelectCompany} />
          </section>

          <aside className="lg:col-span-2 space-y-6">
            <div className="bg-slate-800 p-4 md:p-6 rounded-xl md:rounded-3xl border border-slate-700 shadow-xl">
              <h3 className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-4">Dernières Dépêches</h3>
              <div className="space-y-4">
                {(data.news || []).slice(0, 10).map((item, idx) => (
                  <div key={item.id || idx}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${getTagStyle(item.tag)}`}>
                        {item.tag || 'Market'}
                      </span>
                      <span className="text-[8px] font-bold text-slate-600 uppercase">
                        {item.source} • {item.time}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-200 leading-snug line-clamp-2">
                      {item.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>

        {/* BENCHMARK (Full Width) */}
        <section className="mt-6">
          <SectorBenchmark data={data} initialMetric="evEbitda" initialYear="Forward" showControls={false} />
        </section>
      </div>

      {isSentimentModalOpen && data.sentiment && (
        <SentimentModal
            isOpen={isSentimentModalOpen}
            sentiment={data.sentiment}
            onClose={() => setIsSentimentModalOpen(false)}
        />
      )}
    </>
  );
};

export default DashboardOverview;
