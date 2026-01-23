
import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardOverview from './components/DashboardOverview';
import CompanyDetail from './components/CompanyDetail';
import NewsPage from './components/NewsPage';
import AnalysisPage from './components/AnalysisPage';
import DocumentsPage from './components/DocumentsPage';
import CalendarPage from './components/CalendarPage';
import SourcesPage from './components/SourcesPage';
import ScreenerPage from './components/ScreenerPage';
import { Company, SectorData, AnalystRating } from './types';
import { COMPANIES, NEWS, EVENTS, DOCUMENTS } from './constants';
import { fetchRealTimeOOHData, fetchOOHQuotes, fetchOOHRatings, fetchOOHTargetPrices, FALLBACK_COMPANIES } from './services/aiService';
import { fetchOOHNews, fetchOOHHighlights } from './services/newsService';
import { fetchOOHDocuments } from './services/documentService';
import { fetchOOHAgenda } from './services/agendaService';
import { parseFinancialValue, calculateEV } from './utils';

const CACHE_KEY = 'ooh_insight_v28_persistence';
const FINANCIALS_TTL = 5 * 60 * 1000;
const NEWS_TTL = 15 * 60 * 1000;
const DOCS_TTL = 120 * 60 * 1000;
const CALENDAR_TTL = 240 * 60 * 1000;
const HIGHLIGHTS_TTL = 24 * 60 * 60 * 1000;
const RATINGS_TTL = 24 * 60 * 60 * 1000; // 24h pour les ratings

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'news' | 'analysis' | 'docs' | 'calendar' | 'sources' | 'screener'>('overview');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  
  const [financialLoading, setFinancialLoading] = useState(false);
  const [newsLoading, setNewsLoading] = useState(false);
  const [docsLoading, setDocsLoading] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [highlightsLoading, setHighlightsLoading] = useState(false);
  
  const [loadingStatus, setLoadingStatus] = useState('');
  
  const [data, setData] = useState<SectorData & { timestamps: Record<string, number> }>(() => {
    const saved = localStorage.getItem(CACHE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { 
          ...parsed, 
          companies: parsed.companies?.length > 0 ? parsed.companies : COMPANIES, 
          timestamps: parsed.timestamps || {} 
        };
      } catch (e) { console.error(e); }
    }
    
    // Si pas de cache, enrichir les constantes avec les données de fallback
    const enrichedCompanies = COMPANIES.map(comp => {
      const fallbackData = FALLBACK_COMPANIES.find(fb => fb.ticker === comp.ticker);
      // Fusionne, en s'assurant que les données de marché du fallback (prix, etc.) ne sont pas utilisées
      return fallbackData ? { ...comp, ...fallbackData, price: 0, change: 0, marketCap: '--' } : comp;
    });

    return { companies: enrichedCompanies, news: NEWS, highlights: [], events: EVENTS, documents: DOCUMENTS, companyDocuments: {}, analysis: "", marketOpportunities: [], marketRisks: [], lastUpdated: 'Initialisation...', timestamps: {} };
  });

  useEffect(() => {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  }, [data]);

  const refreshFinancials = useCallback(async () => {
    // NOTE: Le rendement du dividende (yield) est calculé localement à partir du cours
    // et du dividende par action (DPS), il n'est pas extrait directement depuis l'IA.
    setFinancialLoading(true);
    setLoadingStatus('Synchro des cours...');
    try {
      const tickers = data.companies.map(c => c.ticker).filter(Boolean) as string[];
      const quotes = await fetchOOHQuotes(tickers);
      
      setData(prev => {
        const updatedCompanies = prev.companies.map(base => {
          const quote = quotes.find(q => q.ticker.toUpperCase() === base.ticker?.toUpperCase());
          if (!quote || !base.sharesOutstanding) return base;

          const mkt = quote.price * base.sharesOutstanding;
          const debt = parseFinancialValue(base.netDebt);
          const ev = calculateEV(mkt, debt);

          const getV = (val: any) => parseFinancialValue(val);
          const r24 = getV(base.revenue2024), r25 = getV(base.revenue2025), r26 = getV(base.revenue2026);
          const eb24 = getV(base.ebitda2024), eb25 = getV(base.ebitda2025), eb26 = getV(base.ebitda2026);
          const ebit24 = getV(base.ebit2024), ebit25 = getV(base.ebit2025), ebit26 = getV(base.ebit2026);
          const inc24 = getV(base.netIncome2024), inc25 = getV(base.netIncome2025), inc26 = getV(base.netIncome2026);
          const cap24 = getV(base.capex2024), cap25 = getV(base.capex2025), cap26 = getV(base.capex2026);
          const dps24 = getV(base.dividendPerShare2024), dps25 = getV(base.dividendPerShare2025), dps26 = getV(base.dividendPerShare2026);

          const div = (n: number, d: number) => (d > 0 ? n / d : 0);
          const price = quote.price;
          const yield24 = div(dps24, price) * 100, yield25 = div(dps25, price) * 100, yield26 = div(dps26, price) * 100;

          return {
            ...base,
            price: quote.price,
            change: quote.change,
            marketCap: `${mkt.toFixed(0)} M`,
            ev: `${ev.toFixed(0)} M`,
            dividendYield: yield24 > 0 ? `${yield24.toFixed(1)}%` : '--',
            dividendYieldNumeric: yield24,
            dividendYield2025: yield25 > 0 ? `${yield25.toFixed(1)}%` : '--',
            dividendYield2025Numeric: yield25,
            dividendYield2026: yield26 > 0 ? `${yield26.toFixed(1)}%` : '--',
            dividendYield2026Numeric: yield26,
            ebitdaMargin: eb24 > 0 && r24 > 0 ? (eb24 / r24) * 100 : (base.ebitdaMargin || 0),
            evEbitda: div(ev, eb24), evEbitdaForward: div(ev, eb25), evEbitdaNext: div(ev, eb26),
            evEbit: div(ev, ebit24), evEbitForward: div(ev, ebit25), evEbitNext: div(ev, ebit26),
            evSales: div(ev, r24), evSalesForward: div(ev, r25), evSalesNext: div(ev, r26),
            per: div(mkt, inc24), perForward: div(mkt, inc25), perNext: div(mkt, inc26),
            evEbitdaCapex: div(ev, (eb24 - cap24)), evEbitdaCapexForward: div(ev, (eb25 - cap25)), evEbitdaCapexNext: div(ev, (eb26 - cap26)),
          };
        });
        return {
          ...prev,
          companies: updatedCompanies,
          lastUpdated: new Date().toLocaleString(),
          timestamps: { ...prev.timestamps, financials: Date.now() }
        };
      });
    } catch(err) { console.error(err); }
    finally { setFinancialLoading(false); setLoadingStatus(''); }
  }, [data.companies]);

  const refreshFundamentals = useCallback(async (targetTickers?: string[]) => {
    setFinancialLoading(true);
    const tickers = targetTickers || data.companies.map(c => c.ticker).filter(Boolean) as string[];
    const now = Date.now();
    
    setLoadingStatus('Synchro des objectifs de cours...');
    const targetsResult = await fetchOOHTargetPrices(tickers);
    
    let ratingsResult: { ticker: string; rating: AnalystRating }[] = [];
    if (now - (data.timestamps?.ratings || 0) > RATINGS_TTL) {
        setLoadingStatus('Synchro des ratings...');
        ratingsResult = await fetchOOHRatings(tickers);
    }

    setLoadingStatus('Synchro des fondamentaux...');
    try {
      const syncResult = await fetchRealTimeOOHData(tickers);
      
      setData(prev => {
        const merged = prev.companies.map(base => {
          const u = syncResult.companies.find((x: any) => x.ticker.toUpperCase() === base.ticker?.toUpperCase());
          const newRatingData = ratingsResult.find(r => r.ticker.toUpperCase() === base.ticker?.toUpperCase());
          const newTargetData = targetsResult.find(t => t.ticker.toUpperCase() === base.ticker?.toUpperCase());
          
          const companyData = u ? { ...base, ...u } : { ...base };
          if (newRatingData) companyData.rating = newRatingData.rating;
          if (newTargetData && newTargetData.targetPrice !== null) {
            companyData.targetPrice = newTargetData.targetPrice;
          }
          if (!u) return companyData;

          const mkt = u.price * u.sharesOutstanding;
          const debt = parseFinancialValue(u.netDebt);
          const ev = calculateEV(mkt, debt);
          
          const getV = (val: any) => parseFinancialValue(val);
          const r24 = getV(u.revenue2024), r25 = getV(u.revenue2025), r26 = getV(u.revenue2026);
          const eb24 = getV(u.ebitda2024), eb25 = getV(u.ebitda2025), eb26 = getV(u.ebitda2026);
          const ebit24 = getV(u.ebit2024), ebit25 = getV(u.ebit2025), ebit26 = getV(u.ebit2026);
          const inc24 = getV(u.netIncome2024), inc25 = getV(u.netIncome2025), inc26 = getV(u.netIncome2026);
          const cap24 = getV(u.capex2024), cap25 = getV(u.capex2025), cap26 = getV(u.capex2026);
          const dps24 = getV(u.dividendPerShare2024), dps25 = getV(u.dividendPerShare2025), dps26 = getV(u.dividendPerShare2026);

          const div = (n: number, d: number) => (d > 0 ? n / d : 0);
          const price = u.price;
          const yield24 = div(dps24, price) * 100, yield25 = div(dps25, price) * 100, yield26 = div(dps26, price) * 100;
          
          return { 
            ...companyData, 
            marketCap: `${mkt.toFixed(0)} M`,
            ev: ev > 0 ? `${ev.toFixed(0)} M` : companyData.ev,
            dividendYield: yield24 > 0 ? `${yield24.toFixed(1)}%` : '--',
            dividendYieldNumeric: yield24,
            dividendYield2025: yield25 > 0 ? `${yield25.toFixed(1)}%` : '--',
            dividendYield2025Numeric: yield25,
            dividendYield2026: yield26 > 0 ? `${yield26.toFixed(1)}%` : '--',
            dividendYield2026Numeric: yield26,
            evEbitda: div(ev, eb24), evEbitdaForward: div(ev, eb25), evEbitdaNext: div(ev, eb26),
            evEbit: div(ev, ebit24), evEbitForward: div(ev, ebit25), evEbitNext: div(ev, ebit26),
            evSales: div(ev, r24), evSalesForward: div(ev, r25), evSalesNext: div(ev, r26),
            per: div(mkt, inc24), perForward: div(mkt, inc25), perNext: div(mkt, inc26),
            evEbitdaCapex: div(ev, (eb24 - cap24)), evEbitdaCapexForward: div(ev, (eb25 - cap25)), evEbitdaCapexNext: div(ev, (eb26 - cap26)),
            ebitdaMargin: eb24 > 0 && r24 > 0 ? (eb24 / r24) * 100 : 0,
          };
        });

        const newTimestamps: Record<string, number> = { ...prev.timestamps, financials: Date.now(), fundamentals: Date.now() };
        if (ratingsResult.length > 0) newTimestamps.ratings = Date.now();

        return { 
          ...prev, 
          companies: merged, 
          lastUpdated: syncResult.lastUpdated || new Date().toLocaleString(), 
          timestamps: newTimestamps 
        };
      });
    } catch (err) { console.error(err); }
    finally { setFinancialLoading(false); setLoadingStatus(''); }
  }, [data.companies, data.timestamps]);

  const refreshNews = useCallback(async (maxCount: number = 5) => {
    setNewsLoading(true);
    setLoadingStatus('Actualités...');
    try {
      const news = await fetchOOHNews(maxCount);
      setData(prev => ({ ...prev, news, timestamps: { ...prev.timestamps, news: Date.now() } }));
    } catch (err) { console.error(err); }
    finally { setNewsLoading(false); setLoadingStatus(''); }
  }, []);

  const refreshHighlights = useCallback(async () => {
    setHighlightsLoading(true);
    setLoadingStatus('Faits marquants...');
    try {
      const highlights = await fetchOOHHighlights();
      setData(prev => ({ ...prev, highlights, timestamps: { ...prev.timestamps, highlights: Date.now() } }));
    } catch (err) { console.error(err); }
    finally { setHighlightsLoading(false); setLoadingStatus(''); }
  }, []);

  const refreshDocs = useCallback(async () => {
    setDocsLoading(true);
    setLoadingStatus('Documents...');
    try {
      const docsMap = await fetchOOHDocuments();
      setData(prev => ({ ...prev, companyDocuments: { ...prev.companyDocuments, ...docsMap }, timestamps: { ...prev.timestamps, docs: Date.now() } }));
    } catch (err) { console.error(err); }
    finally { setDocsLoading(false); setLoadingStatus(''); }
  }, []);

  const refreshCalendar = useCallback(async () => {
    setCalendarLoading(true);
    setLoadingStatus('Agenda...');
    try {
      const events = await fetchOOHAgenda();
      setData(prev => ({ ...prev, events, timestamps: { ...prev.timestamps, calendar: Date.now() } }));
    } catch (err) { console.error(err); }
    finally { setCalendarLoading(false); setLoadingStatus(''); }
  }, []);

  const handleAddTicker = useCallback((ticker: string) => {
    return refreshFundamentals([ticker]);
  }, [refreshFundamentals]);

  useEffect(() => {
    const now = Date.now();
    if (now - (data.timestamps?.financials || 0) > FINANCIALS_TTL) {
      refreshFinancials();
    }
    const delayedFetches = setTimeout(() => {
      if (now - (data.timestamps?.news || 0) > NEWS_TTL) refreshNews();
      if (now - (data.timestamps?.highlights || 0) > HIGHLIGHTS_TTL) refreshHighlights();
    }, 2500);
    return () => clearTimeout(delayedFetches);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabChange = useCallback((tab: 'overview' | 'news' | 'analysis' | 'docs' | 'calendar' | 'sources' | 'screener') => {
    setSelectedCompany(null);
    setActiveTab(tab);
    const now = Date.now();
    if (tab === 'docs' && (now - (data.timestamps?.docs || 0) > DOCS_TTL)) refreshDocs();
    if (tab === 'calendar' && (now - (data.timestamps?.calendar || 0) > CALENDAR_TTL)) refreshCalendar();
  }, [data.timestamps, refreshDocs, refreshCalendar]);

  const handleGlobalRefresh = useCallback(() => {
    if (selectedCompany) {
      refreshFinancials(); // Refresh léger pour la vue détaillée aussi
      return;
    }
    switch (activeTab) {
      case 'sources':
        refreshFundamentals(); // Synchro lourde uniquement depuis la page "Data"
        break;
      case 'news':
        refreshNews(20);
        refreshHighlights();
        break;
      case 'docs':
        refreshDocs();
        break;
      case 'calendar':
        refreshCalendar();
        break;
      default:
        refreshFinancials(); // Rafraîchissement léger pour toutes les autres pages
        break;
    }
  }, [activeTab, selectedCompany, refreshFinancials, refreshFundamentals, refreshNews, refreshHighlights, refreshDocs, refreshCalendar]);

  const handleSelectCompany = useCallback((company: Company) => {
    setSelectedCompany(company);
  }, []);

  const renderContent = () => {
    if (selectedCompany) return <CompanyDetail company={selectedCompany} peers={data.companies as Company[]} onSelectCompany={handleSelectCompany} />;
    switch (activeTab) {
      case 'overview': return <DashboardOverview data={data} onSelectCompany={handleSelectCompany} />;
      case 'news': return <NewsPage news={data.news} highlights={data.highlights} loading={newsLoading || highlightsLoading} />;
      case 'analysis': return <AnalysisPage data={data} />;
      case 'docs': return <DocumentsPage docs={data.documents} data={data} loading={docsLoading} />;
      case 'calendar': return <CalendarPage events={data.events} loading={calendarLoading} />;
      case 'sources': return <SourcesPage data={data} onAddTicker={handleAddTicker} />;
      case 'screener': return <ScreenerPage data={data} onSelectCompany={handleSelectCompany} />;
      default: return <DashboardOverview data={data} onSelectCompany={handleSelectCompany} />;
    }
  };

  const isCurrentViewLoading = financialLoading || newsLoading || docsLoading || calendarLoading || highlightsLoading;

  return (
    <div className="flex min-h-screen bg-slate-900 text-slate-50 overflow-x-hidden">
      <Sidebar activeTab={selectedCompany ? '' : activeTab} setActiveTab={handleTabChange} />
      <main className="flex-1 md:ml-60 flex flex-col p-4 md:p-8 relative">
        <Header 
          title={selectedCompany ? selectedCompany.name : "OOH Terminal"} 
          subtitle={loadingStatus || `Dernière synchro : ${data.lastUpdated}`} 
          onBack={selectedCompany ? () => setSelectedCompany(null) : undefined} 
          onRefresh={handleGlobalRefresh} 
          loading={isCurrentViewLoading}
          onScreenerClick={() => {
            setActiveTab('screener');
            setSelectedCompany(null);
          }}
        />
        <div>
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
