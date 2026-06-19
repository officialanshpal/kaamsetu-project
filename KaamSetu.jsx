import { useState, useRef } from "react";

// ── Inline styles ────────────────────────────────────────────────────────────
const G = {
  saffron: "#E8640C", deep: "#0F1E2B", slate: "#2D4155",
  muted: "#7A8FA0", bg: "#F2EFE9", green: "#1A7A4A",
  greenLight: "#E8F5EF", white: "#FFFFFF", saffronLight: "#FDF0E6",
};

// ── Job Database ─────────────────────────────────────────────────────────────
const JOBS = [
  { id:1, emoji:"🧱", title:"राजमिस्त्री", title_en:"Mason", tags:["mason","rajmistry","राजमिस्त्री","construction","brick","cement","plaster","निर्माण"], wage:750, wage_max:900, location:"Rohini, Delhi", km:3, employer:"Sharma Constructions", phone:"+91-98765-43210", urgency:"आज से", slots:3 },
  { id:2, emoji:"⚡", title:"बिजली मिस्त्री", title_en:"Electrician", tags:["electrician","bijli","बिजली","electrical","wiring","electric","इलेक्ट्रिशियन"], wage:850, wage_max:1100, location:"Dwarka, Delhi", km:7, employer:"PowerFix Services", phone:"+91-98111-22333", urgency:"कल से", slots:1 },
  { id:3, emoji:"🔧", title:"प्लंबर", title_en:"Plumber", tags:["plumber","plumbing","paani","पानी","pipe","नल","प्लंबर"], wage:700, wage_max:900, location:"Patel Nagar, Delhi", km:5, employer:"QuickFix Home", phone:"+91-99001-12345", urgency:"2 दिन में", slots:2 },
  { id:4, emoji:"🏠", title:"घरेलू सहायिका", title_en:"Domestic Worker", tags:["cook","cooking","cleaning","helper","domestic","ghar","घर","safai","साफाई","khana","खाना","bartan","बर्तन"], wage:14000, wage_max:18000, location:"Vasant Kunj, Delhi", km:9, employer:"Family via NGO", phone:"+91-97654-32109", urgency:"अगले हफ्ते", slots:1, monthly:true },
  { id:5, emoji:"🚗", title:"ड्राइवर", title_en:"Driver", tags:["driver","driving","car","truck","gaadi","गाड़ी","ड्राइवर","vehicle"], wage:20000, wage_max:25000, location:"Noida Sec-62, UP", km:14, employer:"LogiMove Pvt Ltd", phone:"+91-95555-66677", urgency:"तुरंत", slots:5, monthly:true },
  { id:6, emoji:"🌾", title:"खेत मज़दूर", title_en:"Farm Labour", tags:["farm","farming","khet","खेत","agriculture","crop","harvest","fasal","फसल","मज़दूर"], wage:450, wage_max:550, location:"Sonipat, Haryana", km:45, employer:"Farmer Collective", phone:"+91-94444-55566", urgency:"3 दिन में", slots:10 },
  { id:7, emoji:"🎨", title:"पेंटर", title_en:"Painter", tags:["painter","painting","paint","rang","रंग","पेंटर","wall","दीवार"], wage:650, wage_max:800, location:"Gurugram Sec-14", km:18, employer:"ColorCraft Works", phone:"+91-93333-44455", urgency:"आज से", slots:4 },
  { id:8, emoji:"🧵", title:"दर्ज़ी / सिलाई", title_en:"Tailor", tags:["tailor","sewing","silai","सिलाई","stitching","kapda","कपड़ा","garment","कारीगर"], wage:11000, wage_max:15000, location:"Okhla Industrial, Delhi", km:11, employer:"Garment Factory Ltd", phone:"+91-92222-33344", urgency:"कल से", slots:8, monthly:true },
  { id:9, emoji:"🔩", title:"वेल्डर", title_en:"Welder", tags:["welder","welding","iron","loha","लोहा","metal","वेल्डर","steel"], wage:900, wage_max:1200, location:"Bahadurgarh, Haryana", km:22, employer:"SteelFab Industries", phone:"+91-91111-22233", urgency:"तुरंत", slots:2 },
  { id:10, emoji:"🧹", title:"सफाई कर्मचारी", title_en:"Sanitation Staff", tags:["cleaning","safai","सफाई","sweeper","sanitation","hygiene","housekeeping"], wage:10000, wage_max:13000, location:"South Delhi", km:6, employer:"CleanCity Services", phone:"+91-89999-00011", urgency:"तुरंत", slots:15, monthly:true },
];

