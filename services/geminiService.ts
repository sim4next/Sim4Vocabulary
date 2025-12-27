
import { GoogleGenAI, Type } from "@google/genai";
import { VocabularyWord, WordStatus } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const extractWordsFromImage = async (base64Image: string): Promise<VocabularyWord[]> => {
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

export const fetchWordDetails = async (words: string[]): Promise<VocabularyWord[]> => {
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

export const transcribeSpelling = async (base64Audio: string, mimeType: string): Promise<string> => {
  try {
    // gemini-flash-lite-latest is faster and supports audio multimodal input via generateContent
    const response = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest',
      contents: [
        {
          parts: [
            {
              text: `You are a spelling assistant. 
              The user is spelling a word letter by letter (e.g. "C... A... T...").
              Transcribe every single letter heard.
              
              Rules:
              1. Output ONLY the letters separated by spaces (e.g., "C A T").
              2. Map "Double U" to "W".
              3. If user says "Space", output a space.
              4. Be tolerant of background noise.
              5. If the audio ends abruptly, transcribe exactly what was heard up to that point.
              6. Do NOT return the full word (e.g. do not return "CAT"), only the spaced letters.
              `
            },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Audio
              }
            }
          ]
        }
      ]
    });
    return response.text?.trim() || '';
  } catch (error) {
    console.error("Transcription error:", error);
    return '';
  }
};
