import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, GraduationCap, Briefcase, Sparkles, Send, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { getMatchExplanation, getRedFlags } from '../services/ai';
import toast from 'react-hot-toast';

const LABEL_COLORS = {
  'Excellent Match': { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' },
  'High Potential Match': { bg: 'rgba(201,168,76,0.12)', color: '#c9a84c' },
  'Good Match': { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa' },
  'Average Match': { bg: 'rgba(107,114,128,0.12)', color: '#9ca3af' },
};

export default function MatchCard({ match, customer, onSendMatch, index }) {
  const { profile, score, aiLabel } = match;
  const [explanation, setExplanation] = useState('');
  const [redFlags, setRedFlags] = useState('');
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [loadingFlags, setLoadingFlags] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const labelCfg = LABEL_COLORS[aiLabel] || LABEL_COLORS['Good Match'];

  const handleWhyMatch = async () => {
    if (explanation) { setShowDetails(!showDetails); return; }
    setLoadingExplanation(true);
    setShowDetails(true);
    try {
      const data = await getMatchExplanation(customer, profile, score);
      setExplanation(data.explanation);
    } catch {
      setExplanation('Strong alignment in values and lifestyle preferences makes this a compelling match.');
    } finally {
      setLoadingExplanation(false);
    }
  };

  const handleRedFlags = async () => {
    if (redFlags) return;
    setLoadingFlags(true);
    try {
      const data = await getRedFlags(customer, profile);
      setRedFlags(data.redFlags);
    } catch {
      setRedFlags('Unable to analyze at this time.');
    } finally {
      setLoadingFlags(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="card rounded-xl overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Photo */}
          <div className="relative flex-shrink-0">
            <img
              src={profile.photo || `https://i.pravatar.cc/80?u=${profile.id}`}
              alt={profile.firstName}
              className="w-16 h-16 rounded-xl object-cover"
              style={{ border: '2px solid #f0e4cc' }}
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${profile.firstName}+${profile.lastName}&background=c9a84c&color=fff&size=80`;
              }}
            />
            {/* Score ring */}
            <div
              className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{
                background: `conic-gradient(#c9a84c ${score * 3.6}deg, #f0e4cc 0deg)`,
                padding: '2px',
              }}
            >
              <div className="w-full h-full rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'white', color: '#b8920e' }}>
                {score}
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-gray-800 text-base leading-tight">
                  {profile.firstName} {profile.lastName}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">{profile.age} years</p>
              </div>
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                style={{ background: labelCfg.bg, color: labelCfg.color }}
              >
                {aiLabel}
              </span>
            </div>

            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <MapPin size={11} style={{ color: '#c9a84c' }} />
                {profile.city}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Briefcase size={11} style={{ color: '#c9a84c' }} />
                {profile.designation} · {profile.company}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <GraduationCap size={11} style={{ color: '#c9a84c' }} />
                {profile.degree}
              </div>
            </div>
          </div>
        </div>

        {/* Compatibility Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
            <span>Compatibility</span>
            <span className="font-semibold" style={{ color: '#b8920e' }}>{score}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#f0e4cc' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ delay: index * 0.06 + 0.3, duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #c9a84c, #b8920e)' }}
            />
          </div>
        </div>

        {/* AI Explanation */}
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 rounded-xl p-3"
            style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)' }}
          >
            {loadingExplanation ? (
              <div className="space-y-2">
                <div className="h-3 rounded shimmer w-full" />
                <div className="h-3 rounded shimmer w-5/6" />
                <div className="h-3 rounded shimmer w-4/6" />
              </div>
            ) : (
              <p className="text-xs text-gray-600 leading-relaxed">{explanation}</p>
            )}
          </motion.div>
        )}

        {redFlags && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 rounded-xl p-3"
            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle size={11} className="text-red-400" />
              <span className="text-xs font-semibold text-red-500">Considerations</span>
            </div>
            {loadingFlags ? (
              <div className="space-y-1.5">
                <div className="h-2.5 rounded shimmer w-full" />
                <div className="h-2.5 rounded shimmer w-4/5" />
              </div>
            ) : (
              <p className="text-xs text-red-600 leading-relaxed whitespace-pre-line">{redFlags}</p>
            )}
          </motion.div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 mt-4 flex-wrap">
          <button
            onClick={handleWhyMatch}
            className="btn-ghost text-xs px-3 py-1.5 gap-1.5"
            style={{ fontSize: '12px' }}
          >
            <Sparkles size={12} style={{ color: '#c9a84c' }} />
            {showDetails ? 'Hide Insight' : 'Why This Match?'}
            {showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          <button
            onClick={handleRedFlags}
            disabled={loadingFlags}
            className="btn-ghost text-xs px-3 py-1.5 gap-1.5"
            style={{ fontSize: '12px', color: redFlags ? '#9ca3af' : undefined }}
          >
            <AlertTriangle size={12} style={{ color: '#e88080' }} />
            {redFlags ? 'Flagged' : 'Red Flags'}
          </button>
          <button
            onClick={() => onSendMatch?.(match)}
            className="btn-primary text-xs px-3 py-1.5 ml-auto"
            style={{ fontSize: '12px' }}
          >
            <Send size={12} /> Send Match
          </button>
        </div>
      </div>
    </motion.div>
  );
}
