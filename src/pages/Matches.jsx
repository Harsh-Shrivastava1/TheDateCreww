import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Search, RefreshCw, ChevronRight, Calendar, MessageSquare,
  Check, X, Sparkles, AlertTriangle, Copy, CheckCircle, ArrowRight,
  MapPin, Briefcase, GraduationCap, Users, Clock, ArrowRightLeft,
} from 'lucide-react';
import {
  getAllMatches, updateMatchStatus, logActivity, getCustomers, addMeeting,
} from '../services/firebase/firestore';
import { getMatchAnalysis, getRedFlags, generateIntro } from '../services/ai';
import PageHeader from '../components/layout/PageHeader';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['Suggested', 'Sent', 'Interested', 'Meeting Scheduled', 'Closed'];

// ─── Score ring ─────────────────────────────────────────────────────────────────
function ScoreRing({ score }) {
  const color = score >= 75 ? '#10B981' : score >= 55 ? '#6366F1' : '#F59E0B';
  const label = score >= 88 ? 'Exceptional' : score >= 75 ? 'Excellent' : score >= 62 ? 'High Potential' : score >= 48 ? 'Good' : 'Moderate';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
        <circle cx="32" cy="32" r="26" fill="none" stroke="#F3F4F6" strokeWidth="6" />
        <circle
          cx="32" cy="32" r="26" fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={`${(score / 100) * 163.4} 163.4`}
          strokeLinecap="round"
        />
      </svg>
      <div className="text-center -mt-1">
        <p className="text-xl font-bold text-gray-900 leading-none">{score}%</p>
        <p className="text-[10px] font-semibold mt-0.5" style={{ color }}>{label}</p>
      </div>
    </div>
  );
}

// ─── Profile mini-card ──────────────────────────────────────────────────────────
function ProfileCard({ customer, role, onClick }) {
  if (!customer) return (
    <div className="flex flex-col items-center gap-1 opacity-40">
      <div className="w-12 h-12 rounded-full bg-gray-200" />
      <p className="text-xs text-gray-400">{role}</p>
    </div>
  );
  return (
    <div
      className="flex flex-col items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity text-center"
      onClick={onClick}
    >
      <Avatar name={`${customer.firstName} ${customer.lastName}`} photo={customer.photo} size="md" />
      <div>
        <p className="text-[13px] font-semibold text-gray-800 leading-tight">
          {customer.firstName} {customer.lastName}
        </p>
        <p className="text-[11px] text-gray-400 font-medium">{customer.age} · {customer.city}</p>
        <p className="text-[10px] text-[#4F46E5] font-semibold uppercase tracking-wide mt-0.5">{role}</p>
      </div>
    </div>
  );
}

