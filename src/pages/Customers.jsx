import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Filter, ChevronUp, ChevronDown, Users, X, SlidersHorizontal, 
  MapPin, Briefcase, GraduationCap, Mail, Phone, Calendar, Heart, 
  Sparkles, CheckCircle2, AlertCircle, ChevronRight, HelpCircle, UserPlus, ArrowRight
} from 'lucide-react';
import { useCustomers } from '../hooks/useCustomers';
import Badge from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import { Skeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/layout/PageHeader';

const STATUSES   = ['New','Verified','Match Suggested','Match Sent','Interested','Meeting Scheduled','In Discussion','Closed'];
const GENDERS    = ['Male','Female'];
const RELIGIONS  = ['Hindu','Muslim','Christian','Sikh','Jain','Buddhist'];
const MARITAL    = ['Never Married','Divorced','Widowed','Separated'];

/* ── Contextual Recommendation Helper ── */
function getNextAction(status, name) {
  switch (status) {
    case 'New':
      return {
        title: 'Verify Candidate Profile',
        desc: 'Review personal details and update status to Verified.',
        color: 'text-red-700 bg-red-50 border-red-150',
        actionLabel: 'Verify Profile'
      };
    case 'Verified':
      return {
        title: 'Generate Match Proposals',
        desc: 'Run the compatibility algorithm to find matching candidates.',
        color: 'text-indigo-700 bg-indigo-50 border-indigo-150',
        actionLabel: 'Generate Matches'
      };
    case 'Match Suggested':
      return {
        title: 'Send Introduction Proposal',
        desc: 'Review potential partner options and send introduction email.',
        color: 'text-purple-700 bg-purple-50 border-purple-150',
        actionLabel: 'Send Proposal'
      };
    case 'Match Sent':
      return {
        title: 'Follow Up on Introduction',
        desc: 'Check response status and log client feedback notes.',
        color: 'text-blue-700 bg-blue-50 border-blue-150',
        actionLabel: 'Log Follow Up'
      };
    case 'Meeting Scheduled':
      return {
        title: 'Prepare Introduction Briefing',
        desc: 'Log in-person cafe arrangements and send coordinates.',
        color: 'text-emerald-700 bg-emerald-50 border-emerald-150',
        actionLabel: 'View Meeting'
      };
    case 'Closed':
      return {
        title: 'Archive Candidate Folder',
        desc: 'Introduction successful. Client match finalized.',
        color: 'text-gray-700 bg-gray-50 border-gray-150',
        actionLabel: 'Archive File'
      };
    default:
      return {
        title: 'Review Candidate File',
        desc: 'Open profile to verify match journey details.',
        color: 'text-gray-700 bg-gray-50 border-gray-150',
        actionLabel: 'View Profile'
      };
  }
}

export default function Customers() {
  const navigate = useNavigate();
  const { customers, loading, error } = useCustomers();

  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [filters, setFilters] = useState({
    status:   [],
    gender:   [],
    religion: [],
    marital:  [],
    ageMin:   '',
    ageMax:   '',
  });

  // Filter logic
  const filtered = useMemo(() => {
    let list = [...customers];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        (c.city || '').toLowerCase().includes(q) ||
        (c.company || '').toLowerCase().includes(q) ||
        (c.designation || '').toLowerCase().includes(q) ||
        (c.religion || '').toLowerCase().includes(q)
      );
    }

    if (filters.status.length)   list = list.filter(c => filters.status.includes(c.status));
    if (filters.gender.length)   list = list.filter(c => filters.gender.includes(c.gender));
    if (filters.religion.length) list = list.filter(c => filters.religion.includes(c.religion));
    if (filters.marital.length)  list = list.filter(c => filters.marital.includes(c.maritalStatus));

    if (filters.ageMin) list = list.filter(c => (c.age || 0) >= Number(filters.ageMin));
    if (filters.ageMax) list = list.filter(c => (c.age || 99) <= Number(filters.ageMax));

    // Sort: Newest created/registered candidates first
    return list.sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() ?? 0;
      const tb = b.createdAt?.toMillis?.() ?? 0;
      return tb - ta;
    });
  }, [customers, search, filters]);

  // Selected customer object
  const activeCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const activeFiltersCount = useMemo(() => {
    let count = filters.status.length + filters.gender.length + filters.religion.length + filters.marital.length;
    if (filters.ageMin || filters.ageMax) count++;
    return count;
  }, [filters]);

  const handleClearFilters = () => {
    setFilters({ status: [], gender: [], religion: [], marital: [], ageMin: '', ageMax: '' });
  };

  const handleToggleFilter = (key, val) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(val)
        ? prev[key].filter(v => v !== val)
        : [...prev[key], val],
    }));
  };

  return (
    <div className="bg-[#FAFAF9] min-h-screen flex flex-col">
      <PageHeader
        title="Candidate Directory"
        subtitle={loading ? 'Synchronizing Firestore...' : `${filtered.length} client files mapped`}
      />

      {/* Main split-pane workspace */}
      <div className="flex-1 px-8 py-6 flex gap-6 items-stretch min-h-0 overflow-hidden">
        
        {/* Left Side: Filter Panels + Grid */}
        <div className="flex-1 flex flex-col space-y-4 min-w-0">
          
          {/* Toolbar */}
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search candidates by name, city, caste..."
                className="input input-sm pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filter Drawer Toggle */}
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`btn btn-sm gap-1.5 shadow-3xs ${showFilters ? 'btn-primary' : 'btn-secondary'}`}
            >
              <SlidersHorizontal size={13} />
              Filters
              {activeFiltersCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-150 text-indigo-700 ml-1">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Core Content Layout split between side filter & candidate cards */}
          <div className="flex-1 flex gap-5 min-h-0">
            {/* Contextual Filters Panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 220 }}
                  exit={{ opacity: 0, width: 0 }}
                  className="card p-4 bg-white border border-gray-200 overflow-y-auto max-h-[70vh] flex-shrink-0 scrollbar-none"
                >
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-bold text-gray-900">Filters</span>
                    {activeFiltersCount > 0 && (
                      <button onClick={handleClearFilters} className="text-[10px] font-bold text-indigo-600 hover:underline">
                        Clear all
                      </button>
                    )}
                  </div>

                  {/* Status checklist */}
                  <div className="mb-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Stage</p>
                    <div className="space-y-1">
                      {STATUSES.map(s => (
                        <label key={s} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filters.status.includes(s)}
                            onChange={() => handleToggleFilter('status', s)}
                            className="rounded border-gray-300 text-gray-800 w-3 h-3"
                          />
                          <span className="text-xs text-gray-600">{s}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Gender split */}
                  <div className="mb-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Gender</p>
                    <div className="space-y-1">
                      {GENDERS.map(g => (
                        <label key={g} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filters.gender.includes(g)}
                            onChange={() => handleToggleFilter('gender', g)}
                            className="rounded border-gray-300 text-gray-800 w-3 h-3"
                          />
                          <span className="text-xs text-gray-600">{g}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Religion splits */}
                  <div className="mb-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Religion</p>
                    <div className="space-y-1">
                      {RELIGIONS.map(r => (
                        <label key={r} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filters.religion.includes(r)}
                            onChange={() => handleToggleFilter('religion', r)}
                            className="rounded border-gray-300 text-gray-800 w-3 h-3"
                          />
                          <span className="text-xs text-gray-600">{r}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Age selector */}
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Age Range</p>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        className="input input-sm w-full font-bold"
                        value={filters.ageMin}
                        onChange={e => setFilters(p => ({ ...p, ageMin: e.target.value }))}
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        className="input input-sm w-full font-bold"
                        value={filters.ageMax}
                        onChange={e => setFilters(p => ({ ...p, ageMax: e.target.value }))}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Candidate Grid list */}
            <div className="flex-1 overflow-y-auto max-h-[72vh] scrollbar-none pr-1">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="card p-4 space-y-3 bg-white">
                      <div className="flex gap-3">
                        <Skeleton className="w-12 h-12 rounded-xl" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-4 w-32 rounded" />
                          <Skeleton className="h-3 w-20 rounded" />
                        </div>
                      </div>
                      <Skeleton className="h-3 w-full rounded" />
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No candidate files match filters"
                  description="Try resetting search keywords or stage tags."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filtered.map(c => {
                    const isSelected = selectedCustomerId === c.id;
                    const action = getNextAction(c.status, c.firstName);
                    
                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedCustomerId(c.id)}
                        className={`card p-4 bg-white border cursor-pointer hover:border-gray-400 hover:shadow-2xs transition-all relative ${
                          isSelected ? 'border-indigo-600 ring-1 ring-indigo-600' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar name={`${c.firstName} ${c.lastName}`} photo={c.photo} size="md" />
                          
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-xs font-bold text-gray-900 leading-tight">
                                {c.firstName} {c.lastName}
                              </h4>
                              <span className="flex-shrink-0">
                                <Badge status={c.status} size="xs" />
                              </span>
                            </div>

                            <p className="text-[10px] text-gray-400 font-semibold mt-0.5 leading-none">
                              {c.gender} · {c.age} yrs · {c.city || 'Delhi'}
                            </p>

                            <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium mt-2 leading-tight truncate">
                              <Briefcase size={10} className="text-gray-400 flex-shrink-0" />
                              <span className="truncate">{c.designation || 'Onboarding Specialist'}</span>
                            </div>
                            
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium mt-1 leading-tight truncate">
                              <GraduationCap size={10} className="text-gray-400 flex-shrink-0" />
                              <span className="truncate">{c.degree || 'Bachelors'}</span>
                            </div>

                            {/* Recommended Next Action stamp */}
                            <div className="mt-3.5 pt-2 border-t border-gray-100 flex items-center justify-between">
                              <div className="min-w-0">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Next Task</span>
                                <span className="text-[10.5px] text-gray-700 font-semibold truncate block leading-tight mt-0.5">{action.title}</span>
                              </div>
                              <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
                            </div>

                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Split detail intelligence preview panel */}
        <AnimatePresence>
          {activeCustomer && (
            <motion.div
              initial={{ opacity: 0, x: 20, width: 0 }}
              animate={{ opacity: 1, x: 0, width: 340 }}
              exit={{ opacity: 0, x: 20, width: 0 }}
              className="card bg-white border border-gray-200 overflow-hidden flex flex-col justify-between flex-shrink-0 shadow-sm"
            >
              
              {/* Header */}
              <div className="p-5 border-b border-gray-150 bg-gray-50/50 flex items-start justify-between">
                <div className="flex gap-3">
                  <Avatar name={`${activeCustomer.firstName} ${activeCustomer.lastName}`} photo={activeCustomer.photo} size="md" />
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 leading-tight">
                      {activeCustomer.firstName} {activeCustomer.lastName}
                    </h3>
                    <p className="text-[10px] text-gray-400 font-semibold mt-0.5 uppercase tracking-wider">{activeCustomer.gender} File</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedCustomerId(null)}
                  className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-none">
                
                {/* Recommended Next Action Block */}
                <div className="p-4 rounded-xl border border-gray-150 bg-gray-50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <AlertCircle size={13} className="text-indigo-600" />
                      <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Next Matchmaker Action</span>
                    </div>
                    <h4 className="text-xs font-bold text-gray-800 mt-2">
                      {getNextAction(activeCustomer.status, activeCustomer.firstName).title}
                    </h4>
                    <p className="text-[11px] text-gray-500 mt-1 leading-normal font-medium">
                      {getNextAction(activeCustomer.status, activeCustomer.firstName).desc}
                    </p>
                  </div>

                  <button
                    onClick={() => navigate(`/customers/${activeCustomer.id}`)}
                    className="btn btn-primary btn-xs font-bold gap-1 mt-4 shadow-xs py-1.5 w-full justify-center text-center"
                  >
                    Start Next Task <ArrowRight size={11} />
                  </button>
                </div>

                {/* Info List */}
                <div className="space-y-3.5 border-t border-gray-100 pt-4">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Quick Demographics</h4>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 font-semibold block">Religion</span>
                      <span className="text-gray-700 font-bold block mt-0.5">{activeCustomer.religion || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-semibold block">Caste</span>
                      <span className="text-gray-700 font-bold block mt-0.5">{activeCustomer.caste || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-semibold block">Marital Status</span>
                      <span className="text-gray-700 font-bold block mt-0.5">{activeCustomer.maritalStatus || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-semibold block">Education</span>
                      <span className="text-gray-700 font-bold block mt-0.5">{activeCustomer.degree || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* AI Summary Widget Preview if available */}
                {activeCustomer.designation && (
                  <div className="border-t border-gray-100 pt-4 space-y-2">
                    <div className="flex items-center gap-1">
                      <Sparkles size={12} className="text-[#4F46E5] fill-none" />
                      <span className="text-[10px] font-bold text-[#4F46E5] uppercase tracking-wider">AI Intelligence Context</span>
                    </div>
                    <p className="text-[11.5px] text-gray-600 font-medium leading-relaxed italic bg-[#EEF2FF]/40 border border-[#C7D2FE]/20 p-3 rounded-lg">
                      "{activeCustomer.firstName} is a highly accomplished {activeCustomer.designation} based in {activeCustomer.city}, seeking compatibility alignment."
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-150 bg-gray-50 flex gap-2">
                <button
                  onClick={() => navigate(`/customers/${activeCustomer.id}`)}
                  className="btn btn-secondary btn-sm flex-1 font-bold shadow-3xs justify-center"
                >
                  View CRM Profile
                </button>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
