import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, MapPin, Mail, Phone, GraduationCap,
  Briefcase, Users, Star, Sparkles, RefreshCw, Edit2, Check, X,
  Calendar, Clipboard, AlertTriangle, AlertCircle, Plus, Copy,
  CheckCircle, Search, Clock, Trash2, Heart, Award, ArrowUpRight,
  UserCheck, ShieldCheck, MessageSquare, ExternalLink, HelpCircle
} from 'lucide-react';
import {
  updateCustomer, logActivity, getMeetingsForCustomer, addMeeting, deleteMeeting, getCustomers
} from '../services/firebase/firestore';
import { useCustomer } from '../hooks/useCustomer';
import { useCustomers } from '../hooks/useCustomers';
import { useNotes } from '../hooks/useNotes';
import { useActivities } from '../hooks/useActivities';
import { findMatches } from '../services/matching/engine';
import { getProfileSummary, getMatchAnalysis, getRedFlags, generateIntro } from '../services/ai';
import Badge from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import { SkeletonProfileHeader, Skeleton } from '../components/ui/Skeleton';
import NotesPanel from '../components/notes/NotesPanel';
import ActivityFeed from '../components/activity/ActivityFeed';
import SendMatchModal from '../components/matches/SendMatchModal';
import ScoreBreakdown from '../components/matches/ScoreBreakdown';
import toast from 'react-hot-toast';

const STATUSES = ['New', 'Verified', 'Match Suggested', 'Match Sent', 'Interested', 'Meeting Scheduled', 'In Discussion', 'Closed'];

const TABS = [
  { id: 'Overview', label: 'Overview Dossier' },
  { id: 'Matches', label: 'Matches Workspace' },
  { id: 'Meetings', label: 'Scheduler Workspace' },
  { id: 'Timeline', label: 'Chronicle & logs' }
];

/* ── Info field ─────────────────────────────────────────────── */
function InfoField({ label, value, icon: Icon }) {
  if (value === null || value === undefined || value === '') return null;
  const display = Array.isArray(value) ? value.join(', ') : String(value);
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 px-2 rounded-md transition-colors">
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
        {Icon && <Icon size={12} className="text-gray-400" />}
        <span>{label}</span>
      </div>
      <span className="text-xs font-bold text-gray-800 text-right max-w-[60%] truncate" title={display}>
        {display}
      </span>
    </div>
  );
}

/* ── Section block ──────────────────────────────────────────── */
function DossierCard({ icon: Icon, title, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4.5 shadow-3xs transition-all hover:shadow-2xs">
      <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-3">
        <div className="w-6.5 h-6.5 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
          <Icon size={13} className="text-gray-500" />
        </div>
        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="space-y-0.5">
        {children}
      </div>
    </div>
  );
}

/* ── Score Ring Component ───────────────────────────────────── */
function ScoreRing({ score, size = 48, strokeWidth = 3 }) {
  const r = size / 2 - strokeWidth - 2;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;

  const color = score >= 75 ? '#10B981'
              : score >= 55 ? '#3B82F6'
              : score >= 40 ? '#F59E0B'
              : '#EF4444';

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F3F4F6" strokeWidth={strokeWidth} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ fontSize: size > 40 ? '12.5px' : '10.5px', fontWeight: 800, color, lineHeight: 1 }}
      >
        <span>{score}%</span>
      </div>
    </div>
  );
}

