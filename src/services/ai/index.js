/**
 * AI Service — communicates with Vercel Functions -> Groq API
 * In development, /api/* is handled by the Vite middleware plugin (vite.config.js).
 * In production, /api/* routes to Vercel serverless functions.
 *
 * SECURITY: GROQ_API_KEY is NEVER exposed to the browser.
 * It lives only in process.env on the server side.
 */

const API_BASE = '/api';

async function callAPI(endpoint, body) {
  const res = await fetch(`${API_BASE}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `API error ${res.status}`);
  }
  return res.json();
}

/**
 * Generate structured AI match analysis:
 * Returns { summary, strengths, concerns, recommendation }
 */
export const getMatchAnalysis = async (customer, matchProfile, score) => {
  return callAPI('match-analysis', { customer, matchProfile, score });
};

/**
 * Generate personalized introduction message for a match.
 * Returns { intro }
 */
export const generateIntro = async (customer, matchProfile) => {
  return callAPI('generate-intro', { customer, matchProfile });
};

/**
 * Generate AI profile summary (2–3 sentences).
 * Returns { summary }
 */
export const getProfileSummary = async (customer) => {
  return callAPI('profile-summary', { customer });
};

/**
 * Detect potential red flags between two profiles.
 * Returns { redFlags }
 */
export const getRedFlags = async (customer, matchProfile) => {
  return callAPI('red-flags', { customer, matchProfile });
};

/**
 * Generate AI intelligence reports & compatibility trends.
 * Returns { insights }
 */
export const getReportsInsights = async (customers, matches) => {
  return callAPI('reports-insights', { customers, matches });
};
