/**
 * KaamSetu API Test Script
 * Run: node test-api.js
 * Make sure server is running first: npm start
 */

const BASE = "http://localhost:3001";

async function test(name, url, options) {
  try {
    const res = await fetch(url, options);
    const data = await res.json();
    console.log(`\n✅ ${name}`);
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.log(`\n❌ ${name}: ${e.message}`);
  }
}

async function run() {
  console.log("🔶 KaamSetu API Tests\n" + "─".repeat(40));

  // 1. Health
  await test("Health Check", `${BASE}/`);

  // 2. Skill extraction
  await test("Skill Extraction — Hindi", `${BASE}/api/extract-skill`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "मैं राजमिस्त्री हूँ, 10 साल का अनुभव है, दिल्ली में रहता हूँ, 700 रुपये रोज़ चाहिए" })
  });

  // 3. Job matching
  await test("Job Matching — Electrician", `${BASE}/api/match-jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "मुझे बिजली का काम आता है, electrician हूँ" })
  });

  // 4. All jobs
  await test("List All Jobs", `${BASE}/api/jobs`);

  // 5. Post a job
  await test("Post New Job", `${BASE}/api/post-job`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "कारपेंटर चाहिए",
      skill_tags: ["carpenter","carpentry","wood","lakdi","लकड़ी"],
      wage: 800,
      location: "Lajpat Nagar, Delhi",
      employer: "Furniture Studio",
      contact: "+919888877766",
      slots: 2
    })
  });
}

run();
