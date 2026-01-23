
import React, { useState, useEffect } from 'react';
import { Company } from '../types';
import Sparkline from './Sparkline';
import { formatCurrencyShort, formatMultiple } from '../utils';
import { fetchHistoricalPrices } from '../services/historicalService';

interface CompanyDetailProps {
  company: Company;
  onSelectCompany: (company: Company) => void;
  peers: Company[];
}

const CompanyDetail: React.FC<CompanyDetailProps> = ({ company, onSelectCompany, peers }) => {
  const [range, setRange] = useState<'1M' | '6M' | '1A'>('1A');
  const [historyPoints, setHistoryPoints] = useState<number[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const generateFallbackHistory = (price: number, points: number): number[] => {
    let cur = price * (0.85 + Math.random() * 0.1);
    const history = Array.from({ length: points - 1 }, () => cur *= (0.995 + Math.random() * 0.01));
    history.push(price);
    return history;
  };

  useEffect(() => {
    const mapRangeToPeriod = (r: '1M' | '6M' | '1A'): "1M" | "6M" | "1Y" => {
      if (r === '1A') return '1Y';
      return r;
    };

    const loadHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const period = mapRangeToPeriod(range);
        const result = await fetchHistoricalPrices(period, [company.ticker]);
        const companySeries = result.series.find(s => s.ticker === company.ticker);

        if (companySeries && companySeries.points.length > 1) {
          setHistoryPoints(companySeries.points.map(p => p.price));
        } else {
          const points = range === '1M' ? 30 : range === '6M' ? 60 : 120;
          setHistoryPoints(generateFallbackHistory(company.price, points));
        }
      } catch (error) {
        console.error("Failed to fetch history for company detail, using fallback", error);
        const points = range === '1M' ? 30 : range === '6M' ? 60 : 120;
        setHistoryPoints(generateFallbackHistory(company.price, points));
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, [company.ticker, company.price, range]);

  const maxPrice = historyPoints.length > 0 ? Math.max(...historyPoints) * 1.05 : company.price;

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-right-4 duration-700 pb-20">
      
      {/* HEADER PREMIUM */}
      <section className="bg-slate-800/80 backdrop-blur-xl p-8 md:p-12 rounded-[3rem] border border-slate-700 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full -mr-20 -mt-20"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start gap-8 relative z-10">
          <div className="flex gap-6 md:gap-8 items-center">
            <div className="w-20 h-20 md:w-28 md:h-28 bg-slate-900 rounded-[2rem] flex items-center justify-center text-3xl md:text-5xl font-black text-emerald-400 border border-slate-700 shadow-inner">
              {company.ticker.substring(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/30 bg-emerald-500/10 text-emerald-400`}>
                  {company.rating}
                </span>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">Sector: Media & OOH</span>
              </div>
              <h2 className="text-3xl md:text-6xl font-black text-white tracking-tight">{company.name}</h2>
              <p className="text-slate-400 text-sm md:text-lg mt-2 max-w-xl font-medium leading-relaxed opacity-80">
                {company.description}
              </p>
            </div>
          </div>

          <div className="flex md:flex-col justify-between items-center md:items-end w-full md:w-auto bg-slate-900/40 md:bg-transparent p-6 md:p-0 rounded-3xl border md:border-0 border-slate-700">
            <div className="flex flex-col md:items-end">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Dernier Cours (monnaie locale)</span>
              <div className="text-4xl md:text-7xl font-black text-white tracking-tighter tabular-nums">
                {(company.price).toFixed(2)}
              </div>
            </div>
            <div className={`mt-2 px-4 py-2 rounded-2xl text-lg md:text-2xl font-black flex items-center gap-2 ${company.change >= 0 ? 'text-emerald-400 bg-emerald-500/5' : 'text-rose-400 bg-rose-500/5'}`}>
              {company.change >= 0 ? '▲' : '▼'} {Math.abs(company.change).toFixed(2)}%
            </div>
          </div>
        </div>

        {/* CHART SECTION */}
        <div className="mt-12 bg-slate-900/60 rounded-[2.5rem] p-8 border border-slate-700/50">
          <div className="flex justify-between items-center mb-8">
             <div className="flex bg-slate-800 p-1 rounded-2xl border border-slate-700 shadow-inner">
                {['1M', '6M', '1A'].map(p => (
                  <button key={p} onClick={() => setRange(p as any)} className={`px-6 py-2 text-[10px] font-black rounded-xl transition-all ${range === p ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>{p}</button>
                ))}
             </div>
             <div className="text-right">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Volatilité 30J</span>
                <span className="text-sm font-black text-white">{company.volatility}%</span>
             </div>
          </div>
          <div className="h-48 md:h-64 relative">
            {isLoadingHistory && <div className="absolute inset-0 flex items-center justify-center bg-slate-900/20 z-10"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>}
            {historyPoints.length > 1 && (
             <svg width="100%" height="100%" viewBox="0 0 1000 200" preserveAspectRatio="none" className="overflow-visible">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path 
                  d={`M 0,200 L ${historyPoints.map((v, i) => `${(i / (historyPoints.length - 1)) * 1000},${200 - (v / maxPrice) * 180}`).join(' L ')} L 1000,200 Z`} 
                  fill="url(#chartGradient)" 
                />
                <path 
                  d={`M ${historyPoints.map((v, i) => `${(i / (historyPoints.length - 1)) * 1000},${200 - (v / maxPrice) * 180}`).join(' L ')}`} 
                  fill="none" 
                  stroke="#10b981" 
                  strokeWidth="4" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
             </svg>
            )}
          </div>
        </div>
      </section>

      {/* DASHBOARD GRID: VALUATION & FINANCIALS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* VALUATION MULTIPLES */}
        <div className="lg:col-span-1 space-y-6">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-4">Multiples de Valorisation</h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl flex justify-between items-center group hover:border-emerald-500/50 transition-all">
              <div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">EV / EBITDA 25E</span>
                <span className="text-2xl font-black text-white">{formatMultiple(company.evEbitdaForward)}</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">vs 26E</span>
                <span className="text-lg font-bold text-emerald-400">{formatMultiple(company.evEbitdaNext)}</span>
              </div>
            </div>
            <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl flex justify-between items-center group hover:border-emerald-500/50 transition-all">
              <div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">P / E 25E (PER)</span>
                <span className="text-2xl font-black text-white">{formatMultiple(company.perForward)}</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">vs 26E</span>
                <span className="text-lg font-bold text-emerald-400">{formatMultiple(company.perNext)}</span>
              </div>
            </div>
            <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl group hover:border-emerald-500/50 transition-all">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Dividend Yield 25E</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-400">{company.dividendYield2025 || '--'}</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase">Projeté</span>
              </div>
            </div>
          </div>
        </div>

        {/* ESTIMATED FINANCIALS (REVENUE / EBITDA / NET INCOME) */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-4">Consensus & Estimations (M Locale)</h3>
          <div className="bg-slate-800 rounded-[2.5rem] border border-slate-700 shadow-2xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-900/50 border-b border-slate-700">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Indicateur</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-300 uppercase tracking-widest text-center">2024</th>
                  <th className="px-8 py-5 text-[10px] font-black text-emerald-400 uppercase tracking-widest text-center">2025E</th>
                  <th className="px-8 py-5 text-[10px] font-black text-emerald-500 uppercase tracking-widest text-center">2026E</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                <tr className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-8 py-5 font-bold text-slate-100 text-xs">Chiffre d'Affaires</td>
                  <td className="px-8 py-5 text-center font-mono text-xs text-slate-400">{formatCurrencyShort(company.revenue2024)}</td>
                  <td className="px-8 py-5 text-center font-mono text-sm text-white font-black">{formatCurrencyShort(company.revenue2025)}</td>
                  <td className="px-8 py-5 text-center font-mono text-sm text-emerald-400 font-black">{formatCurrencyShort(company.revenue2026)}</td>
                </tr>
                <tr className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-8 py-5 font-bold text-slate-100 text-xs">EBITDA</td>
                  <td className="px-8 py-5 text-center font-mono text-xs text-slate-400">{formatCurrencyShort(company.ebitda2024)}</td>
                  <td className="px-8 py-5 text-center font-mono text-sm text-white font-black">{formatCurrencyShort(company.ebitda2025)}</td>
                  <td className="px-8 py-5 text-center font-mono text-sm text-emerald-400 font-black">{formatCurrencyShort(company.ebitda2026)}</td>
                </tr>
                <tr className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-8 py-5 font-bold text-slate-100 text-xs">EBIT</td>
                  <td className="px-8 py-5 text-center font-mono text-xs text-slate-400">{formatCurrencyShort(company.ebit2024)}</td>
                  <td className="px-8 py-5 text-center font-mono text-sm text-white font-black">{formatCurrencyShort(company.ebit2025)}</td>
                  <td className="px-8 py-5 text-center font-mono text-sm text-emerald-400 font-black">{formatCurrencyShort(company.ebit2026)}</td>
                </tr>
                <tr className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-8 py-5 font-bold text-slate-100 text-xs">Résultat Net</td>
                  <td className="px-8 py-5 text-center font-mono text-xs text-slate-400">{formatCurrencyShort(company.netIncome2024)}</td>
                  <td className="px-8 py-5 text-center font-mono text-sm text-white font-black">{formatCurrencyShort(company.netIncome2025)}</td>
                  <td className="px-8 py-5 text-center font-mono text-sm text-emerald-400 font-black">{formatCurrencyShort(company.netIncome2026)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-emerald-900/10 p-6 rounded-[2rem] border border-emerald-500/20">
              <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest block mb-2">Marge EBITDA 24</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{company.ebitdaMargin.toFixed(1)}%</span>
                <div className="w-12 h-1 bg-slate-700 rounded-full overflow-hidden">
                   <div className="h-full bg-emerald-500" style={{ width: `${company.ebitdaMargin}%` }}></div>
                </div>
              </div>
            </div>
            <div className="bg-slate-800 p-6 rounded-[2rem] border border-slate-700">
               <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Dette Nette / Market Cap</span>
               <span className="text-3xl font-black text-white">{company.netDebt}</span>
            </div>
          </div>
        </div>
      </div>

      {/* PEER COMPARISON SLIDER */}
      <section className="space-y-6">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-4">Valeurs Similaires</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {peers.filter(p => p.id !== company.id).slice(0, 3).map(p => (
            <button 
              key={p.id} 
              onClick={() => onSelectCompany(p)} 
              className="flex items-center justify-between p-6 bg-slate-800/60 backdrop-blur-sm rounded-3xl border border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800 transition-all group shadow-lg"
            >
              <div className="text-left">
                <span className="text-[10px] font-black text-slate-500 block group-hover:text-emerald-400 transition-colors uppercase tracking-widest mb-1">{p.ticker}</span>
                <span className="text-sm font-bold text-white group-hover:translate-x-1 transition-transform inline-block">{p.name}</span>
              </div>
              <div className="flex flex-col items-end">
                <div className="w-20 h-10 mb-2">
                   <Sparkline data={p.sparkline} color={p.change >= 0 ? '#10b981' : '#f43f5e'} />
                </div>
                <span className={`text-[10px] font-black ${p.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {p.change >= 0 ? '+' : ''}{p.change.toFixed(2)}%
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

    </div>
  );
};

export default CompanyDetail;
