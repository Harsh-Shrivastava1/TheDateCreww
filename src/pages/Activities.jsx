import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, Search, RefreshCw, ChevronRight, Clock, User, Plus, CheckCircle, 
  UserCheck, Heart, Send, Calendar, MessageSquare, ToggleLeft, Sparkles, XCircle, Check
} from 'lucide-react';
import { getAllActivities, getCustomers } from '../services/firebase/firestore';
import PageHeader from '../components/layout/PageHeader';
import { Skeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import Avatar from '../components/ui/Avatar';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const CATEGORIES = ['All', 'Profiles', 'Matches', 'Meetings', 'Notes'];

const ACTIVITY_CONFIGS = {
  'Profile Created':   { Icon: Plus,          color: '#4F46E5', bg: '#EEF2FF', badge: 'Profile' },
  'Profile Updated':   { Icon: Activity,      color: '#6B7280', bg: '#F3F4F6', badge: 'Profile' },
  'Profile Verified':  { Icon: UserCheck,     color: '#10B981', bg: '#ECFDF5', badge: 'Verified' },
  'Match Generated':   { Icon: Heart,         color: '#EC4899', bg: '#FDF2F8', badge: 'Matchmaking' },
  'Match Sent':        { Icon: Send,          color: '#3B82F6', bg: '#EFF6FF', badge: 'Matchmaking' },
  'Match Accepted':    { Icon: Check,         color: '#10B981', bg: '#ECFDF5', badge: 'Matchmaking' },
  'Match Rejected':    { Icon: XCircle,       color: '#EF4444', bg: '#FEF2F2', badge: 'Matchmaking' },
  'Meeting Scheduled': { Icon: Calendar,      color: '#F59E0B', bg: '#FFFBEB', badge: 'Meeting' },
  'Meeting Completed': { Icon: CheckCircle,   color: '#10B981', bg: '#ECFDF5', badge: 'Meeting' },
  'Note Added':        { Icon: MessageSquare, color: '#6B7280', bg: '#F9FAFB', badge: 'Notes' },
  'Status Changed':    { Icon: ToggleLeft,    color: '#6366F1', bg: '#EEF2FF', badge: 'Status' },
  'AI Analysis Generated': { Icon: Sparkles,  color: '#8B5CF6', bg: '#F5F3FF', badge: 'AI' }
};

function getActivityConfig(action = '') {
  for (const [key, cfg] of Object.entries(ACTIVITY_CONFIGS)) {
    if (action.includes(key)) return cfg;
  }
  // Fallbacks based on keywords
  if (action.toLowerCase().includes('status')) return ACTIVITY_CONFIGS['Status Changed'];
  if (action.toLowerCase().includes('meeting')) return ACTIVITY_CONFIGS['Meeting Scheduled'];
  if (action.toLowerCase().includes('match') || action.toLowerCase().includes('intro')) return ACTIVITY_CONFIGS['Match Sent'];
  if (action.toLowerCase().includes('note')) return ACTIVITY_CONFIGS['Note Added'];
  if (action.toLowerCase().includes('verified')) return ACTIVITY_CONFIGS['Profile Verified'];
  
  return { Icon: Activity, color: '#6B7280', bg: '#F3F4F6', badge: 'System' };
}

export default function Activities() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [customers, setCustomers] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [limitCount, setLimitCount] = useState(15);

  const loadData = async () => {
    setLoading(true);
    try {
      const [acts, custs] = await Promise.all([
        getAllActivities(),
        getCustomers(),
      ]);
      
      const indexedCusts = {};
      custs.forEach(c => {
        indexedCusts[c.id] = c;
      });
      
      setCustomers(indexedCusts);
      setActivities(acts);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load activity log');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resolvedActivities = useMemo(() => {
    let list = activities.map(act => ({
      ...act,
      customer: customers[act.customerId] || null,
      config: getActivityConfig(act.action)
    }));

    // Filter by tab
    if (activeTab === 'Profiles') {
      list = list.filter(act => ['Profile', 'Verified', 'Status'].includes(act.config.badge));
    } else if (activeTab === 'Matches') {
      list = list.filter(act => ['Matchmaking', 'AI'].includes(act.config.badge));
    } else if (activeTab === 'Meetings') {
      list = list.filter(act => act.config.badge === 'Meeting');
    } else if (activeTab === 'Notes') {
      list = list.filter(act => act.config.badge === 'Notes');
    }

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(act => 
        (act.action || '').toLowerCase().includes(q) ||
        (act.customer ? `${act.customer.firstName} ${act.customer.lastName}`.toLowerCase().includes(q) : false) ||
        (act.createdBy || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [activities, customers, activeTab, search]);

  const displayedActivities = useMemo(() => {
    return resolvedActivities.slice(0, limitCount);
  }, [resolvedActivities, limitCount]);

  const hasMore = resolvedActivities.length > limitCount;

  const formatTs = (ts) => {
    if (!ts) return 'just now';
    try {
      const d = ts?.toDate ? ts.toDate() : new Date(ts);
      return formatDistanceToNow(d, { addSuffix: true });
    } catch { return 'recently'; }
  };

  return (
    <div className="bg-[#FAFAF9] min-h-screen">
      <PageHeader
        title="Activity Log"
        subtitle="Chronological feed of matchmaker operations and customer milestones"
        actions={
          <button onClick={loadData} className="btn btn-secondary btn-sm gap-1.5 shadow-xs">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        }
      />

      <div className="px-8 py-6 w-full space-y-6">
        {/* Navigation & Search toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 p-2 bg-white border border-gray-200 rounded-xl shadow-sm">
          {/* Tab buttons */}
          <div className="flex gap-1 overflow-x-auto px-1">
            {CATEGORIES.map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setLimitCount(15); }}
                className={`px-4 py-2 text-[12px] font-bold rounded-lg whitespace-nowrap transition-all ${
                  activeTab === tab
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-72 sm:mr-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search actions, clients, authors..."
              className="w-full pl-9 pr-4 py-2 text-[13px] bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:bg-white rounded-lg outline-none transition-all shadow-3xs"
              value={search}
              onChange={e => { setSearch(e.target.value); setLimitCount(15); }}
            />
          </div>
        </div>

        {/* Timeline */}
        {loading && displayedActivities.length === 0 ? (
          <div className="space-y-4 py-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex gap-4">
                <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2 bg-white p-4 rounded-xl border border-gray-150">
                  <Skeleton className="h-4 w-48 rounded" />
                  <Skeleton className="h-3 w-24 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : resolvedActivities.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No activity records found"
            description="Your search criteria or selected filters returned no matching activity logs."
          />
        ) : (
          <div className="space-y-4">
            <div className="relative border-l border-gray-200 pl-6 ml-4 space-y-5 py-2">
              <AnimatePresence mode="popLayout">
                {displayedActivities.map((act, i) => {
                  const customerName = act.customer
                    ? `${act.customer.firstName} ${act.customer.lastName}`
                    : 'System/Unknown';

                  return (
                    <motion.div
                      key={act.id || i}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="relative"
                    >
                      {/* Timeline dot/icon */}
                      <div
                        className="absolute -left-[38px] top-4 w-7 h-7 rounded-xl flex items-center justify-center border border-gray-200 bg-white shadow-sm"
                        style={{ color: act.config.color }}
                      >
                        <act.config.Icon size={12} strokeWidth={2.5} />
                      </div>

                      {/* Timeline Card */}
                      <div className="bg-white rounded-xl p-5 hover:shadow-md transition-all shadow-sm border border-gray-200 flex items-center justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          {act.customer && (
                            <div 
                              className="cursor-pointer flex-shrink-0 mt-0.5" 
                              onClick={() => navigate(`/customers/${act.customerId}`)}
                            >
                              <Avatar name={customerName} photo={act.customer.photo} size="sm" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-gray-800">
                                {act.customer ? (
                                  <span 
                                    className="hover:underline cursor-pointer"
                                    onClick={() => navigate(`/customers/${act.customerId}`)}
                                  >
                                    {customerName}
                                  </span>
                                ) : 'System Event'}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider`}
                                style={{ background: act.config.bg, color: act.config.color }}
                              >
                                {act.config.badge}
                              </span>
                            </div>
                            
                            <p className="text-xs text-gray-600 mt-1 leading-relaxed font-medium">
                              {act.action}
                            </p>

                            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-400 font-semibold">
                              <span className="flex items-center gap-1">
                                <Clock size={10} />
                                {formatTs(act.timestamp)}
                              </span>
                              <span>·</span>
                              <span>by {act.createdBy || 'System'}</span>
                            </div>
                          </div>
                        </div>

                        {act.customer && (
                          <button
                            className="btn btn-secondary btn-sm p-1.5 flex-shrink-0 self-center"
                            onClick={() => navigate(`/customers/${act.customerId}`)}
                            title="Go to customer profile"
                          >
                            <ChevronRight size={14} />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {hasMore && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={() => setLimitCount(prev => prev + 15)}
                  className="btn btn-secondary btn-sm gap-2 font-bold shadow-xs"
                >
                  Load more activities ({resolvedActivities.length - limitCount} remaining)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
