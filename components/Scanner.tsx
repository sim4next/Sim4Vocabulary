
import React, { useState, useRef } from 'react';
import { Camera, Upload, Loader2, Sparkles, X, AlertCircle, CheckCircle, Trash2, Type as TypeIcon } from 'lucide-react';
import { extractWordsFromImage, fetchWordDetails } from '../services/geminiService';
import { StudySession, VocabularyWord } from '../types';

interface ScannerProps {
  onProcessed: (session: StudySession) => void;
}

const Scanner: React.FC<ScannerProps> = ({ onProcessed }) => {
  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [image, setImage] = useState<string | null>(null);
  const [manualText, setManualText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedWords, setExtractedWords] = useState<VocabularyWord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const processInput = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      let words: VocabularyWord[] = [];
      if (mode === 'scan') {
        if (!image) return;
        words = await extractWordsFromImage(image);
      } else {
        const wordList = manualText.split('\n').map(w => w.trim()).filter(w => w.length > 0);
        if (wordList.length === 0) throw new Error("Please enter at least one word.");
        words = await fetchWordDetails(wordList);
      }
      
      if (words.length === 0) {
        throw new Error("No words found. Please check your input and try again.");
      }

      setExtractedWords(words);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong while processing.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmBatch = () => {
    if (!extractedWords) return;

    const newSession: StudySession = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      title: mode === 'scan' 
        ? `Scan Batch ${new Date().toLocaleDateString()}` 
        : `Manual Batch ${new Date().toLocaleDateString()}`,
      words: extractedWords,
      imageUrl: mode === 'scan' ? image || undefined : undefined
    };
    
    onProcessed(newSession);
  };

  const removeWord = (id: string) => {
    setExtractedWords(prev => prev ? prev.filter(w => w.id !== id) : null);
  };

  if (extractedWords) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300 pb-12">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Review Batch</h2>
            <p className="text-slate-500">Check extracted definitions before saving.</p>
          </div>
          <button 
            onClick={() => setExtractedWords(null)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Word</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">IPA</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Chinese Meaning</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {extractedWords.map((word) => (
                  <tr key={word.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">{word.term}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">{word.ipa}</td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 uppercase">
                        {word.partOfSpeech}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{word.chineseMeaning}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => removeWord(word.id)}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
            <p className="text-sm text-slate-500 font-medium">
              {extractedWords.length} words analyzed
            </p>
            <button 
              onClick={handleConfirmBatch}
              disabled={extractedWords.length === 0}
              className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50"
            >
              <CheckCircle className="w-5 h-5" />
              Save to Library
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">Add New Vocabulary</h2>
        <p className="text-slate-500">Scan a page or enter words directly to generate definitions.</p>
      </div>

      {/* Mode Toggle */}
      <div className="flex bg-slate-100 p-1 rounded-2xl w-fit mx-auto border border-slate-200">
        <button 
          onClick={() => setMode('scan')}
          className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${mode === 'scan' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Camera className="w-4 h-4" />
          AI Scanner
        </button>
        <button 
          onClick={() => setMode('manual')}
          className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${mode === 'manual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <TypeIcon className="w-4 h-4" />
          Direct Entry
        </button>
      </div>

      <div className="bg-white p-6 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden">
        {mode === 'scan' ? (
          image ? (
            <div className="relative w-full h-full flex flex-col items-center gap-6">
              <div className="relative group w-full max-h-[300px] rounded-2xl overflow-hidden shadow-inner">
                <img src={image} alt="Captured" className="w-full h-full object-contain" />
                {!isProcessing && (
                  <button 
                    onClick={() => setImage(null)}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              <button 
                onClick={processInput}
                disabled={isProcessing}
                className="w-full py-4 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                Scan with Gemini AI
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6 py-12">
              <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500">
                <Camera className="w-12 h-12" />
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center gap-3 shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
              >
                <Upload className="w-6 h-6" />
                Upload Photo
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            </div>
          )
        ) : (
          <div className="w-full space-y-4">
            <label className="block text-sm font-bold text-slate-700 px-2">Enter English words (one per line):</label>
            <textarea 
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="example:&#10;resilient&#10;ephemeral&#10;serendipity"
              className="w-full h-64 p-5 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none transition-all font-medium text-lg resize-none"
              disabled={isProcessing}
            />
            <button 
              onClick={processInput}
              disabled={isProcessing || !manualText.trim()}
              className="w-full py-4 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              Fetch Word Details
            </button>
          </div>
        )}

        {isProcessing && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-20">
            <div className="relative">
               <Loader2 className="w-16 h-16 text-indigo-600 animate-spin" />
               <Sparkles className="absolute -top-1 -right-1 w-6 h-6 text-amber-400 animate-bounce" />
            </div>
            <p className="mt-4 font-bold text-slate-900 text-center px-6">
              Gemini AI is generating definitions...
            </p>
            <p className="text-sm text-slate-500">Extracting IPA, Word Type, and Meanings.</p>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-4">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}
    </div>
  );
};

export default Scanner;
