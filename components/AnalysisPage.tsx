
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { SectorData, Company, HistoricalPricesPayload } from '../types';
import { queryCompanyAI } from '../services/aiService';
import { fetchHistoricalPrices } from '../services/historicalService';

interface AnalysisPageProps {
  data: SectorData;
}

const COLORS = ['#10b981', '#38bdf8', '#fbbf24', '#f87171', '#a78bfa', '#fb7185'];
const PERIODS: ("1M" | "3M" | "6M" | "1Y")[] = ["1M", "3M", "6M", "1Y"];

type MetricKey = 'evEbitda' | 'per' | 'evSales' | 'evEbit' | 'evEbitdaCapex' | 'yield';
type YearKey = 'Forward' | 'Next' | 'Current';

const AnalysisPage: React.FC<AnalysisPageProps> = ({ data }) => {
  const [period, setPeriod] = useState<"1M" | "3M" | "6M" | "1Y">("1Y");
  const [selectedTickers, setSelectedTickers] = useState<string[]>(["DEC.PA", "OUT", "SAX.DE"]);
  const [historicalData, setHistoricalData] = useState<HistoricalPricesPayload | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [query, setQuery] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [hoverData, setHoverData] = useState<{ index: number; x: number } | null>(null);
  const chartRef = useRef<SVGSVGElement>(null);
  const [benchMetric, setBenchMetric] = useState<MetricKey>('evEbitda');
  const [benchYear, setBenchYear] = useState<YearKey>('Forward');
  const [activeBenchTicker, setActiveBenchTicker] = useState<string | null>(null);

  const companies = useMemo(() => (data.companies as Company[]) || [], [data.companies]);

  useEffect(() => {
    const loadHistory = async () => {
      if (selectedTickers.length === 0) { setHistoricalData(null); return; }
      setLoadingHistory(true);
      try {
        const result = await fetchHistoricalPrices(period, selectedTickers);
        setHistoricalData(result);
      } catch (err) { console.error(err); }
      finally { setLoadingHistory(false); }
    };
    loadHistory();
  }, [period, selectedTickers]);

  const toggleTicker = (ticker: string) => {
    setSelectedTickers(prev => prev.includes(ticker) ? prev.filter(t => t !== ticker) : (prev.length >= 6 ? prev : [...prev, ticker]));
  };

  const normalizedSeries = useMemo(() => {
    if (!historicalData || !historicalData.series.length) return [];
    return historicalData.series.map(s => {
      const base = s.points?.[0]?.price || 0;
      return { ...s, normalized: base !== 0 ? s.points.map(p => ((p.price - base) / base) * 100) : [] };
    });
  }, [historicalData]);

  const benchmarkData = useMemo(() => {
    return companies.map(c => {
      let val = 0;
      if (benchMetric === 'yield') val = (c as any).dividendYieldNumeric || 0;
      else {
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
    return benchmarkData[0];
  }, [activeBenchTicker, benchmarkData]);

  return (
    <div className="animate-in fade-in duration-700 max-w-6xl mx-auto pb-24 space-y-8 px-2">
      
      {/* PERFORMANCE CHART MODULE */}
      <div className="bg-slate-900/40 rounded-[2.5rem] p-6 md:p-10 border border-slate-800 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">Performance Relative</h2>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Base 0 au début de période</p>
          </div>
          <div className="flex bg-slate-800/80 p-1 rounded-2xl border border-slate-700 shadow-inner">
            {PERIODS.map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${period === p ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Chart Area */}
        <div className="h-[250px] md:h-[350px] w-full relative mb-12">
          {loadingHistory && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm z-30 rounded-3xl">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          <svg ref={chartRef} viewBox="0 0 1000 400" className="w-full h-full overflow-visible cursor-crosshair" onMouseMove={(e) => {
            const rect = chartRef.current?.getBoundingClientRect();
            if (!rect || !normalizedSeries[0]) return;
            const x = e.clientX - rect.left;
            const dataCount = normalizedSeries[0].normalized.length;
            if (dataCount < 1) return;
            let index = Math.round((x / rect.width) * (dataCount - 1));
            index = Math.max(0, Math.min(dataCount - 1, index));
            setHoverData({ index, x: (index / (dataCount - 1)) * rect.width });
          }} onMouseLeave={() => setHoverData(null)}>
            {[40, 20, 0, -20, -40].map(y => (
              <line key={y} x1="0" y1={400 - ((y + 40) / 80) * 400} x2="1000" y2={400 - ((y + 40) / 80) * 400} stroke="#1e293b" strokeWidth="1" strokeDasharray={y === 0 ? "0" : "4 4"} />
            ))}
            {hoverData && <line x1={hoverData.x} y1="0" x2={hoverData.x} y2="400" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />}
            {normalizedSeries.map((s, idx) => {
              if (!selectedTickers.includes(s.ticker) || s.normalized.length < 2) return null;
              const points = s.normalized.map((p, i) => `${(i / (s.normalized.length - 1)) * 1000},${400 - ((p + 40) / 80) * 400}`).join(' L ');
              return (
                <path 
                  key={s.ticker} 
                  d={`M ${points}`} 
                  fill="none" 
                  stroke={COLORS[idx % COLORS.length]} 
                  strokeWidth="3" 
                  strokeLinecap="round" 
                  className="transition-all duration-500" 
                />
              );
            })}
          </svg>
        </div>

        {/* Performance Detail List: ONE LINE PER COMPANY */}
        <div className="space-y-2 mt-8">
          <div className="grid grid-cols-12 px-6 py-2 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800/50">
            <div className="col-span-6">Entreprise</div>
            <div className="col-span-3 text-right">Cours</div>
            <div className="col-span-3 text-right">Performance</div>
          </div>
          {companies.map((c, idx) => {
            const isSelected = selectedTickers.includes(c.ticker);
            const series = normalizedSeries.find(s => s.ticker === c.ticker);
            const dataIndex = hoverData ? hoverData.index : (series?.normalized.length ? series.normalized.length - 1 : 0);
            const perfValue = (series && series.normalized && series.normalized.length > 0) ? (series.normalized[dataIndex] || 0) : 0;
            
            return (
              <button 
                key={c.ticker} 
                onClick={() => toggleTicker(c.ticker)} 
                className={`w-full grid grid-cols-12 items-center px-6 py-4 rounded-2xl border transition-all text-left group ${
                  isSelected ? 'bg-slate-800/80 border-slate-700 shadow-lg' : 'bg-transparent border-transparent opacity-40 hover:opacity-100'
                }`}
              >
                <div className="col-span-6 flex items-center gap-4">
                  <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: isSelected ? COLORS[idx % COLORS.length] : '#334155' }}></div>
                  <div>
                    <span className="text-xs font-black text-white uppercase tracking-wider">{c.ticker}</span>
                    <span className="hidden md:inline text-[10px] text-slate-500 ml-2 font-bold">{c.name}</span>
                  </div>
                </div>
                <div className="col-span-3 text-right text-xs font-bold text-slate-300">
                  {c.price.toFixed(2)}
                </div>
                <div className={`col-span-3 text-right text-xs font-black ${perfValue >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {perfValue >= 0 ? '+' : ''}{perfValue.toFixed(2)}%
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* BENCHMARK MULTIPLES SECTORIELS - REFONTE VISUELLE */}
      <div className="bg-[#0f172a] rounded-[3rem] p-8 md:p-14 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Comparatif Sectoriel</h2>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Analyse des multiples de valorisation</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <select value={benchMetric} onChange={(e) => setBenchMetric(e.target.value as MetricKey)} className="bg-slate-900 border border-slate-700 text-emerald-400 text-[10px] font-black uppercase p-4 rounded-2xl outline-none hover:border-emerald-500/50 transition-colors shadow-lg">
              <option value="evEbitda">EV/EBITDA</option>
              <option value="evEbit">EV/EBIT</option>
              <option value="evEbitdaCapex">EV/(EBITDA-CAPEX)</option>
              <option value="evSales">EV/Sales</option>
              <option value="per">P/E</option>
              <option value="yield">Dividend Yield</option>
            </select>
            {benchMetric !== 'yield' && (
              <select value={benchYear} onChange={(e) => setBenchYear(e.target.value as YearKey)} className="bg-slate-900 border border-slate-700 text-emerald-400 text-[10px] font-black uppercase p-4 rounded-2xl outline-none hover:border-emerald-500/50 transition-colors shadow-lg">
                <option value="Current">2024</option>
                <option value="Forward">2025E</option>
                <option value="Next">2026E</option>
              </select>
            )}
          </div>
        </div>

        {/* VALEUR EN GROS AU DESSUS DU GRAPHIQUE */}
        <div className="text-center mb-16 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="text-5xl md:text-8xl font-black text-white tracking-tighter tabular-nums drop-shadow-2xl">
            {displayBench?.value.toFixed(1)}
            <span className="text-xl md:text-2xl text-emerald-500 ml-4 font-black uppercase tracking-widest">
              {benchMetric === 'yield' ? '%' : 'x'}
            </span>
          </div>
          <div className="mt-4 flex flex-col items-center">
             <span className="text-sm font-black text-emerald-400 uppercase tracking-[0.3em]">{displayBench?.ticker}</span>
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 opacity-60">{displayBench?.name}</span>
          </div>
        </div>

        <div className="relative h-48 md:h-64 flex items-end gap-3 md:gap-5 border-b border-slate-800 px-6 pb-2">
          {benchmarkData.map((d) => {
            const h = (d.value / maxBenchValue) * 100;
            const isActive = displayBench?.ticker === d.ticker;
            return (
              <div 
                key={d.ticker} 
                className="flex-1 flex flex-col items-center group relative h-full justify-end cursor-pointer"
                onMouseEnter={() => setActiveBenchTicker(d.ticker)}
              >
                <div 
                  className={`w-full rounded-t-2xl transition-all duration-500 relative ${
                    isActive 
                      ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-[0_-10px_30px_rgba(16,185,129,0.3)]' 
                      : 'bg-slate-800/60 group-hover:bg-slate-700 border-x border-t border-slate-700/50'
                  }`} 
                  style={{ height: `${Math.max(8, h)}%` }}
                >
                  {isActive && <div className="absolute inset-0 bg-white/20 animate-pulse rounded-t-2xl"></div>}
                </div>
                <div className={`absolute top-full mt-4 text-[9px] font-black transition-colors ${isActive ? 'text-emerald-400' : 'text-slate-600 group-hover:text-slate-400'}`}>
                  {d.ticker}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI RESEARCH */}
      <section className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 shadow-xl backdrop-blur-sm">
        <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-tight flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div> Analyse IA Stratégique
        </h3>
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!query.trim()) return;
          setIsAiLoading(true);
          try { setAiResponse(await queryCompanyAI(query, data)); }
          catch (err) { setAiResponse("Service indisponible."); }
          finally { setIsAiLoading(false); }
        }} className="flex gap-3 mb-6">
          <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Comparer la valorisation de JCDecaux vs Ströer..." className="flex-1 bg-slate-800/50 border border-slate-700 rounded-2xl px-6 py-4 outline-none text-white text-sm" />
          <button type="submit" disabled={isAiLoading} className="bg-emerald-600 px-8 py-4 rounded-2xl font-black text-[10px] uppercase hover:bg-emerald-500 disabled:opacity-50 text-white">
            {isAiLoading ? "..." : "Analyser"}
          </button>
        </form>
        {aiResponse && <div className="p-6 bg-slate-950/50 rounded-2xl border border-slate-800 text-slate-300 text-sm leading-relaxed whitespace-pre-line animate-in slide-in-from-top-2">{aiResponse}</div>}
      </section>
    </div>
  );
};

export default AnalysisPage;
