
import React, { useState, useMemo } from 'react';
import { DocumentItem, SectorData } from '../types';

interface DocumentsPageProps {
  docs: DocumentItem[]; 
  data?: SectorData;
  onRefreshDocs?: () => void;
}

const DocumentsPage: React.FC<DocumentsPageProps> = ({ docs, data, onRefreshDocs }) => {
  const companies = useMemo(() => 
    data?.companies.map(c => c.ticker).filter(Boolean) as string[] || ['DEC.PA', 'LAMR', 'OUT', 'SAX.DE', 'CCO'], 
    [data?.companies]
  );
  
  const [selectedTicker, setSelectedTicker] = useState<string>(companies[0] || 'DEC.PA');

  const currentDocs = useMemo(() => {
    if (!data?.companyDocuments) return [];
    
    // Tentative de correspondance directe
    if (data.companyDocuments[selectedTicker]) {
      return data.companyDocuments[selectedTicker];
    }
    
    // Normalisation (points -> underscores, etc)
    const normalizedKey = selectedTicker.replace(/\./g, '_').toUpperCase();
    if (data.companyDocuments[normalizedKey]) {
      return data.companyDocuments[normalizedKey];
    }
    
    // Recherche partielle
    const foundKey = Object.keys(data.companyDocuments).find(k => 
      k.toUpperCase().includes(selectedTicker.toUpperCase()) || 
      selectedTicker.toUpperCase().includes(k.toUpperCase())
    );
    
    if (foundKey) return data.companyDocuments[foundKey];

    return [];
  }, [data?.companyDocuments, selectedTicker]);

  return (
    <div className="flex flex-col lg:flex-row gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <aside className="w-full lg:w-72 space-y-4">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2 mb-4">Filtrer par société</h3>
        <div className="space-y-2">
          {companies.map(ticker => (
            <button
              key={ticker}
              onClick={() => setSelectedTicker(ticker)}
              className={`w-full text-left px-5 py-4 rounded-2xl text-xs font-black transition-all border flex items-center justify-between group ${
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
        <div className="flex items-center justify-between p-8 bg-slate-800/50 rounded-[2rem] border border-slate-700 backdrop-blur-sm shadow-2xl">
          <div className="flex-1">
            <h2 className="text-2xl font-black text-white">Base Documentaire : {selectedTicker}</h2>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">Accès aux rapports institutionnels extraits en temps réel</p>
          </div>
          <div className="flex items-center gap-4">
             {onRefreshDocs && (
               <button 
                 onClick={onRefreshDocs}
                 className="p-3 bg-slate-900 text-emerald-400 rounded-2xl border border-slate-700 hover:bg-slate-700 transition-all shadow-lg group"
                 title="Actualiser les documents"
               >
                 <svg className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
               </button>
             )}
             <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20 shadow-inner whitespace-nowrap">
               {currentDocs.length} PUBLICATIONS
             </span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {currentDocs.length > 0 ? (
            currentDocs.map((doc, idx) => (
              <a 
                key={idx}
                href={doc.url || '#'}
                target="_blank"
                rel="noreferrer"
                className="bg-slate-800 p-8 rounded-[2.5rem] border border-slate-700 hover:border-emerald-500/50 transition-all flex flex-col group shadow-xl hover:-translate-y-1 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                   <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" /></svg>
                </div>
                <div className="flex justify-between items-start mb-6">
                  <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                    doc.title.toLowerCase().includes('10-k') || doc.title.toLowerCase().includes('annuel') ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                    doc.title.toLowerCase().includes('10-q') || doc.title.toLowerCase().includes('trimestriel') ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    doc.title.toLowerCase().includes('investor') || doc.title.toLowerCase().includes('presentation') ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                    'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    {doc.type || 'DOCUMENT'}
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{doc.date}</span>
                </div>
                <h4 className="text-xl font-bold text-slate-100 group-hover:text-emerald-400 transition-colors mb-4 line-clamp-2 leading-snug">{doc.title}</h4>
                <div className="mt-auto pt-6 border-t border-slate-700/50 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Finance {selectedTicker} Portal</span>
                  <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-black opacity-0 group-hover:opacity-100 transition-all uppercase tracking-widest">
                    Consulter
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                </div>
              </a>
            ))
          ) : (
            <div className="col-span-full py-24 text-center bg-slate-800/30 rounded-[3rem] border-2 border-slate-700 border-dashed shadow-inner">
              <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-slate-700 shadow-2xl">
                <svg className="w-10 h-10 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-sm italic">Documents non identifiés pour {selectedTicker}</p>
              <p className="text-[10px] text-slate-600 mt-2 uppercase font-black">Utilisez le bouton de rafraîchissement global pour relancer Gemini</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentsPage;
