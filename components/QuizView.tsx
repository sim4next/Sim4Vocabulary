
import React, { useState, useEffect, useRef } from 'react';
import { StudySession, VocabularyWord, WordStatus } from '../types';
import { CheckCircle2, AlertCircle, ArrowRight, Mic, Keyboard, Zap, Loader2, XCircle, Trash2, CloudCog } from 'lucide-react';
import { transcribeSpelling } from '../services/geminiService';

interface QuizViewProps {
  session: StudySession;
  onComplete: () => void;
  onAnswer: (sessionId: string, wordId: string, isCorrect: boolean) => void;
}

const QuizView: React.FC<QuizViewProps> = ({ session, onComplete, onAnswer }) => {
  const [remainingWords, setRemainingWords] = useState<VocabularyWord[]>([]);
  const [currentWord, setCurrentWord] = useState<VocabularyWord | null>(null);
  
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [finished, setFinished] = useState(false);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isHoldingRef = useRef(false);
  const stopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const toStudy = session.words.filter(w => w.status !== WordStatus.MASTERED);
    if (toStudy.length === 0) {
      setFinished(true);
    } else {
      const shuffled = [...toStudy].sort(() => Math.random() - 0.5);
      setRemainingWords(shuffled);
      setCurrentWord(shuffled[0]);
    }
  }, [session]);

  useEffect(() => {
    async function initMic() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
      } catch (err) {
        console.warn("Microphone access denied or unavailable", err);
      }
    }
    initMic();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleCancelTranscription = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsProcessing(false);
  };

  const startRecording = async () => {
    if (!streamRef.current || isProcessing || !currentWord) return;
    
    if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
        stopTimeoutRef.current = null;
    }

    if (!streamRef.current.active) {
       try {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
       } catch (e) {
         alert("Cannot access microphone.");
         return;
       }
    }

    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
    
    try {
      let recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
         recorder = new MediaRecorder(streamRef.current, { mimeType });
         mediaRecorderRef.current = recorder;
         
         recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
          };

          recorder.onstop = async () => {
            if (chunksRef.current.length === 0) {
              setIsRecording(false);
              return;
            }

            setIsProcessing(true);
            setIsRecording(false);
            abortControllerRef.current = new AbortController();
            
            try {
              const blob = new Blob(chunksRef.current, { type: mimeType });
              
              const reader = new FileReader();
              reader.onloadend = async () => {
                const base64String = (reader.result as string).split(',')[1];
                if (base64String && abortControllerRef.current && currentWord) {
                  // 传递目标单词作为上下文
                  const transcribedText = await transcribeSpelling(
                    base64String, 
                    mimeType, 
                    currentWord.term,
                    abortControllerRef.current.signal
                  );
                  if (transcribedText) {
                    const cleanLetters = transcribedText.replace(/[^a-zA-Z]/g, '').toUpperCase();
                    setUserInput(prev => prev + cleanLetters);
                  }
                }
                setIsProcessing(false);
                abortControllerRef.current = null;
              };
              reader.readAsDataURL(blob);
              
            } catch (error: any) {
              if (error.name !== 'AbortError') {
                console.error("Processing error", error);
              }
              setIsProcessing(false);
              abortControllerRef.current = null;
            }
          };
      }

      if (recorder.state === 'inactive') {
          recorder.start(100); 
          setIsRecording(true);
      }
    } catch (err) {
      console.error("Failed to start MediaRecorder", err);
    }
  };

  const stopRecording = () => {
    stopTimeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    }, 400); // 略微减短停止延迟
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (feedback || isProcessing) return;
    
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch (e) {}

    isHoldingRef.current = true;
    startRecording();
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!isHoldingRef.current) return;
    
    isHoldingRef.current = false;
    stopRecording();
    
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (e) {}
  };

  const handleClear = () => {
    setUserInput('');
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (feedback) {
      nextWord();
      return;
    }
    if (!currentWord) return;
    const isCorrect = userInput.trim().toLowerCase() === currentWord.term.toLowerCase();
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    onAnswer(session.id, currentWord.id, isCorrect);
  };

  const nextWord = () => {
    if (!currentWord) return;
    const currentIdx = remainingWords.findIndex(w => w.id === currentWord.id);
    const updatedRemaining = [...remainingWords];
    if (feedback === 'incorrect') {
      const [failedWord] = updatedRemaining.splice(currentIdx, 1);
      updatedRemaining.push(failedWord);
      setRemainingWords(updatedRemaining);
      setCurrentWord(updatedRemaining[0]);
    } else {
      updatedRemaining.splice(currentIdx, 1);
      if (updatedRemaining.length === 0) setFinished(true);
      else {
        setRemainingWords(updatedRemaining);
        setCurrentWord(updatedRemaining[0]);
      }
    }
    setUserInput('');
    setFeedback(null);
  };

  if (finished) {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-8 animate-in zoom-in-95">
        <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mx-auto">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-slate-900">Quiz Completed!</h2>
          <p className="text-slate-500">You've successfully reviewed all words in this batch.</p>
        </div>
        <button 
          onClick={onComplete}
          className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl hover:bg-indigo-700 transition-all active:scale-95"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (!currentWord) return null;

  return (
    <div className="max-w-xl mx-auto space-y-8 py-6 relative select-none">
      
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Spelling Quiz</h2>
        <span className="text-sm font-bold text-indigo-600">Left: {remainingWords.length}</span>
      </div>
      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
        <div 
          className="bg-indigo-600 h-full transition-all duration-700"
          style={{ width: `${(1 - remainingWords.length / session.words.length) * 100}%` }}
        />
      </div>

      <div className="bg-white p-8 rounded-[48px] border border-slate-200 shadow-xl shadow-slate-200/40 min-h-[500px] flex flex-col justify-center animate-in slide-in-from-bottom-8 relative">
        <div className="text-center space-y-8">
          
          <div className="space-y-4">
            <span className="text-indigo-600 font-bold text-xs bg-indigo-50 px-4 py-1.5 rounded-full uppercase tracking-widest">
              Spell the word
            </span>
            <p className="text-slate-400 text-sm font-mono tracking-widest">{currentWord.ipa}</p>
            <h3 className="text-5xl font-black text-slate-900 leading-tight">
              {currentWord.chineseMeaning}
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 relative">
            <div className="relative group">
              <input 
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={isRecording ? "Listening..." : isProcessing ? "AI Analyzing..." : "Hold mic to spell"}
                disabled={!!feedback || isRecording || isProcessing}
                className={`w-full p-8 pr-44 rounded-[32px] border-4 text-center text-4xl font-black outline-none transition-all tracking-[0.3em] uppercase ${
                  feedback === 'correct' 
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                    : feedback === 'incorrect' 
                      ? 'border-red-500 bg-red-50 text-red-700' 
                      : isRecording
                        ? 'border-red-400 bg-red-50'
                        : isProcessing
                          ? 'border-indigo-200 bg-indigo-50/50 text-slate-400'
                          : 'border-slate-100 bg-slate-50 focus:border-indigo-500 focus:bg-white'
                }`}
              />

              <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex items-center gap-3">
                {!feedback && userInput && !isRecording && !isProcessing && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="h-12 w-12 flex items-center justify-center rounded-2xl bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all active:scale-90"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}

                {!feedback && (
                  <button
                    type="button"
                    onContextMenu={(e) => e.preventDefault()}
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    disabled={isProcessing}
                    className={`h-16 w-16 flex items-center justify-center rounded-2xl select-none transition-all shadow-lg cursor-pointer touch-none ${
                       isRecording 
                        ? 'bg-red-500 text-white scale-90 shadow-red-200 ring-4 ring-red-100' 
                        : isProcessing
                          ? 'bg-indigo-400 text-white cursor-wait scale-95'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-indigo-200'
                    }`}
                  >
                    {isRecording ? (
                      <div className="flex gap-1 h-3 items-center">
                         <span className="w-1 h-3 bg-white rounded-full animate-[bounce_1s_infinite]" />
                         <span className="w-1 h-3 bg-white rounded-full animate-[bounce_1s_infinite_0.2s]" />
                         <span className="w-1 h-3 bg-white rounded-full animate-[bounce_1s_infinite_0.4s]" />
                      </div>
                    ) : isProcessing ? (
                      <Loader2 className="w-8 h-8 animate-spin" />
                    ) : (
                      <Mic className="w-8 h-8" />
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="h-6 flex justify-center items-center gap-3">
               {isProcessing ? (
                 <>
                   <p className="text-xs font-bold text-indigo-500 animate-pulse flex items-center gap-1">
                     <CloudCog className="w-3 h-3" /> Native AI Recognition...
                   </p>
                   <button 
                    type="button"
                    onClick={handleCancelTranscription}
                    className="text-[10px] text-slate-400 hover:text-red-500 font-bold uppercase underline"
                   >
                     Cancel
                   </button>
                 </>
               ) : null}
            </div>

            <button 
              type="submit"
              disabled={(!feedback && !userInput.trim()) || isRecording || isProcessing}
              className={`w-full py-6 text-white rounded-[32px] font-black text-xl flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 ${
                !feedback 
                  ? 'bg-slate-900 hover:bg-slate-800 disabled:opacity-20' 
                  : feedback === 'correct' 
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' 
                    : 'bg-red-600 hover:bg-red-700 shadow-red-200'
              }`}
            >
              {!feedback ? (
                <>
                  <Keyboard className="w-6 h-6" />
                  Check Answer
                </>
              ) : (
                <>Next Word <ArrowRight className="w-6 h-6" /></>
              )}
            </button>
          </form>

          {feedback === 'incorrect' && (
            <div className="p-8 bg-red-50 rounded-[32px] border border-red-100 flex items-start gap-5 text-left animate-in zoom-in-95">
              <AlertCircle className="w-8 h-8 text-red-500 shrink-0 mt-1" />
              <div>
                <p className="text-xs font-bold text-red-800 uppercase tracking-widest mb-1">Correct Answer</p>
                <p className="text-4xl font-black text-red-900 uppercase tracking-[0.4em]">{currentWord.term}</p>
              </div>
            </div>
          )}
          
          <div className="h-8 flex items-center justify-center">
             {!isRecording && !isProcessing && !feedback && (
               <div className="flex items-center gap-2 text-[11px] text-slate-400 font-bold uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-full border border-slate-200/50">
                 <Zap className="w-3 h-3 text-amber-500" />
                 Native Audio Optimized &bull; High Accuracy
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizView;
