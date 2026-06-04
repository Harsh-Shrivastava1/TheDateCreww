import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import {
  UserPlus,
  ShieldCheck,
  Heart,
  Send,
  ThumbsUp,
  Calendar,
  MessageSquare,
  CheckCircle2,
} from 'lucide-react';

const ACTION_CONFIG = {
  'Profile Created': { icon: UserPlus, color: '#818cf8', bg: 'rgba(99,102,241,0.1)' },
  'Profile Verified': { icon: ShieldCheck, color: '#4ade80', bg: 'rgba(34,197,94,0.1)' },
  'Match Generated': { icon: Heart, color: '#c9a84c', bg: 'rgba(201,168,76,0.1)' },
  'Match Sent': { icon: Send, color: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
  'Expressed Interest': { icon: ThumbsUp, color: '#f472b6', bg: 'rgba(236,72,153,0.1)' },
  'Meeting Scheduled': { icon: Calendar, color: '#60a5fa', bg: 'rgba(59,130,246,0.1)' },
  'Note Added': { icon: MessageSquare, color: '#c084fc', bg: 'rgba(168,85,247,0.1)' },
  'Status Updated': { icon: CheckCircle2, color: '#9ca3af', bg: 'rgba(107,114,128,0.1)' },
};

function getConfig(action) {
  for (const [key, cfg] of Object.entries(ACTION_CONFIG)) {
    if (action?.includes(key)) return cfg;
  }
  return ACTION_CONFIG['Status Updated'];
}

function formatTimestamp(ts) {
  if (!ts) return 'just now';
  try {
    const date = ts?.toDate ? ts.toDate() : new Date(ts);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return 'recently';
  }
}

export default function ActivityTimeline({ activities = [], loading = false }) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full shimmer flex-shrink-0" />
            <div className="flex-1 space-y-1.5 pt-1">
              <div className="h-3 w-48 rounded shimmer" />
              <div className="h-2.5 w-24 rounded shimmer" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activities.length) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        No activity recorded yet.
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div
        className="absolute left-4 top-4 bottom-4 w-px"
        style={{ background: 'linear-gradient(to bottom, #e4cfa8, transparent)' }}
      />
      <div className="space-y-4">
        {activities.map((activity, i) => {
          const cfg = getConfig(activity.action);
          const Icon = cfg.icon;
          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-3 relative"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10"
                style={{ background: cfg.bg, border: `1.5px solid ${cfg.color}30` }}
              >
                <Icon size={14} style={{ color: cfg.color }} />
              </div>
              <div className="flex-1 pt-0.5">
                <p className="text-sm text-gray-700 font-medium">{activity.action}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatTimestamp(activity.timestamp)}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
