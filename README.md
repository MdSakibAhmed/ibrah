# 📖 ইবরা (Ibrah) — প্রজ্ঞা ও আত্মশুদ্ধির ডিজিটাল ডায়েরি

[![Expo SDK](https://img.shields.io/badge/Expo_SDK-58-blue.svg)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React_Native-0.88-61DAFB.svg)](https://reactnative.dev)
[![Supabase Realtime](https://img.shields.io/badge/Supabase-Realtime_Sync-3ECF8E.svg)](https://supabase.com)
[![Deployed on Vercel](https://img.shields.io/badge/Vercel-Deployed-000000.svg)](https://vercel.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**ইবরা (Ibrah)** হলো একটি শান্ত, আধুনিক ও সুরক্ষিত ক্রস-প্ল্যাটফর্ম অ্যাপ (Mobile & Web), যা দৈনন্দিন জীবনের বিভিন্ন ঘটনা, দ্বীনি আলোচনা, পারিবারিক বা দাম্পত্য কথোপকথন থেকে প্রাপ্ত মূল্যবান শিক্ষা ও উপলব্ধি (হিকমাহ) স্বয়ংক্রিয়ভাবে ভয়েস থেকে টেক্সট ও সামারিতে রূপান্তর করে এবং সারা জীবনের জন্য আত্মউন্নয়নের পাথেয় হিসেবে সংরক্ষণ করে।

---

## 🌟 মূল বৈশিষ্ট্যসমূহ (Core Features)

1. **ভয়েস-ফার্স্ট ক্যাপচার (Zero-Friction Voice Capture):**
   - স্ক্রিনের বড় মাইক বাটনে ট্যাপ করে যেকোনো সময় যেকোনো ঘটনা বা আলোচনা মুখে বলে রেকর্ড করুন।
   - লাইভ অডিও ওয়েভফর্ম ও টাইমার ডিসপ্লে।
   - চাইলে সরাসরি কিবোর্ডে লিখেও ভাবনাগুলো সেভ করার সুবিধা।

2. **এআই দ্বারা স্বয়ংক্রিয় প্রজ্ঞা নিষ্কাশন (Speech-to-Wisdom AI):**
   - Google Gemini Multimodal এআইয়ের মাধ্যমে বাংলা ও ইসলামিক আলোচনা গভীরভাবে বিশ্লেষণ।
   - স্বয়ংক্রিয়ভাবে ৪টি প্রধান ভাগে সাজিয়ে তৈরি করে:
     - **শিরোনাম (Title):** অর্থপূর্ণ ও আকর্ষণীয় নাম।
     - **মূল উপলব্ধি বা শিক্ষা (Hikmah/Learning):** ঘটনা থেকে কী শিখলাম।
     - **ভবিষ্যতের অঙ্গীকার (Action Item):** নিজেকে কীভাবে শুধরাব বা ভবিষ্যতে কী আমল করব।
     - **প্রেক্ষাপট (Story) ও সারসংক্ষেপ (Summary):** গুছিয়ে লেখা সম্পূর্ণ ঘটনা।
     - **স্মার্ট ট্যাগ (Tags):** বিষয়ভিত্তিক ট্যাগ (যেমন: `#সবর`, `#দাম্পত্য`, `#নম্রতা`, `#আত্মশুদ্ধি`)।

3. **🔄 মোবাইল ও ওয়েবের মধ্যে স্বয়ংক্রিয় রিয়েল-টাইম সিঙ্ক (Real-Time Cloud Sync):**
   - Supabase রিয়েল-টাইম ইঞ্জিন দ্বারা পরিচালিত।
   - মোবাইলে কোনো কথা রেকর্ড করলে তা **মুহূর্তের মধ্যে স্বয়ংক্রিয়ভাবে ওয়েব ভার্সনে চলে আসে**।
   - আবার ল্যাপটপ থেকে লাইভ সাইটে কোনো নোট লিখলে সাথে সাথে ফোনে পৌঁছে যায়।
   - কোনো জটিল রেজিস্ট্রেশন বা পাসওয়ার্ডের ঝামেলা নেই — কেবল একটি গোপন সিঙ্ক কী (Sync Key) দিয়ে সব ডিভাইস নিমেষে কানেক্টেড।

4. **অতীতের শিক্ষা রিভিজিট (Daily Wisdom / Flashback):**
   - প্রতিদিন হোম স্ক্রিনে অতীতের কোনো না কোনো প্রজ্ঞা ভেসে ওঠে।
   - স্পেসড রিপিটেশনের মাধ্যমে নিজের আত্মশুদ্ধি ও অর্জিত শিক্ষা জীবন্ত রাখা যায়।

5. **প্রজ্ঞা ও শিক্ষা হাব (Learnings Hub):**
   - শুধুমাত্র শিক্ষা ও অঙ্গীকারগুলোর একটি ডেডিকেটেড ভিউ।
   - ট্যাগভিত্তিক ফিল্টারিং (যেমন: কেবল `#দাম্পত্য` বা `#সবর` সম্পর্কিত শিক্ষাগুলো একনজরে পড়া)।

6. **📁 গুগল ড্রাইভে ম্যানুয়াল ব্যাকআপ ও রিস্টোর:**
   - এক ক্লিকে সম্পূর্ণ ডায়েরির ডেটা JSON আকারে এক্সপোর্ট করে Google Drive-এ রাখা বা পূর্বে সংরক্ষিত ফাইল থেকে রিস্টোর করার সুবিধা।

7. **🛡️ উচ্চমাত্রার নিরাপত্তা ও হার্ডওয়্যার এনক্রিপশন:**
   - আপনার এপিআই কী কোনো ক্লাউডে ফাঁস হয় না; সরাসরি মোবাইলের **Android KeyStore** ও **iOS Keychain**-এ এনক্রিপ্ট থাকে।
   - লোকাল-ফার্স্ট আর্কিটেকচার (SQLite on mobile, secure LocalStorage on web)।

---

## 🚀 লোকাল ডেভেলপমেন্ট (Local Setup)

```bash
# ১. ডিপেনডেন্সি ইনস্টল
npm install

# ২. মোবাইল ডেভেলপমেন্ট সার্ভার চালু (Expo Go)
npm start

# ৩. লোকাল ওয়েব ভার্সন চালু
npm run web
# ব্রাউজারে খুলবে: http://localhost:8081

# ৪. প্রোডাকশন ওয়েব বিল্ড টেস্ট
npm run build:web
```

---

## ⚡ Vercel-এ ওয়েব ভার্সন লাইভ করার নিয়ম (Deploy to Vercel)

প্রজেক্টে ইতিমধ্যে [vercel.json](vercel.json) কনফিগার করা রয়েছে, যা সিঙ্গেল পেজ অ্যাপ্লিকেশন (SPA) হিসেবে সব রাউটিং ও রিরাইট হ্যান্ডেল করে।

### পদ্ধতি ১: Vercel ড্যাশবোর্ড থেকে (সবচেয়ে সহজ)
1. এই গিটহাব রিপোজিটরিটি আপনার GitHub অ্যাকাউন্টে পুশ করুন।
2. [vercel.com](https://vercel.com)-এ গিয়ে **"Add New Project"** চাপুন।
3. আপনার গিটহাব রিপোজিটরি সিলেক্ট করুন।
4. **Environment Variables** সেকশনে নিচের ভ্যারিয়েবলগুলো যোগ করুন:
   - `EXPO_PUBLIC_SUPABASE_URL` = আপনার Supabase Project URL
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` = আপনার Supabase Anon Public Key
   - `EXPO_PUBLIC_GEMINI_API_KEY` = আপনার Google Gemini API Key
   - `EXPO_PUBLIC_SYNC_KEY` = আপনার গোপন সিঙ্ক কী (যেমন: `salman-2026`)
5. **Deploy** বাটনে ক্লিক করুন! কয়েক সেকেন্ডের মধ্যে আপনার ওয়েব ভার্সন লাইভ হয়ে যাবে।

### পদ্ধতি ২: Vercel CLI দিয়ে
```bash
npm install -g vercel
vercel
```

---

## 📱 মোবাইল অ্যাপ লাইভ করা (Standalone APK via EAS)

অ্যান্ড্রয়েড ফোনে সরাসরি ইনস্টল করে লাইভ চালানোর জন্য Expo-র ক্লাউড বিল্ড সার্ভিস কনফিগার করা রয়েছে:

```bash
# ১. EAS CLI লগইন (ফ্রি Expo অ্যাকাউন্ট)
npx eas-cli@latest login

# ২. স্ট্যান্ডঅ্যালোন APK বিল্ড শুরু
npx eas-cli@latest build --platform android --profile preview
```
বিল্ড শেষ হলে টার্মিনালে সরাসরি ডাউনলোড লিংক ও QR কোড পাবেন। ফোনের ক্যামেরা দিয়ে স্ক্যান করলেই `Ibrah.apk` ডাউনলোড হয়ে ইন্সটল হয়ে যাবে!

---

## 🔑 এনভায়রনমেন্ট ভ্যারিয়েবল (.env)

প্রজেক্টের রুট ফোল্ডারে একটি `.env` ফাইল তৈরি করে নিচের মতো মান বসাতে পারেন (নমুনা দেখুন [.env.example](.env.example)-এ):

```env
# Google Gemini API Key (https://aistudio.google.com)
EXPO_PUBLIC_GEMINI_API_KEY=AIzaSy...

# Supabase Project Configuration (https://supabase.com)
EXPO_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...

# গোপন সিঙ্ক কী (মোবাইল ও ওয়েব লিঙ্ক করার জন্য)
EXPO_PUBLIC_SYNC_KEY=your-secret-sync-key
```

> **টিপ:** কোনো কারণে `.env` ফাইল ব্যবহার না করলেও সমস্যা নেই! অ্যাপ ইনস্টল করার পর সরাসরি অ্যাপের **সেটিংস (Settings)** পেজ থেকেও এই তথ্যগুলো সংরক্ষণ করা যায়।

---

## 📁 প্রজেক্ট আর্কিটেকচার (Project Structure)

```
note-taker/
├── assets/                   # আইকন, স্প্ল্যাশ ও ইমেজ ফাইল
├── src/
│   ├── app/                  # Expo Router পেজ ও স্ক্রিন
│   │   ├── _layout.tsx       # রুট লেআউট ও রেসপনসিভ ডেক্সটপ কনটেইনার
│   │   ├── index.tsx         # হোম টাইমলাইন, সার্চ ও ফ্ল্যাশব্যাক
│   │   ├── record.tsx        # ভয়েস রেকর্ডার ও এআই প্রসেসিং
│   │   ├── learnings.tsx     # প্রজ্ঞা ও হিকমাহ হাব
│   │   ├── settings.tsx      # রিয়েল-টাইম সিঙ্ক, ব্যাকআপ ও এপিআই সেটিংস
│   │   └── reflection/
│   │       └── [id].tsx      # বিস্তারিত নোট, অডিও প্লেয়ার ও এডিট
│   ├── components/           # রিইউজেবল ইউআই উপাদান
│   │   ├── Header.tsx        # হেডার ও ক্লাউড সিঙ্ক স্ট্যাটাস ব্যাজ
│   │   ├── DailyWisdomCard.tsx # ফ্ল্যাশব্যাক কোট কার্ড
│   │   ├── ReflectionCard.tsx  # টাইমলাইন কার্ড
│   │   ├── AudioPlayerCard.tsx # অডিও প্লেয়ার কন্ট্রোল
│   │   └── WaveformIndicator.tsx # অ্যানিমেটেড অডিও ওয়েভফর্ম
│   ├── constants/            # রঙ ও ক্যাটাগরি কনস্ট্যান্ট
│   ├── services/             # ব্যাকএন্ড লজিক ও সিকিউরিটি সার্ভিস
│   │   ├── database.ts       # SQLite (মোবাইল) ও LocalStorage (ওয়েব)
│   │   ├── syncService.ts    # Supabase রিয়েল-টাইম দ্বি-মুখী সিঙ্ক
│   │   ├── ai.ts             # Google Gemini Multimodal স্পিচ ও টেক্সট এআই
│   │   ├── securityService.ts# হার্ডওয়্যার এনক্রিপশন ও স্যানিটাইজেশন
│   │   └── backupService.ts  # গুগল ড্রাইভ ম্যানুয়াল এক্সপোর্ট/ইমপোর্ট
│   └── types/                # টাইপস্ক্রিপ্ট টাইপ ডেফিনিশন
├── eas.json                  # Expo Application Services বিল্ড কনফিগ
├── vercel.json               # Vercel ডিপ্লয়মেন্ট ও URL রিরাইট কনফিগ
├── netlify.toml              # Netlify ডিপ্লয়মেন্ট কনফিগ
└── package.json
```

---

## 📄 লাইসেন্স (License)

এই প্রজেক্টটি [MIT License](LICENSE) এর আওতাধীন।
