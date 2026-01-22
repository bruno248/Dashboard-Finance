
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
        return {
           ...parsed,
           companies: parsed.companies?.length > 0 ? parsed.companies : COMPANIES,
           timestamps: parsed.timestamps || {}
        };
      } catch (e) { console.error("Cache error:", e); }
    }
    return {
      companies: COMPANIES, news: NEWS, events: EVENTS, documents: DOCUMENTS, companyDocuments: {},
      analysis: "", marketOpportunities: [], marketRisks: [], lastUpdated: 'Initialisation...',
      timestamps: {}
    };
  });

  useEffect(() => {
    const now = Date.now();
    if (now - (data.timestamps?.financials || 0) > FINANCIALS_TTL) {
      refreshData();
    }
  }, []);

  const refreshData = async (targetTickers?: string[]) => {
    setLoading(true);
    setLoadingStatus('Synchronisation financière...');
    try {
      const tickersToFetch = targetTickers || data.companies.map(c => c.ticker).filter(Boolean) as string[];
      const syncResult = await fetchRealTimeOOHData(tickersToFetch);
      
      setData(prev => {
        const mergedCompanies = prev.companies.map(base => {
          const update = syncResult.companies.find((u: any) => 
            u.ticker.replace(/_/g, '.').toUpperCase() === base.ticker?.toUpperCase()
          );
          
          if (update) {
            const mktCap = parseFinancialValue(update.marketCap);
            const netDebt = parseFinancialValue(update.netDebt);
            const ev = calculateEV(mktCap, netDebt);

            const getV = (v: any) => parseFinancialValue(v);
            const r24 = getV(update.revenue2024), r25 = getV(update.revenue2025), r26 = getV(update.revenue2026);
            const eb24 = getV(update.ebitda2024), eb25 = getV(update.ebitda2025), eb26 = getV(update.ebitda2026);
            const ebit24 = getV(update.ebit2024), ebit25 = getV(update.ebit2025), ebit26 = getV(update.ebit2026);
            const inc24 = getV(update.netIncome2024), inc25 = getV(update.netIncome2025), inc26 = getV(update.netIncome2026);
            const cap24 = getV(update.capex2024), cap25 = getV(update.capex2025), cap26 = getV(update.capex2026);

            const cM = (n: number, d: number) => (d > 0 ? n / d : 0);
            
            return { 
              ...base, ...update, 
              ev: ev > 0 ? `${ev.toFixed(0)} M` : base.ev,
              evEbitda: cM(ev, eb24), evEbitdaForward: cM(ev, eb25), evEbitdaNext: cM(ev, eb26),
              evEbit: cM(ev, ebit24), evEbitForward: cM(ev, ebit25), evEbitNext: cM(ev, ebit26),
              evSales: cM(ev, r24), evSalesForward: cM(ev, r25), evSalesNext: cM(ev, r26),
              per: cM(mktCap, inc24), perForward: cM(mktCap, inc25), perNext: cM(mktCap, inc26),
              evEbitdaCapex: cM(ev, (eb24 - cap24)),
              evEbitdaCapexForward: cM(ev, (eb25 - cap25)),
              evEbitdaCapexNext: cM(ev, (eb26 - cap26)),
              ebitdaMargin: eb24 > 0 ? (eb24 / r24) * 100 : 0,
              // Pour le benchmark de rendement
              dividendYieldNumeric: parsePercent(update.dividendYield)
            };
          }
          return base;
        });

        const next = { 
          ...prev, 
          companies: mergedCompanies, 
          lastUpdated: syncResult.lastUpdated || new Date().toLocaleString(),
          timestamps: { ...prev.timestamps, financials: Date.now() }
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(next));
        return next;
      });
    } catch (err) { setLoadingStatus('Erreur Sync'); }
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
