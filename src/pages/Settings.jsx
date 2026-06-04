import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../services/firebase/config';
import {
  getCustomers,
  getAllMatches,
  getAllActivities,
  recalculateMatches,
} from '../services/firebase/firestore';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { sendPasswordResetEmail, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import {
  Sliders, Brain, Bell, LayoutDashboard, ShieldCheck,
  Database, Palette, Activity, Save, RotateCcw, CheckCircle2,
  Lock, User, Globe, Radio, HardDrive, FileCode, Sparkles,
  ChevronDown, Download, Printer, LogOut, KeyRound,
  Users, Heart, BarChart3, Zap, Eye, EyeOff,
  SlidersHorizontal, Settings2,
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ────────────────── NAV TABS ────────────────── */
const TABS = [
  { id: 'matching',      label: 'Compatibility',     icon: Sliders,         desc: 'Matching algorithm weights' },
  { id: 'ai',           label: 'AI Intelligence',   icon: Brain,           desc: 'LLM engine & features' },
  { id: 'notifications',label: 'Notifications',     icon: Bell,            desc: 'Alerts & summaries' },
  { id: 'dashboard',    label: 'Dashboard',         icon: LayoutDashboard, desc: 'Widget visibility' },
  { id: 'appearance',   label: 'Appearance',        icon: Palette,         desc: 'Theme & density' },
  { id: 'security',     label: 'Security',          icon: ShieldCheck,     desc: 'Access & auth' },
  { id: 'database',     label: 'Database',          icon: Database,        desc: 'Exports & stats' },
  { id: 'health',       label: 'System Health',     icon: Activity,        desc: 'Service status' },
];

/* ────────────────── HELPERS ────────────────── */
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-indigo-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function RangeSlider({ label, value, min = 0, max = 100, unit = '', onChange }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-bold text-indigo-600 tabular-nums min-w-[3rem] text-right">
          {value}{unit}
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-gray-100">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range" min={min} max={max} value={value}
          onChange={e => onChange(parseInt(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-indigo-600 shadow-md pointer-events-none transition-all"
          style={{ left: `calc(${pct}% - 8px)` }}
        />
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, description, color = 'indigo' }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
    violet: 'bg-violet-50 text-violet-600 ring-violet-100',
    amber:  'bg-amber-50  text-amber-600  ring-amber-100',
    emerald:'bg-emerald-50 text-emerald-600 ring-emerald-100',
    rose:   'bg-rose-50   text-rose-600   ring-rose-100',
    blue:   'bg-blue-50   text-blue-600   ring-blue-100',
    slate:  'bg-slate-100 text-slate-600  ring-slate-200',
  };
  return (
    <div className="flex items-start gap-4 mb-8">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ring-1 shrink-0 ${colors[color]}`}>
        <Icon size={20} />
      </div>
      <div>
        <h2 className="text-[17px] font-bold text-gray-900 leading-tight">{title}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200/80 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function CardSection({ label, children }) {
  return (
    <div>
      {label && (
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-4">{label}</p>
      )}
      {children}
    </div>
  );
}

function Divider() {
  return <div className="border-t border-gray-100 my-6" />;
}

function ToggleRow({ label, desc, checked, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5 border-b border-gray-50 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        {desc && <p className="text-xs text-gray-400 mt-0.5 leading-snug">{desc}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

/* ────────────────── MAIN COMPONENT ────────────────── */
export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('matching');

  // ── State ──
  const [matchmaking, setMatchmaking] = useState({
    minAgeGap: 0, maxAgeGap: 6,
    religionWeight: 15, locationWeight: 18, educationWeight: 10,
    incomeWeight: 12, familyWeight: 17, languageWeight: 8, lifestyleWeight: 8,
  });
  const [ai, setAi] = useState({
    model: 'llama-3.3-70b-versatile',
    aiMatchExplanation: true, aiExecutiveSummary: true,
    aiRiskAnalysis: true, aiRelationshipInsights: true, aiRedFlagDetection: true,
  });
  const [notifications, setNotifications] = useState({
    meetingReminders: true, matchSentAlerts: true,
    profileReviewAlerts: true, aiRecommendationAlerts: true,
    dailySummaryEmail: false, weeklyReport: true,
  });
  const [dashboard, setDashboard] = useState({
    showAiWidget: true, showPriorityQueue: true, showUpcomingMeetings: true,
    showActivityFeed: true, showReportsSnapshot: true, showConversionFunnel: true,
  });
  const [appearance, setAppearance] = useState(() => ({
    theme: localStorage.getItem('tdc_theme') || 'light',
    density: localStorage.getItem('tdc_density') || 'comfortable',
  }));
  const [dbStats, setDbStats] = useState({ totalProfiles: 0, verifiedProfiles: 0, matchesCreated: 0, activitiesLogged: 0 });
  const [health, setHealth] = useState({ firebase: 'checking', groq: 'checking', auth: 'checking', dbConn: 'checking', lastAiRequest: localStorage.getItem('last_ai_request_time') || 'No requests logged' });
  const [originalData, setOriginalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Load ──
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [matchSnap, aiSnap, notifSnap, dashSnap] = await Promise.all([
          getDoc(doc(db, 'settings', 'matchmaking')),
          getDoc(doc(db, 'settings', 'ai')),
          getDoc(doc(db, 'settings', 'notifications')),
          getDoc(doc(db, 'settings', 'dashboard')),
        ]);
        const lm = matchSnap.exists() ? { ...matchmaking, ...matchSnap.data() } : matchmaking;
        const la = aiSnap.exists()    ? { ...ai,          ...aiSnap.data()    } : ai;
        const ln = notifSnap.exists() ? { ...notifications,...notifSnap.data()} : notifications;
        const ld = dashSnap.exists()  ? { ...dashboard,   ...dashSnap.data()  } : dashboard;
        applyTheme(appearance.theme);
        applyDensity(appearance.density);
        setMatchmaking(lm); setAi(la); setNotifications(ln); setDashboard(ld);
        setOriginalData(JSON.stringify({ matchmaking: lm, ai: la, notifications: ln, dashboard: ld, appearance }));
        const [customers, matches, activities] = await Promise.all([getCustomers(), getAllMatches(), getAllActivities()]);
        setDbStats({ totalProfiles: customers.length, verifiedProfiles: customers.filter(c => c.status === 'Verified').length, matchesCreated: matches.length, activitiesLogged: activities.length });
        setHealth({ firebase: 'healthy', auth: user ? 'healthy' : 'unhealthy', dbConn: 'healthy', groq: 'healthy', lastAiRequest: localStorage.getItem('last_ai_request_time') || 'No requests logged' });
      } catch (err) {
        console.error(err);
        toast.error('Could not connect to Firestore.');
        setHealth(h => ({ ...h, firebase: 'unhealthy', dbConn: 'unhealthy', auth: 'unhealthy' }));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const hasChanges = useMemo(() => {
    if (!originalData) return false;
    return JSON.stringify({ matchmaking, ai, notifications, dashboard, appearance }) !== originalData;
  }, [matchmaking, ai, notifications, dashboard, appearance, originalData]);

  // ── Helpers ──
  const applyTheme = v => {
    if (v === 'dark' || (v === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches))
      document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };
  const applyDensity = v => {
    if (v === 'compact') document.documentElement.classList.add('compact-mode');
    else document.documentElement.classList.remove('compact-mode');
  };
  const handleAppearanceChange = (key, val) => {
    setAppearance(p => ({ ...p, [key]: val }));
    if (key === 'theme') { localStorage.setItem('tdc_theme', val); applyTheme(val); }
    else { localStorage.setItem('tdc_density', val); applyDensity(val); }
  };

  // ── Save ──
  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        setDoc(doc(db, 'settings', 'matchmaking'), matchmaking),
        setDoc(doc(db, 'settings', 'ai'), ai),
        setDoc(doc(db, 'settings', 'notifications'), notifications),
        setDoc(doc(db, 'settings', 'dashboard'), dashboard),
      ]);
      const count = await recalculateMatches();
      setOriginalData(JSON.stringify({ matchmaking, ai, notifications, dashboard, appearance }));
      toast.success(count > 0 ? `Saved! Recalculated ${count} matches.` : 'Settings saved successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save settings.');
    } finally { setSaving(false); }
  };
  const handleReset = () => {
    if (!originalData) return;
    const p = JSON.parse(originalData);
    setMatchmaking(p.matchmaking); setAi(p.ai); setNotifications(p.notifications);
    setDashboard(p.dashboard); setAppearance(p.appearance);
    applyTheme(p.appearance.theme); applyDensity(p.appearance.density);
    toast.success('Reverted to last saved state.');
  };
  const handleSignOut = async () => {
    if (!window.confirm('Sign out of this session?')) return;
    try { await signOut(auth); navigate('/login'); }
    catch { toast.error('Failed to sign out.'); }
  };
  const handleResetPassword = async () => {
    if (!user?.email) return;
    try { await sendPasswordResetEmail(auth, user.email); toast.success(`Reset link sent to ${user.email}`); }
    catch { toast.error('Could not send reset link.'); }
  };

  const handleExportCSV = async (type) => {
    try {
      toast.loading(`Exporting ${type}…`, { id: 'csv' });
      let data = [], headers = [];
      if (type === 'profiles') { data = await getCustomers(); headers = ['id','firstName','lastName','gender','age','city','religion','degree','designation','company','income','status']; }
      else if (type === 'matches') { data = await getAllMatches(); headers = ['id','customerOne','customerTwo','score','status','createdAt']; }
      else if (type === 'activities') { data = await getAllActivities(); headers = ['id','customerId','action','timestamp']; }
      if (!data.length) { toast.error(`No ${type} found.`, { id: 'csv' }); return; }
      const rows = [headers.join(',')];
      for (const row of data) {
        rows.push(headers.map(h => {
          let v = row[h];
          if (v && typeof v === 'object' && 'toMillis' in v) v = new Date(v.toMillis()).toISOString();
          return `"${('' + (v ?? '')).replace(/"/g, '""')}"`;
        }).join(','));
      }
      const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `tdc-${type}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      toast.success(`${data.length} ${type} exported.`, { id: 'csv' });
    } catch { toast.error('Export failed.', { id: 'csv' }); }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex h-full min-h-screen bg-[#FAFAF8]">
        <div className="w-56 border-r border-gray-200 bg-white p-4 space-y-2">
          {TABS.map(t => <div key={t.id} className="h-10 rounded-lg bg-gray-100 animate-pulse" />)}
        </div>
        <div className="flex-1 p-8 space-y-4">
          <div className="h-8 w-64 rounded-lg bg-gray-100 animate-pulse" />
          <div className="h-4 w-40 rounded bg-gray-100 animate-pulse" />
          <div className="mt-6 space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />)}
          </div>
        </div>
      </div>
    );
  }

  // ── Panel content ──
  const panels = {
    matching: (
      <div className="space-y-6">
        <SectionHeader icon={Sliders} title="Compatibility Engine" color="indigo"
          description="Configure how the algorithm weights each compatibility factor when scoring potential matches." />

        <Card className="p-6 space-y-6">
          <CardSection label="Age Gap Preference">
            <div className="grid grid-cols-2 gap-6">
              <RangeSlider label="Minimum Age Gap" value={matchmaking.minAgeGap} min={0} max={15} unit=" yrs"
                onChange={v => setMatchmaking(p => ({ ...p, minAgeGap: v }))} />
              <RangeSlider label="Maximum Age Gap" value={matchmaking.maxAgeGap} min={0} max={15} unit=" yrs"
                onChange={v => setMatchmaking(p => ({ ...p, maxAgeGap: v }))} />
            </div>
            <p className="text-xs text-gray-400 mt-3 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-indigo-400" />
              Profiles outside this age difference range will receive a lower compatibility score.
            </p>
          </CardSection>

          <Divider />

          <CardSection label="Factor Weights (0 – 100)">
            <p className="text-xs text-gray-400 -mt-2 mb-5">Higher values make this factor more influential in the final compatibility score. All weights are independent.</p>
            <div className="space-y-5">
              {[
                { label: 'Religion Match', key: 'religionWeight' },
                { label: 'Location Proximity', key: 'locationWeight' },
                { label: 'Education Level', key: 'educationWeight' },
                { label: 'Income Compatibility', key: 'incomeWeight' },
                { label: 'Family Preferences', key: 'familyWeight' },
                { label: 'Language Compatibility', key: 'languageWeight' },
                { label: 'Lifestyle Alignment', key: 'lifestyleWeight' },
              ].map(w => (
                <RangeSlider key={w.key} label={w.label} value={matchmaking[w.key]} min={0} max={100}
                  onChange={v => setMatchmaking(p => ({ ...p, [w.key]: v }))} />
              ))}
            </div>
          </CardSection>
        </Card>
      </div>
    ),

    ai: (
      <div className="space-y-6">
        <SectionHeader icon={Brain} title="AI Intelligence" color="violet"
          description="Select the LLM engine and control which AI-powered analysis features are active across the platform." />

        <Card className="p-6">
          <CardSection label="Language Model">
            <div className="relative">
              <select value={ai.model} onChange={e => setAi(p => ({ ...p, model: e.target.value }))}
                className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer">
                <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile — Best Quality (Recommended)</option>
                <option value="llama-3.1-8b-instant">llama-3.1-8b-instant — Fast / Low Latency</option>
              </select>
              <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <p className="text-xs text-gray-400 mt-2">The selected model is used for all AI features: match explanations, summaries, and risk analysis.</p>
          </CardSection>

          <Divider />

          <CardSection label="Feature Toggles">
            {[
              { key: 'aiMatchExplanation',    label: 'Match Explanation',     desc: 'Generate a detailed breakdown explaining why two profiles are compatible.' },
              { key: 'aiExecutiveSummary',    label: 'Executive Summary',     desc: 'Create a short AI-written bio brief shown on each profile card.' },
              { key: 'aiRiskAnalysis',        label: 'Risk Analysis',         desc: 'Highlight critical mismatches like relocation conflicts or value clashes.' },
              { key: 'aiRelationshipInsights',label: 'Relationship Insights', desc: 'Surface relationship dynamics and communication pattern insights.' },
              { key: 'aiRedFlagDetection',    label: 'Red Flag Detection',    desc: 'Automatically tag profiles with warnings visible only to matchmakers.' },
            ].map(f => (
              <ToggleRow key={f.key} label={f.label} desc={f.desc}
                checked={ai[f.key]} onChange={v => setAi(p => ({ ...p, [f.key]: v }))} />
            ))}
          </CardSection>
        </Card>
      </div>
    ),

    notifications: (
      <div className="space-y-6">
        <SectionHeader icon={Bell} title="Notification Preferences" color="amber"
          description="Control which events trigger alerts and how often you receive platform activity summaries." />

        <Card className="p-6">
          <CardSection label="In-App Alerts">
            {[
              { key: 'meetingReminders',        label: 'Meeting Reminders',       desc: 'Notify you before scheduled client introduction dates.' },
              { key: 'matchSentAlerts',         label: 'Match Sent Alerts',       desc: 'Alert when a match proposal has been received by the client.' },
              { key: 'profileReviewAlerts',     label: 'Profile Review Alerts',   desc: 'Trigger when a client completes their profile onboarding form.' },
              { key: 'aiRecommendationAlerts',  label: 'AI High-Score Alerts',    desc: 'Push a notification when AI scores a match above 90%.' },
            ].map(f => (
              <ToggleRow key={f.key} label={f.label} desc={f.desc}
                checked={notifications[f.key]} onChange={v => setNotifications(p => ({ ...p, [f.key]: v }))} />
            ))}
          </CardSection>

          <Divider />

          <CardSection label="Email Reports">
            {[
              { key: 'dailySummaryEmail', label: 'Daily Summary Email', desc: 'Receive an aggregated platform briefing every morning.' },
              { key: 'weeklyReport',      label: 'Weekly PDF Report',   desc: 'Detailed metrics overview delivered every Monday morning.' },
            ].map(f => (
              <ToggleRow key={f.key} label={f.label} desc={f.desc}
                checked={notifications[f.key]} onChange={v => setNotifications(p => ({ ...p, [f.key]: v }))} />
            ))}
          </CardSection>
        </Card>
      </div>
    ),

    dashboard: (
      <div className="space-y-6">
        <SectionHeader icon={LayoutDashboard} title="Dashboard Widgets" color="blue"
          description="Choose which analytics widgets and data panels are visible on your main dashboard." />

        <Card className="p-6">
          <CardSection label="Visible Widgets">
            {[
              { key: 'showAiWidget',         label: 'AI Insights Widget',    desc: 'Aggregate AI match processing statistics and model status.' },
              { key: 'showPriorityQueue',    label: 'Priority Queue',        desc: 'Files requiring immediate review or missing critical information.' },
              { key: 'showUpcomingMeetings', label: 'Upcoming Meetings',     desc: 'Schedule panel for today\'s and upcoming introduction dates.' },
              { key: 'showActivityFeed',     label: 'Live Activity Feed',    desc: 'Real-time event log stream for all client-related actions.' },
              { key: 'showReportsSnapshot',  label: 'Reports Snapshot',      desc: 'Key performance indicators showing totals at a glance.' },
              { key: 'showConversionFunnel', label: 'Conversion Funnel',     desc: 'Pipeline progress visualization showing stage-by-stage conversion.' },
            ].map(f => (
              <ToggleRow key={f.key} label={f.label} desc={f.desc}
                checked={dashboard[f.key]} onChange={v => setDashboard(p => ({ ...p, [f.key]: v }))} />
            ))}
          </CardSection>
        </Card>
      </div>
    ),

    appearance: (
      <div className="space-y-6">
        <SectionHeader icon={Palette} title="Workspace Appearance" color="violet"
          description="Customize the visual theme and layout density of your workspace interface." />

        <Card className="p-6 space-y-8">
          <CardSection label="Color Theme">
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'light',  label: 'Light',  preview: 'bg-white border-gray-300',    dot: 'bg-gray-800' },
                { value: 'dark',   label: 'Dark',   preview: 'bg-gray-900 border-gray-700', dot: 'bg-white' },
                { value: 'system', label: 'System', preview: 'bg-gradient-to-br from-white to-gray-900 border-gray-400', dot: 'bg-gray-400' },
              ].map(t => (
                <button key={t.value} onClick={() => handleAppearanceChange('theme', t.value)}
                  className={`relative flex flex-col gap-2 items-start p-4 rounded-xl border-2 transition-all text-left ${
                    appearance.theme === t.value ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}>
                  <div className={`w-full h-12 rounded-lg border ${t.preview}`}>
                    <div className={`w-3 h-3 rounded-full m-2 ${t.dot}`} />
                  </div>
                  <span className={`text-xs font-bold ${appearance.theme === t.value ? 'text-indigo-600' : 'text-gray-600'}`}>
                    {t.label}
                  </span>
                  {appearance.theme === t.value && (
                    <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center">
                      <CheckCircle2 size={10} className="text-white" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </CardSection>

          <Divider />

          <CardSection label="Layout Density">
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'comfortable', label: 'Comfortable', desc: 'More breathing room between elements' },
                { value: 'compact',     label: 'Compact',     desc: 'Tighter spacing to see more content' },
              ].map(t => (
                <button key={t.value} onClick={() => handleAppearanceChange('density', t.value)}
                  className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                    appearance.density === t.value ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}>
                  <p className={`text-sm font-bold ${appearance.density === t.value ? 'text-indigo-700' : 'text-gray-700'}`}>{t.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t.desc}</p>
                  {appearance.density === t.value && (
                    <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center">
                      <CheckCircle2 size={10} className="text-white" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </CardSection>
        </Card>
      </div>
    ),

    security: (
      <div className="space-y-6">
        <SectionHeader icon={ShieldCheck} title="Security & Access" color="emerald"
          description="Manage your account credentials, session permissions, and workspace access controls." />

        <Card className="p-6 space-y-6">
          <CardSection label="Account">
            <div className="space-y-4">
              {[
                { icon: User,  label: 'Signed-in Account', value: user?.email || 'admin@tdc.com' },
                { icon: ShieldCheck, label: 'System Role', value: 'Admin Matchmaker' },
                { icon: Globe, label: 'Session Status',    value: `Active · Last login ${user?.metadata?.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleDateString() : 'Today'}`, valueClass: 'text-emerald-600' },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-3.5 p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                    <row.icon size={16} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{row.label}</p>
                    <p className={`text-sm font-semibold mt-0.5 ${row.valueClass || 'text-gray-800'}`}>{row.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardSection>

          <Divider />

          <CardSection label="Actions">
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleResetPassword}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold text-gray-700 transition-colors">
                <KeyRound size={15} />
                Reset Password
              </button>
              <button onClick={handleSignOut}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-sm font-semibold text-red-600 transition-colors">
                <LogOut size={15} />
                Sign Out
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-3">A password reset link will be sent to your registered email address.</p>
          </CardSection>
        </Card>
      </div>
    ),

    database: (
      <div className="space-y-6">
        <SectionHeader icon={Database} title="Database Operations" color="slate"
          description="View live collection statistics and export your data in CSV or PDF format." />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Total Profiles',  value: dbStats.totalProfiles,  icon: Users,    color: 'indigo' },
            { label: 'Verified',         value: dbStats.verifiedProfiles, icon: ShieldCheck, color: 'emerald' },
            { label: 'Matches Created', value: dbStats.matchesCreated, icon: Heart,    color: 'rose' },
            { label: 'Activity Logs',   value: dbStats.activitiesLogged, icon: BarChart3, color: 'amber' },
          ].map(s => {
            const colors = {
              indigo:  'bg-indigo-50  text-indigo-600',
              emerald: 'bg-emerald-50 text-emerald-600',
              rose:    'bg-rose-50    text-rose-600',
              amber:   'bg-amber-50   text-amber-600',
            };
            return (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors[s.color]}`}>
                  <s.icon size={17} />
                </div>
                <div>
                  <p className="text-2xl font-black text-gray-900">{s.value}</p>
                  <p className="text-xs font-medium text-gray-400 mt-0.5">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        <Card className="p-6 space-y-4">
          <CardSection label="Export Data">
            <p className="text-xs text-gray-400 -mt-2 mb-4">Download a snapshot of your current data as a CSV file for analysis or backup.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { type: 'profiles',   label: 'Export Profiles',   icon: Users },
                { type: 'matches',    label: 'Export Matches',    icon: Heart },
                { type: 'activities', label: 'Export Activity Log', icon: BarChart3 },
              ].map(btn => (
                <button key={btn.type} onClick={() => handleExportCSV(btn.type)}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-sm font-semibold text-gray-700 transition-colors">
                  <Download size={14} />
                  {btn.label}
                </button>
              ))}
            </div>
          </CardSection>
        </Card>
      </div>
    ),

    health: (
      <div className="space-y-6">
        <SectionHeader icon={Activity} title="System Health" color="emerald"
          description="Real-time status of all connected services. All indicators should show Online during normal operation." />

        <Card className="p-6">
          <div className="space-y-1">
            {[
              { label: 'Firebase Database',      key: 'firebase', icon: HardDrive },
              { label: 'Groq AI API Server',     key: 'groq',     icon: Radio },
              { label: 'Authentication Module',  key: 'auth',     icon: Lock },
              { label: 'Database Read/Write',    key: 'dbConn',   icon: FileCode },
            ].map(sys => {
              const ok = health[sys.key] === 'healthy';
              const checking = health[sys.key] === 'checking';
              return (
                <div key={sys.label} className="flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${ok ? 'bg-emerald-50 text-emerald-600' : checking ? 'bg-gray-100 text-gray-400' : 'bg-red-50 text-red-500'}`}>
                      <sys.icon size={14} />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{sys.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${ok ? 'bg-emerald-500' : checking ? 'bg-gray-300 animate-pulse' : 'bg-red-500 animate-pulse'}`} />
                    <span className={`text-xs font-bold uppercase tracking-wide ${ok ? 'text-emerald-600' : checking ? 'text-gray-400' : 'text-red-500'}`}>
                      {ok ? 'Online' : checking ? 'Checking…' : 'Offline'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <Divider />

          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl border border-gray-100">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Last AI Inference</p>
              <p className="text-sm font-semibold text-gray-700 mt-0.5">{health.lastAiRequest}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Sparkles size={14} />
            </div>
          </div>
        </Card>
      </div>
    ),
  };

  const activeTabMeta = TABS.find(t => t.id === activeTab);

  return (
    <div className="flex min-h-screen bg-[#FAFAF8]">

      {/* ── Left sidebar nav ── */}
      <aside className="w-56 shrink-0 border-r border-gray-200 bg-white flex flex-col py-6 sticky top-0 h-screen overflow-y-auto">
        <div className="px-4 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Settings2 size={14} className="text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900">Settings</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1 leading-snug">System configuration &amp; preferences</p>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {TABS.map(tab => {
            const active = tab.id === activeTab;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
                  active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}>
                <tab.icon size={15} className={active ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'} />
                <span className={`text-[13px] font-${active ? 'semibold' : 'medium'} truncate`}>{tab.label}</span>
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />}
              </button>
            );
          })}
        </nav>

        {/* Save status indicator */}
        <div className="px-4 pt-4 border-t border-gray-100 mt-4">
          {hasChanges ? (
            <div className="flex items-center gap-2 text-amber-600">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[11px] font-bold">Unsaved changes</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 size={12} />
              <span className="text-[11px] font-bold">All saved</span>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto pb-28">
        <div className="max-w-2xl mx-auto px-8 py-10">
          {panels[activeTab]}
        </div>
      </main>

      {/* ── Sticky save bar ── */}
      <div className={`fixed bottom-0 left-0 right-0 h-16 bg-white/90 backdrop-blur border-t border-gray-200 px-6 flex items-center justify-between z-40 transition-all duration-200 ${
        hasChanges ? 'shadow-lg' : 'shadow-none opacity-80'
      }`}>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <SlidersHorizontal size={14} className="text-gray-400" />
          <span>Editing <span className="font-semibold text-gray-700">{activeTabMeta?.label}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleReset} disabled={!hasChanges || saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            <RotateCcw size={13} />
            Revert
          </button>
          <button onClick={handleSave} disabled={!hasChanges || saving}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm">
            {saving
              ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Save size={13} />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
