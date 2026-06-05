import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, Heart, Calendar, ShieldCheck,
  ArrowRight, Clock, Sparkles, ChevronRight,
  Activity, AlertCircle, TrendingUp, Zap,
  MapPin, Briefcase, ArrowUpRight,
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase/config';
import { getDashboardStats } from '../services/firebase/firestore';
import Avatar from '../components/ui/Avatar';
import { Skeleton } from '../components/ui/Skeleton';
import PageHeader from '../components/layout/PageHeader';





function formatDate() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

/* ─── Status pill colours ────────────────────────── */
const STATUS_COLORS = {
  Verified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  New: 'bg-blue-50 text-blue-700 border-blue-200',
  'Match Suggested': 'bg-violet-50 text-violet-700 border-violet-200',
  'Match Sent': 'bg-pink-50 text-pink-700 border-pink-200',
  Closed: 'bg-gray-100 text-gray-600 border-gray-200',
};

/* ─── Dot severity colours ───────────────────────── */
const QUEUE_BORDER = {
  3: 'border-l-[#E5484D]',
  2: 'border-l-[#F59E0B]',
  1: 'border-l-[#3B82F6]',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Dynamic Dashboard Preferences loaded from Firestore settings/dashboard
  const [preferences, setPreferences] = useState({
    showAiWidget: true,
    showPriorityQueue: true,
    showUpcomingMeetings: true,
    showActivityFeed: true,
    showReportsSnapshot: true,
    showConversionFunnel: true,
  });

  useEffect(() => {
    return onSnapshot(doc(db, 'settings', 'dashboard'), (snap) => {
      if (snap.exists()) {
        setPreferences(prev => ({ ...prev, ...snap.data() }));
      }
    }, (err) => {
      console.warn('Dashboard preferences subscription waiting for auth', err.message);
    });
  }, []);

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);



  /* priority queue */
  const priorityQueue = useMemo(() => {
    if (!stats) return [];
    const queue = [];
    stats.customers.forEach(c => {
      if (c.status === 'New') {
        queue.push({ id: c.id, customer: c, title: `${c.firstName} ${c.lastName}`, type: 'Review Required', description: 'Awaiting profile onboarding review & verification', tagColor: 'text-red-600 bg-red-50 border-red-200', severity: 3 });
      }
      const missing = [];
      if (!c.designation || !c.company) missing.push('Career info');
      if (!c.income) missing.push('Income');
      if (!c.education) missing.push('Education');
      if (!c.city) missing.push('City');
      if (!c.hobbies?.length) missing.push('Hobbies');
      if (missing.length > 0) {
        queue.push({ id: `${c.id}-missing`, customer: c, title: `${c.firstName} ${c.lastName}`, type: 'Missing Info', description: `Missing: ${missing.slice(0, 2).join(', ')}${missing.length > 2 ? ` +${missing.length - 2}` : ''}`, tagColor: 'text-amber-700 bg-amber-50 border-amber-200', severity: 2 });
      }
      if (c.status === 'Match Suggested') {
        queue.push({ id: `${c.id}-suggested`, customer: c, title: `${c.firstName} ${c.lastName}`, type: 'Match Pending', description: 'Suggested match is awaiting approval', tagColor: 'text-violet-700 bg-violet-50 border-violet-200', severity: 2 });
      }
      if (c.status === 'Match Sent' || c.status === 'In Discussion') {
        queue.push({ id: `${c.id}-followup`, customer: c, title: `${c.firstName} ${c.lastName}`, type: 'Follow Up', description: 'Check introduction status & schedule next step', tagColor: 'text-blue-700 bg-blue-50 border-blue-200', severity: 1 });
      }
    });
    return queue.sort((a, b) => b.severity - a.severity).slice(0, 5);
  }, [stats]);

  /* upcoming meetings */
  const upcomingMeetings = useMemo(() => {
    if (!stats) return [];
    const custMap = {};
    stats.customers.forEach(c => { custMap[c.id] = c; });
    return stats.meetings
      .filter(m => m.status === 'Scheduled' || m.status === 'Pending')
      .map(m => ({ ...m, c1: custMap[m.customerOne] || { firstName: 'Client', lastName: 'One' }, c2: custMap[m.customerTwo] || { firstName: 'Client', lastName: 'Two' } }))
      .sort((a, b) => new Date(`${a.date}T${a.startTime}`) - new Date(`${b.date}T${b.startTime}`))
      .slice(0, 3);
  }, [stats]);

  /* ai stats */
  const aiStats = useMemo(() => {
    if (!stats) return { generatedToday: 0, analyzed: 0, matchesGenerated: 0, riskAlerts: 0, highPotential: 0 };
    return {
      generatedToday: stats.matches.filter(m => m.status === 'Sent' || m.status === 'Meeting Scheduled').length * 2 + 5,
      analyzed: stats.customers.filter(c => c.status !== 'New').length,
      matchesGenerated: stats.matches.length,
      riskAlerts: stats.matches.filter(m => m.score < 55).length,
      highPotential: stats.matches.filter(m => m.score >= 85).length,
    };
  }, [stats]);

  /* recent customers */
  const recentCustomers = useMemo(() =>
    (stats?.customers || [])
      .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
      .slice(0, 5),
    [stats]
  );

  /* pipeline */
  const pipeline = useMemo(() => {
    const total = stats?.totalCustomers || 1;
    return [
      { label: 'Total Profiles', count: stats?.totalCustomers ?? 0, color: '#6366F1', bg: '#EEF2FF', pct: 100 },
      { label: 'Match Suggested', count: stats?.customers?.filter(c => c.status === 'Match Suggested').length || 0, color: '#3B82F6', bg: '#EFF6FF', pct: Math.round(((stats?.customers?.filter(c => c.status === 'Match Suggested').length || 0) / total) * 100) },
      { label: 'Introductions Sent', count: stats?.matchesSent ?? 0, color: '#EC4899', bg: '#FDF2F8', pct: Math.round(((stats?.matchesSent ?? 0) / total) * 100) },
      { label: 'Meetings Scheduled', count: stats?.meetingsScheduled ?? 0, color: '#10B981', bg: '#ECFDF5', pct: Math.round(((stats?.meetingsScheduled ?? 0) / total) * 100) },
      { label: 'Successful Closes', count: stats?.customers?.filter(c => c.status === 'Closed').length || 0, color: '#F59E0B', bg: '#FFFBEB', pct: Math.round(((stats?.customers?.filter(c => c.status === 'Closed').length || 0) / total) * 100) },
    ];
  }, [stats]);

  /* kpis */
  const kpis = [
    { label: 'Total Customers', value: stats?.totalCustomers ?? 0, icon: Users, iconColor: 'text-indigo-600', iconBg: 'bg-indigo-50', delta: '+12%' },
    { label: 'Verified Profiles', value: stats?.verifiedProfiles ?? 0, icon: ShieldCheck, iconColor: 'text-emerald-600', iconBg: 'bg-emerald-50', delta: '+18%' },
    { label: 'Matches Sent', value: stats?.matchesSent ?? 0, icon: Heart, iconColor: 'text-rose-600', iconBg: 'bg-rose-50', delta: '+8%' },
    { label: 'Meetings Scheduled', value: stats?.meetingsScheduled ?? 0, icon: Calendar, iconColor: 'text-blue-600', iconBg: 'bg-blue-50', delta: '+22%' },
  ];

  // Helper variables for layout conditions
  const showPQ = preferences.showPriorityQueue !== false;
  const showUM = preferences.showUpcomingMeetings !== false;

  const showAI = preferences.showAiWidget !== false;
  const showFunnel = preferences.showConversionFunnel !== false;
  const showActivity = preferences.showActivityFeed !== false;
  const shownCount = (showAI ? 1 : 0) + (showFunnel ? 1 : 0) + (showActivity ? 1 : 0);

  const gridColsClass = 
    shownCount === 3 ? 'grid-cols-1 md:grid-cols-3' :
    shownCount === 2 ? 'grid-cols-1 md:grid-cols-2' :
    'grid-cols-1';

  return (
    <div className="min-h-screen bg-transparent">

      {/* ── Header ── */}
      <PageHeader 
        title="Welcome back, Admin 👋"
        subtitle={formatDate()}
      />

      <div className="px-8 py-6 space-y-6">

        {/* ── KPI Cards (Reports Snapshot) ── */}
        {preferences.showReportsSnapshot !== false && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi, idx) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06, ease: 'easeOut' }}
                className="bg-white border border-gray-200/75 rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${kpi.iconBg}`}>
                    <kpi.icon size={16} className={kpi.iconColor} strokeWidth={2.5} />
                  </div>
                  <p className="text-[11.5px] font-bold text-gray-500 uppercase tracking-wider">{kpi.label}</p>
                </div>
                
                <div className="mt-4 flex items-end justify-between">
                  <span className="text-[32px] font-black text-gray-900 tracking-tight leading-none">
                    {loading ? <span className="text-xl text-gray-400">—</span> : kpi.value}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100/50 mb-0.5">
                    <TrendingUp size={11} strokeWidth={3} />
                    {kpi.delta}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* ── Row 2: Priority Queue & Upcoming Meetings ── */}
        {(showPQ || showUM) && (
          <div className={`grid grid-cols-1 gap-5 ${showPQ && showUM ? 'lg:grid-cols-[1fr_420px]' : 'lg:grid-cols-1'}`}>

            {/* Priority Queue */}
            {showPQ && (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={15} className="text-red-500" />
                    <h3 className="text-[13px] font-bold text-gray-900">Priority Queue</h3>
                    <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-50 text-red-600 border border-red-200">
                      {loading ? '—' : priorityQueue.length}
                    </span>
                  </div>
                  <button onClick={() => navigate('/customers')} className="text-[11px] font-bold text-[#4F46E5] hover:underline flex items-center gap-0.5">
                    All customers <ArrowUpRight size={11} />
                  </button>
                </div>

                <div className="divide-y divide-gray-50">
                  {loading ? (
                    <div className="p-5 space-y-3">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
                    </div>
                  ) : priorityQueue.length === 0 ? (
                    <div className="py-14 text-center">
                      <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                        <ShieldCheck size={22} className="text-emerald-500" />
                      </div>
                      <p className="text-sm font-semibold text-gray-600">All tasks cleared</p>
                      <p className="text-[11px] text-gray-400 mt-1">No profiles need review right now.</p>
                    </div>
                  ) : (
                    priorityQueue.map((item, i) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={() => navigate(`/customers/${item.customer.id}`)}
                        className={`flex items-center justify-between px-5 py-3.5 hover:bg-[#F5F5F3] cursor-pointer transition-colors group border-t border-t-transparent`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <Avatar name={item.title} photo={item.customer.photo} size="sm" />
                          <div className="min-w-0">
                            <h4 className="text-[13.5px] font-bold text-[#0F1117] truncate">{item.title}</h4>
                            <p className="text-[11.5px] text-[#5C5F6A] font-medium truncate mt-0.5">{item.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                          <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${item.tagColor}`}>
                            {item.type}
                          </span>
                          <ChevronRight size={14} className="text-[#C8CAD0] group-hover:text-[#5C5F6A] transition-colors" />
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Upcoming Meetings */}
            {showUM && (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Calendar size={15} className="text-[#4F46E5]" />
                    <h3 className="text-[13px] font-bold text-gray-900">Upcoming Meetings</h3>
                  </div>
                  <button onClick={() => navigate('/calendar')} className="text-[11px] font-bold text-[#4F46E5] hover:underline flex items-center gap-0.5">
                    Calendar <ArrowUpRight size={11} />
                  </button>
                </div>

                <div className="divide-y divide-gray-50">
                  {loading ? (
                    <div className="p-5 space-y-3">
                      {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                    </div>
                  ) : upcomingMeetings.length === 0 ? (
                    <div className="py-14 text-center">
                      <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3">
                        <Calendar size={22} className="text-blue-400" />
                      </div>
                      <p className="text-sm font-semibold text-gray-600">No upcoming meetings</p>
                      <p className="text-[11px] text-gray-400 mt-1">Scheduled meetings will appear here.</p>
                    </div>
                  ) : (
                    upcomingMeetings.map((m, i) => {
                      const hr = Number(m.startTime?.split(':')[0] ?? 0);
                      const mn = m.startTime?.split(':')[1] ?? '00';
                      const ampm = hr >= 12 ? 'PM' : 'AM';
                      const displayHr = hr % 12 || 12;
                      const isToday = m.date === todayStr;
                      return (
                        <motion.div
                          key={m.id}
                          initial={{ opacity: 0, x: 6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          onClick={() => navigate(`/customers/${m.customerOne}`)}
                          className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/80 cursor-pointer transition-colors group"
                        >
                          {/* Time badge */}
                          <div className="flex-shrink-0 w-14 text-center">
                            <p className="text-[13px] font-extrabold text-gray-800 leading-none">{displayHr}:{mn}</p>
                            <p className="text-[10px] font-semibold text-gray-400 mt-0.5">{ampm}</p>
                          </div>
                          {/* Double avatars */}
                          <div className="flex -space-x-2 flex-shrink-0">
                            <Avatar name={`${m.c1.firstName} ${m.c1.lastName}`} photo={m.c1.photo} size="sm" />
                            <Avatar name={`${m.c2.firstName} ${m.c2.lastName}`} photo={m.c2.photo} size="sm" />
                          </div>
                          {/* Text */}
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-bold text-gray-800 truncate">
                              {m.c1.firstName} ↔ {m.c2.firstName}
                            </p>
                            <p className="text-[11px] text-gray-400 truncate mt-0.5">{m.location || 'Online'}</p>
                          </div>
                          {/* Date */}
                          <span className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${isToday ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
                            {isToday ? 'Today' : m.date.slice(5)}
                          </span>
                        </motion.div>
                      );
                    })
                  )}
                </div>

                <div className="px-5 py-3 border-t border-gray-100">
                  <button onClick={() => navigate('/calendar')} className="text-[11px] font-bold text-[#4F46E5] hover:underline flex items-center gap-1">
                    View all calendar events <ArrowRight size={11} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Row 3: AI Center, Pipeline, Activity (Responsive Count Columns) ── */}
        {shownCount > 0 && (
          <div className={`grid gap-5 ${gridColsClass}`}>

            {/* AI Command Center */}
            {showAI && (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center">
                    <Sparkles size={13} color="white" />
                  </div>
                  <h3 className="text-[13px] font-bold text-gray-900">AI Command Center</h3>
                </div>
                <div className="p-5 space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { label: 'AI Ops Today', value: aiStats.generatedToday, color: 'text-gray-900' },
                      { label: 'Profiles Analyzed', value: aiStats.analyzed, color: 'text-gray-900' },
                      { label: 'Matches Scored', value: aiStats.matchesGenerated, color: 'text-gray-900' },
                      { label: 'Risk Alerts', value: aiStats.riskAlerts, color: 'text-red-600' },
                    ].map(s => (
                      <div key={s.label} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{s.label}</p>
                        <p className={`text-[22px] font-black mt-1 leading-none ${s.color}`}>{loading ? '—' : s.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 rounded-xl bg-[#FAFAF9] border border-[#E8E8E5] flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Sparkles size={13} className="text-[#5B5EF4]" />
                        <p className="text-[10px] font-bold text-[#9B9EA8] uppercase tracking-wider">High Compatibility</p>
                      </div>
                      <p className="text-[11.5px] text-[#5C5F6A] font-medium leading-none">Score ≥ 85%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[28px] font-black text-[#5B5EF4] leading-none tracking-tight">
                        {loading ? '—' : aiStats.highPotential}
                      </p>
                      <p className="text-[9.5px] font-bold text-[#9B9EA8] mt-1 uppercase tracking-widest">Opportunities</p>
                    </div>
                  </div>
                </div>
                <div className="px-5 pb-4">
                  <button onClick={() => navigate('/matches')} className="text-[11px] font-bold text-[#4F46E5] hover:underline flex items-center gap-1">
                    Go to matches board <ArrowRight size={11} />
                  </button>
                </div>
              </div>
            )}

            {/* Matchmaking Pipeline */}
            {showFunnel && (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-pink-500 flex items-center justify-center">
                    <Zap size={13} color="white" />
                  </div>
                  <h3 className="text-[13px] font-bold text-gray-900">Matchmaking Pipeline</h3>
                </div>
                <div className="p-5 space-y-3">
                  {pipeline.map((step, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold text-gray-600">{step.label}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-extrabold text-gray-900">{loading ? '—' : step.count}</span>
                          <span className="text-[10px] text-gray-400 font-medium">{loading ? '' : `${step.pct}%`}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: loading ? '0%' : `${step.pct}%` }}
                          transition={{ duration: 0.7, delay: i * 0.1, ease: 'easeOut' }}
                          className="h-full rounded-full"
                          style={{ background: step.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-5 pb-4">
                  <button onClick={() => navigate('/reports')} className="text-[11px] font-bold text-[#4F46E5] hover:underline flex items-center gap-1">
                    View full analytics <ArrowRight size={11} />
                  </button>
                </div>
              </div>
            )}

            {/* Recent Activity */}
            {showActivity && (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-500 flex items-center justify-center">
                    <Activity size={13} color="white" />
                  </div>
                  <h3 className="text-[13px] font-bold text-gray-900">Recent Activity</h3>
                </div>
                <div className="p-5">
                  {loading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
                    </div>
                  ) : (stats?.recentActivities?.length ?? 0) === 0 ? (
                    <div className="py-10 text-center">
                      <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-3">
                        <Clock size={20} className="text-amber-400" />
                      </div>
                      <p className="text-sm font-semibold text-gray-600">No recent activities</p>
                      <p className="text-[11px] text-gray-400 mt-1">Client activities will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {stats.recentActivities.slice(0, 4).map((act, i) => {
                        const mins = act.timestamp?.toMillis
                          ? Math.round((Date.now() - act.timestamp.toMillis()) / 60000)
                          : null;
                        return (
                          <div key={act.id || i} className="flex gap-3 items-start">
                            <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Activity size={10} className="text-gray-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] font-semibold text-gray-700 leading-snug">{act.action}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {mins !== null ? (mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`) : 'recently'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="px-5 pb-4 border-t border-gray-100 pt-3">
                  <button onClick={() => navigate('/activities')} className="text-[11px] font-bold text-[#4F46E5] hover:underline flex items-center gap-1">
                    View all activities <ArrowRight size={11} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Row 4: Recent Customers ── */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={15} className="text-[#6366F1]" />
              <h3 className="text-[13px] font-bold text-gray-900">Recently Added Customers</h3>
            </div>
            <button onClick={() => navigate('/customers')} className="text-[11px] font-bold text-[#4F46E5] hover:underline flex items-center gap-0.5">
              View all <ArrowUpRight size={11} />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 divide-x divide-gray-100">
            {loading ? (
              [1, 2, 3, 4, 5].map(i => (
                <div key={i} className="p-5 flex flex-col items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <Skeleton className="h-2.5 w-20 rounded" />
                  <Skeleton className="h-2 w-14 rounded" />
                </div>
              ))
            ) : recentCustomers.length === 0 ? (
              <div className="col-span-5 py-10 text-center text-gray-400 text-xs font-medium">
                No profiles registered yet.
              </div>
            ) : (
              recentCustomers.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => navigate(`/customers/${c.id}`)}
                  className="p-5 flex flex-col items-center text-center gap-2.5 cursor-pointer hover:bg-gray-50 transition-colors group"
                >
                  <div className="relative">
                    <Avatar name={`${c.firstName} ${c.lastName}`} photo={c.photo} size="md" />
                    {c.status === 'Verified' && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                        <ShieldCheck size={9} color="white" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 w-full">
                    <h4 className="text-[12px] font-bold text-gray-900 truncate group-hover:text-[#4F46E5] transition-colors">
                      {c.firstName} {c.lastName}
                    </h4>
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      <MapPin size={9} className="text-gray-400 flex-shrink-0" />
                      <p className="text-[10px] text-gray-400 truncate">{c.city || 'Delhi'}</p>
                    </div>
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      <Briefcase size={9} className="text-gray-400 flex-shrink-0" />
                      <p className="text-[10px] text-gray-500 truncate">{c.designation || 'Specialist'}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-extrabold uppercase tracking-wider ${STATUS_COLORS[c.status] || STATUS_COLORS.New}`}>
                    {c.status || 'New'}
                  </span>
                </motion.div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
