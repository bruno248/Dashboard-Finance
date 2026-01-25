
import React from 'react';

interface HeaderProps {
  title: string;
  subtitle: string;
  onBack?: () => void;
  onRefresh?: () => void;
  onScreenerClick?: () => void;
  loading?: boolean;
  dataAges?: {
    financials: string;
    fundamentals: string;
    news: string;
    calendar: string;
    docs: string;
  };
}

const Header: React.FC<HeaderProps> = ({ title, subtitle, onBack, onRefresh, onScreenerClick, loading, dataAges }) => {
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  return (
    <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 md:mb-8 gap-4">
      <div className="flex items-start gap-3 w-full md:w-auto">
        {onBack && (
          <button onClick={onBack} title="Retour" className="mt-0.5 p-2 bg-slate-800 rounded-lg text-slate-400 border border-slate-700 shadow-lg hover:bg-slate-700 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
        )}
        <div className="flex-1">
          <h1 className="text-xl md:text-3xl font-bold text-white leading-tight">{title}</h1>
          <p className="text-slate-400 text-[10px] md:text-sm flex items-center gap-2">
            {subtitle} <span className="w-0.5 h-0.5 bg-slate-600 rounded-full"></span> {today}
          </p>
          {dataAges && (
            <div className="mt-2 text-[9px] text-slate-500 font-semibold tracking-tight flex flex-wrap gap-x-2 gap-y-1">
              <span>Cours: <span className="font-bold text-slate-400">{dataAges.financials}</span></span>
              <span className="text-slate-600">•</span>
              <span>News: <span className="font-bold text-slate-400">{dataAges.news}</span></span>
              <span className="text-slate-600 hidden sm:inline">•</span>
              <span>Agenda: <span className="font-bold text-slate-400">{dataAges.calendar}</span></span>
              <span className="text-slate-600 hidden sm:inline">•</span>
              <span>Docs: <span className="font-bold text-slate-400">{dataAges.docs}</span></span>
              <span className="text-slate-600 hidden sm:inline">•</span>
              <span>Fondamentaux: <span className="font-bold text-slate-400">{dataAges.fundamentals}</span></span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
        <div className="flex items-center gap-2">
          <button onClick={onRefresh} disabled={loading} title="Rafraîchir les données" className={`p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:bg-slate-700 transition-colors ${loading ? 'animate-spin' : ''}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </div>
        
        <button onClick={onScreenerClick} className="px-3 md:px-5 py-2 md:py-2.5 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg flex items-center gap-2 hover:bg-emerald-500 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
          <span className="hidden md:inline">Screener</span>
        </button>
      </div>
    </header>
  );
};

export default Header;