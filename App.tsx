
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
import { Company, SectorData } from './types';
import { COMPANIES, NEWS, EVENTS, DOCUMENTS } from './constants';
import { fetchRealTimeOOHData } from './services/aiService';
import { fetchOOHNews } from './services/newsService';
import { fetchOOHDocuments } from './services/documentService';
import { fetchOOHAgenda } from './services/agendaService';
import { parseFinancialValue, calculateEV, parsePercent } from './utils';

const CACHE_KEY = 'ooh_insight_v28_persistence';
const FINANCIALS_TTL = 30 * 60 * 1000;
const NEWS_TTL = 15 * 60 * 1000;
const DOCS_TTL = 120 * 60 * 1000;
const CALENDAR_TTL = 240 * 60 * 1000;

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'news' | 'analysis' | 'docs' | 'calendar' | 'sources' | 'screener'>('overview');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  
  // États de chargement indépendants
  const [financialLoading, setFinancialLoading] = useState(false);
  const [newsLoading, setNewsLoading] = useState(false);
  const [docsLoading, setDocsLoading] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  
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
    return { companies: COMPANIES, news: NEWS, events: EVENTS, documents: DOCUMENTS, companyDocuments: {}, analysis: "", marketOpportunities: [], marketRisks: [], lastUpdated: 'Initialisation...', timestamps: {} };
  });

  // Persistance automatique
  useEffect(() => {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  }, [data]);

  // Chargement initial intelligent
  useEffect(() => {
    const now = Date.now();
    if (now - (data.timestamps?.financials || 0) > FINANCIALS_TTL) refreshFinancials();
    if (now - (data.timestamps?.news || 0) > NEWS_TTL) refreshNews();
    if (now - (data.timestamps?.docs || 0) > DOCS_TTL) refreshDocs();
    if (now - (data.timestamps?.calendar || 0) > CALENDAR_TTL) refreshCalendar();
  }, []);

  const refreshFinancials = async (targetTickers?: string[]) => {
    setFinancialLoading(true);
    setLoadingStatus('Données financières...');
    try {
      const tickers = targetTickers || data.companies.map(c => c.ticker).filter(Boolean) as string[];
      const syncResult = await fetchRealTimeOOHData(tickers);
      
      setData(prev => {
        const merged = prev.companies.map(base => {
          const u = syncResult.companies.find((x: any) => x.ticker.toUpperCase() === base.ticker?.toUpperCase());
          if (!u) return base;
          
          const mkt = parseFinancialValue(u.marketCap), debt = parseFinancialValue(u.netDebt), ev = calculateEV(mkt, debt);
          const getV = (val: any) => parseFinancialValue(val);
          const r24 = getV(u.revenue2024), r25 = getV(u.revenue2025), r26 = getV(u.revenue2026);
          const eb24 = getV(u.ebitda2024), eb25 = getV(u.ebitda2025), eb26 = getV(u.ebitda2026);
          const ebit24 = getV(u.ebit2024), ebit25 = getV(u.ebit2025), ebit26 = getV(u.ebit2026);
          const inc24 = getV(u.netIncome2024), inc25 = getV(u.netIncome2025), inc26 = getV(u.netIncome2026);
          const cap24 = getV(u.capex2024), cap25 = getV(u.capex2025), cap26 = getV(u.capex2026);

          const div = (n: number, d: number) => (d > 0 ? n / d : 0);
          
          return { 
            ...base, ...u, 
            ev: ev > 0 ? `${ev.toFixed(0)} M` : base.ev,
            evEbitda: div(ev, eb24), evEbitdaForward: div(ev, eb25), evEbitdaNext: div(ev, eb26),
            evEbit: div(ev, ebit24), evEbitForward: div(ev, ebit25), evEbitNext: div(ev, ebit26),
            evSales: div(ev, r24), evSalesForward: div(ev, r25), evSalesNext: div(ev, r26),
            per: div(mkt, inc24), perForward: div(mkt, inc25), perNext: div(mkt, inc26),
            evEbitdaCapex: div(ev, (eb24 - cap24)), evEbitdaCapexForward: div(ev, (eb25 - cap25)), evEbitdaCapexNext: div(ev, (eb26 - cap26)),
            ebitdaMargin: eb24 > 0 ? (eb24 / r24) * 100 : 0,
            dividendYieldNumeric: parsePercent(u.dividendYield)
          };
        });

        return { 
          ...prev, 
          companies: merged, 
          lastUpdated: syncResult.lastUpdated || new Date().toLocaleString(), 
          timestamps: { ...prev.timestamps, financials: Date.now() } 
        };
      });
    } catch (err) { console.error(err); }
    finally { setFinancialLoading(false); setLoadingStatus(''); }
  };

  const refreshNews = async () => {
    setNewsLoading(true);
    setLoadingStatus('Actualités...');
    try {
      const news = await fetchOOHNews();
      setData(prev => ({ 
        ...prev, 
        news, 
        timestamps: { ...prev.timestamps, news: Date.now() } 
      }));
    } catch (err) { console.error(err); }
    finally { setNewsLoading(false); setLoadingStatus(''); }
  };

  const refreshDocs = async () => {
    setDocsLoading(true);
    setLoadingStatus('Documents...');
    try {
      const docsMap = await fetchOOHDocuments();
      setData(prev => ({ 
        ...prev, 
        // Fusionner avec les documents existants pour ne rien perdre (persistance des liens téléchargés)
        companyDocuments: { ...prev.companyDocuments, ...docsMap }, 
        timestamps: { ...prev.timestamps, docs: Date.now() } 
      }));
    } catch (err) { console.error(err); }
    finally { setDocsLoading(false); setLoadingStatus(''); }
  };

  const refreshCalendar = async () => {
    setCalendarLoading(true);
    setLoadingStatus('Agenda...');
    try {
      const events = await fetchOOHAgenda();
      setData(prev => ({ 
        ...prev, 
        events, 
        timestamps: { ...prev.timestamps, calendar: Date.now() } 
      }));
    } catch (err) { console.error(err); }
    finally { setCalendarLoading(false); setLoadingStatus(''); }
  };

  const handleGlobalRefresh = useCallback(() => {
    // Si on est sur une vue d'entreprise, on rafraîchit ses chiffres
    if (selectedCompany) {
      refreshFinancials([selectedCompany.ticker]);
      return;
    }
    
    // Sinon, rafraîchissement contextuel selon l'onglet
    switch (activeTab) {
      case 'overview':
      case 'analysis':
      case 'screener':
      case 'sources':
        refreshFinancials();
        break;
      case 'news':
        refreshNews();
        break;
      case 'docs':
        refreshDocs();
        break;
      case 'calendar':
        refreshCalendar();
        break;
    }
  }, [activeTab, selectedCompany]);

  const renderContent = () => {
    if (selectedCompany) return <CompanyDetail company={selectedCompany as Company} onSelectCompany={setSelectedCompany} />;
    switch (activeTab) {
      case 'overview': return <DashboardOverview data={data} onSelectCompany={setSelectedCompany as any} />;
      case 'news': return <NewsPage news={data.news} onRefreshNews={refreshNews} loading={newsLoading} />;
      case 'analysis': return <AnalysisPage data={data} />;
      case 'docs': return <DocumentsPage docs={data.documents} data={data} onRefreshDocs={refreshDocs} loading={docsLoading} />;
      case 'calendar': return <CalendarPage events={data.events} onRefreshAgenda={refreshCalendar} loading={calendarLoading} />;
      case 'sources': return <SourcesPage data={data} onAddTicker={(t) => refreshFinancials([...data.companies.map(c => c.ticker), t] as string[])} />;
      case 'screener': return <ScreenerPage data={data} onSelectCompany={setSelectedCompany as any} />;
      default: return <DashboardOverview data={data} onSelectCompany={setSelectedCompany as any} />;
    }
  };

  const isCurrentViewLoading = financialLoading || newsLoading || docsLoading || calendarLoading;

  return (
    <div className="flex min-h-screen bg-slate-900 text-slate-50 overflow-x-hidden">
      <Sidebar activeTab={selectedCompany ? '' : activeTab} setActiveTab={(tab) => { setActiveTab(tab as any); setSelectedCompany(null); }} />
      <main className="flex-1 md:ml-60 flex flex-col p-4 md:p-8 relative">
        <Header 
          title={selectedCompany ? selectedCompany.name : "OOH Terminal"} 
          subtitle={loadingStatus || `Dernière synchro : ${data.lastUpdated}`} 
          onBack={selectedCompany ? () => setSelectedCompany(null) : undefined} 
          onRefresh={handleGlobalRefresh} 
          loading={isCurrentViewLoading} 
        />
        <div className={isCurrentViewLoading ? 'opacity-50 blur-[1px] transition-all duration-300' : 'transition-all duration-300'}>
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
