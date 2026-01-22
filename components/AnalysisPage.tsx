
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

  const loadHistory = async () => {
    if (selectedTickers.length === 0) {
      setHistoricalData(null);
      return;
    }
    setLoadingHistory(true);
    try {
      const result = await fetchHistoricalPrices(period, selectedTickers);
      setHistoricalData(result);
    } catch (err) {
      console.error("Load history error:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [period, selectedTickers]);

  const toggleTicker = (ticker: string) => {
    setSelectedTickers(prev => {
      if (prev.includes(ticker)) return prev.filter(t => t !== ticker);
      if (prev.length >= 3) return prev;
      return [...prev, ticker];
    });
  };

  const normalizedSeries = useMemo(() => {
    if (!historicalData || !historicalData.series.length) return [];
    return historicalData.series.map(s => {
      if (!s.points || s.points.length === 0) return { ...s, normalized: [] };
      const base = s.points[0].price;
      return {
        ...s,
        normalized: s.points.map(p => base !== 0 ? ((p.price - base) / base) * 100 : 0)
      };
    });
  }, [historicalData]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    if (!chartRef.current || normalizedSeries.length === 0) return;
    const rect = chartRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? (e as any).touches[0].clientX : (e as any).clientX;
    const x = clientX - rect.left;
    const dataCount = normalizedSeries[0].points.length;
    if (dataCount < 1) return;
    let index = Math.round((x / rect.width) * (dataCount - 1));
    index = Math.max(0, Math.min(dataCount - 1, index));
    setHoverData({ index, x: (index / (dataCount - 1)) * rect.width });
  };

  const benchmarkData = useMemo(() => {
    // On affiche toutes les sociétés disponibles dans la base, pas uniquement selectedTickers
    return companies
      .map(c => {
        let val = 0;
        if (benchMetric === 'yield') {
          val = (c as any).dividendYieldNumeric || 0;
        } else {
          const suffix = benchYear === 'Current' ? '' : (benchYear === 'Forward' ? 'Forward' : 'Next');
          const key = `${benchMetric}${suffix}` as keyof Company;
          val = Number((c[key] as any)) || 0;
        }
        return {
          ticker: c.ticker,
          value: val
        };
      })
      .filter(v => v.value > 0);
  }, [companies, benchMetric, benchYear]);

  const maxBenchValue = Math.max(...benchmarkData.map(d => d.value), 1);

  return (
    <div className="animate-in fade-in duration-700 max-w-6xl mx-auto pb-24 space-y-8 px-2 md:px-0">
      
      {/* PERFORMANCE CHART */}
      <div className="bg-slate-900/40 rounded-[2.5rem] p-6 md:p-10 border border-slate-800 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h2 className="text-xl font-bold text-white">Analyse de Performance</h2>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Données normalisées (%)</p>
          </div>
          <div className="flex bg-slate-800/80 p-1 rounded-2xl border border-slate-700 shadow-inner">
            {PERIODS.map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-4 md:px-5 py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase transition-all ${period === p ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[250px] md:h-[350px] w-full relative mb-12">
          {loadingHistory && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm z-30 rounded-3xl">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          <svg ref={chartRef} viewBox="0 0 1000 400" className="w-full h-full overflow-visible cursor-crosshair" onMouseMove={handleMouseMove} onMouseLeave={() => setHoverData(null)}>
            {[40, 20, 0, -20, -40].map(y => (
              <line key={y} x1="0" y1={400 - ((y + 40) / 80) * 400} x2="1000" y2={400 - ((y + 40) / 80) * 400} stroke="#1e293b" strokeWidth="1" strokeDasharray={y === 0 ? "0" : "4 4"} />
            ))}
            {hoverData && <line x1={hoverData.x} y1="0" x2={hoverData.x} y2="400" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />}
            {normalizedSeries.map((s, idx) => {
              if (!selectedTickers.includes(s.ticker) || !s.normalized || s.normalized.length < 2) return null;
              const points = s.normalized.map((p, i) => ({
                x: (i / (s.normalized.length - 1)) * 1000,
                y: 400 - ((p + 40) / 80) * 400
              }));
              let d = `M ${points[0].x} ${points[0].y}`;
              for (let i = 0; i < points.length - 1; i++) {
                const cx = points[i].x + (points[i+1].x - points[i].x) / 2;
                d += ` C ${cx} ${points[i].y}, ${cx} ${points[i+1].y}, ${points[i+1].x} ${points[i+1].y}`;
              }
              return <path key={s.ticker} d={d} fill="none" stroke={COLORS[idx % COLORS.length]} strokeWidth="3" strokeLinecap="round" className="transition-all duration-500" />;
            })}
          </svg>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {companies.map((c, idx) => {
            const isSelected = selectedTickers.includes(c.ticker);
            const series = normalizedSeries.find(s => s.ticker === c.ticker);
            const dataIndex = hoverData ? hoverData.index : (series?.normalized.length ? series.normalized.length - 1 : 0);
            const val = (series && series.normalized && series.normalized.length > 0) ? (series.normalized[dataIndex] || 0) : 0;
            return (
              <div key={c.ticker} onClick={() => toggleTicker(c.ticker)} className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${isSelected ? 'bg-slate-800 border-slate-600 shadow-xl' : 'bg-transparent border-transparent opacity-40 hover:opacity-100'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-1.5 h-6 rounded-full transition-colors ${isSelected ? '' : 'bg-slate-700'}`} style={{ backgroundColor: isSelected ? COLORS[idx % COLORS.length] : undefined }}></div>
                  <div>
                    <p className="text-[10px] font-black text-white uppercase">{c.ticker}</p>
                    <p className="text-[8px] text-slate-500 font-bold uppercase truncate max-w-[100px]">{c.name}</p>
                  </div>
                </div>
                <div className={`text-xs font-black ${val >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {val >= 0 ? '+' : ''}{(val || 0).toFixed(2)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* BENCHMARK MULTIPLES - FULL SECTOR DISPLAY */}
      <div className="bg-[#0f172a] rounded-[2.5rem] p-8 md:p-12 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-20">
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Benchmarks Multiples Sectoriels</h2>
          <div className="flex items-center gap-3">
            <div className="relative group">
              <select value={benchMetric} onChange={(e) => setBenchMetric(e.target.value as MetricKey)} className="appearance-none bg-slate-900 border border-slate-700 text-emerald-400 text-[10px] font-black uppercase tracking-widest px-6 py-3 pr-10 rounded-xl outline-none focus:border-emerald-500 cursor-pointer">
                <option value="evEbitda">EV / EBITDA</option>
                <option value="evEbitdaCapex">EV / (EBITDA-CAPEX)</option>
                <option value="evEbit">EV / EBIT</option>
                <option value="evSales">EV / Sales</option>
                <option value="per">P/E (PER)</option>
                <option value="yield">Dividend Yield (%)</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-500">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3"/></svg>
              </div>
            </div>
            
            {benchMetric !== 'yield' && (
              <div className="relative group">
                <select value={benchYear} onChange={(e) => setBenchYear(e.target.value as YearKey)} className="appearance-none bg-slate-900 border border-slate-700 text-emerald-400 text-[10px] font-black uppercase tracking-widest px-6 py-3 pr-10 rounded-xl outline-none focus:border-emerald-500 cursor-pointer">
                  <option value="Current">2024</option>
                  <option value="Forward">2025E</option>
                  <option value="Next">2026E</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-500">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3"/></svg>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="relative pt-10 pb-6 px-4">
          <div className="flex items-end justify-between h-56 md:h-72 gap-2 md:gap-4 border-b border-slate-800">
            {benchmarkData.map((d) => {
              const height = (d.value / maxBenchValue) * 100;
              // On cherche l'index de la société pour la couleur
              const compIdx = companies.findIndex(c => c.ticker === d.ticker);
              return (
                <div key={d.ticker} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-500 text-slate-900 text-[10px] font-black px-2 py-1 rounded shadow-lg whitespace-nowrap z-20">
                    {(d.value || 0).toFixed(1)}{benchMetric === 'yield' ? '%' : 'x'}
                  </div>
                  <div className={`w-full max-w-[140px] rounded-t-2xl transition-all duration-700 bg-slate-800/80 hover:bg-slate-700 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]`} style={{ height: `${Math.max(5, height)}%` }}>
                    <div className="absolute bottom-0 left-0 right-0 h-1 rounded-full opacity-50" style={{ backgroundColor: COLORS[compIdx % COLORS.length] }}></div>
                  </div>
                  <div className="absolute top-full mt-6 w-full text-center">
                    <span className="text-[10px] md:text-[11px] font-black tracking-widest uppercase text-slate-500 group-hover:text-emerald-400 transition-colors">{d.ticker}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* AI RESEARCH SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
        <section className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 shadow-xl backdrop-blur-sm">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 uppercase tracking-tight">
            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Analyse Stratégique IA
          </h3>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-6">Interrogez le terminal sur les valorisations ou les dynamiques sectorielles.</p>
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!query.trim()) return;
            setIsAiLoading(true);
            try {
              const res = await queryCompanyAI(query, data);
              setAiResponse(res);
            } catch (err) { setAiResponse("L'IA est temporairement saturée."); }
            finally { setIsAiLoading(false); }
          }} className="flex gap-3 mb-6">
            <input 
              type="text" 
              value={query} 
              onChange={e => setQuery(e.target.value)} 
              placeholder="Ex: Analyse de la prime de JCDecaux vs Ströer..." 
              className="flex-1 bg-slate-800/50 border border-slate-700 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-emerald-500/50 text-white text-sm" 
            />
            <button 
              type="submit"
              disabled={isAiLoading} 
              className="bg-emerald-600 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 disabled:opacity-50 text-white shadow-lg"
            >
              {isAiLoading ? "..." : "Analyser"}
            </button>
          </form>
          {aiResponse && (
            <div className="p-6 bg-slate-950/50 rounded-2xl border border-slate-800 text-slate-300 text-sm leading-relaxed whitespace-pre-line animate-in slide-in-from-top-2">
              {aiResponse}
            </div>
          )}
        </section>
        
        <div className="bg-emerald-900/5 p-10 rounded-[2.5rem] border border-emerald-500/10 shadow-xl flex flex-col justify-center items-center text-center">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 border border-emerald-500/20">
            <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          </div>
          <h4 className="text-xl font-bold text-white mb-2">Synthèse Projets DOOH</h4>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm">Les projections 2026 intègrent une accélération de 15% des marges liées à l'automatisation programmatique des inventaires digitaux.</p>
        </div>
      </div>
    </div>
  );
};

export default AnalysisPage;
