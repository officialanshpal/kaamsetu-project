/**
 * KaamSetu Backend Server
 * ========================
 * Routes:
 *   POST /api/extract-skill   — Claude-powered skill extraction from text
 *   POST /api/match-jobs      — Match skill profile to job database
 *   POST /api/whatsapp        — WhatsApp webhook (Meta Cloud API)
 *   POST /api/post-job        — Employer posts a job
 *   GET  /api/jobs            — List all open jobs
 *
 * Setup:
 *   npm install express cors dotenv @anthropic-ai/sdk axios
 *   Set env: ANTHROPIC_API_KEY, WHATSAPP_TOKEN, WHATSAPP_PHONE_ID
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Anthropic = require("@anthropic-ai/sdk");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── In-memory DB (replace with Supabase in production) ──────────────────────
const JOBS = [
  { id: 1, title: "राजमिस्त्री (Mason)", skill_tags: ["mason","rajmistry","राजमिस्त्री","construction","brick","cement"], wage: 750, wage_max: 900, location: "Rohini, Delhi", distance_km: 3, employer: "Sharma Constructions", contact: "+919876543210", urgency: "आज से", slots: 3 },
  { id: 2, title: "बिजली मिस्त्री (Electrician)", skill_tags: ["electrician","bijli","बिजली","electrical","wiring"], wage: 850, wage_max: 1100, location: "Dwarka, Delhi", distance_km: 7, employer: "PowerFix Services", contact: "+919811122333", urgency: "कल से", slots: 1 },
  { id: 3, title: "प्लंबर (Plumber)", skill_tags: ["plumber","plumbing","paani","पानी","pipe","नल"], wage: 700, wage_max: 900, location: "Patel Nagar, Delhi", distance_km: 5, employer: "QuickFix Home", contact: "+919900112345", urgency: "2 दिन में", slots: 2 },
  { id: 4, title: "घरेलू सहायिका", skill_tags: ["cook","cooking","cleaning","helper","domestic","ghar","घर","safai","खाना"], wage: 12000, wage_max: 18000, location: "Vasant Kunj, Delhi", distance_km: 9, employer: "Family (via NGO)", contact: "+919765432109", urgency: "अगले हफ्ते", slots: 1, wage_type: "monthly" },
  { id: 5, title: "ड्राइवर (Driver)", skill_tags: ["driver","driving","car","truck","gaadi","गाड़ी"], wage: 18000, wage_max: 25000, location: "Noida Sec-62", distance_km: 14, employer: "LogiMove Pvt Ltd", contact: "+919555566677", urgency: "तुरंत", slots: 5, wage_type: "monthly" },
];

const WORKER_SESSIONS = {}; // phone → session state for WhatsApp bot

// ── Claude: Extract skill from natural language ──────────────────────────────
async function extractSkill(userText) {
  const msg = await claude.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    system: `You are a skill extraction assistant for Indian informal workers. Extract structured JSON from their description.
Return ONLY valid JSON with:
- skill_name: primary skill in Hindi
- skill_name_en: skill in English  
- skill_tags: array of 5-8 lowercase keywords
- location: city if mentioned, else "Delhi"
- experience_years: number or null
- wage_expectation: daily wage INR or null
- confidence: 0-1
- worker_message: 1-line encouraging message in Hindi`,
    messages: [{ role: "user", content: userText }],
  });

  const text = msg.content[0].text;
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

// ── Job Matcher ───────────────────────────────────────────────────────────────
function matchJobs(skillProfile, allJobs = JOBS) {
  const tags = (skillProfile.skill_tags || []).map(t => t.toLowerCase());
  return allJobs
    .map(job => {
      const overlap = job.skill_tags.filter(t =>
        tags.some(ut => t.includes(ut) || ut.includes(t))
      );
      const score = Math.min(99, Math.round(
        (overlap.length / Math.max(job.skill_tags.length, tags.length)) * 100
      ));
      return { ...job, match_score: score };
    })
    .filter(j => j.match_score > 20)
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, 4);
}

// ── WhatsApp Messenger ────────────────────────────────────────────────────────
async function sendWhatsApp(to, message) {
  if (!process.env.WHATSAPP_TOKEN) {
    console.log(`[WhatsApp Mock] To: ${to}\n${message}`);
    return;
  }
  await axios.post(
    `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: message },
    },
    { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` } }
  );
}

function formatJobsForWhatsApp(jobs, workerName = "आप") {
  if (!jobs.length) return "माफ़ करें, अभी कोई मिलती नौकरी नहीं मिली। कल फिर कोशिश करें।";
  let msg = `✅ *${workerName} के लिए ${jobs.length} काम मिले!*\n\n`;
  jobs.forEach((j, i) => {
    const wage = j.wage_type === "monthly"
      ? `₹${j.wage.toLocaleString()}/माह`
      : `₹${j.wage}/दिन`;
    msg += `*${i + 1}. ${j.title}*\n`;
    msg += `💰 ${wage}  📍 ${j.location} (${j.distance_km} km)\n`;
    msg += `⏰ ${j.urgency}  👔 ${j.employer}\n`;
    msg += `📞 ${j.contact}\n\n`;
  });
  msg += `_KaamSetu — काम सेतु 🔶_`;
  return msg;
}

// ── API Routes ────────────────────────────────────────────────────────────────

// Health check
app.get("/", (_, res) => res.json({ status: "KaamSetu API running ✅" }));

// Skill extraction
app.post("/api/extract-skill", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "text required" });
    const profile = await extractSkill(text);
    res.json({ success: true, profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Job matching
app.post("/api/match-jobs", async (req, res) => {
  try {
    const { text, profile: existingProfile } = req.body;
    const profile = existingProfile || (text ? await extractSkill(text) : null);
    if (!profile) return res.status(400).json({ error: "text or profile required" });
    const jobs = matchJobs(profile);
    res.json({ success: true, profile, jobs, total: jobs.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// All jobs
app.get("/api/jobs", (_, res) => res.json({ jobs: JOBS, total: JOBS.length }));

// Post a job (employer)
app.post("/api/post-job", (req, res) => {
  const { title, skill_tags, wage, location, employer, contact, slots } = req.body;
  const job = {
    id: JOBS.length + 1,
    title, skill_tags: skill_tags || [],
    wage: parseInt(wage) || 0,
    location, employer, contact,
    slots: parseInt(slots) || 1,
    urgency: "तुरंत",
    created_at: new Date().toISOString(),
  };
  JOBS.push(job);
  res.json({ success: true, job });
});

// ── WhatsApp Webhook ──────────────────────────────────────────────────────────

// Verify webhook (Meta requires GET)
app.get("/api/whatsapp", (req, res) => {
  const { "hub.verify_token": token, "hub.challenge": challenge } = req.query;
  if (token === (process.env.WHATSAPP_VERIFY_TOKEN || "kaamsetu_secret")) {
    res.send(challenge);
  } else {
    res.status(403).send("Forbidden");
  }
});

// Incoming WhatsApp messages
app.post("/api/whatsapp", async (req, res) => {
  res.sendStatus(200); // Always respond fast

  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    const message = change?.messages?.[0];
    if (!message) return;

    const from = message.from; // phone number
    const text = message.text?.body || "";
    const session = WORKER_SESSIONS[from] || { step: "start" };

    console.log(`[WA] From: ${from} | Step: ${session.step} | Text: ${text}`);

    if (session.step === "start" || text.toLowerCase().includes("नमस्ते") || text.toLowerCase().includes("hello")) {
      WORKER_SESSIONS[from] = { step: "awaiting_skill" };
      await sendWhatsApp(from,
        `🙏 *नमस्ते! KaamSetu में आपका स्वागत है।*\n\nमुझे बताइए — आपका क्या काम है?\n\n_उदाहरण: "मैं राजमिस्त्री हूँ, दिल्ली में हूँ"_`
      );
    }

    else if (session.step === "awaiting_skill") {
      await sendWhatsApp(from, "🔍 आपका कौशल पहचाना जा रहा है…");
      const profile = await extractSkill(text);
      const jobs = matchJobs(profile);
      WORKER_SESSIONS[from] = { step: "showed_results", profile, jobs };
      const reply = formatJobsForWhatsApp(jobs);
      await sendWhatsApp(from, reply);
      if (jobs.length > 0) {
        await sendWhatsApp(from,
          `किस नौकरी में रुचि है? *1, 2, 3* या *4* टाइप करें।\nया नई खोज के लिए "नई खोज" लिखें।`
        );
      }
    }

    else if (session.step === "showed_results") {
      const num = parseInt(text.trim());
      const { jobs } = session;
      if (num >= 1 && num <= jobs.length) {
        const job = jobs[num - 1];
        WORKER_SESSIONS[from] = { step: "start" };
        await sendWhatsApp(from,
          `✅ *${job.title}*\n\n` +
          `📍 ${job.location}\n💰 ₹${job.wage}/दिन\n👔 ${job.employer}\n\n` +
          `अभी संपर्क करें:\n📞 ${job.contact}\n\n` +
          `_KaamSetu आपकी मदद करता रहेगा! 🔶_`
        );
      } else {
        WORKER_SESSIONS[from] = { step: "awaiting_skill" };
        await sendWhatsApp(from, "अपना काम फिर से बताइए:");
      }
    }

  } catch (err) {
    console.error("[WA Error]", err.message);
  }
});

// ── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🔶 KaamSetu API running at http://localhost:${PORT}`);
  console.log(`   POST /api/extract-skill  — Skill extraction`);
  console.log(`   POST /api/match-jobs     — Job matching`);
  console.log(`   POST /api/whatsapp       — WhatsApp webhook`);
  console.log(`   GET  /api/jobs           — Browse jobs\n`);
});
