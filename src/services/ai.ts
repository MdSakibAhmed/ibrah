import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { AIAnalysisResult } from '../types/reflection';
import { SecurityService } from './securityService';

const GEMINI_API_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent';

const SYSTEM_PROMPT = `
তুমি "ইবরা" (Ibrah) অ্যাপের ব্যক্তিগত আত্মশুদ্ধি ও লাইফ-লার্নিং অ্যাসিস্ট্যান্ট।
ব্যবহারকারী তার দৈনন্দিন জীবনের কথা, কোনো দ্বীনি আলোচনা, পারিবারিক বা দাম্পত্য কথোপকথন, কর্মক্ষেত্রের অভিজ্ঞতা বা ব্যক্তিগত চিন্তাভাবনার অডিও বা লেখা শেয়ার করেছেন।

তোমার কাজ হলো খুব মনোযোগ দিয়ে কথাগুলো শোনা/পড়া এবং সেটিকে একটি গঠনমূলক আত্মউন্নয়ন নোটে রূপান্তর করা।
বিশেষ দ্রষ্টব্য:
- ব্যবহারকারী বাংলা, ইংরেজি বা ইসলামি পরিভাষা (যেমন: তাওয়াক্কুল, সবর, ইহসান, মুহাসাবাহ, রিয়া ইত্যাদি) মিশ্রিত ভাষায় কথা বলতে পারেন।
- ভাষাটি সুন্দর, মার্জিত, প্রজ্ঞাপূর্ণ এবং স্পষ্ট বাংলায় রাখবে।
- তোমাকে অবশ্যই একটি বৈধ JSON অবজেক্ট রিটার্ন করতে হবে। কোনো মার্কডাউন ব্যাকটিক (\`\`\`json ...) ছাড়া সরাসরি শুধু পিওর JSON টেক্সট দিবে।

প্রত্যাশিত JSON ফরম্যাট:
{
  "title": "ছোট, আকর্ষণীয় ও অর্থপূর্ণ শিরোনাম",
  "rawTranscript": "ব্যবহারকারীর কথার সঠিক টেক্সট রূপ",
  "story": "ঘটনা বা আলোচনার প্রেক্ষাপট গুছিয়ে সুন্দর প্রাঞ্জল ভাষায় লিখিত রূপ",
  "learning": "মূল শিক্ষা, উপলব্ধি বা হিকমাহ (কী শিখলাম)",
  "actionCommitment": "ভবিষ্যতে এই লার্নিং অনুযায়ী আমি নিজে কী করব বা কীভাবে নিজেকে শুধরাব",
  "summary": "এক বা দুই বাক্যে সারসংক্ষেপ",
  "category": "দ্বীন ও আখিরাত" অথবা "দাম্পত্য ও পরিবার" অথবা "আত্মশুদ্ধি ও চরিত্র" অথবা "মুয়ামালাত ও ব্যবহার" অথবা "কর্ম ও সমাজ" অথবা "সাধারণ উপলব্ধি",
  "tags": ["ট্যাগ১", "ট্যাগ২", "ট্যাগ৩"]
}
`;

