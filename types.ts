
export enum WordStatus {
  UNLEARNED = 'UNLEARNED',
  LEARNING = 'LEARNING',
  MASTERED = 'MASTERED'
}

export interface VocabularyWord {
  id: string;
  term: string;
  ipa: string;
  partOfSpeech: string;
  chineseMeaning: string;
  status: WordStatus;
  attempts: number;
  correctCount: number;
}

export interface StudySession {
  id: string;
  timestamp: number;
  title: string;
  words: VocabularyWord[];
  imageUrl?: string;
}

export interface UserStats {
  totalWords: number;
  masteredWords: number;
  learningWords: number;
}