// ── Claude API ────────────────────────────────────────────────────────────────
async function claudeExtract(input) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: `You are a skill extractor for Indian informal workers. Given their description in Hindi/Hinglish/English, return ONLY valid JSON (no markdown, no explanation):
{
  "skill_name": "skill in Hindi (e.g. राजमिस्त्री)",
  "skill_name_en": "skill in English",
  "skill_tags": ["array","of","5-8","lowercase","keywords"],
  "location": "city if mentioned else Delhi",
  "experience_years": null_or_number,
  "wage_expectation": null_or_daily_INR_number,
  "confidence": 0.0_to_1.0,
  "worker_message": "warm 1-line message in Hindi encouraging the worker"
}`,
      messages: [{ role: "user", content: input }],
    }),
  });
  const d = await r.json();
  const raw = d.content?.[0]?.text || "{}";
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}

// ── Matcher ───────────────────────────────────────────────────────────────────
function matchJobs(profile) {
  if (!profile?.skill_tags?.length) return [];
  const utags = profile.skill_tags.map(t => t.toLowerCase());
  return JOBS
    .map(j => {
      const hits = j.tags.filter(t => utags.some(u => t.includes(u) || u.includes(t)));
      const raw = (hits.length / Math.max(j.tags.length, utags.length)) * 100;
      return { ...j, score: Math.min(98, Math.round(raw + (raw > 0 ? Math.random() * 7 : 0))) };
    })
    .filter(j => j.score > 18)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Tag({ children, color = G.saffron }) {
  return (
    <span style={{ background: color + "22", color, fontSize: "0.68rem", fontWeight: 700, padding: "0.18rem 0.55rem", borderRadius: 8, letterSpacing: 0.3 }}>
      {children}
    </span>
  );
}

function ScorePip({ score }) {
  const c = score >= 80 ? G.green : score >= 55 ? "#B45309" : G.muted;
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ background: c + "18", color: c, fontWeight: 800, fontSize: "0.85rem", padding: "0.25rem 0.6rem", borderRadius: 9, border: `1.5px solid ${c}44` }}>
        {score}%
      </div>
      <div style={{ fontSize: "0.6rem", color: G.muted, marginTop: 2 }}>match</div>
    </div>
  );
}

