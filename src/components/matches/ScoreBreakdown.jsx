import { motion } from 'framer-motion';

export default function ScoreBreakdown({ breakdown = [] }) {
  const getStatusLabel = (pct) => {
    if (pct >= 90) return { text: 'Optimal Alignment', color: '#059669', bg: '#ECFDF5', border: '#D1FAE5' };
    if (pct >= 75) return { text: 'Strong Alignment', color: '#047857', bg: '#ECFDF5', border: '#A7F3D0' };
    if (pct >= 55) return { text: 'Good Fit', color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' };
    if (pct >= 35) return { text: 'Moderate Match', color: '#B45309', bg: '#FEF3C7', border: '#FDE68A' };
    if (pct >= 20) return { text: 'Potential Friction', color: '#C2410C', bg: '#FFEDD5', border: '#FED7AA' };
    return { text: 'Mismatch Risk', color: '#B91C1C', bg: '#FEF2F2', border: '#FEE2E2' };
  };

  return (
    <div className="space-y-3.5">
      {breakdown.map(({ factor, earned, max }) => {
        const pct = Math.round((earned / max) * 100);
        const status = getStatusLabel(pct);

        return (
          <div key={factor} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-bold text-gray-700">{factor}</span>
              <span
                className="text-[9.5px] font-bold px-2 py-0.5 rounded border tracking-wide uppercase transition-all"
                style={{
                  color: status.color,
                  backgroundColor: status.bg,
                  borderColor: status.border
                }}
              >
                {status.text}
              </span>
            </div>
            <div className="h-1.5 w-full bg-gray-100/80 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                style={{ backgroundColor: status.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
