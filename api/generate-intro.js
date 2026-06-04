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

  if (aiConfig.aiRelationshipInsights === false) {
    return res.status(200).json({ intro: 'Personalized relationship intro generator is disabled in settings.' });
  }

  const selectedModel = aiConfig.model || 'llama-3.3-70b-versatile';

  try {
    const prompt = `You are a professional matchmaker at The Date Crew, a premium Indian matchmaking service.

Write a warm, professional introduction message to send to ${customer.firstName} about their potential match.

Customer: ${customer.firstName} ${customer.lastName} (${customer.age}, ${customer.city})
Match: ${matchProfile.firstName} ${matchProfile.lastName} (${matchProfile.age}, ${matchProfile.city})
Match works as: ${matchProfile.designation} at ${matchProfile.company}
Shared interests: ${
      (() => {
        const interests = [];
        if (customer.religion === matchProfile.religion) interests.push('religion');
        if (customer.wantKids === matchProfile.wantKids) interests.push('family plans');
        const langs = (customer.languages || []).filter(l => (matchProfile.languages || []).includes(l));
        if (langs.length) interests.push(`${langs[0]} language`);
        return interests.join(', ') || 'lifestyle values';
      })()
    }

Write a personalized intro of 2-3 sentences. Start with "Hi ${customer.firstName}," and make it warm, specific, and professional. Don't use generic phrases.`;

    const completion = await groq.chat.completions.create({
      model: selectedModel,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0.8,
    });

    const intro = completion.choices[0]?.message?.content?.trim() ||
      `Hi ${customer.firstName}, we found a promising match who shares your values and future plans. We'd love to introduce you to ${matchProfile.firstName}.`;

    res.status(200).json({ intro });
  } catch (error) {
    console.error('Groq API error:', error);
    res.status(500).json({ error: 'Failed to generate intro' });
  }
}
