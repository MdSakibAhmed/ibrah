import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { AIAnalysisResult } from '../types/reflection';
import { SecurityService } from './securityService';

/**
 * Prioritized Gemini multimodal models (Audio + Text supported):
 * Starts with latest flagship Flash, then automatically fails over to Stable
 * production models if Google returns HTTP 503 (high demand) or 429 (rate limit).
 */
const GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
] as const;

const REQUEST_TIMEOUT_MS = 35000;

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

function buildEndpoint(model: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

function isTransientOrModelError(status: number, message: string): boolean {
  if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504 || status === 404) {
    return true;
  }
  const lower = message.toLowerCase();
  return (
    lower.includes('high demand') ||
    lower.includes('overloaded') ||
    lower.includes('temporarily unavailable') ||
    lower.includes('rate limit') ||
    lower.includes('quota')
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class AIService {
  /**
   * Shared Gemini request executor with automatic model fallback and retry
   */
  private static async generateWithFallback(parts: Array<Record<string, unknown>>): Promise<AIAnalysisResult> {
    const apiKey = await SecurityService.getApiKey();

    if (!apiKey) {
      throw new Error(
        'AI প্রসেসিংয়ের জন্য Gemini API Key প্রয়োজন। দয়া করে সেটিংস স্ক্রিন থেকে আপনার বিনামূল্যে পাওয়া Gemini API Key যুক্ত করুন।'
      );
    }

    const requestBody = JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    });

    let lastError: Error | null = null;

    // Try up to 2 passes across the prioritized model chain
    for (let pass = 0; pass < 2; pass++) {
      if (pass > 0) {
        await delay(1200);
      }

      for (const model of GEMINI_MODELS) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        try {
          const response = await fetch(`${buildEndpoint(model)}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody,
            signal: controller.signal,
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const message = errorData?.error?.message || `HTTP ${response.status}`;

            if (isTransientOrModelError(response.status, message)) {
              console.warn(`[AIService] Model ${model} busy (${response.status}), trying fallback...`);
              lastError = new Error(`Gemini API Error (${model}): ${message}`);
              continue;
            }

            // Fail fast on authentication / invalid API key / malformed request errors
            throw new Error(`Gemini API Error: ${message}`);
          }

          const result = await response.json();
          const textOutput = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (!textOutput) {
            lastError = new Error(`Empty response from ${model}`);
            continue;
          }

          return this.parseAndValidateResponse(textOutput);
        } catch (err: any) {
          if (err?.name === 'AbortError') {
            console.warn(`[AIService] Model ${model} timed out, trying fallback...`);
            lastError = new Error(`Request timeout on ${model}`);
            continue;
          }
          // Re-throw non-transient fatal errors immediately
          if (err?.message?.startsWith('Gemini API Error:') && !err.message.includes('(')) {
            throw err;
          }
          lastError = err instanceof Error ? err : new Error(String(err));
        } finally {
          clearTimeout(timeoutId);
        }
      }
    }

    throw lastError || new Error('Gemini API বর্তমানে ব্যস্ত আছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।');
  }

  /**
   * Process recorded audio file through Gemini Multimodal API (Mobile & Web)
   */
  static async analyzeAudio(audioUri: string): Promise<AIAnalysisResult> {
    try {
      let base64Audio: string;
      let mimeType = 'audio/m4a';

      if (audioUri.endsWith('.wav')) mimeType = 'audio/wav';
      else if (audioUri.endsWith('.mp3')) mimeType = 'audio/mp3';
      else if (audioUri.endsWith('.aac')) mimeType = 'audio/aac';
      else if (audioUri.endsWith('.webm') || audioUri.includes('webm')) mimeType = 'audio/webm';

      if (Platform.OS === 'web') {
        const resp = await fetch(audioUri);
        const blob = await resp.blob();
        if (blob.type) mimeType = blob.type.split(';')[0];

        base64Audio = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            resolve(dataUrl.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        base64Audio = await FileSystem.readAsStringAsync(audioUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      return await this.generateWithFallback([
        {
          text: SYSTEM_PROMPT + '\nদয়া করে নিচের সংযুক্ত অডিওটি প্রসেস করো এবং পিওর JSON তৈরি করো:',
        },
        {
          inlineData: {
            mimeType,
            data: base64Audio,
          },
        },
      ]);
    } catch (error: any) {
      console.error('[AIService] Audio analysis failed:', error);
      throw error;
    }
  }

  /**
   * Process written text/note through Gemini API
   */
  static async analyzeText(text: string): Promise<AIAnalysisResult> {
    try {
      return await this.generateWithFallback([
        {
          text: `${SYSTEM_PROMPT}\n\nব্যবহারকারীর লিখিত কথা:\n"${text}"\n\nউপরে দেওয়া তথ্য অনুযায়ী পিওর JSON প্রস্তুত করো:`,
        },
      ]);
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
   * Generate default template when offline or API is unreachable
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
      summary: spokenText
        ? spokenText.slice(0, 100) + (spokenText.length > 100 ? '...' : '')
        : 'রেকর্ডকৃত ভয়েস নোট সংরক্ষিত হয়েছে।',
      category: 'সাধারণ উপলব্ধি',
      tags: ['আত্মশুদ্ধি', 'নোট'],
    };
  }
}
