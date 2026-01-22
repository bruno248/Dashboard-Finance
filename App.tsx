
import React, { useState, useEffect } from 'react';
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
import { parseFinancialValue, calculateEV, parsePercent } from './utils';

const CACHE_KEY = 'ooh_insight_v28_persistence';
const FINANCIALS_TTL = 30 * 60 * 1000;

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'news' | 'analysis' | 'docs' | 'calendar' | 'sources' | 'screener'>('overview');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [currency, setCurrency] = useState<'EUR' | 'USD'>('EUR');
  
  const [data, setData] = useState<SectorData & { timestamps: Record<string, number> }>(() => {
    const saved = localStorage.getItem(CACHE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...parsed, companies: parsed.companies?.length > 0 ? parsed.companies : COMPANIES, timestamps: parsed.timestamps || {} };
      } catch (e) { console.error(e); }
    }
    return { companies: COMPANIES, news: NEWS, events: EVENTS, documents: DOCUMENTS, companyDocuments: {}, analysis: "", marketOpportunities: [], marketRisks: [], lastUpdated: 'Initialisation...', timestamps: {} };
  });

  useEffect(() => {
    const now = Date.now();
    if (now - (data.timestamps?.financials || 0) > FINANCIALS_TTL) refreshData();
  }, []);

  const refreshData = async (targetTickers?: string[]) => {
    setLoading(true);
    setLoadingStatus('Synchronisation financière...');
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

        const next = { ...prev, companies: merged, lastUpdated: syncResult.lastUpdated || new Date().toLocaleString(), timestamps: { ...prev.timestamps, financials: Date.now() } };
        localStorage.setItem(CACHE_KEY, JSON.stringify(next));
        return next;
      });
    } catch (err) { setLoadingStatus('Erreur'); }
    finally { setTimeout(() => setLoading(false), 500); }
  };

  const renderContent = () => {
    if (selectedCompany) return <CompanyDetail company={selectedCompany as Company} onSelectCompany={setSelectedCompany} currency={currency} />;
    switch (activeTab) {
      case 'overview': return <DashboardOverview data={data} onSelectCompany={setSelectedCompany as any} currency={currency} />;
      case 'news': return <NewsPage news={data.news} />;
      case 'analysis': return <AnalysisPage data={data} />;
      case 'docs': return <DocumentsPage docs={data.documents} data={data} />;
      case 'calendar': return <CalendarPage events={data.events} />;
      case 'sources': return <SourcesPage data={data} onAddTicker={(t) => refreshData([...data.companies.map(c => c.ticker), t] as string[])} />;
      case 'screener': return <ScreenerPage data={data} onSelectCompany={setSelectedCompany as any} />;
      default: return <DashboardOverview data={data} onSelectCompany={setSelectedCompany as any} currency={currency} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-900 text-slate-50 overflow-x-hidden">
      <Sidebar activeTab={selectedCompany ? '' : activeTab} setActiveTab={(tab) => { setActiveTab(tab as any); setSelectedCompany(null); }} />
      <main className="flex-1 md:ml-60 flex flex-col p-4 md:p-8 relative">
        <Header title={selectedCompany ? selectedCompany.name : "OOH Terminal"} subtitle={loadingStatus || `Maj : ${data.lastUpdated}`} onBack={selectedCompany ? () => setSelectedCompany(null) : undefined} onRefresh={() => refreshData()} loading={loading} currency={currency} setCurrency={setCurrency} />
        <div className={loading ? 'opacity-50 blur-[1px]' : ''}>{renderContent()}</div>
      </main>
    </div>
  );
};

export default App;