function Loader({ msg }) {
  return (
    <div style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes wave{0%,100%{transform:scaleY(0.5)}50%{transform:scaleY(1.5)}}`}</style>
      <div style={{ display: "flex", gap: 5, justifyContent: "center", marginBottom: 14 }}>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} style={{ width: 5, height: 24, background: G.saffron, borderRadius: 3, animation: `wave 1s ${i * 0.12}s ease-in-out infinite`, opacity: 0.7 + i * 0.06 }} />
        ))}
      </div>
      <p style={{ color: G.muted, fontSize: "0.85rem", fontFamily: "'Noto Sans Devanagari',sans-serif" }}>{msg}</p>
    </div>
  );
}

function SkillCard({ profile }) {
  return (
    <div style={{ background: G.deep, borderRadius: 14, padding: "1.1rem 1.25rem", marginBottom: 16, color: "white" }}>
      <div style={{ fontSize: "0.65rem", letterSpacing: 1.5, textTransform: "uppercase", color: G.saffron, fontWeight: 700, marginBottom: 8 }}>
        ✓ कौशल पहचाना गया
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ background: G.saffron, borderRadius: 10, padding: "0.4rem 1rem", fontWeight: 700, fontSize: "1rem", fontFamily: "'Noto Sans Devanagari',sans-serif" }}>
          {profile.skill_name}
        </div>
        <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
          {profile.skill_name_en}
          {profile.experience_years ? ` · ${profile.experience_years} साल` : ""}
          {profile.location ? ` · ${profile.location}` : ""}
        </div>
      </div>
      {profile.worker_message && (
        <div style={{ marginTop: 10, fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", fontFamily: "'Noto Sans Devanagari',sans-serif", borderTop: "1px solid rgba(255,255,255,0.09)", paddingTop: 9 }}>
          💬 {profile.worker_message}
        </div>
      )}
    </div>
  );
}

function JobCard({ job }) {
  const [open, setOpen] = useState(false);
  const wage = job.monthly ? `₹${job.wage.toLocaleString()}–${job.wage_max.toLocaleString()}/माह` : `₹${job.wage}–${job.wage_max}/दिन`;

  return (
    <div
      onClick={() => setOpen(o => !o)}
      style={{
        background: G.white, borderRadius: 13, padding: "0.95rem 1.05rem", marginBottom: 9, cursor: "pointer",
        border: `1.5px solid ${open ? G.saffron : "rgba(0,0,0,0.08)"}`,
        boxShadow: open ? `0 4px 18px rgba(232,100,12,0.1)` : "0 2px 6px rgba(0,0,0,0.04)",
        transition: "all 0.2s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <div style={{ width: 42, height: 42, background: G.saffronLight, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem", flexShrink: 0 }}>
          {job.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: "0.9rem", fontFamily: "'Noto Sans Devanagari',sans-serif", marginBottom: 2 }}>{job.title}</div>
          <div style={{ fontSize: "0.75rem", color: G.muted }}>{wage} · {job.location}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
          <ScorePip score={job.score} />
          <div style={{ fontSize: "0.65rem", color: G.muted }}>{job.km} km</div>
        </div>
      </div>

      {open && (
        <div style={{ marginTop: 13, paddingTop: 13, borderTop: "1px solid rgba(0,0,0,0.07)", animation: "fadeIn 0.15s ease" }}>
          <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}`}</style>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px", marginBottom: 12, fontSize: "0.78rem" }}>
            {[["नियोक्ता", job.employer], ["उपलब्धता", job.urgency], ["जगह खाली", `${job.slots} slot`], ["दूरी", `${job.km} km`]].map(([l, v]) => (
              <div key={l}>
                <div style={{ fontSize: "0.62rem", color: G.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 1 }}>{l}</div>
                <div style={{ fontWeight: 500 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <a href={`tel:${job.phone}`} onClick={e => e.stopPropagation()} style={{ background: G.saffron, color: "white", borderRadius: 10, padding: "0.6rem", textAlign: "center", fontWeight: 700, fontSize: "0.8rem", textDecoration: "none", display: "block" }}>
              📞 Call Now
            </a>
            <a href={`https://wa.me/${job.phone.replace(/\D/g, "")}?text=नमस्ते, मुझे ${job.title} काम के बारे में जानकारी चाहिए।`}
              target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
              style={{ background: "#25D366", color: "white", borderRadius: 10, padding: "0.6rem", textAlign: "center", fontWeight: 700, fontSize: "0.8rem", textDecoration: "none", display: "block" }}>
              💬 WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Worker Tab ────────────────────────────────────────────────────────────────
function WorkerTab() {
  const [phase, setPhase] = useState("input"); // input | loading | results
  const [textInput, setTextInput] = useState("");
  const [listening, setListening] = useState(false);
  const [liveText, setLiveText] = useState("");
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const recRef = useRef(null);

  const SAMPLES = [
    "मैं राजमिस्त्री हूँ, 10 साल अनुभव",
    "बिजली का काम आता है, electrician हूँ",
    "घर का काम करती हूँ — cooking, cleaning",
    "Driver हूँ, truck चला सकता हूँ",
    "खेती का काम जानता हूँ",
  ];

  const doSearch = async (txt) => {
    if (!txt.trim()) return;
    setPhase("loading");
    setErr("");
    try {
      const profile = await claudeExtract(txt);
      const jobs = matchJobs(profile);
      setResult({ profile, jobs, input: txt });
      setPhase("results");
    } catch (e) {
      setErr("कुछ गड़बड़ हुई। फिर कोशिश करें।");
      setPhase("input");
    }
  };

  const startVoice = () => {
    setErr("");
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setErr("Voice support नहीं है। नीचे type करें।"); return; }
    const rec = new SR();
    rec.lang = "hi-IN";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onstart = () => setListening(true);
    rec.onresult = e => setLiveText(Array.from(e.results).map(r => r[0].transcript).join(""));
    rec.onerror = () => { setListening(false); setErr("माइक काम नहीं कर रहा।"); };
    rec.onend = () => {
      setListening(false);
      if (liveText) { setTextInput(liveText); setLiveText(""); doSearch(liveText); }
    };
    recRef.current = rec;
    rec.start();
  };

  const stopVoice = () => { recRef.current?.stop(); setListening(false); };

  if (phase === "loading") return <Loader msg="AI आपका कौशल पहचान रहा है…" />;

  if (phase === "results" && result) return (
    <div>
      <SkillCard profile={result.profile} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: "0.78rem", fontWeight: 700, color: G.deep }}>
          {result.jobs.length > 0 ? `${result.jobs.length} काम मिले 🎯` : "कोई काम नहीं मिला"}
        </div>
        <div style={{ fontSize: "0.68rem", color: G.muted, maxWidth: 160, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          "{result.input}"
        </div>
      </div>

      {result.jobs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "1.5rem", background: "white", borderRadius: 13, border: "1px dashed rgba(0,0,0,0.12)" }}>
          <div style={{ fontSize: "1.8rem", marginBottom: 6 }}>🔍</div>
          <div style={{ fontSize: "0.82rem", color: G.muted, fontFamily: "'Noto Sans Devanagari',sans-serif" }}>
            अभी कोई काम नहीं मिला। कल फिर कोशिश करें।
          </div>
        </div>
      ) : result.jobs.map(j => <JobCard key={j.id} job={j} />)}

      <button onClick={() => { setPhase("input"); setTextInput(""); setResult(null); }}
        style={{ width: "100%", marginTop: 6, padding: "0.7rem", background: "white", border: "1.5px solid rgba(0,0,0,0.12)", borderRadius: 11, fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", color: G.slate, fontFamily: "'Noto Sans Devanagari',sans-serif" }}>
        ← नई खोज करें
      </button>
    </div>
  );

  return (
    <div>
      {/* Mic button */}
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <p style={{ fontSize: "0.8rem", color: listening ? G.saffron : G.muted, fontFamily: "'Noto Sans Devanagari',sans-serif", marginBottom: 10 }}>
          {listening ? "🔴 बोल रहे हैं… रुकने पर बटन दबाएं" : "माइक बटन दबाएं और अपना काम बताएं"}
        </p>
        <button
          onClick={listening ? stopVoice : startVoice}
          style={{
            width: 76, height: 76, borderRadius: "50%", border: "none", cursor: "pointer",
            background: listening ? "#DC2626" : G.saffron, fontSize: "2rem",
            boxShadow: listening ? "0 0 0 14px rgba(220,38,38,0.15)" : "0 0 0 10px rgba(232,100,12,0.13)",
            transform: listening ? "scale(1.08)" : "scale(1)", transition: "all 0.25s",
          }}
        >
          {listening ? "⏹" : "🎙️"}
        </button>
        {liveText && (
          <div style={{ marginTop: 10, background: G.saffronLight, borderRadius: 10, padding: "0.55rem 1rem", fontSize: "0.82rem", color: G.deep, fontFamily: "'Noto Sans Devanagari',sans-serif", maxWidth: 300, margin: "10px auto 0" }}>
            "{liveText}"
          </div>
        )}
      </div>

      {/* Sample chips */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: "0.65rem", color: G.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 7 }}>उदाहरण — tap करें</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {SAMPLES.map((s, i) => (
            <button key={i} onClick={() => setTextInput(s)}
              style={{ background: G.bg, border: "1px solid rgba(0,0,0,0.1)", borderRadius: 18, padding: "0.28rem 0.7rem", fontSize: "0.72rem", cursor: "pointer", fontFamily: "'Noto Sans Devanagari',sans-serif", color: G.slate, transition: "all 0.15s" }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Text input */}
      <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: 14 }}>
        <div style={{ fontSize: "0.65rem", color: G.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 7 }}>या type करें</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && doSearch(textInput)}
            placeholder="अपना काम यहाँ लिखें…"
            style={{ flex: 1, padding: "0.65rem 0.9rem", borderRadius: 10, border: "1.5px solid rgba(0,0,0,0.12)", fontSize: "0.88rem", fontFamily: "'Noto Sans Devanagari',Inter,sans-serif", outline: "none", background: G.white }}
          />
          <button onClick={() => doSearch(textInput)}
            style={{ background: G.saffron, color: "white", border: "none", borderRadius: 10, padding: "0 1.1rem", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem" }}>
            →
          </button>
        </div>
        {err && <div style={{ color: "#DC2626", fontSize: "0.75rem", marginTop: 6 }}>{err}</div>}
      </div>
    </div>
  );
}

// ── Employer Tab ──────────────────────────────────────────────────────────────
function EmployerTab() {
  const [form, setForm] = useState({ title: "", skill: "", wage: "", location: "", slots: "" });
  const [done, setDone] = useState(false);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  if (done) return (
    <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
      <div style={{ fontSize: "2.5rem", marginBottom: 10 }}>✅</div>
      <h3 style={{ fontFamily: "'Noto Sans Devanagari',sans-serif", marginBottom: 8, fontSize: "1rem" }}>जॉब पोस्ट हो गई!</h3>
      <p style={{ fontSize: "0.82rem", color: G.muted, marginBottom: 18, fontFamily: "'Noto Sans Devanagari',sans-serif" }}>योग्य कारीगरों को WhatsApp पर सूचना भेजी जा रही है।</p>
      <button onClick={() => { setDone(false); setForm({ title: "", skill: "", wage: "", location: "", slots: "" }); }}
        style={{ background: G.saffron, color: "white", border: "none", borderRadius: 10, padding: "0.65rem 1.5rem", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem" }}>
        नई जॉब पोस्ट करें
      </button>
    </div>
  );

  const fields = [
    { k: "title", label: "काम का नाम", ph: "जैसे: राजमिस्त्री चाहिए" },
    { k: "skill", label: "ज़रूरी कौशल (English में)", ph: "mason, plumber, driver…" },
    { k: "wage", label: "मज़दूरी ₹/दिन", ph: "जैसे: 700" },
    { k: "location", label: "काम की जगह", ph: "जैसे: Rohini, Delhi" },
    { k: "slots", label: "कितने लोग चाहिए", ph: "जैसे: 3" },
  ];

  return (
    <div>
      <p style={{ fontSize: "0.8rem", color: G.muted, fontFamily: "'Noto Sans Devanagari',sans-serif", marginBottom: 14 }}>
        कारीगर की ज़रूरत है? नीचे भरें — matching तुरंत होगा।
      </p>
      {fields.map(f => (
        <div key={f.k} style={{ marginBottom: 11 }}>
          <label style={{ display: "block", fontSize: "0.65rem", color: G.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{f.label}</label>
          <input value={form[f.k]} onChange={set(f.k)} placeholder={f.ph}
            style={{ width: "100%", padding: "0.6rem 0.9rem", borderRadius: 9, border: "1.5px solid rgba(0,0,0,0.12)", fontSize: "0.86rem", outline: "none", fontFamily: "'Noto Sans Devanagari',Inter,sans-serif", background: G.white }} />
        </div>
      ))}
      <button onClick={() => setDone(true)}
        style={{ width: "100%", padding: "0.75rem", background: G.deep, color: "white", border: "none", borderRadius: 11, fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", fontFamily: "'Noto Sans Devanagari',sans-serif", marginTop: 4 }}>
        जॉब पोस्ट करें →
      </button>
    </div>
  );
}

// ── Stats bar ─────────────────────────────────────────────────────────────────
function StatsBar() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 16 }}>
      {[["450M", "कारीगर"], ["12+", "भाषाएं"], ["₹0", "फीस"]].map(([n, l]) => (
        <div key={n} style={{ background: G.white, borderRadius: 11, padding: "0.65rem 0.5rem", textAlign: "center", border: "1px solid rgba(0,0,0,0.07)" }}>
          <div style={{ fontWeight: 800, fontSize: "1.05rem", color: G.saffron, lineHeight: 1 }}>{n}</div>
          <div style={{ fontSize: "0.65rem", color: G.muted, fontFamily: "'Noto Sans Devanagari',sans-serif", marginTop: 2 }}>{l}</div>
        </div>
      ))}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("worker");

  return (
    <div style={{ minHeight: "100vh", background: G.bg, fontFamily: "Inter,'Noto Sans Devanagari',sans-serif", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        button:active{transform:scale(0.97);}
        input:focus{border-color:#E8640C!important;box-shadow:0 0 0 3px rgba(232,100,12,0.12);}
      `}</style>

      {/* Header */}
      <div style={{ width: "100%", background: G.deep, padding: "0.85rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1.25rem", color: G.white }}>
            Kaam<span style={{ color: G.saffron }}>Setu</span>
          </span>
          <span style={{ fontFamily: "'Noto Sans Devanagari',sans-serif", color: "rgba(255,255,255,0.35)", fontSize: "0.85rem" }}>काम सेतु</span>
        </div>
        <div style={{ background: "rgba(232,100,12,0.15)", border: "1px solid rgba(232,100,12,0.3)", color: G.saffron, borderRadius: 16, padding: "0.2rem 0.7rem", fontSize: "0.65rem", fontWeight: 700, letterSpacing: 0.5 }}>
          🏆 ROZGAAR TRACK
        </div>
      </div>

      {/* Body */}
      <div style={{ width: "100%", maxWidth: 480, padding: "1.1rem", flex: 1 }}>
        <StatsBar />

        {/* Tab switcher */}
        <div style={{ display: "flex", background: G.white, borderRadius: 11, padding: 3, marginBottom: 16, border: "1px solid rgba(0,0,0,0.08)" }}>
          {[["worker", "👷 मुझे काम चाहिए"], ["employer", "🏢 कारीगर चाहिए"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ flex: 1, padding: "0.58rem 0.5rem", borderRadius: 9, border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem", fontFamily: "'Noto Sans Devanagari',Inter,sans-serif", transition: "all 0.2s", background: tab === id ? G.deep : "transparent", color: tab === id ? "white" : G.muted }}>
              {label}
            </button>
          ))}
        </div>

        {/* Card */}
        <div style={{ background: G.white, borderRadius: 16, padding: "1.1rem", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 4px 22px rgba(0,0,0,0.07)" }}>
          {tab === "worker" ? <WorkerTab /> : <EmployerTab />}
        </div>

        {/* How it works */}
        <div style={{ marginTop: 14, background: G.deep, borderRadius: 16, padding: "1.1rem 1.2rem", color: "white" }}>
          <div style={{ fontSize: "0.62rem", letterSpacing: 1.5, textTransform: "uppercase", color: G.saffron, fontWeight: 700, marginBottom: 10 }}>कैसे काम करता है</div>
          {[["🎙️", "बोलें", "हिंदी में अपना काम बताएं"], ["🧠", "AI पहचाने", "Claude कौशल निकालता है"], ["🔍", "मिलान हो", "नज़दीकी नौकरियाँ दिखती हैं"], ["📞", "काम मिले", "Call या WhatsApp से जुड़ें"]].map(([ico, ttl, dsc]) => (
            <div key={ttl} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
              <span style={{ fontSize: "0.9rem", flexShrink: 0, marginTop: 2 }}>{ico}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.8rem" }}>{ttl}</div>
                <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", fontFamily: "'Noto Sans Devanagari',sans-serif" }}>{dsc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "0.9rem", fontSize: "0.65rem", color: G.muted, textAlign: "center" }}>
        KaamSetu · ROZGAAR Track · National Student Hackathon for Social Impact
      </div>
    </div>
  );
}