// ─── Compatibility narrative panel ──────────────────────────────────────────────
function CompatibilityPanel({ breakdown = [], analysis, loading }) {
  const strengths = [];
  const concerns = [];

  breakdown.forEach(({ factor, earned, max }) => {
    const pct = (earned / max) * 100;
    if (pct >= 70) strengths.push(factor);
    else if (pct < 40) concerns.push(factor);
  });

  return (
    <div className="space-y-4">
      {/* Strengths */}
      {strengths.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Why this match works</p>
          <div className="space-y-1.5">
            {strengths.map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0">
                  <Check size={9} className="text-emerald-600" strokeWidth={3} />
                </div>
                <span className="text-[13px] text-gray-700 font-medium">{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Concerns */}
      {concerns.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Points to discuss</p>
          <div className="space-y-1.5">
            {concerns.map(c => (
              <div key={c} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-amber-600 text-[9px] font-bold">•</span>
                </div>
                <span className="text-[13px] text-gray-600 font-medium">{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Analysis */}
      <div className="pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles size={12} className="text-[#4F46E5]" />
          <p className="text-[11px] font-semibold text-[#4F46E5] uppercase tracking-wider">AI Assessment</p>
        </div>
        {loading ? (
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-4/5 rounded" />
            <Skeleton className="h-3 w-3/5 rounded" />
          </div>
        ) : (
          <p className="text-[13px] text-gray-600 leading-relaxed">
            {analysis?.summary || 'Select a match to load AI assessment.'}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────
export default function Matches() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');

  const [selectedMatch, setSelectedMatch] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [redFlags, setRedFlags] = useState('');
  const [intro, setIntro] = useState('');
  const [aiLoading, setAiLoading] = useState({ analysis: false, flags: false, intro: false });
  const [copiedIntro, setCopiedIntro] = useState(false);

  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingForm, setMeetingForm] = useState({
    title: '', type: 'Customer Meeting', customerOne: '', customerTwo: '',
    date: '', startTime: '14:00', endTime: '15:00', location: 'Google Meet',
    status: 'Scheduled', description: '', createdBy: 'Admin Matchmaker',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [matchesData, customersData] = await Promise.all([getAllMatches(), getCustomers()]);
      setMatches(matchesData);
      setCustomers(customersData);
      if (matchesData.length > 0) setSelectedMatch(matchesData[0]);
      else setSelectedMatch(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const customersMap = useMemo(() => {
    const map = {};
    customers.forEach(c => { map[c.id] = c; });
    return map;
  }, [customers]);

  const handleStatusChange = async (matchId, customerId, profileName, newStatus) => {
    try {
      await updateMatchStatus(matchId, newStatus);
      await logActivity(customerId, `Match status with ${profileName} updated to ${newStatus}`);
      setMatches(prev => prev.map(m => m.id === matchId ? { ...m, status: newStatus } : m));
      if (selectedMatch?.id === matchId) setSelectedMatch(prev => ({ ...prev, status: newStatus }));
      toast.success(`Status updated to ${newStatus}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update status');
    }
  };

  const loadAIIntelligence = useCallback(async (match) => {
    if (!match) return;
    const cObj = customersMap[match.customerId];
    const pObj = customersMap[match.profileId];
    setAnalysis(null);
    setRedFlags('');
    setIntro('');

    if (!cObj || !pObj) {
      setAnalysis({ summary: 'Profile data unavailable for this match.', strengths: [], concerns: [], recommendation: null });
      return;
    }

    setAiLoading({ analysis: true, flags: true, intro: false });

    // Load analysis and red flags in parallel
    Promise.all([
      getMatchAnalysis(cObj, pObj, match.score)
        .then(res => setAnalysis(res))
        .catch(() => setAnalysis({ summary: 'AI assessment temporarily unavailable.', strengths: [], concerns: [], recommendation: null }))
        .finally(() => setAiLoading(p => ({ ...p, analysis: false }))),

      getRedFlags(cObj, pObj)
        .then(res => setRedFlags(res.redFlags))
        .catch(() => setRedFlags(''))
        .finally(() => setAiLoading(p => ({ ...p, flags: false }))),
    ]);
  }, [customersMap]);

  useEffect(() => {
    if (selectedMatch) loadAIIntelligence(selectedMatch);
  }, [selectedMatch, loadAIIntelligence]);

  const handleGenerateIntro = async () => {
    if (!selectedMatch || aiLoading.intro) return;
    const cObj = customersMap[selectedMatch.customerId];
    const pObj = customersMap[selectedMatch.profileId];
    if (!cObj || !pObj) { toast.error('Profile data not found'); return; }

    setAiLoading(p => ({ ...p, intro: true }));
    try {
      const res = await generateIntro(cObj, pObj);
      setIntro(res.intro);
    } catch {
      toast.error('Could not generate introduction message');
    } finally {
      setAiLoading(p => ({ ...p, intro: false }));
    }
  };

  const filteredMatches = useMemo(() => {
    let list = [...matches];
    if (activeTab !== 'All') list = list.filter(m => m.status === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        (m.customerName || '').toLowerCase().includes(q) ||
        (m.profileName || '').toLowerCase().includes(q) ||
        (customersMap[m.customerId] ? `${customersMap[m.customerId].firstName} ${customersMap[m.customerId].lastName}`.toLowerCase().includes(q) : false) ||
        (customersMap[m.profileId] ? `${customersMap[m.profileId].firstName} ${customersMap[m.profileId].lastName}`.toLowerCase().includes(q) : false)
      );
    }
    return list;
  }, [matches, activeTab, search, customersMap]);

  const stats = useMemo(() => ({
    total: matches.length,
    suggested: matches.filter(m => m.status === 'Suggested').length,
    sent: matches.filter(m => m.status === 'Sent').length,
    interested: matches.filter(m => m.status === 'Interested').length,
    meeting: matches.filter(m => m.status === 'Meeting Scheduled').length,
  }), [matches]);

  const handleSaveMeeting = async (e) => {
    e.preventDefault();
    if (!meetingForm.title || !meetingForm.date || !meetingForm.customerOne) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      await addMeeting(meetingForm);
      await logActivity(meetingForm.customerOne, `Scheduled intro meeting: "${meetingForm.title}" on ${meetingForm.date}`);
      if (meetingForm.customerTwo) {
        await logActivity(meetingForm.customerTwo, `Scheduled intro meeting: "${meetingForm.title}" on ${meetingForm.date}`);
      }
      if (selectedMatch) {
        const selCustomerObj = customersMap[selectedMatch.customerId];
        const selProfileObj = customersMap[selectedMatch.profileId];
        const pName = selProfileObj ? `${selProfileObj.firstName} ${selProfileObj.lastName}` : 'Partner';
        await handleStatusChange(selectedMatch.id, selectedMatch.customerId, pName, 'Meeting Scheduled');
      }
      toast.success('Meeting scheduled');
      setShowMeetingModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to schedule meeting');
    }
  };

  // ── Recommended next action based on match status ──────────────────────────
  const getNextAction = (match) => {
    const cObj = customersMap[match?.customerId];
    const pObj = customersMap[match?.profileId];
    const pName = pObj ? `${pObj.firstName} ${pObj.lastName}` : 'Partner';

    switch (match?.status) {
      case 'Suggested':
        return { label: 'Send Introduction', color: 'indigo', action: () => handleStatusChange(match.id, match.customerId, pName, 'Sent') };
      case 'Sent':
        return { label: 'Mark as Interested', color: 'purple', action: () => handleStatusChange(match.id, match.customerId, pName, 'Interested') };
      case 'Interested':
        return {
          label: 'Schedule Meeting', color: 'pink', action: () => {
            const cName = cObj ? `${cObj.firstName} ${cObj.lastName}` : 'Client';
            setMeetingForm({
              title: `Introduction: ${cName} & ${pName}`,
              type: 'Customer Meeting',
              customerOne: match.customerId,
              customerTwo: match.profileId,
              date: new Date().toISOString().split('T')[0],
              startTime: '15:00', endTime: '16:00',
              location: 'Google Meet', status: 'Scheduled',
              description: `Matchmaker introduction for ${cName} & ${pName}.`,
              createdBy: 'Admin Matchmaker',
            });
            setShowMeetingModal(true);
          },
        };
      case 'Meeting Scheduled':
        return { label: 'Mark as Closed', color: 'emerald', action: () => handleStatusChange(match.id, match.customerId, pName, 'Closed') };
      default:
        return null;
    }
  };

  return (
    <div className="bg-[#FAFAF9] min-h-screen">
      <PageHeader
        title="Matches"
        subtitle="Compatibility recommendations, AI analysis, and matchmaking pipeline"
        actions={
          <button onClick={loadData} className="btn btn-secondary btn-sm gap-1.5">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        }
      />

      <div className="px-4 sm:px-8 py-6">
        {/* ── Stats Bar ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total',    count: stats.total,     color: 'text-gray-900', bg: 'bg-white', border: 'border-gray-200' },
            { label: 'Suggested', count: stats.suggested, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100' },
            { label: 'Sent',      count: stats.sent,      color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-100' },
            { label: 'Interested',count: stats.interested,color: 'text-pink-700', bg: 'bg-pink-50', border: 'border-pink-100' },
            { label: 'Meeting',   count: stats.meeting,   color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
          ].map(s => (
            <div key={s.label} className={`p-4 rounded-xl border ${s.bg} ${s.border} flex flex-col gap-1 items-start shadow-sm transition-all hover:shadow-md`}>
              <p className={`text-2xl font-black tracking-tight leading-none ${s.color}`}>{loading ? '—' : s.count}</p>
              <p className={`text-[10.5px] font-bold uppercase tracking-wider ${s.color} opacity-80 mt-1`}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Toolbar ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 p-2 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="flex gap-1 overflow-x-auto px-1">
            {['All', 'Suggested', 'Sent', 'Interested', 'Meeting Scheduled', 'Closed'].map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  const list = tab === 'All' ? matches : matches.filter(m => m.status === tab);
                  setSelectedMatch(list[0] ?? null);
                }}
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
          <div className="relative w-full sm:w-72 sm:mr-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search matches by name..."
              className="w-full pl-9 pr-4 py-2 text-[13px] bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:bg-white rounded-lg outline-none transition-all shadow-3xs"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* ── Split Pane ── */}
        {loading ? (
          <div className="grid grid-cols-12 bg-white border border-gray-200 rounded-lg overflow-hidden min-h-[500px]">
            <div className="col-span-4 border-r border-gray-200 divide-y divide-gray-100">
              {[1,2,3,4].map(i => (
                <div key={i} className="flex gap-3 p-4">
                  <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <Skeleton className="h-3.5 w-36" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
            <div className="col-span-8 p-6 space-y-4">
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-40 w-full rounded-lg" />
            </div>
          </div>
        ) : filteredMatches.length === 0 ? (
          <EmptyState
            icon={Heart}
            title={activeTab === 'All' ? 'No matches generated yet' : `No matches in stage: ${activeTab}`}
            description="Generate matches from a customer's profile page using the Suggest Matches button."
          />
        ) : (
          <div className="grid grid-cols-12 bg-white border border-gray-200 rounded-lg overflow-hidden min-h-[600px]">

            {/* ── LEFT LIST ── */}
            {(!isMobile || !mobileDetailOpen) && (
              <div className="col-span-12 lg:col-span-4 border-r border-gray-200 flex flex-col max-h-[700px] overflow-y-auto divide-y divide-gray-100 p-2 sm:p-0">
                {isMobile ? (
                  // Mobile Cards Layout
                  <div className="grid grid-cols-1 gap-4 p-2">
                    {filteredMatches.map(m => {
                      const cObj = customersMap[m.customerId];
                      const pObj = customersMap[m.profileId];
                      const cName = m.customerName || (cObj ? `${cObj.firstName} ${cObj.lastName}` : 'Client');
                      const pName = m.profileName || (pObj ? `${pObj.firstName} ${pObj.lastName}` : 'Partner');
                      return (
                        <div key={m.id} className="card p-5 bg-white border border-gray-200 rounded-xl shadow-xs space-y-4">
                          <div className="flex items-center justify-between gap-3">
                            {/* Profile A */}
                            <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0 text-center">
                              <Avatar name={cName} photo={cObj?.photo} size="md" />
                              <span className="text-[12.5px] font-bold text-gray-850 truncate w-full">{cName}</span>
                              <span className="text-[10px] text-gray-400 font-medium">{cObj?.age || '—'} · {cObj?.city || '—'}</span>
                            </div>

                            {/* Score & Arrow */}
                            <div className="flex flex-col items-center gap-1 shrink-0">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                m.score >= 75 ? 'bg-emerald-50 text-emerald-700' : m.score >= 55 ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
                              }`}>
                                {m.score}%
                              </span>
                              <span className="text-[9px] text-gray-405 font-bold uppercase tracking-wider">Match</span>
                            </div>

                            {/* Profile B */}
                            <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0 text-center">
                              <Avatar name={pName} photo={pObj?.photo} size="md" />
                              <span className="text-[12.5px] font-bold text-gray-850 truncate w-full">{pName}</span>
                              <span className="text-[10px] text-gray-400 font-medium">{pObj?.age || '—'} · {pObj?.city || '—'}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                            <Badge status={m.status} size="sm" />
                            <button
                              onClick={() => {
                                setSelectedMatch(m);
                                setMobileDetailOpen(true);
                              }}
                              className="btn btn-secondary btn-xs font-bold px-3 py-1.5 shadow-3xs"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // Desktop Rows Layout
                  filteredMatches.map(m => {
                    const isSelected = selectedMatch?.id === m.id;
                    const cObj = customersMap[m.customerId];
                    const pObj = customersMap[m.profileId];
                    const cName = m.customerName || (cObj ? `${cObj.firstName} ${cObj.lastName}` : 'Client');
                    const pName = m.profileName || (pObj ? `${pObj.firstName} ${pObj.lastName}` : 'Partner');
                    const scoreDot = m.score >= 75 ? 'bg-emerald-500' : m.score >= 55 ? 'bg-indigo-500' : 'bg-amber-500';

                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMatch(m)}
                        className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors ${
                          isSelected ? 'bg-indigo-50/60 border-l-2 border-[#4F46E5]' : 'hover:bg-gray-50 border-l-2 border-transparent'
                        }`}
                      >
                        <div className="flex -space-x-2 flex-shrink-0">
                          <Avatar name={cName} photo={cObj?.photo} size="sm" />
                          <Avatar name={pName} photo={pObj?.photo} size="sm" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-gray-850 truncate">
                            {cName} <span className="text-gray-400 font-normal">↔</span> {pName}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${scoreDot}`} />
                            <span className="text-[11px] text-gray-500 font-medium">{m.score}% · {m.status}</span>
                          </div>
                        </div>
                        <ChevronRight size={13} className="text-gray-300 flex-shrink-0" />
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ── RIGHT DETAIL ── */}
            {(!isMobile || mobileDetailOpen) && (
              <div className="col-span-12 lg:col-span-8 max-h-[700px] overflow-y-auto w-full">
                {isMobile && mobileDetailOpen && (
                  <div className="p-4 border-b border-gray-150 bg-gray-50 flex items-center">
                    <button
                      onClick={() => setMobileDetailOpen(false)}
                      className="btn btn-secondary btn-sm gap-1.5 font-bold"
                    >
                      ← Back to Matches List
                    </button>
                  </div>
                )}
                {selectedMatch ? (() => {
                  const cObj = customersMap[selectedMatch.customerId];
                  const pObj = customersMap[selectedMatch.profileId];
                  const cName = selectedMatch.customerName || (cObj ? `${cObj.firstName} ${cObj.lastName}` : 'Client');
                  const pName = selectedMatch.profileName || (pObj ? `${pObj.firstName} ${pObj.lastName}` : 'Partner');
                  const nextAction = getNextAction(selectedMatch);

                  return (
                    <div className="p-6 space-y-5">

                    {/* ── Hero: pair + score ── */}
                    <div className="flex flex-col sm:flex-row items-center gap-6 p-5 bg-white border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-6 flex-1">
                        <ProfileCard customer={cObj} role="Client" onClick={() => navigate(`/customers/${selectedMatch.customerId}`)} />
                        <div className="flex flex-col items-center gap-2">
                          <ArrowRightLeft size={16} className="text-gray-300" />
                          <ScoreRing score={selectedMatch.score} />
                        </div>
                        <ProfileCard customer={pObj} role="Match" onClick={() => navigate(`/customers/${selectedMatch.profileId}`)} />
                      </div>

                      <div className="flex flex-col gap-2 min-w-[160px]">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-gray-500">Stage</span>
                          <select
                            className="input input-sm flex-1 text-[12px] bg-white"
                            value={selectedMatch.status}
                            onChange={e => {
                              const pNameObj = pObj ? `${pObj.firstName} ${pObj.lastName}` : 'Partner';
                              handleStatusChange(selectedMatch.id, selectedMatch.customerId, pNameObj, e.target.value);
                            }}
                          >
                            {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                          </select>
                        </div>
                        {nextAction && (
                          <button
                            onClick={nextAction.action}
                            className="btn btn-primary btn-sm w-full justify-center gap-1.5 text-white font-semibold"
                            style={{ color: '#ffffff' }}
                          >
                            {nextAction.label} <ArrowRight size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* ── Profile details ── */}
                    {(cObj || pObj) && (
                      <div className="grid grid-cols-2 gap-4">
                        {[{ obj: cObj, role: 'Client', id: selectedMatch.customerId }, { obj: pObj, role: 'Match', id: selectedMatch.profileId }].map(({ obj, role, id }) => (
                          obj ? (
                            <div key={id} className="bg-white border border-gray-200 rounded-lg p-4 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{role} Profile</p>
                                <button onClick={() => navigate(`/customers/${id}`)} className="text-[11px] text-[#4F46E5] hover:underline font-medium">View →</button>
                              </div>
                              <p className="text-[13px] font-semibold text-gray-800">{obj.firstName} {obj.lastName}</p>
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2 text-[12px] text-gray-500">
                                  <Briefcase size={11} className="text-gray-400 flex-shrink-0" />
                                  <span className="truncate">{obj.designation || '—'} at {obj.company || '—'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[12px] text-gray-500">
                                  <MapPin size={11} className="text-gray-400 flex-shrink-0" />
                                  <span>{obj.city || '—'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[12px] text-gray-500">
                                  <GraduationCap size={11} className="text-gray-400 flex-shrink-0" />
                                  <span className="truncate">{obj.degree || '—'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[12px] text-gray-500">
                                  <Users size={11} className="text-gray-400 flex-shrink-0" />
                                  <span>{obj.religion || '—'} · {obj.wantKids ? `Kids: ${obj.wantKids}` : '—'}</span>
                                </div>
                              </div>
                            </div>
                          ) : null
                        ))}
                      </div>
                    )}

                    {/* ── Compatibility narrative ── */}
                    <div className="bg-white border border-gray-200 rounded-lg p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <Heart size={14} className="text-[#4F46E5]" />
                        <h4 className="text-[13px] font-semibold text-gray-800">Compatibility Summary</h4>
                      </div>

                      {/* AI-generated strengths/concerns from structured response */}
                      {(analysis?.strengths || analysis?.concerns) ? (
                        <div className="space-y-4">
                          {analysis.strengths?.length > 0 && (
                            <div>
                              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Why this match works</p>
                              <div className="space-y-1.5">
                                {analysis.strengths.map((s, i) => (
                                  <div key={i} className="flex items-start gap-2">
                                    <div className="w-4 h-4 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                                      <Check size={9} className="text-emerald-600" strokeWidth={3} />
                                    </div>
                                    <span className="text-[13px] text-gray-700 leading-snug">{s}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {analysis.concerns?.length > 0 && (
                            <div>
                              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Points to discuss</p>
                              <div className="space-y-1.5">
                                {analysis.concerns.map((c, i) => (
                                  <div key={i} className="flex items-start gap-2">
                                    <div className="w-4 h-4 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                                      <AlertTriangle size={8} className="text-amber-600" />
                                    </div>
                                    <span className="text-[13px] text-gray-600 leading-snug">{c}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Fallback: derive from scoring breakdown */
                        <CompatibilityPanel
                          breakdown={selectedMatch.breakdown || []}
                          analysis={analysis}
                          loading={aiLoading.analysis}
                        />
                      )}

                      {/* Summary paragraph */}
                      {(analysis?.summary || aiLoading.analysis) && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Sparkles size={12} className="text-[#4F46E5]" />
                            <p className="text-[11px] font-semibold text-[#4F46E5] uppercase tracking-wider">AI Assessment</p>
                          </div>
                          {aiLoading.analysis ? (
                            <div className="space-y-1.5">
                              <Skeleton className="h-3 w-full rounded" />
                              <Skeleton className="h-3 w-4/5 rounded" />
                              <Skeleton className="h-3 w-3/5 rounded" />
                            </div>
                          ) : (
                            <p className="text-[13px] text-gray-600 leading-relaxed">{analysis.summary}</p>
                          )}
                        </div>
                      )}

                      {/* AI recommendation */}
                      {analysis?.recommendation && (
                        <div className="mt-3 flex items-center gap-2 p-3 bg-indigo-50/60 border border-indigo-100 rounded-lg">
                          <Sparkles size={12} className="text-[#4F46E5] flex-shrink-0" />
                          <p className="text-[12px] font-semibold text-[#4F46E5]">
                            AI recommends: <span className="font-bold">{analysis.recommendation}</span>
                          </p>
                        </div>
                      )}
                    </div>

                    {/* ── Potential concerns from AI red flags ── */}
                    {(redFlags || aiLoading.flags) && (
                      <div className="bg-white border border-gray-200 rounded-lg p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle size={13} className="text-amber-500" />
                          <h4 className="text-[13px] font-semibold text-gray-800">Potential Concerns</h4>
                        </div>
                        {aiLoading.flags ? (
                          <div className="space-y-1.5">
                            <Skeleton className="h-3 w-full rounded" />
                            <Skeleton className="h-3 w-3/4 rounded" />
                          </div>
                        ) : (
                          <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-line">{redFlags}</p>
                        )}
                      </div>
                    )}

                    {/* ── Introduction message ── */}
                    <div className="bg-white border border-gray-200 rounded-lg p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <MessageSquare size={13} className="text-gray-400" />
                          <h4 className="text-[13px] font-semibold text-gray-800">Introduction Message</h4>
                        </div>
                        {!intro && !aiLoading.intro && (
                          <button
                            onClick={handleGenerateIntro}
                            className="btn btn-secondary btn-xs gap-1.5 text-[#4F46E5] border-indigo-100 hover:bg-indigo-50 font-semibold"
                          >
                            <Sparkles size={11} /> Generate
                          </button>
                        )}
                      </div>

                      {aiLoading.intro ? (
                        <div className="space-y-1.5">
                          <Skeleton className="h-3 w-full rounded" />
                          <Skeleton className="h-3 w-4/5 rounded" />
                        </div>
                      ) : intro ? (
                        <div className="relative p-3.5 bg-gray-50 border border-gray-200 rounded-lg">
                          <p className="text-[13px] text-gray-700 leading-relaxed italic pr-8">"{intro}"</p>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(intro);
                              setCopiedIntro(true);
                              setTimeout(() => setCopiedIntro(false), 2000);
                            }}
                            className="absolute top-2.5 right-2.5 w-6 h-6 rounded border border-gray-200 bg-white hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors"
                          >
                            {copiedIntro ? <CheckCircle size={12} className="text-emerald-500" /> : <Copy size={11} />}
                          </button>
                        </div>
                      ) : (
                        <p className="text-[13px] text-gray-400">Generate a personalized introduction message for this pair.</p>
                      )}
                    </div>

                    {/* ── Navigation ── */}
                    <div className="flex gap-3 pt-1">
                      <button
                        onClick={() => navigate(`/customers/${selectedMatch.customerId}`)}
                        className="btn btn-secondary btn-sm flex-1 justify-center gap-1.5 font-semibold"
                      >
                        {cObj ? `${cObj.firstName}'s Profile` : 'Client Profile'} <ArrowRight size={12} />
                      </button>
                      <button
                        onClick={() => navigate(`/customers/${selectedMatch.profileId}`)}
                        className="btn btn-secondary btn-sm flex-1 justify-center gap-1.5 font-semibold"
                      >
                        {pObj ? `${pObj.firstName}'s Profile` : 'Match Profile'} <ArrowRight size={12} />
                      </button>
                    </div>

                  </div>
                );
              })() : (
                <div className="flex items-center justify-center h-full p-8">
                  <p className="text-[13px] text-gray-400">Select a match to view details.</p>
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>

      {/* ── Schedule Meeting Modal ── */}
      <AnimatePresence>
        {showMeetingModal && (
          <div className="fixed inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-xl border border-gray-200 shadow-xl max-w-lg w-full flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-4 border-b border-gray-150 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                    <Calendar size={16} className="text-[#4F46E5]" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-gray-900">Schedule Introduction</h3>
                    <p className="text-[12px] text-gray-500 mt-0.5">Coordinate the first meeting</p>
                  </div>
                </div>
                <button onClick={() => setShowMeetingModal(false)} className="w-7 h-7 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors">
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleSaveMeeting} className="flex-1 overflow-y-auto p-6 space-y-4">
                <div>
                  <label className="text-label mb-1 block">Title *</label>
                  <input type="text" required className="input w-full" value={meetingForm.title}
                    onChange={e => setMeetingForm(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-label mb-1 block">Date *</label>
                    <input type="date" required className="input w-full" value={meetingForm.date}
                      onChange={e => setMeetingForm(p => ({ ...p, date: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-label mb-1 block">Start *</label>
                    <input type="time" required className="input w-full" value={meetingForm.startTime}
                      onChange={e => setMeetingForm(p => ({ ...p, startTime: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-label mb-1 block">End *</label>
                    <input type="time" required className="input w-full" value={meetingForm.endTime}
                      onChange={e => setMeetingForm(p => ({ ...p, endTime: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="text-label mb-1 block">Location</label>
                  <input type="text" placeholder="Google Meet, Cafe, etc." className="input w-full" value={meetingForm.location}
                    onChange={e => setMeetingForm(p => ({ ...p, location: e.target.value }))} />
                </div>
                <div>
                  <label className="text-label mb-1 block">Notes</label>
                  <textarea rows={3} className="input w-full resize-none" value={meetingForm.description}
                    onChange={e => setMeetingForm(p => ({ ...p, description: e.target.value }))} />
                </div>
              </form>

              <div className="px-6 py-4 border-t border-gray-150 flex justify-end gap-3 bg-gray-50">
                <button type="button" onClick={() => setShowMeetingModal(false)} className="btn btn-secondary">Cancel</button>
                <button onClick={handleSaveMeeting} className="btn btn-primary" style={{ color: '#fff' }}>Schedule Meeting</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
