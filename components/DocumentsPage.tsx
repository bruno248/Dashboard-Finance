
import React, { useState, useMemo, useEffect } from 'react';
import { DocumentItem, SectorData } from '../types';
import { formatAge } from '../utils';

interface DocumentsPageProps {
  data: SectorData;
  loading?: boolean;
}

const DocumentsPage: React.FC<DocumentsPageProps> = ({ data, loading }) => {
  const companies = useMemo(() => 
    data?.companies.map(c => c.ticker).filter(Boolean) as string[] ?? [], 
    [data?.companies]
  );
  
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedTicker && companies.length > 0) {
      setSelectedTicker(companies[0]);
    }
    if (selectedTicker && !companies.includes(selectedTicker)) {
      setSelectedTicker(companies.length > 0 ? companies[0] : null);
    }
  }, [companies, selectedTicker]);

  const currentDocs = useMemo(() => {
    if (!data?.companyDocuments || !selectedTicker) return [];
    return data.companyDocuments[selectedTicker.toUpperCase()] || [];
  }, [data?.companyDocuments, selectedTicker]);

  const lastSyncAge = useMemo(() => formatAge(data?.timestamps?.docs), [data?.timestamps?.docs]);

  const DocumentCard = ({ doc }: { doc: DocumentItem }) => {
    const hasUrl = doc.url && doc.url !== '#';
    const CardComponent = hasUrl ? 'a' : 'div';

    return (
      <CardComponent
        href={hasUrl ? doc.url : undefined}
        target={hasUrl ? '_blank' : undefined}
        rel={hasUrl ? 'noreferrer' : undefined}
        className={`bg-slate-800 p-4 md:p-8 rounded-xl md:rounded-[2.5rem] border border-slate-700 transition-all flex flex-col group shadow-xl relative overflow-hidden ${hasUrl ? 'hover:border-emerald-500/50 hover:-translate-y-1' : 'cursor-default'}`}
      >
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" /></svg>
        </div>
        <div className="flex justify-between items-start mb-6">
          <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
            doc.type === 'Report' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
            doc.type === 'PPT' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
            'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          }`}>
            {doc.type || 'DOCUMENT'}
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{doc.date}</span>
        </div>
        <h4 className={`text-sm md:text-xl font-bold text-slate-100 mb-4 line-clamp-2 leading-snug ${hasUrl ? 'group-hover:text-emerald-400 transition-colors' : ''}`}>{doc.title}</h4>
        <div className="mt-auto pt-6 border-t border-slate-700/50 flex items-center justify-between">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Source: {selectedTicker}</span>
          {hasUrl ? (
            <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-black opacity-0 group-hover:opacity-100 transition-all uppercase tracking-widest">
              Consulter
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-600 text-[10px] font-black uppercase tracking-widest">
              Lien non disponible
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M6.354 5.5H4a3 3 0 0 0 0 6h3a3 3 0 0 0 2.83-4H9c-.086 0-.17.01-.25.031A2 2 0 0 1 7 10.5H4a2 2 0 1 1 0-4h1.535c.218-.376.495-.714.82-1z"/><path fillRule="evenodd" d="M9 5.5a3 3 0 0 0-2.83 4h1.098A2 2 0 0 1 9 6.5h3a2 2 0 1 1 0 4h-1.535a4.02 4.02 0 0 1-.82 1H12a3 3 0 1 0 0-6H9z"/></svg>
            </div>
          )}
        </div>
      </CardComponent>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 md:gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <aside className="w-full lg:w-72 space-y-4 lg:flex-shrink-0">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2 mb-4">Filtrer par société</h3>
        <div className="space-y-2">
          {companies.map(ticker => (
            <button
              key={ticker}
              onClick={() => setSelectedTicker(ticker)}
              className={`w-full text-left px-3 py-2 md:px-5 md:py-4 rounded-lg md:rounded-2xl text-xs font-black transition-all border flex items-center justify-between group ${
                selectedTicker === ticker 
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-xl shadow-emerald-900/20' 
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200 shadow-md'
              }`}
            >
              <span className="tracking-widest">{ticker}</span>
              <svg className={`w-4 h-4 transition-transform ${selectedTicker === ticker ? 'rotate-90' : 'opacity-20'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
            </button>
          ))}
        </div>
      </aside>

      <div className="flex-1 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 md:p-8 bg-slate-800/50 rounded-xl md:rounded-2xl border border-slate-700 md:backdrop-blur-sm shadow-2xl gap-4">
          <div className="flex-1">
            <h2 className="text-base md:text-2xl font-black text-white">Base Doc : {selectedTicker || '...'}</h2>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">
              Dernière synchro : <span className="text-emerald-400">{lastSyncAge}</span>
            </p>
          </div>
          <div className="flex items-center gap-4">
             <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20 shadow-inner whitespace-nowrap">
               {currentDocs.length} PUBLICATIONS
             </span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {currentDocs.length > 0 ? (
            currentDocs.map((doc, idx) => (
              <DocumentCard key={idx} doc={doc} />
            ))
          ) : (
            <div className="col-span-full py-16 md:py-24 text-center bg-slate-800/30 rounded-2xl md:rounded-[3rem] border-2 border-slate-700 border-dashed shadow-inner">
              <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-slate-700 shadow-2xl">
                <svg className="w-10 h-10 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-sm italic">Documents non identifiés pour {selectedTicker}</p>
              <p className="text-[10px] text-slate-600 mt-2 uppercase font-black">Utilisez le bouton de rafraîchissement pour relancer la recherche</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentsPage;
