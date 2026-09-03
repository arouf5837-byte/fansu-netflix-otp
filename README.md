# 🎬 Netflix OTP & Household Self-Service System

একটি স্বয়ংক্রিয় **Netflix OTP & Household Verification Self-Service Portal** যা সাবস্ক্রিপশন রিসেলার ও প্রোভাইডারদের জন্য তৈরি। গ্রাহকরা অ্যাডমিনকে নক না করে সরাসরি নিজের Access Key ব্যবহার করে ইনস্ট্যান্ট ওটিপি ও ভেরিফিকেশন লিঙ্ক দেখতে ও কপি করতে পারবে।

---

## 🌟 প্রধান ফিচারসমূহ (Key Features)

1. **Client Self-Service Portal**:
   - ক্লায়েন্ট তার জন্য নির্ধারিত `Access Key` (e.g. `NF-7821`) দিয়ে লগইন করবে।
   - পেজ রিফ্রেশ ছাড়াই রিয়েলটাইমে (WebSocket) ওটিপি স্ক্রিনে ভেসে উঠবে।
   - **4/6 ডিজিটের ওটিপি কোড** (১-ক্লিক কপি ও কনফেটি অ্যানিমেশনসহ)।
   - **Household / Travel Verification Link** (সরাসরি ক্লিক করে ভেরিফাই করার বাটন)।
   - স্মার্ট টিভি, মোবাইল ও পিসির জন্য বিস্তারিত বাংলা নির্দেশিকা।

2. **Admin Dashboard (PIN: `0549`)**:
   - **Master Netflix Accounts**: একাধিক জিমেইল বা কাস্টম ডোমেইন অ্যাকাউন্ট যুক্ত করার সুবিধা।
   - **Client Access Keys**: গ্রাহকদের নাম, মেয়াদ (৭ দিন / ১ মাস / লাইফটাইম) দিয়ে ইউনিক কি তৈরি ও এক ক্লিকে **WhatsApp Shareable Link** কপি।
   - **Live OTP Logs & Test Generator**: লাইভ ইনকামিং ওটিপির তালিকা এবং সিস্টেম টেস্ট করার জন্য ইনস্ট্যান্ট টেস্ট ওটিপি বাটন।

3. **Background Email Worker (IMAP / Webhook)**:
   - Gmail (App Password) বা যেকোনো IMAP সার্ভার থেকে নেটফ্লিক্সের ইমেইল স্বয়ংক্রিয়ভাবে পড়ে ওটিপি ও লিঙ্ক এক্সট্র্যাক্ট করে Supabase-এ জমা করে।

---

## 🚀 কীভাবে চালু করবেন (Quick Start)

### ১. ফ্রন্টএন্ড চালানো (Client Portal)
```bash
cd client
npm install
npm run dev
```
ব্রাউজারে ওপেন করুন: `http://localhost:5173`

---

### ২. Supabase ডাটাবেজ সেটআপ (ফ্রি)
1. [supabase.com](https://supabase.com)-এ একটি ফ্রি প্রজেক্ট তৈরি করুন।
2. প্রজেক্টের **SQL Editor**-এ গিয়ে `supabase_schema.sql` ফাইলের কোডটি পেস্ট করে **RUN** করুন।
3. Supabase ড্যাশবোর্ডের **Project Settings > API** থেকে:
   - `Project URL`
   - `anon public key`
   - `service_role key` (শুধুমাত্র worker-এর জন্য) সংগ্রহ করুন।
4. আমাদের ওয়েবসাইটের ডানদিকের **Settings (গিয়ার আইকন)** এ ক্লিক করে Supabase URL ও Anon Key ইনপুট দিয়ে **Save** করুন।

---

### ৩. Gmail App Password তৈরি (Google API লাগবে না!)
1. আপনার নেটফ্লিক্স যে জিমেইলে খোলা, সেই জিমেইলে ঢুকুন।
2. **Manage your Google Account > Security** ট্যাবে যান।
3. **2-Step Verification** চালু করুন।
4. সার্চবারে লিখুন **"App passwords"**।
5. অ্যাপের নাম দিন `Netflix OTP` এবং Create করুন।
6. আপনি একটি **১৬ অক্ষরের পাসওয়ার্ড** পাবেন। এটি অ্যাডমিন প্যানেলে অ্যাকাউন্ট যোগ করার সময় ব্যবহার করবেন।

---

### ৪. ব্যাকগ্রাউন্ড ইমেইল ওয়ার্কার চালানো (Worker)
```bash
cd worker
npm install
```
`worker/.env` ফাইলে আপনার সুপাবেস তথ্য দিন:
```env
PORT=4000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```
এরপর রান করুন:
```bash
npm start
```

---

## 📁 প্রজেক্ট স্ট্রাকচার (Project Structure)
```
├── client/                     # Vite + React + Tailwind Frontend Portal
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx          # Top Navigation & Status
│   │   │   ├── ClientPortal.jsx    # User OTP & Household Link Viewer
│   │   │   ├── AdminDashboard.jsx  # Accounts, Keys & Live Logs Manager
│   │   │   └── SettingsModal.jsx   # Supabase Configuration Modal
│   │   ├── supabaseClient.js       # Realtime Supabase Connector
│   │   └── mockData.js             # Instant Trial / Demo Data
│   └── index.html
├── worker/                     # Node.js IMAP Email Listener & Parser
│   ├── parser.js               # Regex extraction for Netflix OTP & URLs
│   ├── imap-service.js         # Multi-account IMAP Flow Manager
│   └── server.js               # Express API & Auto-sync Engine
└── supabase_schema.sql         # Complete PostgreSQL Database Schema
```
