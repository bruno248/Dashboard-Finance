
import React, { useState, useMemo } from 'react';
import { EventItem, SectorData } from '../types';
import { formatAge } from '../utils';

interface CalendarPageProps {
  data: SectorData;
  loading?: boolean;
}

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const CalendarPage: React.FC<CalendarPageProps> = ({ data, loading }) => {
  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [view, setView] = useState<'grid' | 'list'>(window.innerWidth < 768 ? 'list' : 'grid');
  
  const todayStr = new Date().toISOString().split('T')[0];

  const futureEvents = useMemo(() => {
    return (data.events || [])
      .filter(e => e.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data.events, todayStr]);

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1).getDay();
    const startingDay = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days: {empty?: boolean, day?: number, events?: EventItem[]}[] = [];
    for (let i = 0; i < startingDay; i++) days.push({ empty: true });
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dayEvents = futureEvents.filter(e => {
        const evDate = new Date(e.date);
        return evDate.getDate() === i && evDate.getMonth() === month && evDate.getFullYear() === year;
      });
      
      days.push({ day: i, events: dayEvents });
    }
    return days;
  }, [currentDate, futureEvents]);

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const isImminent = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    const diff = (date.getTime() - today.getTime()) / (1000 * 3600 * 24);
    return diff >= 0 && diff <= 7;
  };
  
  const lastSyncAge = useMemo(() => formatAge(data?.timestamps?.calendar), [data?.timestamps?.calendar]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20 md:pb-10 px-1">
      <div className="bg-slate-800 rounded-xl md:rounded-[2rem] border border-slate-700 overflow-hidden shadow-2xl">
        <div className="p-3 md:p-8 border-b border-slate-700 flex flex-col md:flex-row justify-between items-center bg-slate-800/50 gap-4">
          <div className="flex items-center gap-4 md:gap-6">
            <button onClick={() => changeMonth(-1)} title="Mois précédent" className="p-2 bg-slate-900 rounded-xl hover:bg-slate-700 transition-colors border border-slate-700 shadow-lg text-emerald-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="text-center">
              <h2 className="text-base md:text-2xl font-black text-white min-w-[120px] md:min-w-[200px]">{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
              <p className="text-[9px] md:text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Dernière synchro : <span className="text-emerald-400">{lastSyncAge}</span></p>
            </div>
            <button onClick={() => changeMonth(1)} title="Mois suivant" className="p-2 bg-slate-900 rounded-xl hover:bg-slate-700 transition-colors border border-slate-700 shadow-lg text-emerald-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700 shadow-inner">
              <button onClick={() => setView('grid')} className={`px-4 py-1.5 text-[9px] font-black rounded-lg transition-all ${view === 'grid' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}>GRILLE</button>
              <button onClick={() => setView('list')} className={`px-4 py-1.5 text-[9px] font-black rounded-lg transition-all ${view === 'list' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}>LISTE</button>
            </div>
          </div>
        </div>

        <div className="p-1 md:p-6">
          {view === 'grid' ? (
            <div className="grid grid-cols-7 gap-px bg-slate-700 border border-slate-700 rounded-lg md:rounded-2xl overflow-hidden">
              {["L", "M", "M", "J", "V", "S", "D"].map(d => (
                <div key={d} className="bg-slate-900 py-2 md:py-3 text-center text-[8px] md:text-[10px] font-black text-slate-500 border-b border-slate-700">{d}</div>
              ))}
              {calendarDays.map((d, i) => (
                <div key={i} className={`bg-slate-800 p-1 md:p-3 min-h-[56px] md:min-h-[110px] flex flex-col gap-1 border border-slate-700/20 ${d.empty ? 'bg-slate-900/40 opacity-10' : ''}`}>
                  {!d.empty && (
                    <>
                      <span className={`text-[9px] md:text-xs font-black ${d.events && d.events.length > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>{d.day}</span>
                      <div className="flex flex-col gap-1 overflow-hidden">
                        {d.events?.map((e, idx) => (
                          <div key={idx} title={e.title} className={`rounded p-1 text-[7px] md:text-[8px] font-black leading-tight truncate ${isImminent(e.date) ? 'bg-emerald-500 text-slate-900' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                            {e.title}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2 md:space-y-3 p-1 md:p-0">
              {futureEvents.length > 0 ? (
                futureEvents.map((ev, idx) => {
                  const evDate = new Date(ev.date);
                  const day = evDate.getDate();
                  const month = MONTHS[evDate.getMonth()].substring(0, 3).toUpperCase();
                  const imminent = isImminent(ev.date);

                  return (
                    <div key={idx} className="flex items-center gap-4 p-2 md:p-6 bg-slate-900/50 rounded-lg md:rounded-3xl border border-slate-700 hover:border-emerald-500/30 transition-all group shadow-xl">
                      <div className={`flex flex-col w-10 h-10 md:w-16 md:h-16 rounded-md md:rounded-2xl border overflow-hidden shadow-lg flex-shrink-0 transition-transform group-hover:scale-105 ${imminent ? 'border-emerald-500' : 'border-slate-700'}`}>
                        <div className={`h-1/3 w-full flex items-center justify-center text-[7px] md:text-[10px] font-black tracking-widest ${imminent ? 'bg-emerald-500 text-slate-900' : 'bg-slate-700 text-slate-400'}`}>
                          {month}
                        </div>
                        <div className={`h-2/3 w-full flex items-center justify-center text-base md:text-2xl font-black bg-slate-800 ${imminent ? 'text-emerald-400' : 'text-white'}`}>
                          {day}
                        </div>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="text-sm md:text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">{ev.title}</h4>
                          {imminent && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-900 text-[8px] font-black uppercase shadow-sm">Imminent</span>
                          )}
                        </div>
                        <p className="text-[8px] md:text-[10px] text-slate-500 font-black uppercase mt-1 tracking-widest flex items-center gap-2">
                           <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                           {ev.type || 'Événement'}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-20 text-center text-slate-600 italic font-black uppercase tracking-widest text-[10px]">
                  Aucun événement à venir identifié.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
