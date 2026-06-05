import clsx from 'clsx';

const STATUS_MAP = {
  'New':               { cls: 'badge-new',        dot: '#3B82F6', label: 'New' },
  'Verified':          { cls: 'badge-verified',    dot: '#047857', label: 'Verified' },
  'Match Suggested':   { cls: 'badge-suggested',   dot: '#D97706', label: 'Match Suggested' },
  'Match Sent':        { cls: 'badge-sent',        dot: '#7C3AED', label: 'Match Sent' },
  'Interested':        { cls: 'badge-interested',  dot: '#E8445A', label: 'Interested' },
  'Meeting Scheduled': { cls: 'badge-meeting',     dot: '#1E3A8A', label: 'Meeting Scheduled' },
  'In Discussion':     { cls: 'badge-discussion',  dot: '#5C5F6A', label: 'In Discussion' },
  'Closed':            { cls: 'badge-closed',      dot: '#9B9EA8', label: 'Closed' },
};

export default function Badge({ status, size = 'md', className }) {
  const cfg = STATUS_MAP[status] || STATUS_MAP['New'];

  return (
    <span className={clsx('badge', cfg.cls, size === 'xs' && 'text-[10px] px-2 py-0.5', className)}>
      <span className="badge-dot" style={{ background: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}66` }} />
      {cfg.label}
    </span>
  );
}

export function PillBadge({ label, color = 'gray', size = 'md' }) {
  const COLORS = {
    gray:   'bg-gray-100 text-gray-600 border border-gray-200',
    blue:   'bg-blue-50 text-blue-700 border border-blue-200',
    green:  'bg-emerald-50 text-emerald-700 border border-emerald-200',
    yellow: 'bg-amber-50 text-amber-700 border border-amber-200',
    red:    'bg-red-50 text-red-700 border border-red-200',
    purple: 'bg-violet-50 text-violet-700 border border-violet-200',
  };

  return (
    <span className={clsx(
      'inline-flex items-center rounded-full font-bold tracking-tight',
      size === 'sm' ? 'px-2 py-0.5 text-[9.5px] uppercase tracking-wider' : 'px-2.5 py-1 text-xs',
      COLORS[color] || COLORS.gray
    )}>
      {label}
    </span>
  );
}
