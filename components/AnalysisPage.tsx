
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
    setSelectedTickers(prev => prev.includes(ticker) ? prev.filter(t => t !== ticker) : (prev.length >= 3 ? prev : [...prev, ticker]));
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
      return { ticker: c.ticker, value: val };
    }).filter(v => v.value > 0);
  }, [companies, benchMetric, benchYear]);

  const maxBenchValue = Math.max(...benchmarkData.map(d => d.value), 1);

  return (
    <div className="animate-in fade-in duration-700 max-w-6xl mx-auto pb-24 space-y-8 px-2">
      
      {/* PERFORMANCE CHART */}
      <div className="bg-slate-900/40 rounded-[2.5rem] p-6 md:p-10 border border-slate-800 shadow-2xl backdrop-blur-md">
        <div className="flex justify-between items-center mb-12">
          <h2 className="text-xl font-bold text-white uppercase tracking-tight">Performance Relative</h2>
          <div className="flex bg-slate-800/80 p-1 rounded-2xl border border-slate-700">
            {PERIODS.map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${period === p ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[300px] w-full relative mb-12">
          {loadingHistory && <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm z-30 rounded-3xl"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>}
          <svg ref={chartRef} viewBox="0 0 1000 400" className="w-full h-full overflow-visible" onMouseMove={(e) => {
            const rect = chartRef.current?.getBoundingClientRect();
            if (!rect || !normalizedSeries[0]) return;
            const x = e.clientX - rect.left;
            const dataCount = normalizedSeries[0].normalized.length;
            let index = Math.round((x / rect.width) * (dataCount - 1));
            setHoverData({ index, x: (index / (dataCount - 1)) * rect.width });
          }} onMouseLeave={() => setHoverData(null)}>
            {[40, 20, 0, -20, -40].map(y => (
              <line key={y} x1="0" y1={400 - ((y + 40) / 80) * 400} x2="1000" y2={400 - ((y + 40) / 80) * 400} stroke="#1e293b" strokeWidth="1" strokeDasharray={y === 0 ? "0" : "4 4"} />
            ))}
            {hoverData && <line x1={hoverData.x} y1="0" x2={hoverData.x} y2="400" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />}
            {normalizedSeries.map((s, idx) => {
              if (!selectedTickers.includes(s.ticker) || s.normalized.length < 2) return null;
              const points = s.normalized.map((p, i) => `${(i / (s.normalized.length - 1)) * 1000},${400 - ((p + 40) / 80) * 400}`).join(' L ');
              return <path key={s.ticker} d={`M ${points}`} fill="none" stroke={COLORS[idx % COLORS.length]} strokeWidth="3" strokeLinecap="round" className="transition-all duration-500" />;
            })}
          </svg>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">
          {companies.map((c, idx) => (
            <button key={c.ticker} onClick={() => toggleTicker(c.ticker)} className={`p-3 rounded-xl border text-[10px] font-black uppercase transition-all ${selectedTickers.includes(c.ticker) ? 'bg-slate-800 border-slate-600 text-white' : 'border-transparent text-slate-500 opacity-50'}`}>
              <div className="w-1 h-3 rounded-full mb-1 mx-auto" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
              {c.ticker}
            </button>
          ))}
        </div>
      </div>

      {/* BENCHMARK MULTIPLES - TOUT LE SECTEUR */}
      <div className="bg-[#0f172a] rounded-[2.5rem] p-8 md:p-12 border border-slate-800 shadow-2xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-16">
          <h2 className="text-xl font-bold text-white uppercase tracking-tight">Comparatif Sectoriel</h2>
          <div className="flex gap-2">
            <select value={benchMetric} onChange={(e) => setBenchMetric(e.target.value as MetricKey)} className="bg-slate-900 border border-slate-700 text-emerald-400 text-[10px] font-black uppercase p-3 rounded-xl outline-none">
              <option value="evEbitda">EV/EBITDA</option>
              <option value="evEbit">EV/EBIT</option>
              <option value="evEbitdaCapex">EV/(EBITDA-CAPEX)</option>
              <option value="evSales">EV/Sales</option>
              <option value="per">P/E</option>
              <option value="yield">Dividend Yield</option>
            </select>
            {benchMetric !== 'yield' && (
              <select value={benchYear} onChange={(e) => setBenchYear(e.target.value as YearKey)} className="bg-slate-900 border border-slate-700 text-emerald-400 text-[10px] font-black uppercase p-3 rounded-xl outline-none">
                <option value="Current">2024</option>
                <option value="Forward">2025E</option>
                <option value="Next">2026E</option>
              </select>
            )}
          </div>
        </div>

        <div className="relative h-64 md:h-80 flex items-end gap-2 md:gap-4 border-b border-slate-800 px-4">
          {benchmarkData.map((d, idx) => {
            const h = (d.value / maxBenchValue) * 100;
            return (
              <div key={d.ticker} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                <div className="absolute -top-8 text-[10px] font-black text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">{(d.value || 0).toFixed(1)}</div>
                <div className="w-full rounded-t-xl bg-slate-800/80 group-hover:bg-emerald-500/20 transition-all border-x border-t border-slate-700 group-hover:border-emerald-500/50" style={{ height: `${Math.max(5, h)}%` }}></div>
                <div className="absolute top-full mt-4 text-[9px] font-black text-slate-500 group-hover:text-emerald-400">{d.ticker}</div>
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
