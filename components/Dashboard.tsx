
import React from 'react';
import { UserStats, StudySession } from '../types';
/* Added BookOpen to imports */
import { Plus, ChevronRight, GraduationCap, Clock, CheckCircle2, BookOpen } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DashboardProps {
  stats: UserStats;
  recentSessions: StudySession[];
  onStartScan: () => void;
  onViewHistory: () => void;
  onSessionClick: (session: StudySession) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ stats, recentSessions, onStartScan, onViewHistory, onSessionClick }) => {
  const chartData = [
    { name: 'Mastered', value: stats.masteredWords, color: '#4f46e5' },
    { name: 'Learning', value: stats.learningWords, color: '#6366f1' },
    { name: 'Remaining', value: stats.totalWords - stats.masteredWords - stats.learningWords, color: '#cbd5e1' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Welcome Back</h1>
          <p className="text-slate-500">Track your English vocabulary progress and keep learning.</p>
        </div>
        <button 
          onClick={onStartScan}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Start New Scan
        </button>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          icon={<GraduationCap className="text-indigo-600" />}
          label="Total Words"
          value={stats.totalWords}
          color="bg-indigo-50"
        />
        <StatCard 
          icon={<CheckCircle2 className="text-emerald-600" />}
          label="Mastered"
          value={stats.masteredWords}
          color="bg-emerald-50"
        />
        <StatCard 
          icon={<Clock className="text-amber-600" />}
          label="Learning"
          value={stats.learningWords}
          color="bg-amber-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Progress Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6">Mastery Distribution</h3>
          {stats.totalWords > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              No words scanned yet. Start by scanning a page!
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800">Recent Sessions</h3>
            <button 
              onClick={onViewHistory}
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {recentSessions.length > 0 ? (
              recentSessions.map(session => (
                <div 
                  key={session.id}
                  onClick={() => onSessionClick(session)}
                  className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-slate-50 transition-all cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-900 truncate">{session.title}</h4>
                    <p className="text-xs text-slate-500">{new Date(session.timestamp).toLocaleDateString()} • {session.words.length} words</p>
                  </div>
                  <div className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-center py-8 text-sm">Your recent sessions will appear here.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: number; color: string }> = ({ icon, label, value, color }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  </div>
);

export default Dashboard;
