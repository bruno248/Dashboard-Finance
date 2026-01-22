
import React, { useState, useEffect } from 'react';
import { NewsItem } from '../types';
import { summarizeNewsItem } from '../services/newsService';

interface NewsPageProps {
  news: NewsItem[];
  onRefreshNews?: () => void;
  loading?: boolean;
}

const NewsPage: React.FC<NewsPageProps> = ({ news, onRefreshNews, loading }) => {
  const [filter, setFilter] = useState('All');
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Empêcher le scroll du body quand la modal est ouverte
  useEffect(() => {
    if (selectedNews) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedNews]);
  
  const tags = ['All', 'Acquisition', 'Earnings', 'Digital', 'Deals', 'Market', 'Corporate', 'Trends', 'Regulation', 'Company'];

  const filteredNews = news.filter(item => 
    filter === 'All' || item.tag?.toLowerCase() === filter.toLowerCase()
  );

  const handleSummarize = async () => {
    if (!selectedNews) return;
    setIsSummarizing(true);
    setSummary(null);
    try {
      const res = await summarizeNewsItem(selectedNews.title, selectedNews.source);
      setSummary(res);
    } catch (e) {
      setSummary("Erreur lors du résumé.");
    } finally {
      setIsSummarizing(false);
    }
  };

  const closeOverlay = () => {
    setSelectedNews(null);
    setSummary(null);
    setIsSummarizing(false);
  };

  const getTagStyle = (tag: string) => {
    switch (tag?.toLowerCase()) {
      case 'acquisition': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'digital': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'earnings': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'deals': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'market': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      case 'corporate': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'trends': return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
      case 'regulation': return 'bg-rose-500/10 text-rose-300 border-rose-500/30';
      case 'company': return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6 px-1">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-white">Flux Stratégique</h2>
            <p className="text-[9px] md:text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Veille M&A & Digitale</p>
          </div>
          {onRefreshNews && (
            <button 
              onClick={onRefreshNews}
              disabled={loading}
              className={`p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl hover:bg-emerald-500/20 transition-all border border-emerald-500/20 shadow-sm ${loading ? 'animate-spin opacity-50' : ''}`}
              title="Actualiser les news"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
          )}
        </div>
        
        <div className="flex bg-slate-800 p-1 rounded-xl md:rounded-2xl border border-slate-700 overflow-x-auto max-w-full no-scrollbar shadow-lg">
           {tags.map(tag => (
             <button 
               key={tag}
               onClick={() => setFilter(tag)}
               className={`px-3 md:px-5 py-1.5 md:py-2.5 text-[9px] md:text-[10px] font-black rounded-lg md:rounded-xl transition-all whitespace-nowrap uppercase tracking-widest ${
                 filter === tag 
                   ? 'bg-emerald-600 text-white shadow-lg' 
                   : 'text-slate-500 hover:text-slate-200'
               }`}
             >
               {tag === 'All' ? 'Tous' : tag}
             </button>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:gap-4">
        {filteredNews.length > 0 ? (
          filteredNews.map((item, idx) => (
            <button 
              key={idx}
              onClick={() => setSelectedNews(item)}
              className={`text-left bg-slate-800 p-5 md:p-6 rounded-2xl md:rounded-[2rem] border transition-all flex flex-col md:flex-row justify-between items-start md:items-center group gap-4 md:gap-6 shadow-xl w-full ${
                item.tag?.toLowerCase() === 'acquisition' || item.tag?.toLowerCase() === 'deals'
                  ? 'border-amber-500/20 bg-gradient-to-br from-slate-800 to-amber-900/10 hover:border-amber-500/50' 
                  : 'border-slate-700 hover:border-emerald-500/50'
              }`}
            >
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2 md:mb-3">
                  <span className={`text-[8px] md:text-[9px] font-black px-2 md:px-3 py-0.5 md:py-1 rounded-md md:rounded-lg border uppercase tracking-[0.2em] shadow-inner ${getTagStyle(item.tag)}`}>
                    {item.tag || 'Secteur'}
                  </span>
                  <span className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                    {item.source}
                    <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                    {item.time}
                  </span>
                </div>
                <h3 className="text-base md:text-xl font-bold text-slate-100 group-hover:text-emerald-400 transition-colors leading-snug">
                  {item.title}
                </h3>
              </div>
              <div className="flex items-center gap-2 md:gap-3 text-emerald-400 font-black text-[9px] md:text-[10px] opacity-0 md:opacity-0 group-hover:opacity-100 transition-all uppercase tracking-widest">
                 <span className="hidden md:inline">Options</span>
                 <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:translate-x-1 transition-transform">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                 </div>
              </div>
            </button>
          ))
        ) : (
          <div className="py-20 text-center bg-slate-800/30 rounded-3xl border-2 border-slate-700 border-dashed">
            <p className="text-slate-500 italic font-black uppercase tracking-widest text-[10px]">Aucune donnée stratégique identifiée.</p>
          </div>
        )}
      </div>

      {/* MODAL D'ACTION NEWS */}
      {selectedNews && (
        <div className="fixed inset-0 z-[200] flex items-start md:items-center justify-center p-2 md:p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-slate-800 w-full max-w-2xl rounded-3xl md:rounded-[2.5rem] border border-slate-700 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 my-auto">
            <div className="p-6 md:p-10 border-b border-slate-700/50 flex justify-between items-start gap-4">
              <div className="space-y-2">
                <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${getTagStyle(selectedNews.tag)}`}>
                  {selectedNews.tag}
                </span>
                <h2 className="text-lg md:text-xl font-black text-white leading-tight">
                  {selectedNews.title}
                </h2>
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">
                  {selectedNews.source} • {selectedNews.time}
                </p>
              </div>
              <button 
                onClick={closeOverlay} 
                className="p-3 bg-slate-900 rounded-2xl text-slate-400 hover:text-white border border-slate-700 transition-all hover:scale-110 active:scale-95 shadow-lg flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 md:p-10 space-y-6 max-h-[60vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a 
                  href={selectedNews.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-700 text-slate-100 font-black text-[10px] uppercase tracking-widest py-5 rounded-2xl border border-slate-700 transition-all group"
                >
                  <svg className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  Lire l'article original
                </a>
                <button 
                  onClick={handleSummarize}
                  disabled={isSummarizing || !!summary}
                  className={`flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest py-5 rounded-2xl border transition-all ${
                    summary ? 'bg-emerald-900/30 border-emerald-500/40 text-emerald-400' : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-xl'
                  } disabled:opacity-100`}
                >
                  {isSummarizing ? (
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  )}
                  {summary ? "Analyse générée" : isSummarizing ? "Analyse en cours..." : "Générer un résumé IA"}
                </button>
              </div>

              {(isSummarizing || summary) && (
                <div className="bg-slate-900/50 p-6 md:p-8 rounded-[2rem] border border-slate-700/50 animate-in slide-in-from-top-4 duration-500 shadow-inner">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></div>
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">OOH Insight Summary</span>
                    </div>
                  </div>
                  
                  {isSummarizing ? (
                    <div className="space-y-4">
                      <div className="h-2 w-full bg-slate-800 rounded-full animate-pulse"></div>
                      <div className="h-2 w-3/4 bg-slate-800 rounded-full animate-pulse"></div>
                      <div className="h-2 w-5/6 bg-slate-800 rounded-full animate-pulse"></div>
                      <div className="h-2 w-1/2 bg-slate-800 rounded-full animate-pulse"></div>
                    </div>
                  ) : (
                    <div className="text-slate-200 text-sm leading-relaxed prose prose-invert max-w-none">
                      <div className="whitespace-pre-line font-medium text-slate-100 border-b border-slate-700/50 pb-6 mb-6">
                        {summary?.split(/KEY TAKEAWAYS/i)[0]}
                      </div>
                      {summary?.toLowerCase().includes('key takeaways') && (
                        <div>
                          <h4 className="text-emerald-400 font-black text-[11px] uppercase tracking-widest mb-4">Key Takeaways</h4>
                          <div className="text-slate-300 space-y-2">
                            {summary?.split(/KEY TAKEAWAYS/i)[1]?.trim().split('\n').map((line, lidx) => (
                              <div key={lidx} className="flex gap-3">
                                <span className="text-emerald-500 font-black">•</span>
                                <span className="text-xs">{line.replace(/^[•\-\*]\s*/, '')}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="p-6 bg-slate-900/30 border-t border-slate-700/50 flex justify-center">
               <button 
                 onClick={closeOverlay}
                 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] hover:text-white transition-colors"
               >
                 [ Retour au flux ]
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsPage;
