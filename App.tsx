
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import { Company, SectorData, AnalystRating, NewsItem, RawCompanyFromAI } from './types';
import { COMPANIES, NEWS, EVENTS, DOCUMENTS } from './constants';
import { fetchRealTimeOOHData, fetchOOHQuotes, fetchOOHRatings, fetchOOHTargetPrices, FALLBACK_COMPANIES } from './services/aiService';
import { fetchOOHNews, fetchOOHHighlights, fetchOOHSentimentFromNews } from './services/newsService';
import { fetchOOHDocuments } from './services/documentService';
import { fetchOOHAgenda } from './services/agendaService';
import { computeFinancialRatios, formatAge } from './utils';

const CACHE_KEY = 'ooh_insight_v28_persistence';
const FINANCIALS_TTL = 5 * 60 * 1000;
const FUNDAMENTALS_TTL = 60 * 60 * 1000; // 1 heure
const NEWS_TTL = 15 * 60 * 1000;
const SENTIMENT_TTL = 2 * 60 * 60 * 1000; // 2 heures
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
        const companiesFromStorage = parsed.companies?.length > 0 ? parsed.companies : COMPANIES;

        const repairedCompanies = companiesFromStorage.map(comp => {
          const fallbackData = FALLBACK_COMPANIES.find(fb => fb.ticker === comp.ticker);
          let baseData = { ...comp };

          if (fallbackData) {
            const withFallback = { ...baseData, ...fallbackData };
            withFallback.price = baseData.price;
            withFallback.change = baseData.change;
            baseData = withFallback;
          }
          
          const ratios = computeFinancialRatios(baseData);
          return { ...baseData, ...ratios };
        });

        return { 
          ...parsed, 
          companies: repairedCompanies, 
          timestamps: parsed.timestamps || {},
          aiStatus: parsed.aiStatus || { lastSuccess: null, lastError: null },
        };
      } catch (e) { console.error("Could not parse saved data, re-initializing.", e); }
    }
    
    // Si pas de cache, `COMPANIES` est maintenant la source de vérité complète.
    const initialCompanies = COMPANIES.map(comp => {
      const ratios = computeFinancialRatios(comp);
      // On s'assure que price & change sont à 0 au démarrage
      return { ...comp, ...ratios, price: 0, change: 0 };
    });

    return { companies: initialCompanies, news: NEWS, highlights: [], events: EVENTS, documents: DOCUMENTS, companyDocuments: {}, analysis: "", marketOpportunities: [], marketRisks: [], lastUpdated: 'Initialisation...', timestamps: {}, aiStatus: { lastSuccess: null, lastError: null } };
  });

  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  }, [data]);

  const handleAiSuccess = useCallback(() => {
    setData(prev => ({ ...prev, aiStatus: { ...prev.aiStatus, lastSuccess: Date.now() } }));
  }, []);

  const handleAiError = useCallback(() => {
    setData(prev => ({ ...prev, aiStatus: { ...prev.aiStatus, lastError: Date.now() } }));
  }, []);

  const refreshFinancials = useCallback(async () => {
    setFinancialLoading(true);
    setLoadingStatus('Synchro des cours...');
    try {
      const tickers = data.companies.map(c => c.ticker).filter(Boolean) as string[];
      const quotes = await fetchOOHQuotes(tickers);
      handleAiSuccess();
      
      setData(prev => {
        const updatedCompanies = prev.companies.map(base => {
          const quote = quotes.find(q => q.ticker.toUpperCase() === base.ticker?.toUpperCase());
          if (!quote) return base;
          const updatedCompanyData = { ...base, price: quote.price, change: quote.change };
          const ratios = computeFinancialRatios(updatedCompanyData);
          return { ...updatedCompanyData, ...ratios };
        });

        return { ...prev, companies: updatedCompanies, lastUpdated: new Date().toLocaleString(), timestamps: { ...prev.timestamps, financials: Date.now() } };
      });
    } catch(err) { console.error(err); handleAiError(); }
    finally { setFinancialLoading(false); setLoadingStatus(''); }
  }, [data.companies, handleAiSuccess, handleAiError]);

  const refreshFundamentals = useCallback(async (targetTickers?: string[]) => {
    setFinancialLoading(true);
    const tickers = targetTickers || data.companies.map(c => c.ticker).filter(Boolean) as string[];
    const now = Date.now();
    
    try {
      setLoadingStatus('Synchro des objectifs de cours...');
      const targetsResult = await fetchOOHTargetPrices(tickers);
      handleAiSuccess();
      
      let ratingsResult: { ticker: string; rating: AnalystRating }[] = [];
      if (now - (data.timestamps?.ratings || 0) > RATINGS_TTL) {
          setLoadingStatus('Synchro des ratings...');
          ratingsResult = await fetchOOHRatings(tickers);
          handleAiSuccess();
      }

      setLoadingStatus('Synchro des fondamentaux...');
      const syncResult = await fetchRealTimeOOHData(tickers);
      handleAiSuccess();
      
      setData(prev => {
        const merged = prev.companies.map(base => {
          const fallbackData = FALLBACK_COMPANIES.find(fb => fb.ticker === base.ticker) || {};
          const rawData = syncResult.companies.find((x: RawCompanyFromAI) => x.ticker.toUpperCase() === base.ticker?.toUpperCase());
          const newRatingData = ratingsResult.find(r => r.ticker.toUpperCase() === base.ticker?.toUpperCase());
          const newTargetData = targetsResult.find(t => t.ticker.toUpperCase() === base.ticker?.toUpperCase());
          
          // Start with a full set of fallback data, layer current state, then layer new AI data.
          // This prevents null/undefined from AI from erasing existing valid data.
          let updatedCompanyData = { ...fallbackData, ...base };

          if (rawData) {
            const definedRawData = Object.fromEntries(
              Object.entries(rawData).filter(([_, value]) => value !== null && value !== undefined)
            );
            updatedCompanyData = { ...updatedCompanyData, ...definedRawData };
          }
          
          if (newRatingData) {
            updatedCompanyData.rating = newRatingData.rating;
          }
          if (newTargetData && newTargetData.targetPrice !== null) {
            updatedCompanyData.targetPrice = newTargetData.targetPrice;
          }

          const ratios = computeFinancialRatios(updatedCompanyData);

          return { ...updatedCompanyData, ...ratios };
        });
        const newTimestamps: Record<string, number> = { ...prev.timestamps, financials: Date.now(), fundamentals: Date.now() };
        if (ratingsResult.length > 0) newTimestamps.ratings = Date.now();
        return { ...prev, companies: merged, lastUpdated: syncResult.lastUpdated || new Date().toLocaleString(), timestamps: newTimestamps };
      });
    } catch (err) { console.error(err); handleAiError(); }
    finally { setFinancialLoading(false); setLoadingStatus(''); }
  }, [data.companies, data.timestamps, handleAiSuccess, handleAiError]);

  const refreshNews = useCallback(async (maxCount: number = 5) => {
    console.log('refreshNews called with maxCount:', maxCount);
    setNewsLoading(true);
    setLoadingStatus('Actualités...');
    try {
      const newsItems = await fetchOOHNews(maxCount);
      handleAiSuccess();
      const now = Date.now();
      let sentimentPayload = {}, sentimentTimestamp = {};
      
      if (now - (dataRef.current.timestamps.sentiment || 0) > SENTIMENT_TTL) {
        setLoadingStatus('Analyse du sentiment...');
        const sentimentAnalysis = await fetchOOHSentimentFromNews(newsItems);
        handleAiSuccess();
        sentimentPayload = { sentiment: { ...sentimentAnalysis, lastUpdated: new Date().toLocaleString() } };
        sentimentTimestamp = { sentiment: now };
      }
      setData(prev => ({ ...prev, news: newsItems, ...sentimentPayload, timestamps: { ...prev.timestamps, news: now, ...sentimentTimestamp } }));
    } catch (err) { console.error("refreshNews failed:", err); handleAiError(); } 
    finally { setNewsLoading(false); setLoadingStatus(''); }
  }, [handleAiSuccess, handleAiError]);

  const refreshHighlights = useCallback(async () => {
    setHighlightsLoading(true);
    setLoadingStatus('Faits marquants...');
    try {
      const highlights = await fetchOOHHighlights();
      handleAiSuccess();
      setData(prev => ({ ...prev, highlights, timestamps: { ...prev.timestamps, highlights: Date.now() } }));
    } catch (err) { console.error(err); handleAiError(); }
    finally { setHighlightsLoading(false); setLoadingStatus(''); }
  }, [handleAiSuccess, handleAiError]);

  const refreshDocs = useCallback(async () => {
    setDocsLoading(true);
    setLoadingStatus('Documents...');
    try {
      const tickers = dataRef.current.companies.map(c => c.ticker).filter(Boolean) as string[];
      if (tickers.length === 0) {
        setDocsLoading(false);
        return;
      }
      const docsMap = await fetchOOHDocuments(tickers);
      handleAiSuccess();
      setData(prev => ({ ...prev, companyDocuments: { ...prev.companyDocuments, ...docsMap }, timestamps: { ...prev.timestamps, docs: Date.now() } }));
    } catch (err) { console.error(err); handleAiError(); }
    finally { setDocsLoading(false); setLoadingStatus(''); }
  }, [handleAiSuccess, handleAiError]);

  const refreshCalendar = useCallback(async () => {
    console.log('refreshCalendar called.');
    setCalendarLoading(true);
    setLoadingStatus('Agenda...');
    try {
      const events = await fetchOOHAgenda();
      handleAiSuccess();
      setData(prev => ({ ...prev, events, timestamps: { ...prev.timestamps, calendar: Date.now() } }));
    } catch (err) { console.error(err); handleAiError(); }
    finally { setCalendarLoading(false); setLoadingStatus(''); }
  }, [handleAiSuccess, handleAiError]);

  const handleAddTicker = useCallback((ticker: string) => {
    return refreshFundamentals([ticker]);
  }, [refreshFundamentals]);

  useEffect(() => {
    console.log('App Mounted: Checking for initial data refresh.');
    const now = Date.now();
    
    if (now - (data.timestamps?.financials || 0) > FINANCIALS_TTL) {
      console.log('Financials TTL expired, calling refreshFinancials()');
      refreshFinancials();
    }
    
    if (now - (data.timestamps?.news || 0) > NEWS_TTL) {
      console.log('News TTL expired, calling refreshNews()');
      refreshNews();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabChange = useCallback((tab: 'overview' | 'news' | 'analysis' | 'docs' | 'calendar' | 'sources' | 'screener') => {
    setSelectedCompany(null);
    setActiveTab(tab);
  }, []);

  const handleGlobalRefresh = useCallback(() => {
    if (selectedCompany) {
      refreshFinancials();
      return;
    }
    switch (activeTab) {
      case 'sources': refreshFundamentals(); break;
      case 'news': refreshNews(20); refreshHighlights(); break;
      case 'docs': refreshDocs(); break;
      case 'calendar': refreshCalendar(); break;
      default: refreshFinancials(); break;
    }
  }, [activeTab, selectedCompany, refreshFinancials, refreshFundamentals, refreshNews, refreshHighlights, refreshDocs, refreshCalendar]);

  const handleSelectCompany = useCallback((company: Company) => {
    setSelectedCompany(company);
  }, []);

  const dataAges = useMemo(() => ({
    financials: formatAge(data.timestamps.financials),
    news: formatAge(data.timestamps.news),
    calendar: formatAge(data.timestamps.calendar),
    docs: formatAge(data.timestamps.docs),
  }), [data.timestamps]);

  const renderContent = () => {
    if (selectedCompany) return <CompanyDetail company={selectedCompany} peers={data.companies as Company[]} onSelectCompany={handleSelectCompany} />;
    switch (activeTab) {
      case 'overview': return <DashboardOverview data={data} onSelectCompany={handleSelectCompany} />;
      case 'news': return <NewsPage news={data.news} highlights={data.highlights} sentiment={data.sentiment} loading={newsLoading || highlightsLoading} />;
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
      <Sidebar activeTab={selectedCompany ? '' : activeTab} setActiveTab={handleTabChange} aiStatus={data.aiStatus} />
      <main className="flex-1 md:ml-60 flex flex-col p-4 md:p-8 relative">
        <Header 
          title={selectedCompany ? selectedCompany.name : "OOH Terminal"} 
          subtitle={loadingStatus || `Dernière synchro : ${data.lastUpdated}`} 
          onBack={selectedCompany ? () => setSelectedCompany(null) : undefined} 
          onRefresh={handleGlobalRefresh} 
          loading={isCurrentViewLoading}
          dataAges={dataAges}
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
