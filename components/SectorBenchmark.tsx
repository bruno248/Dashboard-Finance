
import React, { useState, useMemo } from 'react';
import { Company, SectorData } from '../types';

type MetricKey = 'evEbitda' | 'per' | 'evSales' | 'evEbit' | 'evEbitdaCapex' | 'yield';
type YearKey = 'Forward' | 'Next' | 'Current';

interface SectorBenchmarkProps {
  data: SectorData;
  initialMetric: MetricKey;
  initialYear: YearKey;
  showControls?: boolean;
}

const SectorBenchmark: React.FC<SectorBenchmarkProps> = ({ 
  data, 
  initialMetric, 
  initialYear, 
  showControls = true 
}) => {
  const [benchMetric, setBenchMetric] = useState<MetricKey>(initialMetric);
  const [benchYear, setBenchYear] = useState<YearKey>(initialYear);
  const [activeBenchTicker, setActiveBenchTicker] = useState<string | null>(null);

  const companies = useMemo(() => (data.companies as Company[]) || [], [data.companies]);

  const benchmarkData = useMemo(() => {
    return companies.map(c => {
      let val = 0;
      if (benchMetric === 'yield') {
        if (benchYear === 'Current') val = (c as any).dividendYieldNumeric || 0;
        else if (benchYear === 'Forward') val = (c as any).dividendYield2025Numeric || 0;
        else val = (c as any).dividendYield2026Numeric || 0;
      } else {
        const suffix = benchYear === 'Current' ? '' : benchYear;
        const key = `${benchMetric}${suffix}` as keyof Company;
        val = Number(c[key]) || 0;
      }
      return { ticker: c.ticker, value: val, name: c.name };
    }).filter(v => v.value > 0);
  }, [companies, benchMetric, benchYear]);

  const maxBenchValue = Math.max(...benchmarkData.map(d => d.value), 1);

  const displayBench = useMemo(() => {
    if (activeBenchTicker) return benchmarkData.find(d => d.ticker === activeBenchTicker);
    return benchmarkData.length > 0 ? benchmarkData[0] : null;
  }, [activeBenchTicker, benchmarkData]);

  return (
    <div className="bg-[#0f172a] rounded-xl md:rounded-[3rem] p-4 md:p-8 lg:p-14 border border-slate-800 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
      <div className={`flex flex-col ${showControls ? 'md:flex-row' : ''} justify-between items-start md:items-center gap-8 mb-12 md:mb-16`}>
        <div>
          <h2 className="text-base md:text-2xl font-black text-white uppercase tracking-tight">Comparatif Sectoriel</h2>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Analyse des multiples de valorisation</p>
        </div>
        {showControls && (
          <div className="flex flex-wrap gap-3">
            <select value={benchMetric} onChange={e => setBenchMetric(e.target.value as MetricKey)} className="bg-slate-900 border border-slate-700 text-emerald-400 text-[10px] font-black uppercase p-3 md:p-4 rounded-xl md:rounded-2xl outline-none hover:border-emerald-500/50 transition-colors shadow-lg">
              <option value="evEbitda">EV/EBITDA</option>
              <option value="evEbit">EV/EBIT</option>
              <option value="evEbitdaCapex">EV/(EBITDA-CAPEX)</option>
              <option value="evSales">EV/Sales</option>
              <option value="per">P/E</option>
              <option value="yield">Dividend Yield</option>
            </select>
            <select value={benchYear} onChange={e => setBenchYear(e.target.value as YearKey)} className="bg-slate-900 border border-slate-700 text-emerald-400 text-[10px] font-black uppercase p-3 md:p-4 rounded-xl md:rounded-2xl outline-none hover:border-emerald-500/50 transition-colors shadow-lg">
              <option value="Current">2024</option>
              <option value="Forward">2025E</option>
              <option value="Next">2026E</option>
            </select>
          </div>
        )}
      </div>
      {displayBench ? (
        <>
            <div className="text-center mb-16 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="text-3xl md:text-8xl font-black text-white tracking-tighter tabular-nums drop-shadow-2xl">
                    {displayBench?.value.toFixed(1)}
                    <span className="text-lg md:text-2xl text-emerald-500 ml-2 md:ml-4 font-black uppercase tracking-widest">
                        {benchMetric === 'yield' ? '%' : 'x'}
                    </span>
                </div>
                <div className="mt-4 flex flex-col items-center">
                    <span className="text-sm font-black text-emerald-400 uppercase tracking-[0.3em]">{displayBench?.ticker}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 opacity-60">{displayBench?.name}</span>
                </div>
            </div>
            <div className="relative h-48 md:h-64 flex items-end gap-3 md:gap-5 border-b border-slate-800 px-2 md:px-6 pb-2">
            {benchmarkData.map(d => {
                const h = (d.value / maxBenchValue) * 100;
                const isActive = displayBench?.ticker === d.ticker;
                return (
                <div key={d.ticker} className="flex-1 flex flex-col items-center group relative h-full justify-end cursor-pointer" onMouseEnter={() => setActiveBenchTicker(d.ticker)}>
                    <div className={`mb-2 text-[10px] font-black transition-all duration-300 ${isActive ? 'text-emerald-400 scale-110' : 'text-slate-500 opacity-60'}`}>{d.value.toFixed(1)}{benchMetric === 'yield' ? '%' : 'x'}</div>
                    <div className={`w-full rounded-t-lg md:rounded-t-2xl transition-all duration-500 relative ${isActive ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-[0_-10px_30px_rgba(16,185,129,0.3)]' : 'bg-slate-800/60 group-hover:bg-slate-700 border-x border-t border-slate-700/50'}`} style={{ height: `${Math.max(8, h)}%` }}>
                    {isActive && <div className="absolute inset-0 bg-white/20 md:animate-pulse rounded-t-lg md:rounded-t-2xl"></div>}
                    </div>
                    <div className={`absolute top-full mt-4 text-[9px] font-black transition-colors ${isActive ? 'text-emerald-400' : 'text-slate-600 group-hover:text-slate-400'}`}>{d.ticker}</div>
                </div>
                );
            })}
            </div>
        </>
      ) : (
        <div className="text-center py-20 text-slate-600 italic font-bold">Aucune donnée pour ce multiple.</div>
      )}
    </div>
  );
};

export default SectorBenchmark;
