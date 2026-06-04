import clsx from 'clsx';

const STATUS_CONFIG = {
  'New': { bg: 'rgba(99,102,241,0.12)', color: '#818cf8', dot: '#6366f1' },
  'Verified': { bg: 'rgba(34,197,94,0.12)', color: '#4ade80', dot: '#22c55e' },
  'Match Suggested': { bg: 'rgba(201,168,76,0.15)', color: '#c9a84c', dot: '#b8920e' },
  'Match Sent': { bg: 'rgba(251,146,60,0.12)', color: '#fb923c', dot: '#f97316' },
  'Interested': { bg: 'rgba(236,72,153,0.12)', color: '#f472b6', dot: '#ec4899' },
  'Meeting Scheduled': { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa', dot: '#3b82f6' },
  'In Discussion': { bg: 'rgba(168,85,247,0.12)', color: '#c084fc', dot: '#a855f7' },
  'Closed': { bg: 'rgba(107,114,128,0.12)', color: '#9ca3af', dot: '#6b7280' },
};

export default function StatusBadge({ status, size = 'md' }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG['New'];

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-semibold rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      )}
      style={{ background: config.bg, color: config.color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: config.dot }}
      />
      {status}
    </span>
  );
}
