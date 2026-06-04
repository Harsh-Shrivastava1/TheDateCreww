import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// ─── Groq API handler — runs in Node (Vite dev server process) ─────────────────
// This plugin intercepts /api/* requests during `npm run dev` so that
// Groq AI features work locally without a separate server or exposing the key.

async function getFirestoreDoc(docId, env) {
  const projectId = env.VITE_FIREBASE_PROJECT_ID || 'thedatecrew-a04f3';
  try {
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/settings/${docId}`);
    if (res.ok) {
      const data = await res.json();
      const result = {};
      if (data.fields) {
        for (const [key, val] of Object.entries(data.fields)) {
          if ('stringValue' in val) result[key] = val.stringValue;
          else if ('booleanValue' in val) result[key] = val.booleanValue;
          else if ('integerValue' in val) result[key] = Number(val.integerValue);
        }
      }
      return result;
    }
  } catch (err) {
    console.error('Error fetching settings doc in dev API:', err);
  }
  return null;
}

async function handleApiRequest(url, body, env) {
  const { default: Groq } = await import('groq-sdk');
  const groq = new Groq({ apiKey: env.GROQ_API_KEY });

  const aiConfig = await getFirestoreDoc('ai', env) || {};
  const selectedModel = aiConfig.model || 'llama-3.3-70b-versatile';

  const chat = (prompt, maxTokens = 400, temperature = 0.7) =>
    groq.chat.completions.create({
      model: selectedModel,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature,
    }).then(r => r.choices[0]?.message?.content?.trim() || '');

  // ── /api/match-analysis ──────────────────────────────────────────────────────
  if (url === '/api/match-analysis') {
    const { customer: a, matchProfile: b, score } = body;
    const prompt = `You are a senior matchmaker at The Date Crew, a premium Indian matchmaking firm.

Analyze these two profiles and provide a structured compatibility assessment.

Profile A: ${a.firstName} ${a.lastName}, ${a.age}, ${a.city}, ${a.religion}, ${a.degree}, ${a.designation} at ${a.company}, Income ₹${(a.income||0).toLocaleString('en-IN')}, Wants Kids: ${a.wantKids}, Relocate: ${a.relocate}, Diet: ${a.diet}
Profile B: ${b.firstName} ${b.lastName}, ${b.age}, ${b.city}, ${b.religion}, ${b.degree}, ${b.designation} at ${b.company}, Income ₹${(b.income||0).toLocaleString('en-IN')}, Wants Kids: ${b.wantKids}, Relocate: ${b.relocate}, Diet: ${b.diet}

Compatibility Score: ${score}%

Respond in this EXACT JSON format (no markdown, no code blocks, just raw JSON):
{
  "summary": "${aiConfig.aiMatchExplanation !== false ? "2-3 sentence professional assessment of why this match works or needs discussion" : "Explanation disabled"}",
  "strengths": ["strength 1", "strength 2", "strength 3", "strength 4"],
  "concerns": [${aiConfig.aiRiskAnalysis !== false ? '"concern 1", "concern 2"' : ''}],
  "recommendation": "one of: Send Introduction | Schedule Meeting | Collect More Information | Review Family Preferences | Request Verification"
}`;

    const raw = await chat(prompt, 500, 0.6);
    try {
      const parsed = JSON.parse(raw);
      return parsed;
    } catch {
      return {
        summary: raw.slice(0, 400),
        strengths: ['Compatible values', 'Similar background'],
        concerns: ['Requires further discussion'],
        recommendation: score >= 70 ? 'Send Introduction' : 'Collect More Information',
      };
    }
  }

  // ── /api/profile-summary ─────────────────────────────────────────────────────
  if (url === '/api/profile-summary') {
    const { customer: c } = body;
    if (aiConfig.aiExecutiveSummary === false) {
      return { summary: 'Executive summary disabled in settings.' };
    }
    const prompt = `You are a matchmaker at The Date Crew. Write a brief, warm, professional profile summary (2–3 sentences) for this customer that highlights what makes them an excellent match prospect.

Profile: ${c.firstName} ${c.lastName}, ${c.age} years old, ${c.city}
Role: ${c.designation} at ${c.company}
Education: ${c.degree} from ${c.college}
Religion: ${c.religion}, Marital Status: ${c.maritalStatus}
Wants kids: ${c.wantKids}, Open to relocate: ${c.relocate}
Hobbies: ${Array.isArray(c.hobbies) ? c.hobbies.join(', ') : 'N/A'}

Write ONLY the summary text, no labels or formatting.`;

    const summary = await chat(prompt, 180, 0.7);
    return { summary };
  }

  // ── /api/generate-intro ──────────────────────────────────────────────────────
  if (url === '/api/generate-intro') {
    const { customer: c, matchProfile: m } = body;
    if (aiConfig.aiRelationshipInsights === false) {
      return { intro: 'Personalized relationship intro generator is disabled in settings.' };
    }
    const shared = [];
    if (c.religion === m.religion) shared.push('religious background');
    if (c.wantKids === m.wantKids) shared.push('family plans');
    const langs = (c.languages||[]).filter(l => (m.languages||[]).includes(l));
    if (langs.length) shared.push(`${langs[0]} language`);
    const sharedStr = shared.join(', ') || 'lifestyle values';

    const prompt = `You are a professional matchmaker at The Date Crew. Write a warm, specific, personalized introduction message to send to ${c.firstName} about their potential match.

Customer: ${c.firstName} ${c.lastName} (${c.age}, ${c.city})
Match: ${m.firstName} ${m.lastName} (${m.age}, ${m.city}, ${m.designation} at ${m.company})
Shared: ${sharedStr}

Start with "Hi ${c.firstName}," — write 2–3 sentences. Make it personal and warm. No generic phrases.`;

    const intro = await chat(prompt, 220, 0.8);
    return { intro };
  }

  // ── /api/red-flags ───────────────────────────────────────────────────────────
  if (url === '/api/red-flags') {
    const { customer: a, matchProfile: b } = body;
    if (aiConfig.aiRedFlagDetection === false) {
      return { redFlags: 'Red flag detection disabled in settings.' };
    }
    const prompt = `You are a professional matchmaker. Identify 2–3 specific compatibility challenges between these two profiles. Be honest but constructive.

Profile A: ${a.firstName} (${a.age}, ${a.city}, ${a.religion}, wants kids: ${a.wantKids}, relocate: ${a.relocate}, diet: ${a.diet})
Profile B: ${b.firstName} (${b.age}, ${b.city}, ${b.religion}, wants kids: ${b.wantKids}, relocate: ${b.relocate}, diet: ${b.diet})

List 2–3 challenges as short bullet points (start each with "• "). If no major issues, briefly say so.`;

    const redFlags = await chat(prompt, 220, 0.6);
    return { redFlags };
  }

  // ── /api/reports-insights ────────────────────────────────────────────────────
  if (url === '/api/reports-insights') {
    const { customers = [], matches = [] } = body;
    if (aiConfig.aiExecutiveSummary === false) {
      return {
        compatibilityTrends: "Intelligence summary is disabled in settings.",
        successfulMatchFactors: "Successful matchmaking factors are disabled in settings.",
        profilesNeedingReview: [],
        highPotentialMatches: [],
        relationshipRiskAlerts: []
      };
    }
    const totalCustomers = customers.length;
    const verified = customers.filter(c => c.status === 'Verified').length;
    const religions = [...new Set(customers.map(c => c.religion))].filter(Boolean);
    const avgScore = matches.length
      ? Math.round(matches.reduce((s, m) => s + (m.score || 0), 0) / matches.length)
      : 0;

    const prompt = `You are a senior matchmaker writing a monthly intelligence brief for The Date Crew.

Platform data:
- Total Profiles: ${totalCustomers} (${verified} verified)
- Religions represented: ${religions.join(', ')}
- Matches Generated: ${matches.length}
- Average Compatibility Score: ${avgScore}%
- High-potential matches (≥80%): ${matches.filter(m => (m.score||0) >= 80).length}

Write a concise 3-paragraph executive summary covering:
1. Overall platform health and activity
2. Key matchmaking trends and patterns
3. Recommended priorities for the team this month`;

    const insights = await chat(prompt, 400, 0.7);
    return { insights };
  }

  return null;
}

// ─── Vite config ────────────────────────────────────────────────────────────────
export default defineConfig(({ mode }) => {
  // Load ALL env vars (not just VITE_ prefixed) so GROQ_API_KEY is available
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      tailwindcss(),

      // ── Local API middleware (dev only) ──────────────────────────────────────
      {
        name: 'local-api-middleware',
        apply: 'serve', // only in dev server, not build
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (!req.url?.startsWith('/api/')) return next();

            // Read request body
            let body = {};
            try {
              await new Promise((resolve, reject) => {
                let data = '';
                req.on('data', chunk => { data += chunk; });
                req.on('end', () => {
                  try { body = JSON.parse(data || '{}'); } catch { body = {}; }
                  resolve();
                });
                req.on('error', reject);
              });
            } catch {
              body = {};
            }

            try {
              const result = await handleApiRequest(req.url, body, env);
              if (result === null) {
                res.statusCode = 404;
                res.end(JSON.stringify({ error: 'API route not found' }));
                return;
              }
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify(result));
            } catch (err) {
              console.error('[API Error]', req.url, err.message);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message || 'Internal server error' }));
            }
          });
        },
      },
    ],

    server: {
      port: 5173,
    },
  };
});
