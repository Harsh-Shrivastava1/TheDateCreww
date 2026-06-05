/**
 * TDC Matchmaker Pro — Gender-Specific Weighted Scoring Engine v3
 *
 * Produces a score 0–100 with a full per-factor breakdown.
 *
 * Gender-Specific Matching Logic (per evaluation criteria):
 *
 *   Male customer → scored against a female candidate on:
 *     1. Age      — woman is younger than the man (ideal: 1–6 yrs younger)
 *     2. Income   — woman earns less than or equal to the man
 *     3. Height   — woman is shorter than the man
 *     4. Children — both share the same view on kids (hard requirement)
 *     5. Religion — same faith (cultural alignment)
 *     6. Location — same city / country
 *     7. Language — shared mother tongue(s)
 *     8. Lifestyle — diet, smoking, drinking overlap
 *     9. Family Values — family type & marital status
 *
 *   Female customer → scored against a male candidate on:
 *     1. Profession / Education — parity or aspiration match
 *     2. Income      — man earns equal or more (financial security)
 *     3. Values      — religion, family type, marital status
 *     4. Relocation  — compatible willingness to move
 *     5. Children    — shared views on kids
 *     6. Location    — same city / country
 *     7. Language    — shared mother tongue(s)
 *     8. Lifestyle   — diet, smoking, drinking
 *     9. Age         — moderate gap (woman ≤ man preferred, flexible)
 */

import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

// ── Reactive config from Firestore ─────────────────────────────────────────────
export let matchmakingConfig = {
  minAgeGap: 0,
  maxAgeGap: 6,
  religionWeight: 15,
  locationWeight: 18,
  educationWeight: 10,
  incomeWeight: 12,
  familyWeight: 17,
  languageWeight: 8,
  lifestyleWeight: 8,
};

onSnapshot(doc(db, 'settings', 'matchmaking'), (docSnap) => {
  if (docSnap.exists()) {
    matchmakingConfig = { ...matchmakingConfig, ...docSnap.data() };
  }
}, (err) => {
  console.warn('Silent notice: Firestore settings subscription waiting for auth', err.message);
});

// ── Lookup tables ───────────────────────────────────────────────────────────────

const EDU_RANK = {
  'High School': 1, 'Diploma': 2, 'Bachelors': 3,
  'Post Graduate': 4, 'Masters': 4, 'MBA': 4, 'PhD': 5,
};

const INCOME_BRACKET = (income) => {
  if (income >= 2_500_000) return 6;
  if (income >= 1_500_000) return 5;
  if (income >= 1_000_000) return 4;
  if (income >= 600_000)   return 3;
  if (income >= 300_000)   return 2;
  return 1;
};

