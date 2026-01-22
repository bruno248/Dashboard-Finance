
import React from 'react';
import { Company, AnalystRating } from '../types';

interface MarketTableProps {
  companies: Company[];
  onSelectCompany: (company: Company) => void;
}

const MarketTable: React.FC<MarketTableProps> = ({ companies, onSelectCompany }) => {
  const getRatingColor = (rating: AnalystRating) => {
    switch (rating) {
      case AnalystRating.BUY: return 'text-emerald-400 bg-emerald-500/10';
      case AnalystRating.STRONG_BUY: return 'text-emerald-500 bg-emerald-500/20';
      case AnalystRating.HOLD: return 'text-amber-400 bg-amber-500/10';
      case AnalystRating.SELL: return 'text-rose-400 bg-rose-500/10';
      default: return 'text-slate-400 bg-slate-500/10';
    }
  };

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-left text-sm min-w-[800px] md:min-w-0">
          <thead className="bg-slate-800/50 border-b border-slate-700">
            <tr>
              <th className="px-4 md:px-6 py-4 font-semibold text-slate-400 text-[9px] md:text-[10px] uppercase tracking-widest">Valeur</th>
              <th className="px-4 md:px-6 py-4 font-semibold text-slate-400 text-[9px] md:text-[10px] uppercase tracking-widest text-right">Cours (LC)</th>
              <th className="px-4 md:px-6 py-4 font-semibold text-slate-400 text-[9px] md:text-[10px] uppercase tracking-widest text-right">Objectif (LC)</th>
              <th className="px-4 md:px-6 py-4 font-semibold text-slate-400 text-[9px] md:text-[10px] uppercase tracking-widest text-center">Var. %</th>
              <th className="hidden lg:table-cell px-6 py-4 font-semibold text-slate-400 text-[10px] uppercase tracking-widest text-right">Cap.</th>
              <th className="hidden lg:table-cell px-6 py-4 font-semibold text-slate-400 text-[10px] uppercase tracking-widest text-right">EV/EBITDA 25E</th>
              <th className="px-4 md:px-6 py-4 font-semibold text-slate-400 text-[9px] md:text-[10px] uppercase tracking-widest text-right">Rating</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {companies.map((company) => (
              <tr key={company.id} className="hover:bg-slate-700/30 transition-colors cursor-pointer group" onClick={() => onSelectCompany(company)}>
                <td className="px-4 md:px-6 py-4">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded bg-slate-700 flex items-center justify-center font-bold text-[9px] md:text-[10px] text-emerald-400 shadow-inner">
                      {(company.ticker || '???').substring(0, 3)}
                    </div>
                    <div>
                      <p className="font-bold text-white text-xs md:text-sm group-hover:text-emerald-400 truncate max-w-[80px] md:max-w-none">{company.name}</p>
                      <p className="text-[8px] md:text-[10px] text-slate-500 font-bold uppercase tracking-tight">{company.ticker}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 md:px-6 py-4 font-bold text-slate-100 text-right text-xs md:text-sm whitespace-nowrap">
                  {(company.price || 0).toFixed(2)}
                </td>
                <td className="px-4 md:px-6 py-4 font-bold text-emerald-400 text-right text-xs md:text-sm whitespace-nowrap">
                  {(company.targetPrice || 0).toFixed(2)}
                </td>
                <td className={`px-4 md:px-6 py-4 font-black text-center text-xs md:text-sm ${(company.change || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {(company.change || 0) >= 0 ? '+' : ''}{(company.change || 0).toFixed(2)}%
                </td>
                <td className="hidden lg:table-cell px-6 py-4 text-slate-300 font-bold text-right text-xs">
                  {company.marketCap}
                </td>
                <td className="hidden lg:table-cell px-6 py-4 text-slate-200 font-bold text-right">
                  {company.evEbitdaForward ? company.evEbitdaForward.toFixed(1) + 'x' : '--'}
                </td>
                <td className="px-4 md:px-6 py-4 text-right">
                  <span className={`px-2 py-0.5 md:py-1 rounded text-[8px] md:text-[9px] font-black uppercase whitespace-nowrap border border-current ${getRatingColor(company.rating)}`}>
                    {company.rating}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MarketTable;
