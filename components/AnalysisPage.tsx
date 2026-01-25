
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { SectorData, Company, HistoricalPricesPayload } from '../types';
import { queryCompanyAI, queryMeetingQA } from '../services/aiService';
import { fetchHistoricalPrices } from '../services/historicalService';
import SectorBenchmark from './SectorBenchmark';
import { parseFinancialValue } from '../utils';

interface AnalysisPageProps {
  data: SectorData;
}

const COLORS = ['#10b981', '#38bdf8', '#fbbf24', '#f87171', '#a78bfa', '#fb7185'];
const PERIODS: ("1M" | "3M" | "6M" | "1Y")[] = ["1M", "3M", "6M", "1Y"];

const AIBadge: React.FC = () => (
  <div className="flex items-center gap-2">
    <div className="w-2 h-2 bg-emerald-500 rounded-full md:animate-pulse shadow-[0_0_10px_#10b981]"></div>
    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Données IA</span>
  </div>
);

const buildKpiSummary = (company: Company, peers: Company[]): string => {
  if (!company) return "Veuillez sélectionner une société.";

  const getMedian = (arr: number[]): number => {
    const mid = Math.floor(arr.length / 2);
    const nums = [...arr].sort((a, b) => a - b);
    return arr.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
  };

  // Calcul des métriques de la société
  const r24 = parseFinancialValue(company.revenue2024);
  const r25 = parseFinancialValue(company.revenue2025);
  const companyGrowth = r24 > 0 ? ((r25 - r24) / r24) * 100 : 0;
  const companyMargin = company.ebitdaMargin2025 || 0;
  const companyCapexRatio = company.capexRevenue2025 || 0;
  const netDebt = parseFinancialValue(company.netDebt);
  const ebitda24 = parseFinancialValue(company.ebitda2024);
  const companyLeverage = ebitda24 > 0 ? netDebt / ebitda24 : 0;

  // Calcul des médianes du secteur
  const peerGrowths = peers.map(p => {
    const pr24 = parseFinancialValue(p.revenue2024);
    const pr25 = parseFinancialValue(p.revenue2025);
    return pr24 > 0 ? ((pr25 - pr24) / pr24) * 100 : 0;
  }).filter(v => v > 0);
  const medianGrowth = getMedian(peerGrowths);

  const peerMargins = peers.map(p => p.ebitdaMargin2025).filter(v => v > 0) as number[];
  const medianMargin = getMedian(peerMargins);

  // Analyse et construction des phrases
  let growthAnalysis = "Croissance du CA 2024-25E en ligne avec le secteur.";
  if (companyGrowth > medianGrowth * 1.1) growthAnalysis = "Croissance du CA 2024-25E supérieure à la médiane du secteur.";
  else if (companyGrowth < medianGrowth * 0.9) growthAnalysis = "Croissance du CA 2024-25E inférieure à la médiane du secteur.";

  let marginAnalysis = "Marge d'EBITDA 2025E proche de la médiane sectorielle.";
  if (companyMargin > medianMargin + 1) marginAnalysis = "Marge d'EBITDA 2025E dans le haut de la fourchette du secteur, signe de pricing power.";
  else if (companyMargin < medianMargin - 1) marginAnalysis = "Marge d'EBITDA 2025E dans le bas de la fourchette du secteur.";

  let capexProfile = "Profil CAPEX/CA modéré, soutenant la génération de FCF.";
  if (companyCapexRatio > 8) capexProfile = "Intensité capitalistique (CAPEX/CA) élevée, typique d'une phase d'investissement.";
  
  let leverageProfile = `Levier financier (${companyLeverage.toFixed(1)}x) maîtrisé.`;
  if (companyLeverage > 3.5) leverageProfile = `Levier financier (${companyLeverage.toFixed(1)}x) élevé, point de vigilance sur le profil de risque.`;

  return [
      `• ${growthAnalysis}`,
      `• ${marginAnalysis}`,
      `• ${capexProfile}`,
      `• ${leverageProfile}`
  ].join('\n');
};


