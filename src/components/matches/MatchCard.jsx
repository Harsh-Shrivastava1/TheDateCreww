import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, GraduationCap, Send, ChevronDown, ChevronUp, Sparkles, AlertTriangle } from 'lucide-react';
import Avatar from '../ui/Avatar';
import ScoreBreakdown from './ScoreBreakdown';
import { getMatchAnalysis, getRedFlags } from '../../services/ai';

function ScoreRing({ score }) {
  const size = 52;
  const r    = 20;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;

  const color = score >= 75 ? '#10B981'
              : score >= 55 ? '#3B82F6'
              : score >= 40 ? '#F59E0B'
              : '#EF4444';

  return (
    <div className="relative w-13 h-13 flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F3F4F6" strokeWidth={3.5} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={3.5}
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ fontSize: '14px', fontWeight: 700, color, lineHeight: 1 }}
      >
        <span>{score}</span>
        <span style={{ fontSize: '8px', fontWeight: 500, color: '#9CA3AF', marginTop: '1px' }}>/ 100</span>
      </div>
    </div>
  );
}

export default function MatchCard({ match, customer, index, onSendMatch }) {
  const { profile, score, label, breakdown } = match;
  const [expanded, setExpanded]     = useState(false);
  const [analysis, setAnalysis]     = useState('');
  const [redFlags, setRedFlags]     = useState('');
  const [aiLoading, setAiLoading]   = useState({ analysis: false, flags: false });

  const loadAnalysis = async () => {
    if (analysis || aiLoading.analysis) return;
    setAiLoading(p => ({ ...p, analysis: true }));
    try {
      const res = await getMatchAnalysis(customer, profile, score, breakdown);
      setAnalysis(res.analysis);
    } catch {
      setAnalysis('Unable to generate analysis.');
    } finally {
      setAiLoading(p => ({ ...p, analysis: false }));
    }
  };

  const loadRedFlags = async () => {
    if (redFlags || aiLoading.flags) return;
    setAiLoading(p => ({ ...p, flags: true }));
    try {
      const res = await getRedFlags(customer, profile);
      setRedFlags(res.redFlags);
    } catch {
      setRedFlags('Unable to assess risk factors.');
    } finally {
      setAiLoading(p => ({ ...p, flags: false }));
    }
  };

  const handleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) {
      loadAnalysis();
      loadRedFlags();
    }
  };

  const income = profile.income ? `₹${Number(profile.income).toLocaleString('en-IN')} / yr` : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="card overflow-hidden"
    >
      {/* Rank badge */}
      <div
        className="px-4 py-2 flex items-center justify-between"
        style={{ background: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}
      >
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          #{index + 1} Best Match
        </span>
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: score >= 75 ? '#ECFDF5' : score >= 55 ? '#EFF6FF' : score >= 40 ? '#FFFBEB' : '#FEF2F2',
            color:      score >= 75 ? '#059669' : score >= 55 ? '#2563EB' : score >= 40 ? '#B45309' : '#DC2626',
          }}
        >
          {label}
        </span>
      </div>

      {/* Main row */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <ScoreRing score={score} />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800">
              {profile.firstName} {profile.lastName}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{profile.designation}</p>
            <div className="flex items-center gap-3 mt-1.5">
              {profile.city && (
                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                  <MapPin size={10} /> {profile.city}
                </span>
              )}
              {profile.degree && (
                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                  <GraduationCap size={10} /> {profile.degree}
                </span>
              )}
              {income && <span className="text-[11px] text-gray-400">{income}</span>}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {profile.religion && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-medium">
                  {profile.religion}
                </span>
              )}
              {profile.age && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-medium">
                  {profile.age} yrs
                </span>
              )}
              {profile.wantKids && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-medium">
                  Kids: {profile.wantKids}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Score bar */}
        <div className="mt-3">
          <div className="score-bar-track">
            <motion.div
              className="score-bar-fill"
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ delay: 0.3 + index * 0.04, duration: 0.6, ease: 'easeOut' }}
              style={{
                background: score >= 75 ? '#10B981' : score >= 55 ? '#3B82F6' : score >= 40 ? '#F59E0B' : '#EF4444',
              }}
            />
          </div>
        </div>

        {/* Action row */}
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => onSendMatch(match)}
            className="btn btn-primary btn-sm gap-1.5 flex-1 justify-center"
          >
            <Send size={12} /> Send Match
          </button>
          <button
            onClick={handleExpand}
            className="btn btn-secondary btn-sm gap-1"
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? 'Less' : 'Details'}
          </button>
        </div>
      </div>

      {/* Expanded section */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="border-t border-gray-100"
        >
          {/* Score breakdown */}
          <div className="p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Score Breakdown
            </p>
            <ScoreBreakdown breakdown={breakdown} />
          </div>

          {/* AI Analysis */}
          <div className="p-4 pt-0">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles size={10} /> Why They're Compatible
            </p>
            {aiLoading.analysis ? (
              <div className="flex items-center gap-2 py-2">
                <span className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-gray-400">Analyzing…</span>
              </div>
            ) : (
              <p className="text-xs text-gray-600 leading-relaxed">{analysis || '—'}</p>
            )}
          </div>

          {/* Red flags */}
          {(redFlags || aiLoading.flags) && (
            <div className="p-4 pt-0">
              <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlertTriangle size={10} /> Risk Factors
              </p>
              {aiLoading.flags ? (
                <div className="flex items-center gap-2 py-2">
                  <span className="w-3 h-3 border border-amber-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-gray-400">Analyzing…</span>
                </div>
              ) : (
                <p className="text-xs text-gray-600 leading-relaxed">{redFlags}</p>
              )}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
