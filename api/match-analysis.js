import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function getAiConfig() {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'thedatecrew-a04f3';
  try {
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/settings/ai`);
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
    console.error('Error fetching Firestore doc:', err);
  }
  return {
    model: 'llama-3.3-70b-versatile',
    aiMatchExplanation: true,
    aiExecutiveSummary: true,
    aiRiskAnalysis: true,
    aiRelationshipInsights: true,
    aiRedFlagDetection: true
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { customer: a, matchProfile: b, score } = req.body;

  if (!a || !b) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const aiConfig = await getAiConfig();
  const selectedModel = aiConfig.model || 'llama-3.3-70b-versatile';

  const prompt = `You are a senior matchmaker at The Date Crew, a premium Indian matchmaking firm.

Analyze these two profiles and provide a structured compatibility assessment.

Profile A: ${a.firstName} ${a.lastName}, ${a.age}, ${a.city}, ${a.religion}, ${a.degree}, ${a.designation} at ${a.company}, Income ₹${(a.income||0).toLocaleString('en-IN')}, Wants Kids: ${a.wantKids}, Relocate: ${a.relocate}, Diet: ${a.diet}
Profile B: ${b.firstName} ${b.lastName}, ${b.age}, ${b.city}, ${b.religion}, ${b.degree}, ${b.designation} at ${b.company}, Income ₹${(b.income||0).toLocaleString('en-IN')}, Wants Kids: ${b.wantKids}, Relocate: ${b.relocate}, Diet: ${b.diet}

Compatibility Score: ${score}%

Respond in this EXACT JSON format (no markdown, no code blocks, just raw JSON):
{
  "summary": "${aiConfig.aiMatchExplanation !== false ? "2-3 sentence professional assessment of why this match works or needs discussion" : "Explanation disabled in settings."}",
  "strengths": ["strength 1", "strength 2", "strength 3", "strength 4"],
  "concerns": [${aiConfig.aiRiskAnalysis !== false ? '"concern 1", "concern 2"' : ''}],
  "recommendation": "one of: Send Introduction | Schedule Meeting | Collect More Information | Review Family Preferences | Request Verification"
}`;

  try {
    const completion = await groq.chat.completions.create({
      model: selectedModel,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.6,
    });

    const raw = completion.choices[0]?.message?.content?.trim() || '';

    try {
      const parsed = JSON.parse(raw);
      return res.status(200).json(parsed);
    } catch {
      return res.status(200).json({
        summary: raw.slice(0, 400),
        strengths: ['Compatible values', 'Similar background'],
        concerns: ['Requires further discussion'],
        recommendation: score >= 70 ? 'Send Introduction' : 'Collect More Information',
      });
    }
  } catch (error) {
    console.error('Groq API error:', error);
    return res.status(500).json({ error: 'Failed to generate match analysis' });
  }
}