const AnalysisPage: React.FC<AnalysisPageProps> = ({ data }) => {
  // State for Chart
  const [period, setPeriod] = useState<"1M" | "3M" | "6M" | "1Y">("1Y");
  const [selectedTickers, setSelectedTickers] = useState<string[]>(["DEC.PA", "OUT", "SAX.DE"]);
  const [historicalData, setHistoricalData] = useState<HistoricalPricesPayload | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isChartInitiated, setIsChartInitiated] = useState(false);
  const [hoverData, setHoverData] = useState<{ index: number; x: number } | null>(null);
  const chartRef = useRef<SVGSVGElement>(null);

  // State for Company AI Tools
  const [selectedCompanyTicker, setSelectedCompanyTicker] = useState<string>(data.companies[0]?.ticker || '');
  const [companyAiResponse, setCompanyAiResponse] = useState<string | null>(null);
  const [isCompanyAiLoading, setIsCompanyAiLoading] = useState(false);
  const [aiResponseContext, setAiResponseContext] = useState<{type: 'summary' | 'kpi' | 'sensitivity', ticker: string} | null>(null);


  // State for Q&A AI
  const [meetingContext, setMeetingContext] = useState('');
  const [qaResponse, setQaResponse] = useState<string | null>(null);
  const [isQaLoading, setIsQaLoading] = useState(false);

  const companies = useMemo(() => (data.companies as Company[]) || [], [data.companies]);

  useEffect(() => {
    if (!selectedCompanyTicker && companies.length > 0) {
        setSelectedCompanyTicker(companies[0].ticker);
    }
  }, [companies, selectedCompanyTicker]);

  useEffect(() => {
    if (!isChartInitiated || selectedTickers.length === 0) {
      setHistoricalData(null);
      return;
    }
    const loadHistory = async () => {
      setLoadingHistory(true);
      try {
        const result = await fetchHistoricalPrices(period, selectedTickers);
        setHistoricalData(result);
      } catch (err) { console.error(err); }
      finally { setLoadingHistory(false); }
    };
    loadHistory();
  }, [period, selectedTickers, isChartInitiated]);

  const toggleTicker = useCallback((ticker: string) => {
    setSelectedTickers(prev => prev.includes(ticker) ? prev.filter(t => t !== ticker) : (prev.length >= 6 ? prev : [...prev, ticker]));
  }, []);

  const normalizedSeries = useMemo(() => {
    if (!historicalData || !historicalData.series.length) return [];
    return historicalData.series.map(s => {
      const base = s.points?.[0]?.price || 0;
      return { ...s, normalized: base !== 0 ? s.points.map(p => ((p.price - base) / base) * 100) : [] };
    });
  }, [historicalData]);
  
  const handleCompanyAiRequest = useCallback(async (type: 'summary' | 'kpi' | 'sensitivity') => {
      if (!selectedCompanyTicker) return;
      
      const company = companies.find(c => c.ticker === selectedCompanyTicker);
      if (!company) return;
      
      setAiResponseContext({ type, ticker: company.ticker });

      if (type === 'kpi') {
          setIsCompanyAiLoading(false);
          setCompanyAiResponse(null);
          const summary = buildKpiSummary(company, companies);
          setCompanyAiResponse(summary);
          return;
      }

      setIsCompanyAiLoading(true);
      setCompanyAiResponse(null);
      
      let prompt = '';
      switch (type) {
          case 'summary':
              prompt = `Résumer les derniers résultats de ${company.name} (${company.ticker}) en 3-4 phrases factuelles, ton neutre, sans introduction ni conclusion.`;
              break;
          case 'sensitivity':
              prompt = `Pour ${company.name} (${company.ticker}), en te basant sur les KPI disponibles (croissance CA, marges, CAPEX, FCF, leverage) et la valorisation actuelle :
- identifie les 3 principaux leviers de sensibilité pour la valeur de l’action (croissance, marge, CAPEX, régulation, etc.),
- écris 3 bullet points, chacun avec une phrase claire qui explique pourquoi ce levier est important.
Ne commente pas les consignes, ne réponds pas avec "3 bullet points? Yes" ou autre, produis seulement les 3 bullet points d’analyse, en français, ton neutre.`;
              break;
      }

      try {
          const response = await queryCompanyAI(prompt, data);
          
          if (type === 'sensitivity') {
            const trimmedResponse = response.trim();
            const lastChar = trimmedResponse.slice(-1);
            const isTruncated = !['.', ')', ']', ';'].includes(lastChar) || trimmedResponse.endsWith('...');
            
            if (isTruncated) {
              console.warn("Sensitivity analysis response seems truncated:", response);
              setCompanyAiResponse("Lecture de sensibilité momentanément indisponible (réponse IA incomplète).");
            } else {
              setCompanyAiResponse(response);
            }
          } else {
            setCompanyAiResponse(response);
          }

      } catch (err) {
          setCompanyAiResponse("Le service d'analyse est momentanément indisponible.");
      } finally {
          setIsCompanyAiLoading(false);
      }
  }, [selectedCompanyTicker, companies, data]);

  const handleQaRequest = useCallback(async (e: React.FormEvent) => {
      e.preventDefault();
      if (!meetingContext.trim()) return;
      setIsQaLoading(true);
      setQaResponse(null);
      
      try {
          const response = await queryMeetingQA(meetingContext, data);
          const trimmedResponse = response.trim();
          const lastChar = trimmedResponse.slice(-1);
          const isTruncated = !['.', '!', '?', ')', ']', ';', '"'].includes(lastChar);

          if (isTruncated && trimmedResponse.length > 0) {
              console.warn("Q&A response seems truncated:", response);
              setQaResponse("Génération Q&A momentanément indisponible (réponse IA incomplète).");
          } else {
              setQaResponse(response);
          }
      } catch (err) {
          setQaResponse("Le service de Q&A est momentanément indisponible.");
      } finally {
          setIsQaLoading(false);
      }
  }, [meetingContext, data]);
  
  const parsedQaResponse = useMemo(() => {
    if (!qaResponse) return [];
    // Handle the case where the entire response is the error message
    if (qaResponse.startsWith("Génération Q&A")) return [{ question: "Erreur", answer: qaResponse }];

    return qaResponse.split('Q:')
        .filter(Boolean) 
        .map(part => {
            const [question, ...answerParts] = part.split('R:');
            return {
                question: question.trim(),
                answer: answerParts.join('R:').trim()
            };
        }).filter(item => item.question && item.answer);
  }, [qaResponse]);

  const generateResponseTitle = () => {
    if (!aiResponseContext) return null;
    switch (aiResponseContext.type) {
      case 'summary': return `Résumé des résultats – ${aiResponseContext.ticker}`;
      case 'kpi': return `Synthèse KPI – ${aiResponseContext.ticker}`;
      case 'sensitivity': return `Lecture de sensibilité – ${aiResponseContext.ticker}`;
      default: return 'Analyse';
    }
  };

  return (
    <div className="animate-in fade-in duration-700 max-w-6xl mx-auto pb-24 space-y-12 px-2">
      
      {/* Section 1: Analyses Chiffrées */}
      <section className="space-y-8">
        <div className="bg-slate-900/40 rounded-xl md:rounded-[2.5rem] p-4 md:p-8 border border-slate-800 shadow-2xl md:backdrop-blur-md">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 md:mb-12">
            <div><h2 className="text-base md:text-xl font-bold text-white uppercase tracking-tight">Performance Relative</h2><p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Base 0 au début de période</p></div>
            <div className="flex bg-slate-800/80 p-1 rounded-2xl border border-slate-700 shadow-inner">{PERIODS.map(p => (<button key={p} onClick={() => setPeriod(p)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${period === p ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>{p}</button>))}</div>
          </div>
          <div className="overflow-x-auto no-scrollbar">
            <div className="h-52 md:h-[350px] relative mb-12 md:min-w-[600px]">
              {loadingHistory && <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 md:backdrop-blur-sm z-30 rounded-3xl"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>}
              {!isChartInitiated && !loadingHistory && (<div className="absolute inset-0 flex items-center justify-center z-20"><button onClick={() => setIsChartInitiated(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm uppercase tracking-widest px-8 py-5 rounded-2xl shadow-lg transition-all transform hover:scale-105">Charger le graphique</button></div>)}
              {isChartInitiated && !loadingHistory && normalizedSeries.length === 0 && (<div className="absolute inset-0 flex items-center justify-center z-20 text-slate-500 text-sm font-bold">Veuillez sélectionner au moins un ticker.</div>)}
              <svg ref={chartRef} viewBox="0 0 1000 400" className={`w-full h-full overflow-visible transition-opacity duration-500 ${!isChartInitiated || loadingHistory ? 'opacity-20' : 'cursor-crosshair'}`} onMouseMove={e => { const rect = chartRef.current?.getBoundingClientRect(); if (!rect || !normalizedSeries[0]) return; const x = e.clientX - rect.left; const dataCount = normalizedSeries[0].normalized.length; if (dataCount < 1) return; let index = Math.round((x / rect.width) * (dataCount - 1)); index = Math.max(0, Math.min(dataCount - 1, index)); setHoverData({ index, x: (index / (dataCount - 1)) * 1000 }); }} onMouseLeave={() => setHoverData(null)}>{[40, 20, 0, -20, -40].map(y => (<line key={y} x1="0" y1={400 - ((y + 40) / 80) * 400} x2="1000" y2={400 - ((y + 40) / 80) * 400} stroke="#1e293b" strokeWidth="1" strokeDasharray={y === 0 ? "0" : "4 4"} />))}{hoverData && <line x1={hoverData.x} y1="0" x2={hoverData.x} y2="400" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />}{normalizedSeries.map((s, idx) => { if (!selectedTickers.includes(s.ticker) || s.normalized.length < 2) return null; const points = s.normalized.map((p, i) => `${(i / (s.normalized.length - 1)) * 1000},${400 - ((p + 40) / 80) * 400}`).join(' L '); return (<path key={s.ticker} d={`M ${points}`} fill="none" stroke={COLORS[idx % COLORS.length]} strokeWidth="3" strokeLinecap="round" className="transition-all duration-500" />);})}</svg>
            </div>
            <div className="space-y-2 mt-8 md:min-w-[600px]">
              <div className="grid grid-cols-12 px-6 py-2 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800/50"><div className="col-span-6">Entreprise</div><div className="col-span-3 text-right">Cours</div><div className="col-span-3 text-right">Performance</div></div>
              {companies.map((c, idx) => { const isSelected = selectedTickers.includes(c.ticker); const series = normalizedSeries.find(s => s.ticker === c.ticker); const dataIndex = hoverData ? hoverData.index : (series?.normalized.length ? series.normalized.length - 1 : 0); const perfValue = (series && series.normalized && series.normalized.length > 0) ? (series.normalized[dataIndex] || 0) : 0; return (<button key={c.ticker} onClick={() => toggleTicker(c.ticker)} className={`w-full grid grid-cols-12 items-center px-6 py-4 rounded-2xl border transition-all text-left group ${isSelected ? 'bg-slate-800/80 border-slate-700 shadow-lg' : 'bg-transparent border-transparent opacity-40 hover:opacity-100'}`}><div className="col-span-6 flex items-center gap-4"><div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: isSelected ? COLORS[idx % COLORS.length] : '#334155' }}></div><div><span className="text-xs font-black text-white uppercase tracking-wider">{c.ticker}</span><span className="hidden md:inline text-[10px] text-slate-500 ml-2 font-bold">{c.name}</span></div></div><div className="col-span-3 text-right text-xs font-bold text-slate-300">{c.price.toFixed(2)}</div><div className={`col-span-3 text-right text-xs font-black ${perfValue >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{perfValue >= 0 ? '+' : ''}{perfValue.toFixed(2)}%</div></button>); })}
            </div>
          </div>
        </div>
        <SectorBenchmark data={data} initialMetric="evEbitda" initialYear="Forward" showControls={true} />
      </section>

      {/* Section 2: Outils IA par Société */}
      <section className="bg-slate-900/40 p-4 md:p-8 rounded-xl md:rounded-[2.5rem] border border-slate-800 shadow-xl md:backdrop-blur-sm">
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-base md:text-lg font-bold text-white uppercase tracking-tight">Outils d'Analyse par Société</h3>
          <AIBadge />
        </div>
        
        <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50 flex flex-col sm:flex-row gap-4 items-center mb-6">
          <select value={selectedCompanyTicker} onChange={e => setSelectedCompanyTicker(e.target.value)} className="w-full sm:w-auto bg-slate-900 border border-slate-700 text-white text-sm font-bold p-4 rounded-xl outline-none hover:border-emerald-500/50 transition-colors shadow-lg">
            {companies.map(c => <option key={c.ticker} value={c.ticker}>{c.name}</option>)}
          </select>
          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button onClick={() => handleCompanyAiRequest('summary')} disabled={isCompanyAiLoading} className="px-4 py-3 bg-emerald-600/80 rounded-xl font-black text-[10px] uppercase hover:bg-emerald-500 disabled:opacity-50 text-white transition-colors">Résumer Résultats</button>
            <button onClick={() => handleCompanyAiRequest('kpi')} className="px-4 py-3 bg-emerald-600/80 rounded-xl font-black text-[10px] uppercase hover:bg-emerald-500 disabled:opacity-50 text-white transition-colors">Lecture Analytique KPI</button>
            <button onClick={() => handleCompanyAiRequest('sensitivity')} disabled={isCompanyAiLoading} className="px-4 py-3 bg-emerald-600/80 rounded-xl font-black text-[10px] uppercase hover:bg-emerald-500 disabled:opacity-50 text-white transition-colors">Lecture de sensibilité</button>
          </div>
        </div>

        {(isCompanyAiLoading || companyAiResponse) && (
          <div className="p-6 bg-slate-950/50 rounded-2xl border border-slate-800 animate-in slide-in-from-top-2">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-4">{generateResponseTitle()}</h4>
            <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-line max-h-64 overflow-y-auto pr-2">
                {isCompanyAiLoading ? "Analyse en cours..." : companyAiResponse}
            </div>
          </div>
        )}
      </section>
      
      {/* Section 3: Préparation réunion */}
      <section className="bg-slate-900/40 p-4 md:p-8 rounded-xl md:rounded-[2.5rem] border border-slate-800 shadow-xl md:backdrop-blur-sm">
        <div className="flex justify-between items-center mb-6"><h3 className="text-base md:text-lg font-bold text-white uppercase tracking-tight">Préparation Réunion (Q&A IA)</h3><AIBadge /></div>
        <form onSubmit={handleQaRequest} className="flex flex-col sm:flex-row gap-3 mb-6">
          <textarea value={meetingContext} onChange={e => setMeetingContext(e.target.value)} placeholder="Contexte: Roadshow US, focus DOOH, inflation..." rows={2} className="flex-1 bg-slate-800/50 border border-slate-700 rounded-2xl px-6 py-4 outline-none text-white text-sm focus:ring-2 focus:ring-emerald-500/50 transition-all resize-none" />
          <button type="submit" disabled={isQaLoading} className="bg-emerald-600 px-8 py-4 rounded-2xl font-black text-[10px] uppercase hover:bg-emerald-500 disabled:opacity-50 text-white transition-colors">
            {isQaLoading ? "..." : "Générer Q&A"}
          </button>
        </form>
        {isQaLoading && <div className="p-6 text-center text-slate-500 text-sm">Génération du Q&A en cours...</div>}
        {qaResponse && (
            <div className="p-6 bg-slate-950/50 rounded-2xl border border-slate-800 space-y-6 animate-in slide-in-from-top-2">
                {parsedQaResponse.map((item, index) => (
                    <div key={index} className="border-b border-slate-800/50 pb-4 last:border-b-0 last:pb-0">
                        <p className="font-bold text-emerald-400 text-sm mb-2">Q: {item.question}</p>
                        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">R: {item.answer}</p>
                    </div>
                ))}
            </div>
        )}
      </section>
    </div>
  );
};

export default AnalysisPage;
