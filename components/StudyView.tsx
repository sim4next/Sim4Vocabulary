
import React, { useState } from 'react';
import { StudySession, VocabularyWord, WordStatus } from '../types';
import { ArrowLeft, Play, Info, Plus, Trash2, Edit2, Check, X, Loader2, Sparkles } from 'lucide-react';
import { fetchWordDetails } from '../services/geminiService';

interface StudyViewProps {
  session: StudySession;
  onStartQuiz: () => void;
  onBack: () => void;
  onAddWords?: (sessionId: string, words: VocabularyWord[]) => void;
  onUpdateWord?: (sessionId: string, wordId: string, updates: Partial<VocabularyWord>) => void;
  onDeleteWord?: (sessionId: string, wordId: string) => void;
}

const StudyView: React.FC<StudyViewProps> = ({ 
  session, 
  onStartQuiz, 
  onBack,
  onAddWords,
  onUpdateWord,
  onDeleteWord
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newWordsText, setNewWordsText] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<VocabularyWord>>({});

  const handleAddSubmit = async () => {
    if (!newWordsText.trim() || !onAddWords) return;
    
    setIsFetching(true);
    const wordsToFetch = newWordsText
      .split('\n')
      .map(w => w.trim())
      .filter(w => w.length > 0);

    try {
      const detailedWords = await fetchWordDetails(wordsToFetch);
      onAddWords(session.id, detailedWords);
      setNewWordsText('');
      setIsAdding(false);
    } catch (error) {
      console.error("Failed to fetch word details", error);
      alert("Failed to fetch word details. Please try again.");
    } finally {
      setIsFetching(false);
    }
  };

  const startEditing = (word: VocabularyWord) => {
    setEditingWordId(word.id);
    setEditForm(word);
  };

  const saveEdit = () => {
    if (editingWordId && onUpdateWord) {
      onUpdateWord(session.id, editingWordId, editForm);
      setEditingWordId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{session.title}</h2>
            <p className="text-slate-500">{session.words.length} words in this batch</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
          >
            <Plus className="w-5 h-5" />
            Add Words
          </button>
          <button 
            onClick={onStartQuiz}
            disabled={session.words.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50"
          >
            <Play className="w-5 h-5 fill-current" />
            Start Quiz
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 space-y-4 animate-in slide-in-from-top-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-indigo-900">Add New Words</h3>
            <button onClick={() => setIsAdding(false)} className="text-indigo-400 hover:text-indigo-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-indigo-700">Type one word per line. Gemini will automatically fetch meanings and IPA.</p>
          <textarea 
            className="w-full p-4 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 outline-none h-32 font-medium"
            placeholder="apple&#10;banana&#10;cherry"
            value={newWordsText}
            onChange={(e) => setNewWordsText(e.target.value)}
            disabled={isFetching}
          />
          <div className="flex justify-end gap-3">
            <button 
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-indigo-600 font-semibold"
              disabled={isFetching}
            >
              Cancel
            </button>
            <button 
              onClick={handleAddSubmit}
              disabled={isFetching || !newWordsText.trim()}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold flex items-center gap-2 disabled:opacity-50"
            >
              {isFetching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Fetching Details...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Add to Batch
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {session.words.map(word => (
          <div 
            key={word.id}
            className={`bg-white p-5 rounded-2xl border transition-all group relative ${
              editingWordId === word.id ? 'border-indigo-500 ring-2 ring-indigo-50 shadow-lg' : 'border-slate-200 hover:border-indigo-300'
            }`}
          >
            {editingWordId === word.id ? (
              <div className="space-y-3">
                <input 
                  className="w-full p-2 border border-slate-200 rounded text-lg font-bold"
                  value={editForm.term}
                  onChange={(e) => setEditForm({...editForm, term: e.target.value})}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    className="p-2 border border-slate-200 rounded text-xs font-mono"
                    value={editForm.ipa}
                    placeholder="IPA"
                    onChange={(e) => setEditForm({...editForm, ipa: e.target.value})}
                  />
                  <input 
                    className="p-2 border border-slate-200 rounded text-xs"
                    value={editForm.partOfSpeech}
                    placeholder="POS"
                    onChange={(e) => setEditForm({...editForm, partOfSpeech: e.target.value})}
                  />
                </div>
                <input 
                  className="w-full p-2 border border-slate-200 rounded text-sm"
                  value={editForm.chineseMeaning}
                  placeholder="Meaning"
                  onChange={(e) => setEditForm({...editForm, chineseMeaning: e.target.value})}
                />
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setEditingWordId(null)} className="p-2 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                  <button onClick={saveEdit} className="p-2 text-indigo-600 hover:text-indigo-800"><Check className="w-5 h-5" /></button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 uppercase">
                    {word.partOfSpeech}
                  </span>
                  <div className="flex items-center gap-1">
                    <StatusBadge status={word.status} />
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 ml-2">
                      <button 
                        onClick={() => startEditing(word)}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onDeleteWord?.(session.id, word.id)}
                        className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">
                  {word.term}
                </h3>
                <p className="text-sm font-mono text-slate-400 mb-3">{word.ipa}</p>
                <p className="text-slate-700 font-medium">{word.chineseMeaning}</p>

                <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                  <span>Attempts: {word.attempts}</span>
                  <span>Success: {word.correctCount}/3</span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {session.words.length === 0 && !isAdding && (
        <div className="text-center py-20 bg-slate-100/50 rounded-3xl border border-slate-200">
          <Info className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">No words in this session. Add some words manually or scan an image.</p>
        </div>
      )}
    </div>
  );
};

export const StatusBadge: React.FC<{ status: WordStatus }> = ({ status }) => {
  switch (status) {
    case WordStatus.MASTERED:
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">MASTERED</span>;
    case WordStatus.LEARNING:
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-700">LEARNING</span>;
    default:
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500">NEW</span>;
  }
};

export default StudyView;
