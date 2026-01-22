
import React, { useState, useMemo } from 'react';
import { Company } from '../types';
import { COMPANIES } from '../constants';
import Sparkline from './Sparkline';

interface CompanyDetailProps {
  company: Company;
  onSelectCompany: (company: Company) => void;
  currency: 'EUR' | 'USD';
}

const CompanyDetail: React.FC<CompanyDetailProps> = ({ company, onSelectCompany, currency }) => {
  const [range, setRange] = useState<'1M' | '6M' | '1A'>('1A');
  const FX_RATE = 1.08;
  const convert = (val: number) => currency === 'USD' ? val * FX_RATE : val;

  const simulatedHistory = useMemo(() => {
    const points = range === '1M' ? 30 : range === '6M' ? 60 : 90;
    const history = [];
    let cur = company.price * 0.9;
    for (let i = 0; i < points; i++) {
      cur *= (0.99 + Math.random() * 0.02);
      history.push(cur);
    }
    history[points-1] = company.price;
    return history;
  }, [company.id, range]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <section className="bg-slate-800 p-6 md:p-10 rounded-2xl md:rounded-[2.5rem] border border-slate-700 shadow-2xl overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
          <div className="flex gap-4 md:gap-6 items-center">
            <div className="w-14 h-14 md:w-20 md:h-20 bg-slate-900 rounded-2xl flex items-center justify-center text-xl md:text-3xl font-black text-emerald-400 border border-slate-700">
              {company.ticker.substring(0, 3)}
            </div>
            <div>
              <h2 className="text-2xl md:text-4xl font-black text-white">{company.name}</h2>
              <p className="text-slate-500 text-xs mt-1 uppercase font-bold tracking-widest">{company.ticker}</p>
            </div>
          </div>
          <div className="flex md:flex-col justify-between items-center md:items-end w-full md:w-auto border-t md:border-t-0 border-slate-700 pt-4 md:pt-0">
            <div className="text-3xl md:text-5xl font-black text-white tracking-tighter">
              {convert(company.price).toFixed(2)} <span className="text-xs md:text-xl text-slate-600 font-bold">{currency}</span>
            </div>
            <div className={`text-sm md:text-xl font-black ${(company.change || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {(company.change || 0) >= 0 ? '+' : ''}{(company.change || 0).toFixed(2)}%
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-4 md:p-6 h-48 md:h-72 flex flex-col mb-8 border border-slate-700">
          <div className="flex gap-2 mb-4 md:mb-6">
            {['1M', '6M', '1A'].map(p => (
              <button key={p} onClick={() => setRange(p as any)} className={`px-3 py-1 text-[9px] md:text-[10px] font-black rounded ${range === p ? 'bg-emerald-600 text-white' : 'text-slate-600'}`}>{p}</button>
            ))}
          </div>
          <div className="flex-1 relative">
            <svg width="100%" height="100%" viewBox="0 0 1000 200" preserveAspectRatio="none">
              <path d={`M ${simulatedHistory.map((v, i) => `${(i / (simulatedHistory.length - 1)) * 1000},${200 - (v / (Math.max(...simulatedHistory)*1.05)) * 180}`).join(' L ')}`} fill="none" stroke="#10b981" strokeWidth="2" />
            </svg>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          <div className="p-4 md:p-6 bg-slate-900 rounded-xl border border-slate-700">
            <span className="text-[8px] md:text-[10px] font-black text-slate-600 block mb-1">EV/EBITDA 26E</span>
            <span className="text-lg md:text-xl font-black text-white">{company.evEbitdaNext?.toFixed(1) || '--'}x</span>
          </div>
          <div className="p-4 md:p-6 bg-slate-900 rounded-xl border border-slate-700">
            <span className="text-[8px] md:text-[10px] font-black text-slate-600 block mb-1">MKT CAP</span>
            <span className="text-lg md:text-xl font-black text-white">{company.marketCap}</span>
          </div>
          <div className="p-4 md:p-6 bg-slate-900 rounded-xl border border-slate-700">
            <span className="text-[8px] md:text-[10px] font-black text-slate-600 block mb-1">OBJ. COURS</span>
            <span className="text-lg md:text-xl font-black text-emerald-400">{convert(company.targetPrice || 0).toFixed(1)}</span>
          </div>
          <div className="p-4 md:p-6 bg-slate-900 rounded-xl border border-slate-700">
            <span className="text-[8px] md:text-[10px] font-black text-slate-600 block mb-1">RATING</span>
            <span className="text-lg md:text-xl font-black text-white uppercase">{company.rating}</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {COMPANIES.filter(p => p.id !== company.id).slice(0, 3).map(p => (
          <button key={p.id} onClick={() => onSelectCompany(p)} className="flex items-center justify-between p-4 bg-slate-800 rounded-xl border border-slate-700 hover:border-emerald-500 transition-all group">
            <div className="text-left">
              <span className="text-[10px] font-black text-slate-400 block group-hover:text-emerald-400">{p.ticker}</span>
              <span className="text-sm font-bold text-white">{p.name}</span>
            </div>
            <div className="w-16 h-8">
               <Sparkline data={p.sparkline} color={p.change >= 0 ? '#10b981' : '#f43f5e'} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CompanyDetail;
