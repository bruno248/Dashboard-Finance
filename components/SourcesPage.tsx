
import React, { useState, useMemo, useEffect } from 'react';
import { SectorData, Company } from '../types';
import { formatCurrencyShort, formatMultiple } from '../utils';

interface SourcesPageProps {
  data: SectorData;
  onAddTicker?: (ticker: string) => Promise<void>;
}

const SourcesPage: React.FC<SourcesPageProps> = ({ data, onAddTicker }) => {
  const allCompanies = (data.companies as Company[]) || [];
  const [visibleTickers, setVisibleTickers] = useState<string[]>([]);
  const [newTicker, setNewTicker] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (allCompanies.length > 0 && visibleTickers.length === 0) {
      setVisibleTickers(allCompanies.map(c => c.ticker));
    } else if (allCompanies.length > visibleTickers.length) {
      const currentTickers = allCompanies.map(c => c.ticker);
      setVisibleTickers(prev => {
        const newOnes = currentTickers.filter(t => !prev.includes(t));
        return [...prev, ...newOnes];
      });
    }
  }, [allCompanies]);

  const toggleTicker = (ticker: string) => {
    setVisibleTickers(prev => {
      if (prev.includes(ticker)) {
        if (prev.length <= 1) return prev; 
        return prev.filter(t => t !== ticker);
      }
      return [...prev, ticker];
    });
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicker.trim() || !onAddTicker) return;
    setIsAdding(true);
    try {
      await onAddTicker(newTicker.toUpperCase());
      setNewTicker('');
    } finally {
      setIsAdding(false);
    }
  };

  const filteredCompanies = useMemo(() => 
    allCompanies.filter(c => visibleTickers.includes(c.ticker)),
    [allCompanies, visibleTickers]
  );

  const metricsGroups = [
    {
      label: 'CHIFFRE D\'AFFAIRES (REVENUE)',
      metrics: [
        { key: 'revenue2024', label: 'Revenue 2024', type: 'currency' },
        { key: 'revenue2025', label: 'Revenue 2025E', type: 'currency' },
        { key: 'revenue2026', label: 'Revenue 2026E', type: 'currency' },
      ]
    },
    {
      label: 'RÉSULTAT OPÉRATIONNEL (EBITDA & EBIT)',
      metrics: [
        { key: 'ebitda2024', label: 'EBITDA 2024', type: 'currency' },
        { key: 'ebitda2025', label: 'EBITDA 2025E', type: 'currency' },
        { key: 'ebitda2026', label: 'EBITDA 2026E', type: 'currency' },
        { key: 'ebit2024', label: 'EBIT 2024', type: 'currency' },
        { key: 'ebit2025', label: 'EBIT 2025E', type: 'currency' },
        { key: 'ebit2026', label: 'EBIT 2026E', type: 'currency' },
      ]
    },
    {
      label: 'CAPITAL EXPENDITURE (CAPEX)',
      metrics: [
        { key: 'capex2024', label: 'CAPEX 2024', type: 'currency' },
        { key: 'capex2025', label: 'CAPEX 2025E', type: 'currency' },
        { key: 'capex2026', label: 'CAPEX 2026E', type: 'currency' },
      ]
    },
    {
      label: 'CASH FLOW (FCF)',
      metrics: [
        { key: 'fcf2024', label: 'FCF 2024', type: 'currency' },
        { key: 'fcf2025', label: 'FCF 2025E', type: 'currency' },
        { key: 'fcf2026', label: 'FCF 2026E', type: 'currency' },
      ]
    },
    {
      label: 'MULTIPLES DE VALORISATION',
      metrics: [
        { key: 'evEbitda', label: 'EV / EBITDA 24', type: 'multiple' },
        { key: 'evEbitdaForward', label: 'EV / EBITDA 25E', type: 'multiple' },
        { key: 'evEbitdaNext', label: 'EV / EBITDA 26E', type: 'multiple' },
        { key: 'evEbit', label: 'EV / EBIT 24', type: 'multiple' },
        { key: 'evEbitForward', label: 'EV / EBIT 25E', type: 'multiple' },
        { key: 'evEbitNext', label: 'EV / EBIT 26E', type: 'multiple' },
        { key: 'per', label: 'PER 24', type: 'multiple' },
        { key: 'perForward', label: 'PER 25E', type: 'multiple' },
        { key: 'perNext', label: 'PER 26E', type: 'multiple' },
        { key: 'evEbitdaCapex', label: 'EV / (EBITDA-CAPEX) 24', type: 'multiple' },
        { key: 'evEbitdaCapexForward', label: 'EV / (EBITDA-CAPEX) 25E', type: 'multiple' },
        { key: 'evEbitdaCapexNext', label: 'EV / (EBITDA-CAPEX) 26E', type: 'multiple' },
      ]
    },
    {
      label: 'STRUCTURE & RENDEMENT',
      metrics: [
        { key: 'marketCap', label: 'Capitalisation', type: 'currency' },
        { key: 'ev', label: 'Valeur d’entreprise (EV)', type: 'currency' },
        { key: 'netDebt', label: 'Dette Nette', type: 'currency' },
        { key: 'sharesOutstanding', label: "Nombre d'actions (M)", type: 'number' },
        { key: 'dividendYield', label: 'Yield 2024', type: 'string' },
        { key: 'dividendYield2025', label: 'Yield 2025E', type: 'string' },
        { key: 'dividendYield2026', label: 'Yield 2026E', type: 'string' },
      ]
    }
  ];

  const renderCellValue = (val: any, type: string) => {
    if (val === undefined || val === null || val === '--' || val === 0) return '--';
    switch (type) {
      case 'currency': return formatCurrencyShort(val);
      case 'multiple': return typeof val === 'number' ? formatMultiple(val) : val;
      default: return val;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-7xl mx-auto pb-20">
      <section className="bg-slate-800 p-8 rounded-[2rem] border border-slate-700 shadow-xl">
        <div className="flex flex-col lg:flex-row justify-between gap-8 mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white uppercase tracking-tight">Peer Group OOH</h3>
            <div className="flex flex-wrap gap-2 mt-4">
              {allCompanies.map(c => (
                <button key={c.ticker} onClick={() => toggleTicker(c.ticker)} className={`px-4 py-2 rounded-xl text-[10px] font-black border transition-all ${visibleTickers.includes(c.ticker) ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>
                  {c.ticker}
                </button>
              ))}
            </div>
          </div>
          <div className="w-full lg:w-72">
            <form onSubmit={handleAddSubmit} className="flex gap-2">
              <input type="text" value={newTicker} onChange={e => setNewTicker(e.target.value)} placeholder="Ticker (ex: SAX.DE)" className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-emerald-500/50" />
              <button type="submit" disabled={isAdding || !newTicker} className="bg-emerald-600 p-3 rounded-xl shadow-lg text-white">
                {isAdding ? '...' : '+'}
              </button>
            </form>
          </div>
        </div>
      </section>

      <div className="bg-slate-800 rounded-[2.5rem] border border-slate-700 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-slate-500 uppercase text-[10px] font-black border-b-2 border-slate-700">
              <tr>
                <th className="px-8 py-6 sticky left-0 bg-slate-900 z-20 w-64 border-r border-slate-700">Agrégat / Multiple</th>
                {filteredCompanies.map(c => (
                  <th key={c.ticker} className="px-8 py-6 text-center text-white min-w-[140px]">{c.ticker}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {metricsGroups.map(group => (
                <React.Fragment key={group.label}>
                  <tr className="bg-slate-900">
                    <td colSpan={filteredCompanies.length + 1} className="px-8 py-3 text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-slate-900 sticky left-0 border-r border-slate-700 border-b-2 border-slate-700">
                      {group.label}
                    </td>
                  </tr>
                  {group.metrics.map(m => (
                    <tr key={m.key} className="hover:bg-slate-700/20 group">
                      <td className="px-8 py-4 font-bold text-slate-300 sticky left-0 bg-slate-800 border-r border-slate-700 group-hover:bg-slate-700 transition-colors">{m.label}</td>
                      {filteredCompanies.map(c => (
                        <td key={c.ticker} className="px-8 py-4 text-center font-mono text-[11px] text-slate-100 font-bold">
                          {renderCellValue((c as any)[m.key], m.type)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SourcesPage;
