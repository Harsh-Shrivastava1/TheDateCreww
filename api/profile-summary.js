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

  const { customer } = req.body;
  const aiConfig = await getAiConfig();

  if (aiConfig.aiExecutiveSummary === false) {
    return res.status(200).json({ summary: 'Executive summary is disabled in settings.' });
  }

  const selectedModel = aiConfig.model || 'llama-3.3-70b-versatile';

  try {
    const prompt = `You are a matchmaker at The Date Crew. Write a brief, professional profile summary (2 sentences) for this customer that captures their personality and what makes them a great match prospect.

Profile:
- ${customer.firstName} ${customer.lastName}, ${customer.age} years old from ${customer.city}
- ${customer.designation} at ${customer.company}
- Education: ${customer.degree} from ${customer.college}
- Religion: ${customer.religion}, Marital Status: ${customer.maritalStatus}
- Wants kids: ${customer.wantKids}, Open to relocate: ${customer.relocate}
- Hobbies: ${Array.isArray(customer.hobbies) ? customer.hobbies.join(', ') : 'N/A'}
- Languages: ${Array.isArray(customer.languages) ? customer.languages.join(', ') : 'N/A'}

Write a warm, professional summary that highlights their strengths as a match prospect.`;

    const completion = await groq.chat.completions.create({
      model: selectedModel,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: 0.7,
    });

    const summary = completion.choices[0]?.message?.content?.trim() ||
      `${customer.firstName} is a driven professional with a strong foundation in ${customer.degree} and a clear vision for family life.`;

    res.status(200).json({ summary });
  } catch (error) {
    console.error('Groq API error:', error);
    res.status(500).json({ error: 'Failed to generate profile summary' });
  }
}