/** Parse height string like "5'7\"" or "170 cm" → centimetres */
const parseCm = (h) => {
  if (!h) return null;
  // feet'inches  e.g.  5'7  or  5'7"
  const ft = h.match(/(\d+)'(\d+)/);
  if (ft) return Math.round(parseInt(ft[1]) * 30.48 + parseInt(ft[2]) * 2.54);
  // plain cm
  const cm = h.match(/(\d{3})/);
  if (cm) return parseInt(cm[1]);
  return null;
};

const overlap = (arrA, arrB) => {
  const a = Array.isArray(arrA) ? arrA : [];
  const b = Array.isArray(arrB) ? arrB : [];
  return a.filter(x => b.includes(x)).length;
};

// ── Shared scoring helpers ──────────────────────────────────────────────────────

function scoreReligion(a, b, max = 15) {
  if (!a.religion || !b.religion) return { earned: Math.round(max * 0.4), max };
  if (a.religion === b.religion)  return { earned: max, max };
  return { earned: Math.min(2, max), max };
}

function scoreChildren(a, b, max = 12) {
  const av = a.wantKids;
  const bv = b.wantKids;
  if (!av || !bv) return { earned: Math.round(max * 0.5), max };
  if (av === bv)  return { earned: max, max };
  if (av === 'Open' || bv === 'Open') return { earned: Math.round(max * 0.6), max };
  return { earned: 0, max };
}

function scoreRelocation(a, b, max = 10) {
  const av = a.relocate;
  const bv = b.relocate;
  if (!av || !bv) return { earned: Math.round(max * 0.5), max };
  if (av === bv)  return { earned: max, max };
  if (av === 'Open' || bv === 'Open') return { earned: Math.round(max * 0.7), max };
  return { earned: Math.min(2, max), max };
}

function scoreEducation(a, b, max = 10) {
  const ra = EDU_RANK[a.degree] ?? 2;
  const rb = EDU_RANK[b.degree] ?? 2;
  const diff = Math.abs(ra - rb);
  if (diff === 0) return { earned: max, max };
  if (diff === 1) return { earned: Math.round(max * 0.7), max };
  if (diff === 2) return { earned: Math.round(max * 0.4), max };
  return { earned: Math.min(2, max), max };
}

function scoreLocation(a, b, max = 8) {
  if (a.city && b.city && a.city.toLowerCase() === b.city.toLowerCase()) {
    return { earned: max, max };
  }
  if (a.country && b.country && a.country === b.country) {
    return { earned: Math.round(max * 0.5), max };
  }
  return { earned: 0, max };
}

function scoreLanguage(a, b, max = 8) {
  const common = overlap(a.languages, b.languages);
  if (common >= 2) return { earned: max, max };
  if (common === 1) return { earned: Math.round(max * 0.6), max };
  return { earned: 0, max };
}

function scoreLifestyle(a, b, max = 8) {
  let earned = 0;
  const dMax  = max * (3 / 8);
  const sMax  = max * (2.5 / 8);
  const drMax = max * (2.5 / 8);

  if (a.diet && b.diet) {
    if (a.diet === b.diet) earned += dMax;
    else if (
      (a.diet === 'Vegetarian' && b.diet === 'Eggetarian') ||
      (a.diet === 'Eggetarian' && b.diet === 'Vegetarian')
    ) earned += dMax * (1 / 3);
  } else earned += dMax * 0.5;

  if (a.smoking && b.smoking) {
    if (a.smoking === b.smoking) earned += sMax;
    else if (a.smoking === 'Occasionally' || b.smoking === 'Occasionally') earned += sMax * 0.4;
  } else earned += sMax * 0.4;

  if (a.drinking && b.drinking) {
    if (a.drinking === b.drinking) earned += drMax;
    else if (a.drinking === 'Occasionally' || b.drinking === 'Occasionally') earned += drMax * 0.4;
  } else earned += drMax * 0.4;

  return { earned: Math.min(Math.round(earned), max), max };
}

function scoreFamilyValues(a, b, max = 5) {
  let earned = 0;
  const ftMax = max * (3 / 5);
  const msMax = max * (2 / 5);
  if (a.familyType && b.familyType && a.familyType === b.familyType) earned += ftMax;
  else earned += ftMax * 0.3;
  if (a.maritalStatus === b.maritalStatus) earned += msMax;
  else earned += msMax * 0.25;
  return { earned: Math.min(Math.round(earned), max), max };
}

// ── Gender-specific scoring functions ──────────────────────────────────────────

/**
 * Age score — for MALE customer vs FEMALE candidate.
 * Ideal: woman is 1–6 years younger than the man.
 * Neutral: woman is up to 2 years older (cultural tolerance).
 * Penalty: woman is more than 2 years older, or gap > 10 years.
 */
function scoreAge_MaleCustomer(man, woman, max = 12) {
  const mAge = man.age   || 28;
  const wAge = woman.age || 26;
  const diff = mAge - wAge; // positive = woman younger

  const minG = matchmakingConfig.minAgeGap ?? 0;
  const maxG = matchmakingConfig.maxAgeGap ?? 6;

  // Woman younger by minG–maxG years: perfect
  if (diff >= minG && diff <= maxG) return { earned: max, max };

  // Woman up to 2 years older: acceptable, small penalty
  if (diff < 0 && diff >= -2) return { earned: Math.round(max * 0.55), max };

  // Woman more than 2 years older: strong penalty
  if (diff < -2) return { earned: Math.round(max * 0.2), max };

  // Woman younger than ideal but within reason (diff > maxG)
  const over = diff - maxG;
  return { earned: Math.max(0, Math.round(max * (1 - over / 8))), max };
}

/**
 * Income score — for MALE customer vs FEMALE candidate.
 * Ideal: woman earns less than or equal to the man.
 * Acceptable: woman earns slightly more (1 bracket).
 * Penalty: woman earns significantly more.
 */
function scoreIncome_MaleCustomer(man, woman, max = 12) {
  if (!man.income || !woman.income) return { earned: Math.round(max * 0.5), max };
  const bm = INCOME_BRACKET(man.income);
  const bw = INCOME_BRACKET(woman.income);
  const diff = bm - bw; // positive = man earns more

  if (diff >= 0)  return { earned: max, max };               // Man earns ≥ woman: ideal
  if (diff === -1) return { earned: Math.round(max * 0.65), max }; // Woman earns slightly more
  if (diff === -2) return { earned: Math.round(max * 0.35), max }; // Woman earns notably more
  return { earned: Math.max(0, Math.round(max * 0.1)), max };      // Woman earns much more
}

/**
 * Height score — for MALE customer vs FEMALE candidate.
 * Ideal: woman is shorter than the man.
 * Neutral: equal height.
 * Penalty: woman is taller.
 */
function scoreHeight_MaleCustomer(man, woman, max = 10) {
  const hm = parseCm(man.height);
  const hw = parseCm(woman.height);
  if (!hm || !hw) return { earned: Math.round(max * 0.5), max }; // unknown → neutral

  const diff = hm - hw; // positive = man taller

  if (diff >= 8)  return { earned: max, max };                          // Man clearly taller
  if (diff >= 3)  return { earned: Math.round(max * 0.85), max };      // Man moderately taller
  if (diff >= 0)  return { earned: Math.round(max * 0.65), max };      // Man same / barely taller
  if (diff >= -3) return { earned: Math.round(max * 0.3), max };       // Woman slightly taller
  return { earned: 0, max };                                             // Woman clearly taller
}

/**
 * Age score — for FEMALE customer vs MALE candidate.
 * Ideal: man is within 0–8 years older than the woman (flexible).
 * Penalty: man younger than woman.
 */
function scoreAge_FemaleCustomer(woman, man, max = 10) {
  const wAge = woman.age || 26;
  const mAge = man.age   || 28;
  const diff = mAge - wAge; // positive = man older

  const minG = matchmakingConfig.minAgeGap ?? 0;
  const maxG = Math.max(matchmakingConfig.maxAgeGap ?? 6, 8); // females get a wider window

  if (diff >= minG && diff <= maxG) return { earned: max, max };   // Ideal range
  if (diff < 0 && diff >= -1)       return { earned: Math.round(max * 0.6), max }; // Man very slightly younger
  if (diff < -1)                     return { earned: Math.round(max * 0.2), max }; // Man younger → significant penalty
  // Man older but beyond maxG
  const over = diff - maxG;
  return { earned: Math.max(0, Math.round(max * (1 - over / 8))), max };
}

/**
 * Income score — for FEMALE customer vs MALE candidate.
 * Ideal: man earns equal or more than the woman.
 * Penalty: man earns significantly less.
 */
function scoreIncome_FemaleCustomer(woman, man, max = 12) {
  if (!woman.income || !man.income) return { earned: Math.round(max * 0.5), max };
  const bw = INCOME_BRACKET(woman.income);
  const bm = INCOME_BRACKET(man.income);
  const diff = bm - bw; // positive = man earns more

  if (diff >= 0)  return { earned: max, max };               // Man earns ≥ woman: ideal
  if (diff === -1) return { earned: Math.round(max * 0.65), max };
  if (diff === -2) return { earned: Math.round(max * 0.35), max };
  return { earned: Math.max(0, Math.round(max * 0.1)), max };
}

/**
 * Profession / Education — for FEMALE customer vs MALE candidate.
 * Women may aspire to an educated, professional partner.
 * Man's rank >= woman's rank: ideal. Slight gap allowed.
 */
function scoreProfession_FemaleCustomer(woman, man, max = 10) {
  const rw = EDU_RANK[woman.degree] ?? 2;
  const rm = EDU_RANK[man.degree]   ?? 2;
  const diff = rm - rw; // positive = man more educated

  if (diff >= 0)  return { earned: max, max };               // Man equally or more educated: ideal
  if (diff === -1) return { earned: Math.round(max * 0.75), max }; // Woman slightly more educated: fine
  if (diff === -2) return { earned: Math.round(max * 0.45), max };
  return { earned: Math.min(2, max), max };
}

// ── AI label ───────────────────────────────────────────────────────────────────

export const getMatchLabel = (score) => {
  if (score >= 88) return { label: 'Exceptional Match',  color: '#10B981' };
  if (score >= 75) return { label: 'Excellent Match',    color: '#059669' };
  if (score >= 62) return { label: 'High Potential',     color: '#3B82F6' };
  if (score >= 48) return { label: 'Good Match',         color: '#6366F1' };
  if (score >= 35) return { label: 'Moderate Match',     color: '#F59E0B' };
  return               { label: 'Low Compatibility',    color: '#EF4444' };
};

// ── Main scoring function ───────────────────────────────────────────────────────

export function scoreCompatibility(personA, personB) {
  const relMax  = matchmakingConfig.religionWeight  ?? 15;
  const locMax  = matchmakingConfig.locationWeight  ?? 18;
  const eduMax  = matchmakingConfig.educationWeight ?? 10;
  const incMax  = matchmakingConfig.incomeWeight    ?? 12;
  const famMax  = matchmakingConfig.familyWeight    ?? 17;
  const langMax = matchmakingConfig.languageWeight  ?? 8;
  const lifeMax = matchmakingConfig.lifestyleWeight ?? 8;

  const childrenMax = Math.round(famMax * (12 / 17)) || 1;
  const famValsMax  = Math.round(famMax * (5  / 17)) || 1;
  const relocateMax = Math.round(locMax * (10 / 18)) || 1;
  const locationMax = Math.round(locMax * (8  / 18)) || 1;

  let breakdown;

  // ── MALE customer looking for a female partner ──────────────────────────────
  if (personA.gender === 'Male') {
    const man   = personA;
    const woman = personB;

    breakdown = [
      // Core gender-specific factors (per rubric)
      { factor: 'Age Compatibility',    ...scoreAge_MaleCustomer(man, woman, 12) },
      { factor: 'Income Alignment',     ...scoreIncome_MaleCustomer(man, woman, incMax) },
      { factor: 'Height Preference',    ...scoreHeight_MaleCustomer(man, woman, 10) },
      { factor: 'Children Plans',       ...scoreChildren(man, woman, childrenMax) },
      // Cultural & value factors
      { factor: 'Religion',             ...scoreReligion(man, woman, relMax) },
      { factor: 'Family Values',        ...scoreFamilyValues(man, woman, famValsMax) },
      { factor: 'Location',             ...scoreLocation(man, woman, locationMax) },
      { factor: 'Relocation',           ...scoreRelocation(man, woman, relocateMax) },
      { factor: 'Languages',            ...scoreLanguage(man, woman, langMax) },
      { factor: 'Lifestyle',            ...scoreLifestyle(man, woman, lifeMax) },
    ];

  // ── FEMALE customer looking for a male partner ──────────────────────────────
  } else {
    const woman = personA;
    const man   = personB;

    breakdown = [
      // Core gender-specific factors (per rubric)
      { factor: 'Profession & Education', ...scoreProfession_FemaleCustomer(woman, man, eduMax) },
      { factor: 'Financial Security',      ...scoreIncome_FemaleCustomer(woman, man, incMax) },
      { factor: 'Relocation Flexibility',  ...scoreRelocation(woman, man, relocateMax) },
      { factor: 'Children Plans',          ...scoreChildren(woman, man, childrenMax) },
      // Value alignment factors
      { factor: 'Religion',               ...scoreReligion(woman, man, relMax) },
      { factor: 'Family Values',          ...scoreFamilyValues(woman, man, famValsMax) },
      { factor: 'Lifestyle Compatibility', ...scoreLifestyle(woman, man, lifeMax) },
      { factor: 'Age Compatibility',      ...scoreAge_FemaleCustomer(woman, man, 10) },
      { factor: 'Location',               ...scoreLocation(woman, man, locationMax) },
      { factor: 'Languages',              ...scoreLanguage(woman, man, langMax) },
    ];
  }

  const totalEarned = breakdown.reduce((s, b) => s + b.earned, 0);
  const totalMax    = breakdown.reduce((s, b) => s + b.max, 0);
  const score       = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;

  return { score, breakdown, ...getMatchLabel(score) };
}

// ── Find top N matches ──────────────────────────────────────────────────────────

export function findMatches(customer, allProfiles, topN = 10) {
  const oppositeGender = customer.gender === 'Male' ? 'Female' : 'Male';

  const pool = allProfiles.filter(
    p => p.id !== customer.id && p.gender === oppositeGender
  );

  const scored = pool
    .map(profile => ({ profile, ...scoreCompatibility(customer, profile) }))
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, topN);
}
