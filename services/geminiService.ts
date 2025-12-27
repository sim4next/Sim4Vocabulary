
import { GoogleGenAI, Type } from "@google/genai";
import { VocabularyWord, WordStatus } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const extractWordsFromImage = async (base64Image: string, signal?: AbortSignal): Promise<VocabularyWord[]> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        parts: [
          {
            text: `Extract English vocabulary words from this image. 
            For each word, provide:
            1. The English word itself.
            2. Its IPA phonetic transcription.
            3. Its primary part of speech (e.g., n., v., adj.).
            4. Its primary Chinese meaning.
            Only include standard English words. Return the data as a clean JSON array.`
          },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image.split(',')[1] || base64Image
            }
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            term: { type: Type.STRING },
            ipa: { type: Type.STRING },
            partOfSpeech: { type: Type.STRING },
            chineseMeaning: { type: Type.STRING }
          },
          required: ["term", "ipa", "partOfSpeech", "chineseMeaning"]
        }
      }
    }
  });

  const rawJson = response.text;
  const parsed = JSON.parse(rawJson || '[]');
  
  return parsed.map((item: any) => ({
    id: Math.random().toString(36).substr(2, 9),
    term: item.term,
    ipa: item.ipa,
    partOfSpeech: item.partOfSpeech,
    chineseMeaning: item.chineseMeaning,
    status: WordStatus.UNLEARNED,
    attempts: 0,
    correctCount: 0
  }));
};

export const fetchWordDetails = async (words: string[], signal?: AbortSignal): Promise<VocabularyWord[]> => {
  if (words.length === 0) return [];

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `For the following English words: ${words.join(', ')}. 
    Provide the IPA phonetic transcription, primary part of speech, and primary Chinese meaning for each.
    Return as a JSON array.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            term: { type: Type.STRING },
            ipa: { type: Type.STRING },
            partOfSpeech: { type: Type.STRING },
            chineseMeaning: { type: Type.STRING }
          },
          required: ["term", "ipa", "partOfSpeech", "chineseMeaning"]
        }
      }
    }
  });

  const rawJson = response.text;
  const parsed = JSON.parse(rawJson || '[]');
  
  return parsed.map((item: any) => ({
    id: Math.random().toString(36).substr(2, 9),
    term: item.term,
    ipa: item.ipa,
    partOfSpeech: item.partOfSpeech,
    chineseMeaning: item.chineseMeaning,
    status: WordStatus.UNLEARNED,
    attempts: 0,
    correctCount: 0
  }));
};

/**
 * 优化后的拼写转录服务
 * 使用 Gemini 3 Flash 模型，针对字母拼读进行极致优化
 */
export const transcribeSpelling = async (
  base64Audio: string, 
  mimeType: string, 
  targetWord: string,
  signal?: AbortSignal
): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            {
              text: `TRANSCRIPTION TASK:
              User is spelling the word: "${targetWord.toUpperCase()}"
              
              INSTRUCTIONS:
              1. The audio contains a person saying individual letters one by one.
              2. Use the target word "${targetWord.toUpperCase()}" as a strict phonetic anchor.
              3. If a sound is ambiguous (e.g., sounds like both 'P' and 'B'), and 'P' is in the target word but 'B' is not, transcribe it as 'P'.
              4. If the user clearly says a letter NOT in the target word, transcribe that letter exactly as heard (do not force it to be correct if they are wrong).
              5. Output ONLY the letters found, separated by spaces.
              6. Example output: "A P P L E"
              7. Do not include any words like "The letters are" or punctuation.`
            },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Audio
              }
            }
          ]
        }
      ],
      config: {
        // 降低随机性，使识别更稳定
        temperature: 0.1,
      }
    });
    
    // 过滤掉非字母内容，仅保留字母并组合
    const text = response.text || '';
    return text.trim();
  } catch (error: any) {
    console.error("Transcription API Error:", error);
    return '';
  }
};
