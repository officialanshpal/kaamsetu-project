# KaamSetu — काम सेतु 🔶
### Voice-First Job Matching for India's Informal Workers
**ROZGAAR Track | National Student Hackathon for Social Impact**

---

## 🎯 What It Does

KaamSetu connects India's 450 million informal workers to jobs using:
- **Voice input in Hindi** — workers speak their skill, no typing/reading needed
- **Claude AI** — extracts structured skill profile from natural speech
- **Instant job matching** — finds nearby jobs by skill, location, wage
- **Zero app install** — works via WhatsApp + USSD fallback for feature phones

---

## 🗂️ Project Structure

```
kaamsetu/
├── server.js          ← Node.js/Express backend API
├── package.json       ← Backend dependencies
├── .env.example       ← Environment variables template
├── test-api.js        ← API test script
└── src/
    └── App.jsx        ← React frontend (also works as standalone artifact)
```

---

## ⚡ Quick Start (Backend)

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment
```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

### 3. Run the server
```bash
npm start
# → KaamSetu API running at http://localhost:3001
```

### 4. Test the API
```bash
node test-api.js
```

---

## 🔌 API Endpoints

### `POST /api/extract-skill`
Extract a skill profile from Hindi/Hinglish/English text.

**Request:**
```json
{ "text": "मैं राजमिस्त्री हूँ, 10 साल का अनुभव है, दिल्ली में हूँ" }
```

**Response:**
```json
{
  "success": true,
  "profile": {
    "skill_name": "राजमिस्त्री",
    "skill_name_en": "Mason",
    "skill_tags": ["mason", "rajmistry", "construction", "brick", "cement", "plaster"],
    "location": "Delhi",
    "experience_years": 10,
    "wage_expectation": null,
    "confidence": 0.95,
    "worker_message": "आपकी प्रोफ़ाइल तैयार है! बहुत अच्छा अनुभव है आपके पास।"
  }
}
```

---

### `POST /api/match-jobs`
Match a worker to available jobs.

**Request:**
```json
{ "text": "बिजली का काम आता है" }
```

**Response:**
```json
{
  "success": true,
  "profile": { ... },
  "jobs": [
    {
      "id": 2,
      "title": "बिजली मिस्त्री (Electrician)",
      "wage": 850,
      "location": "Dwarka, Delhi",
      "match_score": 87,
      ...
    }
  ],
  "total": 2
}
```

---

### `POST /api/whatsapp`
WhatsApp webhook — handles incoming messages from workers.

**Flow:**
```
Worker sends "नमस्ते"
  → Bot: "अपना काम बताइए"
Worker: "मैं राजमिस्त्री हूँ"
  → Bot: extracts skill → shows top 4 matching jobs with wages + contacts
Worker: "1"
  → Bot: sends full details of job #1 with direct phone number
```

---

### `POST /api/post-job`
Employer posts a new job opening.

```json
{
  "title": "कारपेंटर चाहिए",
  "skill_tags": ["carpenter", "wood", "furniture"],
  "wage": 800,
  "location": "Lajpat Nagar, Delhi",
  "employer": "Furniture Studio",
  "contact": "+919888877766",
  "slots": 2
}
```

---

## 📱 Frontend Setup (React)

The `src/App.jsx` is a self-contained React component. Run it inside any React project:

```bash
npx create-react-app kaamsetu-frontend
cd kaamsetu-frontend
# Replace src/App.js content with src/App.jsx
npm start
```

Or paste `App.jsx` directly into Claude.ai's artifact runner — it works as a standalone artifact with live Claude API calls.

---

## 🔑 API Keys You Need

| Service | Purpose | Get it at | Cost |
|---------|---------|-----------|------|
| **Anthropic Claude** | Skill extraction NLP | console.anthropic.com | ~$0.003/call |
| **Bhashini (Govt.)** | Hindi voice-to-text | bhashini.gov.in | Free |
| **Meta WhatsApp Cloud API** | WhatsApp bot | developers.facebook.com | Free (up to 1000 conv/month) |
| **Twilio** | USSD / SMS fallback | twilio.com | ~₹0.5/SMS |

---

## 🏗️ Architecture

```
Worker's Phone (Any Android, ₹5000+)
    │
    ├── Voice Input → Web Speech API (Hindi) → Text
    │   OR
    ├── WhatsApp Message → Meta Cloud API → Webhook
    │   OR
    └── USSD (*123#) → Twilio → API
         │
         ▼
    KaamSetu Backend (Node.js/Express)
         │
         ├── Claude API ──────────── Skill Extraction (NLP)
         ├── Job DB (Supabase) ───── Vector Matching (pgvector)
         └── Response
              │
              ├── React Web App ───── Job cards with Call/WhatsApp
              ├── WhatsApp Message ── Formatted job list
              └── USSD Menu ───────── Numbered options
```

---

## 🚀 For the Hackathon Demo

**What to show (in order):**
1. Open the React app on your phone
2. Tap mic → say "मैं राजमिस्त्री हूँ, दिल्ली में हूँ" in Hindi
3. Show Claude extracting the skill profile in real-time
4. Show 4 matching jobs appearing with match %, wage, distance
5. Tap a job → show Call + WhatsApp buttons
6. Switch to Employer tab → show how a contractor posts a job
7. Show the backend logs + WhatsApp bot flow (via mock terminal)

**Killer pitch line:**
> "We didn't build another job portal. We built the infrastructure that 450 million people were waiting for — in their language, on their phone, for free."

---

## 🌱 Scale Path (Post-Hackathon)

- Replace in-memory DB with **Supabase + pgvector** for semantic search
- Add **Bhashini API** for 12 Indian language voice support
- **Aadhaar eKYC** for worker identity + skill verification
- **Employer rating system** to build trust
- **NGO partnerships** for women workers, migrant workers
- Revenue: employer subscription (₹500/month for unlimited postings)

---

## 👥 Team Roles

| Person | Track |
|--------|-------|
| Backend Dev | server.js, Claude API, matching engine |
| Frontend Dev | React app, WhatsApp bot, UX polish |
| AI/NLP | Prompt engineering, multilingual testing |
| Design + Pitch | Impact framing, demo flow, slide deck |

---

*Built with ❤️ for India's invisible workforce.*
*KaamSetu — काम सेतु · ROZGAAR Track · National Student Hackathon for Social Impact*

