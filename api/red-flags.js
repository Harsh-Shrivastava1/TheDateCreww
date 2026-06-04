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

  const { customer, matchProfile } = req.body;
  const aiConfig = await getAiConfig();

  if (aiConfig.aiRedFlagDetection === false) {
    return res.status(200).json({ redFlags: 'Red flag detection is disabled in settings.' });
  }

  const selectedModel = aiConfig.model || 'llama-3.3-70b-versatile';

  try {
    const prompt = `You are a professional matchmaker. Identify potential red flags or compatibility concerns between these two profiles. Be honest but constructive.

Profile A: ${customer.firstName} (${customer.age}, ${customer.city}, ${customer.religion}, wants kids: ${customer.wantKids}, relocate: ${customer.relocate})
Profile B: ${matchProfile.firstName} (${matchProfile.age}, ${matchProfile.city}, ${matchProfile.religion}, wants kids: ${matchProfile.wantKids}, relocate: ${matchProfile.relocate})

List 2-3 specific potential challenges as bullet points. If there are no major red flags, say so and mention minor considerations. Keep it brief and professional.`;

    const completion = await groq.chat.completions.create({
      model: selectedModel,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0.6,
    });

    const redFlags = completion.choices[0]?.message?.content?.trim() ||
      'No major red flags detected. Minor lifestyle differences may need discussion.';

    res.status(200).json({ redFlags });
  } catch (error) {
    console.error('Groq API error:', error);
    res.status(500).json({ error: 'Failed to analyze red flags' });
  }
}
