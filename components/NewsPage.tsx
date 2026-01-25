
import React, { useState, useEffect, useMemo } from 'react';
import { NewsItem, NewsTag, SectorData } from '../types';
import { summarizeNewsItem } from '../services/newsService';
import Modal from './Modal';

interface NewsPageProps {
  news: NewsItem[];
  highlights?: NewsItem[];
  sentiment?: SectorData['sentiment'];
  loading?: boolean;
}

const AIBadge: React.FC<{className?: string}> = ({className}) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <div className="w-2 h-2 bg-emerald-500 rounded-full md:animate-pulse shadow-[0_0_10px_#10b981]"></div>
    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Données IA</span>
  </div>
);

const NewsPage: React.FC<NewsPageProps> = ({ news, highlights, sentiment, loading }) => {
  const [filter, setFilter] = useState('All');
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  
  const tags: ('All' | NewsTag)[] = ['All', 'Market', 'Corporate', 'Earnings', 'Deals', 'Digital', 'Regulation'];

  const filteredNews = news.filter(item => 
    filter === 'All' || item.tag?.toLowerCase() === filter.toLowerCase()
  );

  const filteredHighlights = useMemo(() => {
    if (!highlights) return [];
    if (filter === 'All') return highlights;
    return highlights.filter(item => item.tag?.toLowerCase() === filter.toLowerCase());
  }, [highlights, filter]);

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

  const getTagStyle = (tag: NewsTag) => {
    switch (tag?.toLowerCase()) {
      case 'deals': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'digital': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'earnings': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'corporate': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'regulation': return 'bg-rose-500/10 text-rose-300 border-rose-500/30';
      case 'market':
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-6 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 md:pb-0">
      
      <section className="bg-slate-800/60 p-2 md:p-6 rounded-lg md:rounded-2xl border border-slate-700/80 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm md:text-base font-bold text-white">À retenir (Flux 7 jours)</h3>
          <AIBadge />
        </div>
        {sentiment?.keyTakeaways && sentiment.keyTakeaways.length > 0 ? (
          <ul className="space-y-2 list-none p-0">
            {sentiment.keyTakeaways.map((item, index) => (
              <li key={index} className="flex items-start gap-3 text-xs md:text-sm text-slate-300">
                <span className="text-emerald-500 font-black mt-1">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs md:text-sm text-slate-400 italic">
            En attente d'analyse IA pour extraire les points clés du flux...
          </p>
        )}
      </section>

      <section className="space-y-4 md:space-y-6">
        <div className="bg-slate-800/40 rounded-lg md:rounded-2xl border border-slate-700/60 shadow-lg overflow-hidden">
          
          <div className="px-3 md:px-5 pt-3 md:pt-5 pb-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6">
              <div>
                <h2 className="text-base md:text-2xl font-black text-white">Flux Stratégique</h2>
                <p className="text-[9px] md:text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Veille M&A & Digitale</p>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto no-scrollbar px-3 md:px-5">
            <div className="inline-flex bg-slate-800 p-1 rounded-xl border border-slate-700 shadow-lg whitespace-nowrap">
              {tags.map(tag => (
                <button key={tag} onClick={() => setFilter(tag)} className={`px-3 py-1.5 text-[9px] font-black rounded-lg transition-all whitespace-nowrap uppercase tracking-widest ${filter === tag ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-200'}`}>
                  {tag === 'All' ? 'Tous' : tag}
                </button>
              ))}
            </div>
          </div>

          <div className="px-3 md:px-5 pb-3 md:pb-5 pt-4">
            <div className="grid grid-cols-1 gap-3 md:gap-4">
              {filteredNews.length > 0 ? (
                filteredNews.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedNews(item)}
                    className="w-full max-w-full text-left bg-slate-800/40 p-3 md:p-4 rounded-lg md:rounded-2xl border border-slate-700/50 hover:border-emerald-500/30 transition-all group block"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${getTagStyle(item.tag)}`}>
                        {item.tag || 'Market'}
                      </span>
                      <span className="text-[8px] font-bold text-slate-600 uppercase">
                        {item.source} • {item.time}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors leading-snug line-clamp-2">
                      {item.title}
                    </p>
                  </button>
                ))
              ) : (
                <div className="py-20 text-center bg-slate-800/30 rounded-3xl border-2 border-slate-700 border-dashed"><p className="text-slate-500 italic font-black uppercase tracking-widest text-[10px]">Aucune donnée stratégique identifiée.</p></div>
              )}
            </div>
          </div>
        </div>
      </section>

      {highlights && highlights.length > 0 && (
        <section className="space-y-4 md:space-y-6 hidden md:block">
          <div className="px-1">
            <h2 className="text-xl md:text-2xl font-black text-white">Actualités Marquantes</h2>
            <p className="text-[9px] md:text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">12 derniers mois</p>
          </div>
          {filteredHighlights.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {filteredHighlights.map((item) => (
                <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/60 hover:border-emerald-500/50 transition-all group block shadow-lg">
                  <p className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors leading-snug line-clamp-2 mb-3">{item.title}</p>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${getTagStyle(item.tag)}`}>{item.tag}</span>
                    <span className="text-[8px] font-bold text-slate-600 uppercase">
                      {item.source} • {item.date && new Date(item.date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center bg-slate-800/20 rounded-2xl border-2 border-slate-700/50 border-dashed">
              <p className="text-slate-500 italic font-black uppercase tracking-widest text-[10px]">
                Aucune actualité marquante dans cette catégorie sur 12 mois.
              </p>
            </div>
          )}
        </section>
      )}

      <Modal isOpen={!!selectedNews} onClose={closeOverlay}>
        {selectedNews && (
          <div className="bg-slate-800 w-full max-w-md md:max-w-2xl rounded-xl md:rounded-3xl border border-slate-700 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-3 sm:p-6 md:p-10 border-b border-slate-700/50 flex justify-between items-start gap-4">
              <div className="space-y-2"><span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${getTagStyle(selectedNews.tag)}`}>{selectedNews.tag}</span><h2 className="text-base md:text-xl font-black text-white leading-tight">{selectedNews.title}</h2><p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">{selectedNews.date && `${new Date(selectedNews.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} • `}{selectedNews.source} • {selectedNews.time}</p></div>
              <button onClick={closeOverlay} className="p-3 bg-slate-900 rounded-2xl text-slate-400 hover:text-white border border-slate-700 transition-all hover:scale-110 active:scale-95 shadow-lg flex-shrink-0" title="Fermer"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-3 sm:p-6 md:p-10 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a 
                  href={selectedNews.url && /^https?:\/\//.test(selectedNews.url) ? selectedNews.url : `https://www.google.com/search?q=${encodeURIComponent(selectedNews.title + ' ' + selectedNews.source)}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-700 text-slate-100 font-black text-[10px] uppercase tracking-widest py-3 md:py-5 rounded-xl border border-slate-700 transition-all group">
                    <svg className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    Lire l'article original
                </a>
                <button onClick={handleSummarize} disabled={isSummarizing || !!summary} className={`flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest py-3 md:py-5 rounded-xl border transition-all ${summary ? 'bg-emerald-900/30 border-emerald-500/40 text-emerald-400' : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-xl'} disabled:opacity-100`}>{isSummarizing ? (<svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>) : (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>)}{summary ? "Analyse générée" : isSummarizing ? "Analyse en cours..." : "Générer un résumé IA"}</button>
              </div>
              {(isSummarizing || summary) && (
                <div className="bg-slate-900/50 p-5 md:p-8 rounded-2xl md:rounded-[2rem] border border-slate-700/50 animate-in slide-in-from-top-4 duration-500 shadow-inner">
                  <AIBadge className="mb-6"/>
                  {isSummarizing ? (<div className="space-y-4"><div className="h-2 w-full bg-slate-800 rounded-full animate-pulse"></div><div className="h-2 w-3/4 bg-slate-800 rounded-full animate-pulse"></div><div className="h-2 w-5/6 bg-slate-800 rounded-full animate-pulse"></div><div className="h-2 w-1/2 bg-slate-800 rounded-full animate-pulse"></div></div>) : (
                    <div className="text-slate-200 text-sm leading-relaxed prose prose-invert max-w-none">
                      <div className="whitespace-pre-line font-medium text-slate-100 border-b border-slate-700/50 pb-6 mb-6">{summary?.split(/KEY TAKEAWAYS/i)[0]}</div>
                      {summary?.toLowerCase().includes('key takeaways') && (
                        <div>
                          <h4 className="text-emerald-400 font-black text-[11px] uppercase tracking-widest mb-4">Points Clés</h4>
                          <ul className="text-slate-300 space-y-2 list-none p-0">
                            {summary?.split(/KEY TAKEAWAYS/i)[1]?.trim().split('\n').map((line, lidx) => (
                              <li key={lidx} className="flex gap-3 items-start"><span className="text-emerald-500 font-black mt-1">•</span><span className="text-xs">{line.replace(/^[•\-\*]\s*/, '')}</span></li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="p-3 md:p-6 bg-slate-900/30 border-t border-slate-700/50 flex justify-center"><button onClick={closeOverlay} className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] hover:text-white transition-colors">[ Retour au flux ]</button></div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default NewsPage;