export default function CustomerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { customer, loading, reload: reloadCustomer } = useCustomer(id);
  const { customers: allCustomers } = useCustomers();
  const { notes, loading: notesLoading, reload: reloadNotes } = useNotes(id);
  const { activities, loading: actLoading, reload: reloadActivities } = useActivities(id);

  const [activeTab, setActiveTab] = useState('Overview');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [mobileMatchDetailOpen, setMobileMatchDetailOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Meetings local state
  const [meetings, setMeetings] = useState([]);
  const [meetingsLoading, setMeetingsLoading] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    type: 'Customer Meeting',
    customerOne: '',
    customerTwo: '',
    date: '',
    startTime: '10:00',
    endTime: '11:00',
    location: 'Google Meet',
    status: 'Scheduled',
    description: '',
    createdBy: 'Admin Matchmaker'
  });

  // Matches states
  const [matches, setMatches] = useState([]);
  const [matchesComputed, setMatchesComputed] = useState(false);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [matchAnalysis, setMatchAnalysis] = useState(null);
  const [matchRedFlagsText, setMatchRedFlagsText] = useState('');
  const [matchIntroText, setMatchIntroText] = useState('');
  const [matchAILoading, setMatchAILoading] = useState({ analysis: false, flags: false, intro: false });
  const [copiedIntro, setCopiedIntro] = useState(false);
  const [sendModal, setSendModal] = useState({ open: false, match: null });

  // Load customer meetings
  const loadMeetings = useCallback(async () => {
    setMeetingsLoading(true);
    try {
      const data = await getMeetingsForCustomer(id);
      setMeetings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setMeetingsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadMeetings();
    }
  }, [id, loadMeetings]);

  const computeMatches = useCallback(() => {
    if (!customer || !allCustomers.length) return;
    setMatchesLoading(true);
    setTimeout(() => {
      const ranked = findMatches(customer, allCustomers, 12);
      setMatches(ranked);
      setMatchesComputed(true);
      setMatchesLoading(false);
      if (ranked.length > 0) {
        setSelectedMatch(ranked[0]);
      }
    }, 250);
  }, [customer, allCustomers]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'Matches' && !matchesComputed) {
      computeMatches();
    }
  };

  const handleStatusSave = async (customStatus = null) => {
    const statusVal = customStatus || newStatus;
    if (!statusVal || statusVal === customer.status) {
      setEditingStatus(false);
      return;
    }
    try {
      await updateCustomer(id, { status: statusVal });
      await logActivity(id, `Status Updated → ${statusVal}`);
      reloadCustomer();
      reloadActivities();
      setEditingStatus(false);
      toast.success(`Dossier status updated to: ${statusVal}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleAISummary = async () => {
    if (aiSummary || summaryLoading) return;
    setSummaryLoading(true);
    try {
      const data = await getProfileSummary(customer);
      setAiSummary(data.summary);
    } catch {
      setAiSummary('Unable to generate automated summary at this time.');
    } finally {
      setSummaryLoading(false);
    }
  };

  // Fetch detailed AI insights for the selected match candidate
  const loadMatchAIInsights = useCallback(async (matchItem) => {
    if (!matchItem) return;
    const { profile, score, breakdown } = matchItem;

    setMatchAnalysis(null);
    setMatchRedFlagsText('');
    setMatchIntroText('');

    setMatchAILoading({ analysis: true, flags: true, intro: false });

    // Load compatibility analysis
    getMatchAnalysis(customer, profile, score, breakdown)
      .then(res => setMatchAnalysis(res))
      .catch(() => setMatchAnalysis(null))
      .finally(() => setMatchAILoading(prev => ({ ...prev, analysis: false })));

    // Load red flags
    getRedFlags(customer, profile)
      .then(res => setMatchRedFlagsText(res.redFlags))
      .catch(() => setMatchRedFlagsText('Could not evaluate warning flags.'))
      .finally(() => setMatchAILoading(prev => ({ ...prev, flags: false })));
  }, [customer]);

  const handleGenerateIntroText = async () => {
    if (!selectedMatch || matchAILoading.intro) return;
    setMatchAILoading(prev => ({ ...prev, intro: true }));
    try {
      const res = await generateIntro(customer, selectedMatch.profile);
      setMatchIntroText(res.intro);
    } catch {
      toast.error('Failed to generate template intro message');
    } finally {
      setMatchAILoading(prev => ({ ...prev, intro: false }));
    }
  };

  // Trigger loading when selected match changes
  useEffect(() => {
    if (selectedMatch) {
      loadMatchAIInsights(selectedMatch);
    }
  }, [selectedMatch, loadMatchAIInsights]);

  // Next Action calculations
  const nextAction = useMemo(() => {
    if (!customer) return null;
    const status = customer.status;

    switch (status) {
      case 'New':
        return {
          title: 'Complete Profile Verification',
          description: 'Step 1 of the matchmaker pipeline. Review demographics, verification notes, and align details before activation.',
          primaryLabel: 'Verify & Activate Client',
          primaryAction: () => handleStatusSave('Verified'),
          icon: ShieldCheck,
          color: 'indigo'
        };
      case 'Verified':
        return {
          title: 'Discover Candidate Matches',
          description: 'Client is active. Calculate compatibility scores, review matching coefficients, and suggest proposals.',
          primaryLabel: 'Open Matching Board',
          primaryAction: () => handleTabChange('Matches'),
          icon: Sparkles,
          color: 'emerald'
        };
      case 'Match Suggested':
        return {
          title: 'Propose Selected Matches',
          description: 'Compatible proposals have been generated. Review and dispatch matching profiles to the client.',
          primaryLabel: 'Review Matches Suggestions',
          primaryAction: () => handleTabChange('Matches'),
          icon: Award,
          color: 'amber'
        };
      case 'Match Sent':
        return {
          title: 'Awaiting Proposal Approval',
          description: 'Suggestions have been sent to the client. Call/email to collect approval feedback and schedule discussions.',
          primaryLabel: 'Mark Mutual Interest Confirmed',
          primaryAction: () => handleStatusSave('Interested'),
          secondaryLabel: 'Log Call Notes',
          secondaryAction: () => {
            document.getElementById('notes-section-trigger')?.scrollIntoView({ behavior: 'smooth' });
          },
          icon: MessageSquare,
          color: 'purple'
        };
      case 'Interested':
        return {
          title: 'Schedule Introduction Call/Meeting',
          description: 'Both clients confirmed interest. Arrange a safe, virtual meet-up or coordinate coffee introduction dates.',
          primaryLabel: 'Create Meeting Invitation',
          primaryAction: () => {
            setMeetingForm({
              title: `Introduction: ${customer.firstName} & Match`,
              type: 'Customer Meeting',
              customerOne: customer.id,
              customerTwo: '',
              date: new Date().toISOString().split('T')[0],
              startTime: '11:00',
              endTime: '12:00',
              location: 'Google Meet',
              status: 'Scheduled',
              description: `Mutual interest introduction call scheduled for ${customer.firstName}.`,
              createdBy: 'Admin Matchmaker'
            });
            setShowMeetingModal(true);
          },
          icon: Calendar,
          color: 'pink'
        };
      case 'Meeting Scheduled':
        return {
          title: 'Prepare Clients & Collect Post-Meeting Logs',
          description: 'Meeting scheduled. Reach out to coordinate final timings. Once the meeting concludes, record notes and feedback.',
          primaryLabel: 'Go to Chronicle & Notes',
          primaryAction: () => {
            document.getElementById('notes-section-trigger')?.scrollIntoView({ behavior: 'smooth' });
          },
          icon: Clock,
          color: 'blue'
        };
      case 'In Discussion':
        return {
          title: 'Evaluate Relationship Pipeline Progress',
          description: 'Couple is currently communicating. Follow up regularly. If successful, proceed to closure; otherwise, return to matching.',
          primaryLabel: 'Complete Match & Archive',
          primaryAction: () => handleStatusSave('Closed'),
          secondaryLabel: 'Reactivate Search',
          secondaryAction: () => handleStatusSave('Verified'),
          icon: Heart,
          color: 'teal'
        };
      case 'Closed':
        return {
          title: 'Relationship Dossier Archived',
          description: 'Client is closed. Relational intelligence cycle completed. Reactivate if they re-engage.',
          primaryLabel: 'Reactivate Profile',
          primaryAction: () => handleStatusSave('Verified'),
          icon: UserCheck,
          color: 'gray'
        };
      default:
        return null;
    }
  }, [customer]);

  // Opposite gender candidates list for booking meeting
  const partnerCandidates = useMemo(() => {
    if (!customer || !allCustomers.length) return [];
    const oppositeGender = customer.gender === 'Male' ? 'Female' : 'Male';
    return allCustomers
      .filter(c => c.gender === oppositeGender && c.id !== customer.id)
      .sort((a,b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
  }, [customer, allCustomers]);

  // Form Saving for new meeting
  const handleSaveMeeting = async (e) => {
    e.preventDefault();
    if (!meetingForm.title || !meetingForm.date || !meetingForm.customerOne) {
      toast.error('Required fields missing.');
      return;
    }

    try {
      await addMeeting(meetingForm);
      await logActivity(meetingForm.customerOne, `Scheduled meeting: "${meetingForm.title}" on ${meetingForm.date}`);
      if (meetingForm.customerTwo) {
        await logActivity(meetingForm.customerTwo, `Scheduled meeting: "${meetingForm.title}" on ${meetingForm.date}`);
      }
      
      // Update status if in transition
      if (customer.status === 'Interested') {
        await updateCustomer(id, { status: 'Meeting Scheduled' });
        reloadCustomer();
      }

      toast.success('Meeting scheduled successfully!');
      setShowMeetingModal(false);
      loadMeetings();
      reloadActivities();
    } catch (err) {
      console.error(err);
      toast.error('Failed to create meeting.');
    }
  };

  const handleCancelMeeting = async (meetingId) => {
    if (!window.confirm('Cancel this scheduled meeting?')) return;
    try {
      await deleteMeeting(meetingId);
      await logActivity(id, `Cancelled scheduled meeting`);
      toast.success('Meeting cancelled.');
      loadMeetings();
      reloadActivities();
    } catch {
      toast.error('Failed to cancel meeting.');
    }
  };

  const formatIncome = (income) =>
    income ? `₹${Number(income).toLocaleString('en-IN')} / yr` : '—';

  const formatBirthday = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="bg-[#FAFAF9] min-h-screen">
        <div className="px-8 pt-6 pb-3">
          <button className="btn btn-ghost btn-sm gap-1.5 text-gray-500 -ml-2 mb-4" onClick={() => navigate('/customers')}>
            <ArrowLeft size={14} /> Back
          </button>
        </div>
        <div className="px-8">
          <SkeletonProfileHeader />
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="bg-[#FAFAF9] min-h-screen flex items-center justify-center p-8">
        <div className="card max-w-sm w-full p-8 text-center bg-white shadow-xs">
          <AlertCircle size={36} className="text-gray-300 mx-auto mb-4" />
          <h2 className="text-sm font-bold text-gray-800">Dossier Not Found</h2>
          <p className="text-xs text-gray-400 mt-2 leading-relaxed">
            The profile client record does not exist or was removed from Firestore.
          </p>
          <button className="btn btn-primary btn-sm mt-5 mx-auto" onClick={() => navigate('/customers')}>
            Back to Customer Directory
          </button>
        </div>
      </div>
    );
  }

  const borderColors = {
    indigo: 'border-indigo-150 bg-indigo-50/20 text-indigo-800',
    emerald: 'border-emerald-150 bg-emerald-50/20 text-emerald-800',
    amber: 'border-amber-150 bg-amber-50/20 text-amber-800',
    purple: 'border-purple-150 bg-purple-50/20 text-purple-800',
    pink: 'border-pink-150 bg-pink-50/20 text-pink-800',
    blue: 'border-blue-150 bg-blue-50/20 text-blue-800',
    teal: 'border-teal-150 bg-teal-50/20 text-teal-800',
    gray: 'border-gray-200 bg-gray-50 text-gray-800'
  };

  const actionText = nextAction ? borderColors[nextAction.color] || borderColors.gray : borderColors.gray;

  return (
    <div className="bg-[#FAFAF9] min-h-screen">
      {/* ── Page header ────────────────────────────────────── */}
      <div className="px-4 sm:px-8 pt-6 pb-0 border-b border-gray-200 bg-white">
        <button
          className="btn btn-ghost btn-sm gap-1.5 text-gray-400 -ml-2 mb-4 hover:text-gray-700"
          onClick={() => navigate('/customers')}
        >
          <ArrowLeft size={14} /> Back to Directory
        </button>

        {/* Profile Header Block */}
        <div className="flex flex-col gap-4 pb-6">
          {/* Top row: avatar + identity + status badges */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4">
            <Avatar
              name={`${customer.firstName} ${customer.lastName}`}
              photo={customer.photo}
              size="xl"
              className="ring-4 ring-gray-50 shadow-sm rounded-xl flex-shrink-0"
            />
            <div className="space-y-1 flex-1 min-w-0 flex flex-col items-center sm:items-start w-full">
              <div className="flex items-center gap-3.5 flex-wrap justify-center sm:justify-start">
                <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-none">
                  {customer.firstName} {customer.lastName}
                </h1>
                <div className="flex items-center gap-2">
                  {editingStatus ? (
                    <div className="flex items-center gap-1.5">
                      <select
                        className="input input-sm py-0.5 px-2 border-gray-300 text-xs w-auto bg-white font-semibold"
                        value={newStatus}
                        onChange={e => setNewStatus(e.target.value)}
                        autoFocus
                      >
                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                      <button onClick={() => handleStatusSave(null)} className="btn btn-primary btn-xs font-bold px-2 py-1">
                        Save
                      </button>
                      <button onClick={() => setEditingStatus(false)} className="btn btn-secondary btn-xs px-2 py-1">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Badge status={customer.status} size="sm" />
                      <button
                        onClick={() => { setNewStatus(customer.status); setEditingStatus(true); }}
                        className="w-5 h-5 rounded hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-800 transition-colors"
                        title="Update Client Status"
                      >
                        <Edit2 size={10.5} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500 font-medium justify-center sm:justify-start">
                <span>{customer.designation || 'Specialist'}</span>
                {customer.company && (
                  <>
                    <span className="text-gray-300">·</span>
                    <span>{customer.company}</span>
                  </>
                )}
                {customer.city && (
                  <>
                    <span className="text-gray-300">·</span>
                    <span className="flex items-center gap-1 text-gray-400">
                      <MapPin size={10.5} /> {customer.city}
                    </span>
                  </>
                )}
              </div>

              {/* Tag Badges row */}
              <div className="flex flex-wrap gap-1.5 mt-2 justify-center sm:justify-start">
                <span className="px-2 py-0.5 bg-gray-50 border border-gray-150 text-gray-500 rounded-full text-[10.5px] font-bold">
                  {customer.age} yrs
                </span>
                <span className="px-2 py-0.5 bg-gray-50 border border-gray-150 text-gray-500 rounded-full text-[10.5px] font-bold">
                  {customer.height || '—'}
                </span>
                <span className="px-2 py-0.5 bg-gray-50 border border-gray-150 text-gray-500 rounded-full text-[10.5px] font-bold font-sans">
                  {customer.maritalStatus}
                </span>
                <span className="px-2 py-0.5 bg-gray-50 border border-gray-150 text-gray-500 rounded-full text-[10.5px] font-bold">
                  {customer.religion}
                </span>
                {customer.income && (
                  <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full text-[10.5px] font-bold font-mono">
                    {formatIncome(customer.income)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* AI Executive Brief — full-width below profile */}
          {aiSummary ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              style={{
                background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 50%, #fdf4ff 100%)',
                border: '1px solid rgba(99,102,241,0.18)',
                borderRadius: '14px',
                padding: '14px 18px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* decorative orb */}
              <div style={{
                position: 'absolute', top: '-18px', right: '-18px',
                width: '80px', height: '80px',
                background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)',
                borderRadius: '50%', pointerEvents: 'none'
              }} />

              <div className="flex items-start gap-3 relative">
                {/* icon badge */}
                <div style={{
                  width: '30px', height: '30px', flexShrink: 0,
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(99,102,241,0.35)'
                }}>
                  <Sparkles size={14} color="white" />
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  {/* header row */}
                  <div className="flex items-center gap-2">
                    <span style={{
                      fontSize: '9px', fontWeight: 800, letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      background: 'linear-gradient(90deg,#6366f1,#8b5cf6)',
                      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>AI Executive Brief</span>
                    <span style={{
                      fontSize: '9px', fontWeight: 700, color: '#6366f1',
                      background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                      borderRadius: '4px', padding: '1px 6px', letterSpacing: '0.04em'
                    }}>Gemini AI · Confidential</span>
                  </div>

                  {/* brief text */}
                  <p style={{
                    fontSize: '12px', lineHeight: '1.7', color: '#374151', fontWeight: 500,
                  }}>
                    {aiSummary}
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <div
              style={{
                background: 'linear-gradient(135deg, #f8faff 0%, #faf8ff 100%)',
                border: '1.5px dashed rgba(99,102,241,0.25)',
                borderRadius: '14px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div style={{
                width: '30px', height: '30px', flexShrink: 0,
                background: 'rgba(99,102,241,0.08)',
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Sparkles size={13} color="#6366f1" />
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, margin: 0 }}>
                  Generate a real-time AI personality brief for this client — used in match appeals and dossier summaries.
                </p>
              </div>
              <button
                onClick={handleAISummary}
                disabled={summaryLoading}
                className="btn btn-secondary btn-xs gap-1.5 shadow-3xs hover:border-indigo-200 flex-shrink-0"
              >
                {summaryLoading ? (
                  <span className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Sparkles size={11} className="text-indigo-600" />
                )}
                Analyze Client
              </button>
            </div>
          )}
        </div>

        {/* Tab System bar */}
        <div className="tab-list">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`tab-item pb-3 font-semibold relative ${activeTab === tab.id ? 'active text-gray-900' : 'text-gray-500 hover:text-gray-800'}`}
              onClick={() => handleTabChange(tab.id)}
            >
              {tab.label}
              {tab.id === 'Matches' && matchesComputed && matches.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-[9.5px] bg-indigo-50 border border-indigo-100 text-indigo-600 rounded font-bold">
                  {matches.length}
                </span>
              )}
              {tab.id === 'Meetings' && meetings.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-[9.5px] bg-blue-50 border border-blue-100 text-blue-600 rounded font-bold">
                  {meetings.length}
                </span>
              )}
              {activeTab === tab.id && (
                <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main content area ────────────────────────────────── */}
      <div className="px-4 sm:px-8 py-6 w-full">
        
        {/* Next Action Box - persistent workspace helper */}
        {nextAction && (
          <div className={`border p-4.5 rounded-xl mb-6 shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:shadow-2xs ${actionText}`}>
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-white/75 flex items-center justify-center flex-shrink-0 mt-0.5">
                <nextAction.icon size={16} className="opacity-90" />
              </div>
              <div className="space-y-1">
                <h4 className="text-[13px] font-bold uppercase tracking-wide opacity-95">What should I do next?</h4>
                <p className="text-xs font-semibold leading-relaxed opacity-85">{nextAction.title} — {nextAction.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto flex-shrink-0">
              {nextAction.secondaryLabel && (
                <button
                  onClick={nextAction.secondaryAction}
                  className="btn btn-secondary btn-sm bg-white/90 font-bold border-transparent hover:bg-white text-gray-800"
                >
                  {nextAction.secondaryLabel}
                </button>
              )}
              <button
                onClick={nextAction.primaryAction}
                className="btn btn-primary btn-sm font-bold shadow-xs bg-gray-900 hover:bg-gray-950 text-white border-transparent"
              >
                {nextAction.primaryLabel}
              </button>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          
          {/* TAB 1: OVERVIEW DOSSIER */}
          {activeTab === 'Overview' && (
            <motion.div
              key="Overview"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              {/* Left Column: Dossiers and Demographics */}
              <div className="lg:col-span-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DossierCard icon={Users} title="Personal & Heritage">
                    <InfoField label="Date of Birth" value={formatBirthday(customer.dateOfBirth)} />
                    <InfoField label="Age" value={customer.age ? `${customer.age} years` : null} />
                    <InfoField label="Gender" value={customer.gender} />
                    <InfoField label="Height" value={customer.height} />
                    <InfoField label="Marital Status" value={customer.maritalStatus} />
                    <InfoField label="Languages Spoken" value={customer.languages} />
                  </DossierCard>

                  <DossierCard icon={GraduationCap} title="Professional Profile">
                    <InfoField label="Designation" value={customer.designation} />
                    <InfoField label="Company / Employer" value={customer.company} />
                    <InfoField label="Annual Income" value={formatIncome(customer.income)} />
                    <InfoField label="Education Degree" value={customer.degree} />
                    <InfoField label="College / University" value={customer.college} />
                  </DossierCard>

                  <DossierCard icon={Award} title="Beliefs & Social Coordinates">
                    <InfoField label="Religion" value={customer.religion} />
                    <InfoField label="Caste" value={customer.caste} />
                    <InfoField label="Family Structure" value={customer.familyType} />
                    <InfoField label="Siblings Detail" value={customer.siblings} />
                  </DossierCard>

                  <DossierCard icon={Star} title="Lifestyle & Beliefs">
                    <InfoField label="Dietary Preference" value={customer.diet} />
                    <InfoField label="Hobbies & Interests" value={customer.hobbies} />
                    <InfoField label="Pets Allowed" value={customer.pets} />
                    <InfoField label="Smoking Frequency" value={customer.smoking} />
                    <InfoField label="Drinking Habit" value={customer.drinking} />
                    <InfoField label="Open to Relocation" value={customer.relocate} />
                    <InfoField label="Opinion on Kids" value={customer.wantKids} />
                  </DossierCard>
                </div>

                {/* Additional CRM details cards */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-3xs">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-4">
                    <Mail size={14} className="text-gray-400" />
                    <h3 className="text-xs font-bold text-gray-800">Matchmaker Verification Parameters</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg">
                      <p className="text-[10px] text-gray-400 uppercase font-bold">Email Address</p>
                      <p className="text-xs font-bold text-gray-700 mt-1">{customer.email || 'None provided'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg">
                      <p className="text-[10px] text-gray-400 uppercase font-bold">Phone Connection</p>
                      <p className="text-xs font-bold text-gray-700 mt-1">{customer.phone || 'None provided'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Interaction Chronicle & Notes */}
              <div className="lg:col-span-4 space-y-6" id="notes-section-trigger">
                {/* Notes Workspace */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
                  <div className="px-4.5 py-4 border-b border-gray-150 flex items-center justify-between bg-gray-50">
                    <div>
                      <h3 className="text-xs font-bold text-gray-800">Matchmaker Workspace Notes</h3>
                      <p className="text-[9.5px] text-gray-400 font-semibold mt-0.5">Interaction details and client briefs</p>
                    </div>
                  </div>
                  <div className="p-4.5">
                    <NotesPanel
                      customerId={id}
                      notes={notes}
                      loading={notesLoading}
                      onNotesChange={reloadNotes}
                    />
                  </div>
                </div>

                 {/* Micro activities feed */}
                 <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                   <div className="px-4.5 py-4 border-b border-gray-150 flex items-center justify-between bg-gray-50">
                    <h3 className="text-xs font-bold text-gray-800">Dossier Activity Audit</h3>
                  </div>
                  <div className="p-4.5">
                    <ActivityFeed activities={activities.slice(0, 5)} loading={actLoading} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: MATCHES WORKSPACE SPLIT PANE */}
          {activeTab === 'Matches' && (
            <motion.div
              key="Matches"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full"
            >
              {matchesLoading ? (
                <div className="lg:col-span-12 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col items-center justify-center py-20">
                  <span className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-gray-400 font-semibold mt-3">Computing weighted alignment scores...</p>
                </div>
              ) : !matchesComputed ? (
                <div className="lg:col-span-12 bg-white border border-gray-200 rounded-2xl shadow-sm py-20 text-center max-w-sm mx-auto px-6">
                  <Heart size={36} className="text-red-400 mx-auto mb-4 animate-pulse" />
                  <h3 className="text-sm font-bold text-gray-800">Find Compatible Candidates</h3>
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                    Compute matchmaking compatibility using the algorithmic engine, matching religio-demographic traits, lifestyles, and preferences.
                  </p>
                  <button onClick={computeMatches} className="btn btn-accent btn-sm mt-5 gap-1.5 font-bold shadow-xs">
                    <Sparkles size={13} /> Compute Compatibility Matches
                  </button>
                </div>
              ) : matches.length === 0 ? (
                <div className="lg:col-span-12 bg-white border border-gray-200 rounded-2xl shadow-sm py-20 text-center">
                  <p className="text-xs text-gray-400">No compatible match found inside database constraints.</p>
                </div>
              ) : (
                <>
                  {/* Left Column: Match Candidates List */}
                  {(!isMobile || !mobileMatchDetailOpen) && (
                    <div className="lg:col-span-4 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col max-h-[800px] overflow-hidden sticky top-6 w-full">
                      <div className="p-4 bg-gray-50/75 border-b border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Compatible Matches</span>
                          <span className="px-1.5 py-0.5 text-[9px] bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-md font-bold">
                            {matches.length}
                          </span>
                        </div>
                        <button onClick={computeMatches} className="p-1.5 hover:bg-gray-250/60 rounded-lg text-gray-400 hover:text-gray-700 transition-colors" title="Regenerate Compatibility Engine">
                          <RefreshCw size={12.5} />
                        </button>
                      </div>

                      <div className="divide-y divide-gray-100 overflow-y-auto flex-1">
                        {matches.map((item, idx) => {
                          const { profile, score, label } = item;
                          const isSelected = selectedMatch?.profile.id === profile.id;
                          
                          return (
                            <div
                              key={profile.id}
                              onClick={() => {
                                setSelectedMatch(item);
                                if (isMobile) {
                                  setMobileMatchDetailOpen(true);
                                }
                              }}
                            className={`p-4 flex items-center gap-3.5 cursor-pointer transition-all duration-150 border-l-4 ${
                              isSelected
                                ? 'bg-indigo-50/15 border-indigo-650 shadow-[inset_1px_0_0_0_rgba(99,102,241,0.08)]'
                                : 'border-transparent hover:bg-gray-50/40'
                            }`}
                          >
                            <ScoreRing score={score} size={42} strokeWidth={2.5} />
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-950' : 'text-gray-800'}`}>{profile.firstName} {profile.lastName}</p>
                                <span className={`text-[8.5px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                                  score >= 75
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                    : score >= 55
                                      ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                      : 'bg-amber-50 text-amber-700 border border-amber-100'
                                }`}>
                                  {label}
                                </span>
                              </div>
                              
                              <p className="text-[10.5px] text-gray-400 truncate mt-0.5 font-medium">{profile.designation}</p>
                              
                              <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400 font-semibold">
                                <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 font-bold">{profile.age} yrs</span>
                                <span>·</span>
                                <span className="truncate">{profile.city}</span>
                                <span>·</span>
                                <span>{profile.religion}</span>
                              </div>
                            </div>
                          </div>
                        );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Right Column: Active Match AI Intelligence & Action Panel */}
                  {(!isMobile || mobileMatchDetailOpen) && (
                    <div className="lg:col-span-8 flex flex-col gap-6 max-h-[800px] overflow-y-auto pr-1 w-full">
                      {isMobile && mobileMatchDetailOpen && (
                        <button
                          onClick={() => setMobileMatchDetailOpen(false)}
                          className="btn btn-secondary btn-sm mb-4 gap-1.5 w-fit"
                        >
                          ← Back to Candidates List
                        </button>
                      )}
                      {selectedMatch ? (
                      <div className="space-y-6">
                        
                        {/* Profile Hero card */}
                        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center gap-5 relative overflow-hidden bg-gradient-to-br from-indigo-50/30 via-purple-50/10 to-white">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-200/10 to-purple-200/10 rounded-full blur-2xl pointer-events-none" />
                          
                          <Avatar
                            name={`${selectedMatch.profile.firstName} ${selectedMatch.profile.lastName}`}
                            photo={selectedMatch.profile.photo}
                            size="xl"
                            className="ring-4 ring-white shadow-md rounded-xl"
                          />
                          <div className="flex-1 min-w-0 text-center sm:text-left z-10 w-full">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2 justify-center sm:justify-start">
                                  <h3 className="text-base font-bold text-gray-900 tracking-tight">
                                    {selectedMatch.profile.firstName} {selectedMatch.profile.lastName}
                                  </h3>
                                  <a
                                    href={`/customers/${selectedMatch.profile.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-400 hover:text-indigo-650 transition-colors"
                                    title="View Candidate Dossier"
                                  >
                                    <ArrowUpRight size={14} />
                                  </a>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5 font-medium">{selectedMatch.profile.designation} at <span className="font-semibold text-gray-700">{selectedMatch.profile.company || 'Private Corporation'}</span></p>
                              </div>
                              <button
                                onClick={() => setSendModal({ open: true, match: selectedMatch })}
                                className="btn btn-accent btn-sm gap-1.5 font-bold shadow-xs hover:scale-[1.01] transition-transform"
                              >
                                <ArrowUpRight size={13} className="stroke-[3px]" />
                                <span>Send Proposal Match</span>
                              </button>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 mt-4 text-[10px] font-bold justify-center sm:justify-start">
                              <span className="px-2.5 py-1 bg-blue-50/70 text-blue-700 border border-blue-100/70 rounded-lg">{selectedMatch.profile.religion} ({selectedMatch.profile.caste})</span>
                              <span className="px-2.5 py-1 bg-purple-50/70 text-purple-700 border border-purple-100/70 rounded-lg">{selectedMatch.profile.maritalStatus}</span>
                              <span className="px-2.5 py-1 bg-amber-50/70 text-amber-700 border border-amber-100/70 rounded-lg">{selectedMatch.profile.height}</span>
                              {selectedMatch.profile.income && <span className="px-2.5 py-1 bg-emerald-50/70 text-emerald-700 border border-emerald-100/70 rounded-lg font-mono">{formatIncome(selectedMatch.profile.income)}</span>}
                            </div>
                          </div>
                        </div>

                        {/* Quantitative matching breakdown */}
                        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
                          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Algorithmic Match Breakdowns</h4>
                          </div>
                          <ScoreBreakdown
                            breakdown={selectedMatch.breakdown}
                            className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4"
                          />
                        </div>

                        {/* Qualitative AI compatibility reasoning */}
                        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-5">
                          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h4 className="text-[10.5px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                              <Sparkles size={12} className="text-indigo-500" />
                              AI Compatibility Intelligence
                            </h4>
                            <span className="text-[9px] font-bold bg-indigo-50 border border-indigo-100 text-indigo-650 rounded px-1.5 py-0.5 uppercase tracking-wide">
                              Simulation Active
                            </span>
                          </div>
                          {matchAILoading.analysis ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-2">
                              <span className="w-6 h-6 border-2 border-indigo-650 border-t-transparent rounded-full animate-spin" />
                              <span className="text-xs text-gray-400 font-semibold">Running compatibility simulation...</span>
                            </div>
                          ) : matchAnalysis ? (
                            <div className="space-y-5">
                              {/* Executive Summary */}
                              {matchAnalysis.summary && (
                                <div className="border-l-4 border-indigo-500 pl-4 py-1">
                                  <p className="text-[12.5px] text-gray-700 leading-relaxed font-semibold italic">
                                    "{matchAnalysis.summary}"
                                  </p>
                                </div>
                              )}

                              {/* Strengths & Concerns Grid */}
                              {(matchAnalysis.strengths?.length > 0 || matchAnalysis.concerns?.length > 0) && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {matchAnalysis.strengths?.length > 0 && (
                                    <div className="bg-emerald-50/20 border border-emerald-100/70 p-4.5 rounded-xl space-y-3">
                                      <p className="text-[9.5px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        Strengths & Shared Values
                                      </p>
                                      <div className="space-y-2.5">
                                        {matchAnalysis.strengths.map((s, idx) => (
                                          <div key={idx} className="flex items-start gap-2">
                                            <div className="w-4 h-4 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                                              <Check size={9} className="text-emerald-600" strokeWidth={3} />
                                            </div>
                                            <span className="text-[11.5px] text-gray-700 font-semibold leading-snug">{s}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {matchAnalysis.concerns?.length > 0 && (
                                    <div className="bg-amber-50/20 border border-amber-100/70 p-4.5 rounded-xl space-y-3">
                                      <p className="text-[9.5px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                        Areas to Discuss
                                      </p>
                                      <div className="space-y-2.5">
                                        {matchAnalysis.concerns.map((c, idx) => (
                                          <div key={idx} className="flex items-start gap-2">
                                            <div className="w-4 h-4 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                                              <span className="text-amber-655 text-[10px] font-extrabold leading-none">•</span>
                                            </div>
                                            <span className="text-[11.5px] text-gray-700 font-semibold leading-snug">{c}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Recommendation Callout */}
                              {matchAnalysis.recommendation && (
                                <div className="p-4 bg-gradient-to-r from-indigo-50/60 via-purple-50/30 to-indigo-50/40 border border-indigo-100 rounded-xl flex items-center justify-between gap-4 shadow-3xs">
                                  <div className="min-w-0 space-y-0.5">
                                    <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider">AI Matching Strategy Advisory</p>
                                    <p className="text-xs text-indigo-950 font-bold leading-normal">{matchAnalysis.recommendation}</p>
                                  </div>
                                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-650 flex items-center justify-center flex-shrink-0 shadow-3xs">
                                    <Sparkles size={14} />
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 font-semibold italic">
                              AI Alignment assessment not loaded.
                            </p>
                          )}
                        </div>

                        {/* Risk evaluation panel */}
                        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-3">
                          <div className="flex items-center gap-1.5 border-b border-gray-100 pb-2.5">
                            <AlertTriangle size={13} className="text-amber-500" />
                            <h4 className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                              Lifestyle Mismatch Warning Assessment
                            </h4>
                          </div>
                          {matchAILoading.flags ? (
                            <div className="flex items-center gap-2 py-2">
                              <span className="w-3.5 h-3.5 border-2 border-amber-550 border-t-transparent rounded-full animate-spin" />
                              <span className="text-xs text-gray-400 font-semibold">Cross-referencing constraints...</span>
                            </div>
                          ) : matchRedFlagsText ? (
                            <div className="p-4 bg-amber-50/30 border border-amber-100/60 rounded-xl flex items-start gap-3">
                              <AlertCircle size={16} className="text-amber-650 mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-amber-950 leading-relaxed font-semibold">
                                {matchRedFlagsText}
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 font-medium italic">
                              No risk evaluation present.
                            </p>
                          )}
                        </div>

                        {/* Personalized Template Message Generator */}
                        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
                          <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">AI Icebreaker Proposal Draft</h4>
                            {!matchIntroText && !matchAILoading.intro && (
                              <button
                                onClick={handleGenerateIntroText}
                                className="btn btn-ghost btn-xs text-indigo-650 font-bold hover:bg-indigo-50"
                              >
                                Generate Icebreaker
                              </button>
                            )}
                          </div>

                          {matchAILoading.intro ? (
                            <div className="flex items-center gap-2 py-2">
                              <span className="w-3.5 h-3.5 border-2 border-indigo-650 border-t-transparent rounded-full animate-spin" />
                              <span className="text-xs text-gray-400 font-semibold">Generating customized introductory icebreaker...</span>
                            </div>
                          ) : matchIntroText ? (
                            <div className="p-4 bg-gray-50/50 border border-gray-200 rounded-xl relative group/copy bg-gradient-to-br from-gray-50/80 to-white shadow-3xs">
                              <p className="text-xs text-gray-700 leading-relaxed italic pr-10 font-medium">
                                "{matchIntroText}"
                              </p>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(matchIntroText);
                                  setCopiedIntro(true);
                                  setTimeout(() => setCopiedIntro(false), 2000);
                                }}
                                className="absolute top-3 right-3 w-7 h-7 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-all shadow-3xs hover:shadow-2xs active:scale-95"
                              >
                                {copiedIntro ? <CheckCircle size={13} className="text-emerald-500" /> : <Copy size={12} />}
                              </button>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 font-medium">Generate a personalized draft introducing {selectedMatch.profile.firstName} to {customer.firstName}.</p>
                          )}
                        </div>

                      </div>
                    ) : (
                      <div className="bg-white border border-gray-200 rounded-2xl flex items-center justify-center h-[400px] text-center p-8 shadow-sm">
                        <p className="text-xs text-gray-400 font-medium">Select a candidate on the left to analyze alignment parameters.</p>
                      </div>
                    )}
                  </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* TAB 3: SCHEDULER WORKSPACE */}
          {activeTab === 'Meetings' && (
            <motion.div
              key="Meetings"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-6"
            >
              {/* Controls bar */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-gray-800">Appointments Coordinator</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Manage virtual and physical dates scheduled for this client</p>
                </div>
                <button
                  onClick={() => {
                    setMeetingForm({
                      title: `Introduction Date: ${customer.firstName} & `,
                      type: 'Customer Meeting',
                      customerOne: customer.id,
                      customerTwo: '',
                      date: new Date().toISOString().split('T')[0],
                      startTime: '16:00',
                      endTime: '17:00',
                      location: 'Google Meet',
                      status: 'Scheduled',
                      description: '',
                      createdBy: 'Admin Matchmaker'
                    });
                    setShowMeetingModal(true);
                  }}
                  className="btn btn-primary btn-sm gap-1.5 shadow-xs font-bold"
                >
                  <Plus size={13} /> Add Scheduled Event
                </button>
              </div>

              {/* Meetings List */}
              {meetingsLoading ? (
                <div className="space-y-3">
                  {[1,2].map(i => <Skeleton key={i} className="h-16 rounded-xl w-full" />)}
                </div>
              ) : meetings.length === 0 ? (
                <div className="bg-white border border-gray-200 border-dashed rounded-xl p-16 text-center">
                  <Calendar size={28} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-xs text-gray-500 font-bold">No active meetings scheduled</p>
                  <p className="text-[11px] text-gray-400 mt-1 max-w-xs mx-auto leading-relaxed">
                    Log introductory coffee dates or virtual video calls directly from the Scheduler workspace.
                  </p>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-150 shadow-3xs overflow-hidden">
                  {meetings.map(meet => {
                    const isUpcoming = new Date(`${meet.date}T${meet.startTime}`) >= new Date();
                    return (
                      <div key={meet.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/40 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className={`p-2.5 rounded-lg border flex-shrink-0 ${
                            isUpcoming ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-gray-50 border-gray-100 text-gray-400'
                          }`}>
                            <Calendar size={16} />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-gray-800 flex items-center gap-2">
                              {meet.title}
                              {!isUpcoming && <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Past</span>}
                            </h4>
                            
                            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10.5px] text-gray-400 font-semibold">
                              <span className="flex items-center gap-1">
                                <Clock size={10} />
                                {meet.date} at {meet.startTime}
                              </span>
                              <span>·</span>
                              <span className="flex items-center gap-1">
                                <MapPin size={10} />
                                {meet.location || 'Virtual Coordinator'}
                              </span>
                            </div>

                            {meet.description && (
                              <p className="text-[11.5px] text-gray-500 italic mt-1.5 leading-relaxed">
                                "{meet.description}"
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Meeting Actions */}
                        <div className="flex items-center gap-3 self-end sm:self-auto">
                          <button
                            onClick={() => handleCancelMeeting(meet.id)}
                            className="btn btn-secondary border-red-100 text-red-500 hover:bg-red-50 btn-xs font-bold shadow-3xs"
                          >
                            <Trash2 size={11} /> Cancel
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 4: TIMELINE & CHRONICLE */}
          {activeTab === 'Timeline' && (
            <motion.div
              key="Timeline"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              {/* Detailed Operational Timeline */}
              <div className="lg:col-span-7 bg-white border border-gray-200 rounded-xl p-5 shadow-3xs space-y-4">
                <h3 className="text-xs font-bold text-gray-800">Dossier Audit & Logs Timeline</h3>
                <ActivityFeed activities={activities} loading={actLoading} />
              </div>

              {/* CRM note archive */}
              <div className="lg:col-span-5 bg-white border border-gray-200 rounded-xl p-5 shadow-3xs space-y-4">
                <h3 className="text-xs font-bold text-gray-800">Notes Archive Repository</h3>
                <p className="text-[11px] text-gray-400 leading-relaxed font-semibold">
                  A structured listing of all recorded matchmaker interaction logs.
                </p>
                <div className="divider" />
                
                {notesLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-14 rounded-lg w-full" />
                    <Skeleton className="h-14 rounded-lg w-full" />
                  </div>
                ) : notes.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center">No recorded note files in registry.</p>
                ) : (
                  <div className="space-y-3">
                    {notes.map(note => (
                      <div key={note.id} className="p-3 bg-gray-50 border border-gray-150 rounded-lg text-xs leading-relaxed text-gray-700">
                        <p className="font-semibold text-gray-800">{note.note}</p>
                        <div className="flex justify-between items-center text-[9px] text-gray-400 font-bold mt-2 pt-1.5 border-t border-gray-200/50">
                          <span>Recorded by {note.createdBy || 'Matchmaker'}</span>
                          <span>
                            {note.createdAt?.toDate ? note.createdAt.toDate().toLocaleDateString() : 'Recent'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── Internal Booking Scheduler Modal ────────────────── */}
      <AnimatePresence>
        {showMeetingModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] animate-scale-in"
            >
              <div className="px-6 py-5 border-b border-gray-150 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-650 flex-shrink-0">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 tracking-tight">Schedule Matchmaking Date</h3>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">Pre-locked to customer {customer.firstName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMeetingModal(false)}
                  className="w-8 h-8 rounded-lg hover:bg-gray-150 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveMeeting} className="flex-1 overflow-y-auto p-6 space-y-4">
                <div>
                  <label className="text-label mb-1.5 block">Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Priya & Aarav Coffee Date"
                    className="input w-full text-sm"
                    value={meetingForm.title}
                    onChange={e => setMeetingForm(p => ({ ...p, title: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-label mb-1.5 block">Client One (Host)</label>
                    <input
                      type="text"
                      disabled
                      className="input w-full bg-gray-100/75 border-gray-200 text-gray-700 font-semibold cursor-not-allowed select-none opacity-90"
                      value={`${customer.firstName} ${customer.lastName}`}
                    />
                  </div>

                  <div>
                    <label className="text-label mb-1.5 block">Client Two (Partner)</label>
                    <select
                      className="input w-full text-sm font-medium text-gray-700 bg-white"
                      value={meetingForm.customerTwo}
                      onChange={e => setMeetingForm(p => ({ ...p, customerTwo: e.target.value }))}
                    >
                      <option value="">Select Candidate Profile</option>
                      {partnerCandidates.map(p => (
                        <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.city})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <label className="text-label mb-1.5 block">Date *</label>
                    <input
                      type="date"
                      required
                      className="input w-full text-sm font-medium text-gray-700 bg-white"
                      value={meetingForm.date}
                      onChange={e => setMeetingForm(p => ({ ...p, date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-label mb-1.5 block">Start Time *</label>
                    <input
                      type="time"
                      required
                      className="input w-full text-sm font-medium text-gray-700 bg-white"
                      value={meetingForm.startTime}
                      onChange={e => setMeetingForm(p => ({ ...p, startTime: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-label mb-1.5 block">End Time *</label>
                    <input
                      type="time"
                      required
                      className="input w-full text-sm font-medium text-gray-700 bg-white"
                      value={meetingForm.endTime}
                      onChange={e => setMeetingForm(p => ({ ...p, endTime: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-label mb-1.5 block">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Cafe Coffee Day, Google Meet link"
                    className="input w-full text-sm"
                    value={meetingForm.location}
                    onChange={e => setMeetingForm(p => ({ ...p, location: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-label mb-1.5 block">Brief / Objective Description</label>
                  <textarea
                    rows={3}
                    placeholder="Provide coordinate notes..."
                    className="input w-full resize-none py-2 text-sm"
                    value={meetingForm.description}
                    onChange={e => setMeetingForm(p => ({ ...p, description: e.target.value }))}
                  />
                </div>
              </form>

              <div className="px-6 py-4.5 border-t border-gray-150 flex items-center justify-end gap-3 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setShowMeetingModal(false)}
                  className="btn btn-secondary font-semibold"
                  style={{ color: '#374151', backgroundColor: '#ffffff', borderColor: '#d1d5db' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveMeeting}
                  className="btn btn-primary font-bold shadow-sm bg-indigo-600 hover:bg-indigo-700 border-indigo-650 text-white"
                  style={{ color: '#ffffff' }}
                >
                  Schedule Date
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Send Match Modal Suggestions */}
      <SendMatchModal
        isOpen={sendModal.open}
        match={sendModal.match}
        customer={customer}
        onClose={() => setSendModal({ open: false, match: null })}
        onSent={() => {
          reloadCustomer();
          reloadActivities();
        }}
      />
    </div>
  );
}
