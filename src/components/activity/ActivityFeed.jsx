import { formatDistanceToNow } from 'date-fns';
import {
  UserPlus, ShieldCheck, Heart, Send, ThumbsUp,
  Calendar, MessageSquare, RefreshCw,
} from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';

const ACTION_MAP = {
  'Profile Created':  { Icon: UserPlus,     color: '#6366F1', bg: '#EEF2FF' },
  'Profile Verified': { Icon: ShieldCheck,  color: '#10B981', bg: '#ECFDF5' },
  'Match Generated':  { Icon: Heart,        color: '#F59E0B', bg: '#FFFBEB' },
  'Match Sent':       { Icon: Send,         color: '#3B82F6', bg: '#EFF6FF' },
  'Interested':       { Icon: ThumbsUp,     color: '#EC4899', bg: '#FDF2F8' },
  'Meeting Scheduled':{ Icon: Calendar,     color: '#10B981', bg: '#ECFDF5' },
  'Note Added':       { Icon: MessageSquare,color: '#6B7280', bg: '#F9FAFB' },
  'Status Updated':   { Icon: RefreshCw,    color: '#6B7280', bg: '#F9FAFB' },
};

function getConfig(action = '') {
  for (const [key, cfg] of Object.entries(ACTION_MAP)) {
    if (action.includes(key)) return cfg;
  }
  return ACTION_MAP['Status Updated'];
}

function formatTs(ts) {
  if (!ts) return 'just now';
  try {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return formatDistanceToNow(d, { addSuffix: true });
  } catch { return 'recently'; }
}

export default function ActivityFeed({ activities = [], loading = false, compact = false }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-start gap-2.5">
            <Skeleton className="w-6 h-6 rounded-lg flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-40 rounded" />
              <Skeleton className="h-2.5 w-20 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activities.length) {
    return (
      <p className="text-xs text-gray-400 py-4 text-center">No activity recorded.</p>
    );
  }

  return (
    <div className="space-y-1">
      {activities.map((act, i) => {
        const { Icon, color, bg } = getConfig(act.action);
        return (
          <div
            key={act.id || i}
            className="flex items-start gap-2.5 py-2"
            style={{ borderBottom: i < activities.length - 1 ? '1px solid #F9FAFB' : 'none' }}
          >
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: bg }}
            >
              <Icon size={11} style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-700 leading-relaxed truncate">{act.action}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{formatTs(act.timestamp)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
