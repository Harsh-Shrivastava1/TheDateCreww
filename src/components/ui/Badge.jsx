import clsx from 'clsx';

const STATUS_MAP = {
  'New':               { cls: 'badge-new',        dot: '#3B82F6', label: 'New' },
  'Verified':          { cls: 'badge-verified',    dot: '#10B981', label: 'Verified' },
  'Match Suggested':   { cls: 'badge-suggested',   dot: '#F59E0B', label: 'Match Suggested' },
  'Match Sent':        { cls: 'badge-sent',        dot: '#8B5CF6', label: 'Match Sent' },
  'Interested':        { cls: 'badge-interested',  dot: '#EC4899', label: 'Interested' },
  'Meeting Scheduled': { cls: 'badge-meeting',     dot: '#1D4ED8', label: 'Meeting Scheduled' },
  'In Discussion':     { cls: 'badge-discussion',  dot: '#6B7280', label: 'In Discussion' },
  'Closed':            { cls: 'badge-closed',      dot: '#D1D5DB', label: 'Closed' },
};

export default function Badge({ status, size = 'md', className }) {
  const cfg = STATUS_MAP[status] || STATUS_MAP['New'];

  return (
    <span className={clsx('badge', cfg.cls, size === 'sm' && 'text-[10px] px-1.5 py-0.5', className)}>
      <span className="badge-dot" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

export function PillBadge({ label, color = 'gray', size = 'md' }) {
  const COLORS = {
    gray:   'bg-gray-100 text-gray-600',
    blue:   'bg-blue-50 text-blue-700',
    green:  'bg-emerald-50 text-emerald-700',
    yellow: 'bg-amber-50 text-amber-700',
    red:    'bg-red-50 text-red-700',
    purple: 'bg-violet-50 text-violet-700',
  };

  return (
    <span className={clsx(
      'inline-flex items-center rounded-full font-medium',
      size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
      COLORS[color] || COLORS.gray
    )}>
      {label}
    </span>
  );
}