export class AIService {
  /**
   * Process recorded audio file through Gemini Multimodal API (Mobile & Web)
   */
  static async analyzeAudio(audioUri: string): Promise<AIAnalysisResult> {
    const apiKey = await SecurityService.getApiKey();

    if (!apiKey) {
      throw new Error(
        'AI প্রসেসিংয়ের জন্য Gemini API Key প্রয়োজন। দয়া করে সেটিংস স্ক্রিন থেকে আপনার বিনামূল্যে পাওয়া Gemini API Key যুক্ত করুন।'
      );
    }

    try {
      let base64Audio: string;
      let mimeType = 'audio/m4a';

      if (audioUri.endsWith('.wav')) mimeType = 'audio/wav';
      else if (audioUri.endsWith('.mp3')) mimeType = 'audio/mp3';
      else if (audioUri.endsWith('.aac')) mimeType = 'audio/aac';
      else if (audioUri.endsWith('.webm') || audioUri.includes('webm')) mimeType = 'audio/webm';

      // On Web: audioUri is typically a blob: URL
      if (Platform.OS === 'web') {
        const resp = await fetch(audioUri);
        const blob = await resp.blob();
        if (blob.type) mimeType = blob.type.split(';')[0];

        base64Audio = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            const base64 = dataUrl.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        // On Mobile: read file directly using FileSystem
        base64Audio = await FileSystem.readAsStringAsync(audioUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: SYSTEM_PROMPT + '\nদয়া করে নিচের সংযুক্ত অডিওটি প্রসেস করো এবং পিওর JSON তৈরি করো:',
              },
              {
                inlineData: {
                  mimeType,
                  data: base64Audio,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      };

      const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData?.error?.message || `HTTP ${response.status}`;
        throw new Error(`Gemini API Error: ${message}`);
      }

      const result = await response.json();
      const textOutput =
        result?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      return this.parseAndValidateResponse(textOutput);
    } catch (error: any) {
      console.error('[AIService] Audio analysis failed:', error);
      throw error;
    }
  }

  /**
   * Process written text/note through Gemini API
   */
  static async analyzeText(text: string): Promise<AIAnalysisResult> {
    const apiKey = await SecurityService.getApiKey();

    if (!apiKey) {
      throw new Error(
        'AI প্রসেসিংয়ের জন্য Gemini API Key প্রয়োজন। দয়া করে সেটিংস স্ক্রিন থেকে আপনার বিনামূল্যে পাওয়া Gemini API Key যুক্ত করুন।'
      );
    }

    try {
      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: `${SYSTEM_PROMPT}\n\nব্যবহারকারীর লিখিত কথা:\n"${text}"\n\nউপরে দেওয়া তথ্য অনুযায়ী পিওর JSON প্রস্তুত করো:`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      };

      const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData?.error?.message || `HTTP ${response.status}`;
        throw new Error(`Gemini API Error: ${message}`);
      }

      const result = await response.json();
      const textOutput =
        result?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      return this.parseAndValidateResponse(textOutput);
    } catch (error: any) {
      console.error('[AIService] Text analysis failed:', error);
      throw error;
    }
  }

  /**
   * Helper to clean and parse JSON response from Gemini
   */
  private static parseAndValidateResponse(rawText: string): AIAnalysisResult {
    let cleaned = rawText.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(cleaned);

    return {
      title: parsed.title || 'শিরোনামহীন উপলব্ধি',
      rawTranscript: parsed.rawTranscript || '',
      story: parsed.story || '',
      learning: parsed.learning || 'কোনো নির্দিষ্ট শিক্ষা পাওয়া যায়নি',
      actionCommitment: parsed.actionCommitment || '',
      summary: parsed.summary || parsed.learning || '',
      category: parsed.category || 'সাধারণ উপলব্ধি',
      tags: Array.isArray(parsed.tags) ? parsed.tags : ['লার্নিং'],
    };
  }

  /**
   * Generate default template when offline or API key is absent
   */
  static generateDefaultTemplate(spokenText?: string): AIAnalysisResult {
    const todayStr = new Date().toLocaleDateString('bn-BD', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    return {
      title: `দৈনন্দিন উপলব্ধি - ${todayStr}`,
      rawTranscript: spokenText || '',
      story: spokenText || 'রেকর্ডকৃত ভয়েস সংরক্ষিত রয়েছে।',
      learning: 'ভয়েসটি শুনে পরবর্তীতে আপনার মূল শিক্ষা বা উপলব্ধি এখানে নোট করতে পারেন।',
      actionCommitment: 'ভবিষ্যতে এই বিষয়ে সচেতন থাকা ও নিজেকে শুধরানো।',
      summary: 'রেকর্ডকৃত ভয়েস নোট সংরক্ষিত হয়েছে।',
      category: 'সাধারণ উপলব্ধি',
      tags: ['ভয়েস নোট', 'আত্মশুদ্ধি'],
    };
  }
}
