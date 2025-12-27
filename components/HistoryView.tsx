
import React from 'react';
import { StudySession } from '../types';
import { Calendar, ChevronRight, Book, Trash2, Search, Filter } from 'lucide-react';
import { StatusBadge } from './StudyView';

interface HistoryViewProps {
  sessions: StudySession[];
  onSessionClick: (session: StudySession) => void;
  onDeleteSession?: (sessionId: string) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ sessions, onSessionClick, onDeleteSession }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Batch Management</h2>
          <p className="text-slate-500">Manage and review all your scanned word collections.</p>
        </div>
        <div className="flex gap-2">
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search batches..." 
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
           </div>
           <button className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50">
             <Filter className="w-5 h-5" />
           </button>
        </div>
      </div>

      {sessions.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {sessions.map(session => (
            <div 
              key={session.id}
              className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-200 hover:shadow-lg hover:-translate-y-0.5 transition-all group flex flex-col md:flex-row md:items-center gap-6 relative"
            >
              <div 
                onClick={() => onSessionClick(session)}
                className="absolute inset-0 z-0 cursor-pointer"
              />
              
              <div className="w-20 h-20 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden flex-shrink-0 relative z-10 pointer-events-none">
                {session.imageUrl ? (
                  <img src={session.imageUrl} alt="Source" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Book className="w-8 h-8" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 space-y-1 relative z-10 pointer-events-none">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-slate-900">{session.title}</h3>
                  <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                    <Calendar className="w-3 h-3" />
                    {new Date(session.timestamp).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                    {session.words.length} Words
                  </span>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                    {session.words.filter(w => w.status === 'MASTERED').length} Mastered
                  </span>
                  <div className="flex-1" />
                </div>
              </div>

              <div className="flex -space-x-2 overflow-hidden items-center hidden lg:flex relative z-10 pointer-events-none">
                {session.words.slice(0, 5).map(word => (
                  <div 
                    key={word.id}
                    className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-indigo-50 flex items-center justify-center text-[10px] font-black text-indigo-400 uppercase"
                    title={word.term}
                  >
                    {word.term[0]}
                  </div>
                ))}
                {session.words.length > 5 && (
                  <div className="flex items-center justify-center h-8 w-8 rounded-full ring-2 ring-white bg-slate-100 text-[10px] font-bold text-slate-500">
                    +{session.words.length - 5}
                  </div>
                )}
              </div>

              <div className="flex gap-2 relative z-20">
                {onDeleteSession && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Are you sure you want to delete this batch?')) {
                        onDeleteSession(session.id);
                      }
                    }}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
                <div className="p-2 text-indigo-400 pointer-events-none transition-all group-hover:translate-x-1">
                  <ChevronRight className="w-6 h-6" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200">
          <Book className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900">No batches yet</h3>
          <p className="text-slate-500 mb-6">Scan some English text to create your first vocabulary batch.</p>
        </div>
      )}
    </div>
  );
};

export default HistoryView;
