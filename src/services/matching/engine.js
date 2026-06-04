/**
 * TDC Matchmaker Pro — Weighted Scoring Engine v2
 *
 * Produces a score 0–100 with full breakdown per factor.
 * Score factors are gender-agnostic; the engine finds the best
 * opposite-gender matches for any customer.
 */

import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

// Global cache for matchmaking settings from Firestore
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

// Listen to Firestore matchmaking settings for instant, reactive compatibility updates
onSnapshot(doc(db, 'settings', 'matchmaking'), (docSnap) => {
  if (docSnap.exists()) {
    const data = docSnap.data();
    matchmakingConfig = { ...matchmakingConfig, ...data };
  }
}, (err) => {
  console.warn('Silent notice: Firestore settings subscription waiting for auth', err.message);
});

// ── Helpers ────────────────────────────────────────────────────────────────────

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

const ageDiff = (a, b) => Math.abs((a.age || 28) - (b.age || 28));

const overlap = (arrA, arrB) => {
  const a = Array.isArray(arrA) ? arrA : [];
  const b = Array.isArray(arrB) ? arrB : [];
  return a.filter(x => b.includes(x)).length;
};

// ── Individual scoring functions ────────────────────────────────────────────────

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

function scoreAge(a, b, max = 12) {
  const diff = ageDiff(a, b);
  const minG = matchmakingConfig.minAgeGap ?? 0;
  const maxG = matchmakingConfig.maxAgeGap ?? 6;

  // Perfect match if within the slider limits
  if (diff >= minG && diff <= maxG) {
    return { earned: max, max };
  }
  // Linear penalty for being outside the gap
  const dist = diff < minG ? (minG - diff) : (diff - maxG);
  const scaledEarned = Math.max(0, Math.round(max * (1 - dist / 5)));
  return { earned: scaledEarned, max };
}

function scoreCareer(a, b, max = 12) {
  if (!a.income || !b.income) return { earned: Math.round(max * 0.5), max };
  const ba = INCOME_BRACKET(a.income);
  const bb = INCOME_BRACKET(b.income);
  const diff = Math.abs(ba - bb);
  if (diff === 0) return { earned: max, max };
  if (diff === 1) return { earned: Math.round(max * 0.8), max };
  if (diff === 2) return { earned: Math.round(max * 0.5), max };
  if (diff === 3) return { earned: Math.round(max * 0.25), max };
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
  // Diet (3pts proportional mapping)
  const dMax = max * (3 / 8);
  if (a.diet && b.diet) {
    if (a.diet === b.diet) earned += dMax;
    else if (
      (a.diet === 'Vegetarian' && b.diet === 'Eggetarian') ||
      (a.diet === 'Eggetarian' && b.diet === 'Vegetarian')
    ) earned += dMax * (1 / 3);
  } else earned += dMax * 0.5;

  // Smoking (2.5pts proportional mapping)
  const sMax = max * (2.5 / 8);
  if (a.smoking && b.smoking) {
    if (a.smoking === b.smoking) earned += sMax;
    else if (a.smoking === 'Occasionally' || b.smoking === 'Occasionally') earned += sMax * (1 / 2.5);
  } else earned += sMax * 0.4;

  // Drinking (2.5pts proportional mapping)
  const drMax = max * (2.5 / 8);
  if (a.drinking && b.drinking) {
    if (a.drinking === b.drinking) earned += drMax;
    else if (a.drinking === 'Occasionally' || b.drinking === 'Occasionally') earned += drMax * (1 / drMax);
  } else earned += drMax * 0.4;

  return { earned: Math.min(Math.round(earned), max), max };
}

function scoreFamilyValues(a, b, max = 5) {
  let earned = 0;
  const ftMax = max * (3 / 5);
  if (a.familyType && b.familyType && a.familyType === b.familyType) earned += ftMax;
  else earned += ftMax * 0.3;

  const msMax = max * (2 / 5);
  if (a.maritalStatus === b.maritalStatus) earned += msMax;
  else earned += msMax * 0.25;

  return { earned: Math.min(Math.round(earned), max), max };
}

// ── AI Label ───────────────────────────────────────────────────────────────────

export const getMatchLabel = (score) => {
  if (score >= 88) return { label: 'Exceptional Match',    color: '#10B981' };
  if (score >= 75) return { label: 'Excellent Match',      color: '#059669' };
  if (score >= 62) return { label: 'High Potential',       color: '#3B82F6' };
  if (score >= 48) return { label: 'Good Match',           color: '#6366F1' };
  if (score >= 35) return { label: 'Moderate Match',       color: '#F59E0B' };
  return               { label: 'Low Compatibility',       color: '#EF4444' };
};

// ── Main scoring function ───────────────────────────────────────────────────────

export function scoreCompatibility(personA, personB) {
  // Retrieve weight overrides from the reactive config
  const relMax  = matchmakingConfig.religionWeight ?? 15;
  const locMax  = matchmakingConfig.locationWeight ?? 18;
  const eduMax  = matchmakingConfig.educationWeight ?? 10;
  const incMax  = matchmakingConfig.incomeWeight ?? 12;
  const famMax  = matchmakingConfig.familyWeight ?? 17;
  const langMax = matchmakingConfig.languageWeight ?? 8;
  const lifeMax = matchmakingConfig.lifestyleWeight ?? 8;

  // Split composite weights proportionally
  const childrenMax = Math.round(famMax * (12 / 17)) || 1;
  const famValsMax = Math.round(famMax * (5 / 17)) || 1;

  const relocateMax = Math.round(locMax * (10 / 18)) || 1;
  const locationMax = Math.round(locMax * (8 / 18)) || 1;

  const ageMax = 12; // Age weight

  const breakdown = [
    { factor: 'Religion',          ...scoreReligion(personA, personB, relMax) },
    { factor: 'Children Plans',    ...scoreChildren(personA, personB, childrenMax) },
    { factor: 'Age',               ...scoreAge(personA, personB, ageMax) },
    { factor: 'Career & Income',   ...scoreCareer(personA, personB, incMax) },
    { factor: 'Relocation',        ...scoreRelocation(personA, personB, relocateMax) },
    { factor: 'Education',         ...scoreEducation(personA, personB, eduMax) },
    { factor: 'Location',          ...scoreLocation(personA, personB, locationMax) },
    { factor: 'Languages',         ...scoreLanguage(personA, personB, langMax) },
    { factor: 'Lifestyle',         ...scoreLifestyle(personA, personB, lifeMax) },
    { factor: 'Family Values',     ...scoreFamilyValues(personA, personB, famValsMax) },
  ];

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
