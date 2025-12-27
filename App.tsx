
import React, { useState, useEffect } from 'react';
import { StudySession, VocabularyWord, WordStatus, UserStats } from './types';
import Dashboard from './components/Dashboard';
import Scanner from './components/Scanner';
import StudyView from './components/StudyView';
import QuizView from './components/QuizView';
import HistoryView from './components/HistoryView';
import { BookOpen, Camera, Library, LayoutDashboard } from 'lucide-react';

const App: React.FC = () => {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [currentView, setCurrentView] = useState<'dashboard' | 'scanner' | 'study' | 'quiz' | 'history'>('dashboard');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Computed active session
  const activeSession = sessions.find(s => s.id === activeSessionId) || null;

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('smart-vocab-sessions');
    if (saved) {
      setSessions(JSON.parse(saved));
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem('smart-vocab-sessions', JSON.stringify(sessions));
  }, [sessions]);

  const handleAddSession = (session: StudySession) => {
    setSessions(prev => [session, ...prev]);
    setActiveSessionId(session.id);
    setCurrentView('study');
  };

  const handleDeleteSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
      setCurrentView('dashboard');
    }
  };

  const handleAddWordsToSession = (sessionId: string, newWords: VocabularyWord[]) => {
    setSessions(prev => prev.map(session => {
      if (session.id !== sessionId) return session;
      return { ...session, words: [...session.words, ...newWords] };
    }));
  };

  const handleUpdateWordInSession = (sessionId: string, wordId: string, updates: Partial<VocabularyWord>) => {
    setSessions(prev => prev.map(session => {
      if (session.id !== sessionId) return session;
      const updatedWords = session.words.map(w => w.id === wordId ? { ...w, ...updates } : w);
      return { ...session, words: updatedWords };
    }));
  };

  const handleRemoveWordFromSession = (sessionId: string, wordId: string) => {
    setSessions(prev => prev.map(session => {
      if (session.id !== sessionId) return session;
      return { ...session, words: session.words.filter(w => w.id !== wordId) };
    }));
  };

  const updateWordProgress = (sessionId: string, wordId: string, isCorrect: boolean) => {
    setSessions(prev => prev.map(session => {
      if (session.id !== sessionId) return session;
      
      const updatedWords = session.words.map(word => {
        if (word.id !== wordId) return word;
        
        const newCorrectCount = isCorrect ? word.correctCount + 1 : word.correctCount;
        const newStatus = newCorrectCount >= 3 ? WordStatus.MASTERED : (newCorrectCount > 0 ? WordStatus.LEARNING : WordStatus.UNLEARNED);
        
        return {
          ...word,
          attempts: word.attempts + 1,
          correctCount: newCorrectCount,
          status: newStatus
        };
      });

      return { ...session, words: updatedWords };
    }));
  };

  const stats: UserStats = {
    totalWords: sessions.reduce((acc, s) => acc + s.words.length, 0),
    masteredWords: sessions.reduce((acc, s) => acc + s.words.filter(w => w.status === WordStatus.MASTERED).length, 0),
    learningWords: sessions.reduce((acc, s) => acc + s.words.filter(w => w.status === WordStatus.LEARNING).length, 0),
  };

  return (
    <div className="min-h-screen pb-20 md:pb-0 md:pl-64 flex flex-col bg-slate-50">
      {/* Sidebar - Desktop */}
      <nav className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-200 flex-col p-4 z-10">
        <div className="mb-8 px-2 flex items-center gap-2 text-indigo-600">
          <BookOpen className="w-8 h-8" />
          <h1 className="text-xl font-bold tracking-tight text-slate-900">SmartVocab AI</h1>
        </div>
        
        <div className="space-y-1">
          <NavItem 
            active={currentView === 'dashboard'} 
            onClick={() => setCurrentView('dashboard')} 
            icon={<LayoutDashboard className="w-5 h-5" />} 
            label="Dashboard" 
          />
          <NavItem 
            active={currentView === 'scanner'} 
            onClick={() => setCurrentView('scanner')} 
            icon={<Camera className="w-5 h-5" />} 
            label="New Scan" 
          />
          <NavItem 
            active={currentView === 'history'} 
            onClick={() => setCurrentView('history')} 
            icon={<Library className="w-5 h-5" />} 
            label="Batches" 
          />
        </div>

        <div className="mt-auto p-4 bg-indigo-50 rounded-xl">
          <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">My Progress</p>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-600">Mastered</span>
            <span className="font-bold text-slate-900">{stats.masteredWords}/{stats.totalWords}</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-indigo-600 h-full transition-all duration-500" 
              style={{ width: `${stats.totalWords ? (stats.masteredWords / stats.totalWords) * 100 : 0}%` }}
            />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
        {currentView === 'dashboard' && (
          <Dashboard 
            stats={stats} 
            recentSessions={sessions.slice(0, 3)} 
            onStartScan={() => setCurrentView('scanner')}
            onViewHistory={() => setCurrentView('history')}
            onSessionClick={(s) => { setActiveSessionId(s.id); setCurrentView('study'); }}
          />
        )}
        {currentView === 'scanner' && (
          <Scanner onProcessed={handleAddSession} />
        )}
        {currentView === 'study' && activeSession && (
          <StudyView 
            session={activeSession} 
            onStartQuiz={() => setCurrentView('quiz')}
            onBack={() => setCurrentView('dashboard')}
            onAddWords={handleAddWordsToSession}
            onUpdateWord={handleUpdateWordInSession}
            onDeleteWord={handleRemoveWordFromSession}
          />
        )}
        {currentView === 'quiz' && activeSession && (
          <QuizView 
            session={activeSession} 
            onComplete={() => setCurrentView('dashboard')}
            onAnswer={updateWordProgress}
          />
        )}
        {currentView === 'history' && (
          <HistoryView 
            sessions={sessions} 
            onSessionClick={(s) => { setActiveSessionId(s.id); setCurrentView('study'); }}
            onDeleteSession={handleDeleteSession}
          />
        )}
      </main>

      {/* Bottom Nav - Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-3 z-10">
        <MobileNavItem 
          active={currentView === 'dashboard'} 
          onClick={() => setCurrentView('dashboard')} 
          icon={<LayoutDashboard />} 
          label="Home" 
        />
        <MobileNavItem 
          active={currentView === 'scanner'} 
          onClick={() => setCurrentView('scanner')} 
          icon={<Camera />} 
          label="Scan" 
        />
        <MobileNavItem 
          active={currentView === 'history'} 
          onClick={() => setCurrentView('history')} 
          icon={<Library />} 
          label="Batches" 
        />
      </nav>
    </div>
  );
};

const NavItem: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
      active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
    }`}
  >
    {icon}
    {label}
  </button>
);

const MobileNavItem: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 transition-colors ${
      active ? 'text-indigo-600' : 'text-slate-400'
    }`}
  >
    {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-6 h-6' })}
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

export default App;
