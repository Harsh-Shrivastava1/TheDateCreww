import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Search, Plus,
  Clock, MapPin, X, Trash2, Edit2, AlertCircle, CheckCircle, Clock3, UserCircle2
} from 'lucide-react';
import {
  getAllMeetings, addMeeting, updateMeeting, deleteMeeting,
  getCustomers, logActivity
} from '../services/firebase/firestore';
import PageHeader from '../components/layout/PageHeader';
import Avatar from '../components/ui/Avatar';
import { Skeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import toast from 'react-hot-toast';

const EVENT_TYPES = [
  'Customer Meeting',
  'Follow Up',
  'Match Review',
  'Verification Call',
  'Internal Team Meeting'
];

const STATUS_CONFIG = {
  'Scheduled': { bg: 'bg-blue-50/60 border-l-[3px] border-l-blue-500 border-y border-r border-blue-200/50', text: 'text-blue-800', dot: 'bg-blue-500' },
  'Completed': { bg: 'bg-emerald-50/60 border-l-[3px] border-l-emerald-500 border-y border-r border-emerald-200/50', text: 'text-emerald-800', dot: 'bg-emerald-500' },
  'Cancelled': { bg: 'bg-red-50/60 border-l-[3px] border-l-red-500 border-y border-r border-red-200/50', text: 'text-red-800', dot: 'bg-red-500' },
  'Pending': { bg: 'bg-amber-50/60 border-l-[3px] border-l-amber-500 border-y border-r border-amber-200/50', text: 'text-amber-800', dot: 'bg-amber-500' },
};

export default function Calendar() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentView, setCurrentView] = useState('Month'); // Month, Week, Day, Agenda
  const [currentDate, setCurrentDate] = useState(new Date());

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setCurrentView('Agenda');
      }
    };
    window.addEventListener('resize', handleResize);
    if (window.innerWidth < 768) {
      setCurrentView('Agenda');
    }
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);

  // Form states
  const [form, setForm] = useState({
    title: '',
    type: 'Customer Meeting',
    customerOne: '',
    customerTwo: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    status: 'Scheduled',
    description: '',
    createdBy: 'Admin Matchmaker'
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [meetingsData, customersData] = await Promise.all([
        getAllMeetings(),
        getCustomers()
      ]);
      setMeetings(meetingsData);
      setCustomers(customersData.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter meetings by search
  const filteredMeetings = useMemo(() => {
    const custMap = {};
    customers.forEach(c => { custMap[c.id] = c; });

    let list = meetings.map(m => ({
      ...m,
      c1: custMap[m.customerOne],
      c2: custMap[m.customerTwo],
    }));

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        (m.title || '').toLowerCase().includes(q) ||
        (m.description || '').toLowerCase().includes(q) ||
        (m.c1 ? `${m.c1.firstName} ${m.c1.lastName}`.toLowerCase().includes(q) : false) ||
        (m.c2 ? `${m.c2.firstName} ${m.c2.lastName}`.toLowerCase().includes(q) : false)
      );
    }

    return list;
  }, [meetings, customers, search]);

  // Navigate dates
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (currentView === 'Month') d.setMonth(d.getMonth() - 1);
    else if (currentView === 'Week') d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (currentView === 'Month') d.setMonth(d.getMonth() + 1);
    else if (currentView === 'Week') d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Open Modal
  const openCreateModal = (dateStr = '') => {
    setSelectedMeeting(null);
    setForm({
      title: '',
      type: 'Customer Meeting',
      customerOne: '',
      customerTwo: '',
      date: dateStr || new Date().toISOString().split('T')[0],
      startTime: '10:00',
      endTime: '11:00',
      location: 'Google Meet',
      status: 'Scheduled',
      description: '',
      createdBy: 'Admin Matchmaker'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (meeting) => {
    setSelectedMeeting(meeting);
    setForm({
      title: meeting.title || '',
      type: meeting.type || 'Customer Meeting',
      customerOne: meeting.customerOne || '',
      customerTwo: meeting.customerTwo || '',
      date: meeting.date || '',
      startTime: meeting.startTime || '',
      endTime: meeting.endTime || '',
      location: meeting.location || '',
      status: meeting.status || 'Scheduled',
      description: meeting.description || '',
      createdBy: meeting.createdBy || 'Admin Matchmaker'
    });
    setIsModalOpen(true);
  };

  // Save Event
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title || !form.date || !form.startTime || !form.endTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (selectedMeeting) {
        // Edit
        await updateMeeting(selectedMeeting.id, form);
        await logActivity(form.customerOne, `Rescheduled meeting: "${form.title}" for ${form.date}`);
        if (form.customerTwo) {
          await logActivity(form.customerTwo, `Rescheduled meeting: "${form.title}" for ${form.date}`);
        }
        toast.success('Meeting updated');
      } else {
        // Create
        await addMeeting(form);
        await logActivity(form.customerOne, `Scheduled meeting: "${form.title}" on ${form.date}`);
        if (form.customerTwo) {
          await logActivity(form.customerTwo, `Scheduled meeting: "${form.title}" on ${form.date}`);
        }
        toast.success('Meeting scheduled successfully');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save meeting');
    }
  };

  // Delete Event
  const handleDelete = async () => {
    if (!selectedMeeting) return;
    if (!window.confirm('Are you sure you want to cancel and delete this meeting?')) return;

    try {
      await deleteMeeting(selectedMeeting.id);
      await logActivity(selectedMeeting.customerOne, `Cancelled meeting: "${selectedMeeting.title}"`);
      toast.success('Meeting deleted');
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete meeting');
    }
  };

  // Grid Calculations
  const monthData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const mStr = String(month === 0 ? 12 : month).padStart(2, '0');
      const yNum = month === 0 ? year - 1 : year;
      days.push({
        dayNum,
        isCurrentMonth: false,
        dateStr: `${yNum}-${mStr}-${String(dayNum).padStart(2, '0')}`
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const mStr = String(month + 1).padStart(2, '0');
      days.push({
        dayNum: i,
        isCurrentMonth: true,
        dateStr: `${year}-${mStr}-${String(i).padStart(2, '0')}`
      });
    }

    // Next month padding to complete 42 days grid
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const mStr = String(month === 11 ? 1 : month + 2).padStart(2, '0');
      const yNum = month === 11 ? year + 1 : year;
      days.push({
        dayNum: i,
        isCurrentMonth: false,
        dateStr: `${yNum}-${mStr}-${String(i).padStart(2, '0')}`
      });
    }

    return days;
  }, [currentDate]);

  // Group events by date for rendering in monthly grid
  const monthMeetingsGroup = useMemo(() => {
    const groups = {};
    filteredMeetings.forEach(m => {
      if (!groups[m.date]) groups[m.date] = [];
      groups[m.date].push(m);
    });
    return groups;
  }, [filteredMeetings]);

  // Group events by date sorted chronologically for Agenda view
  const groupedMeetingsByDate = useMemo(() => {
    const groups = {};
    filteredMeetings.forEach(m => {
      if (!groups[m.date]) groups[m.date] = [];
      groups[m.date].push(m);
    });
    return Object.keys(groups)
      .sort((a, b) => new Date(a) - new Date(b))
      .map(date => ({
        date,
        meetings: groups[date].sort((a, b) => a.startTime.localeCompare(b.startTime))
      }));
  }, [filteredMeetings]);

  const viewMonthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Format Time Helper
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const hr = Number(h);
    return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
  };

  return (
    <div className="bg-[#FAFAF9] min-h-screen">
      <PageHeader
        title="Calendar"
        subtitle="Workspace appointments, matchmaking coordinates, and scheduling logs"
        actions={
          <button onClick={() => openCreateModal()} className="btn btn-accent btn-sm gap-1.5 shadow-xs">
            <Plus size={13} strokeWidth={2.5} /> Schedule Meeting
          </button>
        }
      />

      <div className="px-4 sm:px-8 py-6 space-y-6">

        {/* Navigation Controls & Search Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200/80 pb-4">

          <div className="flex items-center gap-3.5">
            <h2 className="text-xl font-extrabold text-gray-900 w-52 tracking-tight leading-none truncate bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              {viewMonthName}
            </h2>

            <div className="flex gap-1">
              <button onClick={handlePrev} className="w-8 h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-all shadow-3xs active:scale-95" title="Previous Month">
                <ChevronLeft size={15} />
              </button>
              <button onClick={handleToday} className="px-3 h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-600 hover:text-gray-900 transition-all shadow-3xs active:scale-95">
                Today
              </button>
              <button onClick={handleNext} className="w-8 h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-all shadow-3xs active:scale-95" title="Next Month">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 self-stretch md:self-auto flex-wrap">
            {/* View selectors */}
            {!isMobile && (
              <div className="flex border border-gray-200 bg-gray-50/50 rounded-lg p-0.5 shadow-3xs">
                {['Month', 'Agenda'].map(view => (
                  <button
                    key={view}
                    onClick={() => setCurrentView(view)}
                    className={`px-3.5 py-1 text-xs font-bold rounded-md transition-all ${currentView === view
                        ? 'bg-gray-900 text-white shadow-xs'
                        : 'text-gray-500 hover:text-gray-800'
                      }`}
                  >
                    {view}
                  </button>
                ))}
              </div>
            )}

            {/* Search inputs */}
            <div className="relative w-full sm:w-60">
              <Search size={13.5} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search appointments..."
                className="input input-sm pl-9 hover:border-gray-300 focus:border-indigo-500 transition-colors"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Calendar Body */}
        {loading ? (
          <div className="grid grid-cols-7 border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
            {Array.from({ length: 42 }).map((_, i) => (
              <div key={i} className="h-32 border border-gray-100 p-3 space-y-2">
                <Skeleton className="h-3 w-6 rounded" />
                <Skeleton className="h-8 w-full rounded-md" />
              </div>
            ))}
          </div>
        ) : currentView === 'Month' ? (

          /* ── Month Grid View ── */
          <div className="border border-border rounded-2xl overflow-hidden shadow-sm bg-[#FAFAF9]">

            {/* Weekdays names header */}
            <div className="grid grid-cols-7 bg-white border-b border-border text-center font-semibold text-[11px] text-text-secondary uppercase py-3.5 tracking-wider">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <span key={d}>{d}</span>)}
            </div>

            {/* Month Days */}
            <div className="grid grid-cols-7 gap-[1px] bg-border/60">
              {monthData.map((day, idx) => {
                const dayMeetings = monthMeetingsGroup[day.dateStr] || [];
                const isToday = day.dateStr === new Date().toISOString().split('T')[0];

                return (
                  <div
                    key={idx}
                    className={`min-h-36 p-3 flex flex-col justify-between hover:bg-gray-50/60 transition-all duration-200 group cursor-pointer relative ${
                      day.isCurrentMonth ? 'bg-white' : 'bg-[#FAF9F6]/60'
                    } ${isToday ? 'bg-accent/[0.03] ring-1 ring-inset ring-accent/30' : ''}`}
                    onClick={(e) => {
                      if (e.target === e.currentTarget) openCreateModal(day.dateStr);
                    }}
                  >
                    {/* Day indicator */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                          !day.isCurrentMonth
                            ? 'text-text-muted/60'
                            : isToday
                              ? 'bg-accent text-white font-semibold shadow-sm'
                              : 'text-text-primary group-hover:text-accent font-medium'
                        }`}
                      >
                        {day.dayNum}
                      </span>
                      <button
                        onClick={() => openCreateModal(day.dateStr)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 text-text-secondary hover:text-text-primary rounded-md transition-all duration-150 active:scale-95"
                        title="Add meeting to date"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    {/* Day Meetings */}
                    <div className="space-y-1.5 mt-2.5 flex-1 overflow-y-auto max-h-24 scrollbar-none">
                      {dayMeetings.map(m => {
                        const style = STATUS_CONFIG[m.status] || STATUS_CONFIG['Scheduled'];
                        return (
                          <div
                            key={m.id}
                            onClick={() => openEditModal(m)}
                            className={`px-1.5 py-0.5 rounded-r-md rounded-l-xs text-[10px] font-semibold leading-normal truncate flex items-center gap-1.5 hover:shadow-2xs transition-all duration-150 active:scale-[0.98] ${style.bg} ${style.text}`}
                            title={`${m.title} (${m.startTime})`}
                          >
                            <span className={`w-1 h-1 rounded-full ${style.dot} shrink-0`} />
                            <span className="opacity-80 font-mono tracking-tight shrink-0">{m.startTime}</span>
                            <span className="truncate">
                              {m.c1 ? m.c1.firstName : 'Client'} & {m.c2 ? m.c2.firstName : 'Client'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (

          /* ── Agenda View ── */
          <div className="space-y-6 max-w-5xl mx-auto py-2">
            {groupedMeetingsByDate.length === 0 ? (
              <EmptyState
                icon={CalendarIcon}
                title="No meetings found"
                description="Use the search bar above or schedule a new meeting."
              />
            ) : (
              <div className="relative border-l border-border ml-4 pl-8 space-y-8">
                {groupedMeetingsByDate.map((group) => {
                  const dateObj = new Date(group.date);
                  const weekday = dateObj.toLocaleDateString('default', { weekday: 'short' });
                  const dayNum = dateObj.getDate();
                  const monthName = dateObj.toLocaleDateString('default', { month: 'short' });

                  return (
                    <div key={group.date} className="relative group/timeline">
                      {/* Timeline dot badge on the left line */}
                      <div className="absolute -left-[41px] top-1.5 w-6 h-6 rounded-full bg-white border-2 border-accent flex items-center justify-center shadow-3xs group-hover/timeline:scale-110 transition-transform duration-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                      </div>

                      {/* Date Header for the group */}
                      <div className="mb-4">
                        <h3 className="text-xs font-semibold text-text-secondary flex items-baseline gap-2">
                          <span className="text-base font-extrabold text-accent">{weekday}</span>
                          <span className="text-text-muted/50">•</span>
                          <span className="font-semibold text-text-primary">{monthName} {dayNum}</span>
                        </h3>
                      </div>

                      {/* Meetings list */}
                      <div className="space-y-3.5">
                        {group.meetings.map(m => {
                          const style = STATUS_CONFIG[m.status] || STATUS_CONFIG['Scheduled'];
                          return (
                            <div
                              key={m.id}
                              onClick={() => openEditModal(m)}
                              className="bg-white border border-border-subtle hover:border-border rounded-xl p-4 shadow-3xs hover:shadow-xs transition-all duration-200 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                            >
                              <div className="flex items-start gap-4">
                                <div className={`p-2.5 rounded-xl flex-shrink-0 flex items-center justify-center ${style.bg} ${style.text}`}>
                                  <Clock size={16} />
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-sm font-bold text-text-primary tracking-tight">
                                      {m.title}
                                    </h4>
                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${style.bg} ${style.text}`}>
                                      {m.status}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11.5px] text-text-secondary font-medium">
                                    <span className="flex items-center gap-1">
                                      <Clock size={12} className="text-text-muted" />
                                      {formatTime(m.startTime)} – {formatTime(m.endTime)}
                                    </span>
                                    <span className="text-text-muted/40">•</span>
                                    <span className="flex items-center gap-1">
                                      <MapPin size={12} className="text-text-muted" />
                                      {m.location || 'Google Meet'}
                                    </span>
                                    {m.type && (
                                      <>
                                        <span className="text-text-muted/40">•</span>
                                        <span className="text-text-muted">{m.type}</span>
                                      </>
                                    )}
                                  </div>
                                  {m.description && (
                                    <p className="text-xs text-text-secondary italic bg-gray-50/50 border-l-2 border-border pl-3 py-1.5 mt-2 rounded-r-md max-w-2xl leading-relaxed">
                                      "{m.description}"
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Clients involved */}
                              <div className="flex items-center justify-between border-t border-border-subtle pt-3 md:border-none md:pt-0 gap-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="flex -space-x-2">
                                    <Avatar
                                      name={`${m.c1?.firstName || 'Client'} ${m.c1?.lastName || 'One'}`}
                                      photo={m.c1?.photo}
                                      size="xs"
                                      className="ring-2 ring-white"
                                    />
                                    <Avatar
                                      name={`${m.c2?.firstName || 'Client'} ${m.c2?.lastName || 'Two'}`}
                                      photo={m.c2?.photo}
                                      size="xs"
                                      className="ring-2 ring-white"
                                    />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-xs text-text-primary font-semibold">
                                      {m.c1 ? `${m.c1.firstName} ${m.c1.lastName}` : 'Client One'}
                                    </span>
                                    <span className="text-[10px] text-text-muted">
                                      & {m.c2 ? `${m.c2.firstName} ${m.c2.lastName}` : 'Client Two'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Create/Edit Event Modal ── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] animate-scale-in"
            >

              {/* Header */}
              <div className="px-6 py-5 border-b border-border-subtle flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-soft border border-accent/10 flex items-center justify-center text-accent flex-shrink-0">
                    <CalendarIcon size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-text-primary tracking-tight">
                      {selectedMeeting ? 'Modify Appointment' : 'Schedule Matchmaker Meeting'}
                    </h3>
                    <p className="text-xs text-text-muted font-medium mt-0.5">
                      Configure matches synchronization parameters
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-gray-100 text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">

                {/* Title */}
                <div>
                  <label className="text-label mb-1.5 block">Meeting Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Priya & Rahul Cafe Introduction"
                    className="input w-full text-sm"
                    value={form.title}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  />
                </div>

                {/* Grid Type & Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-label mb-1.5 block">Appointment Type</label>
                    <select
                      className="input w-full text-sm bg-white"
                      value={form.type}
                      onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                    >
                      {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-label mb-1.5 block">Meeting Status</label>
                    <select
                      className="input w-full text-sm bg-white"
                      value={form.status}
                      onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                    >
                      {Object.keys(STATUS_CONFIG).map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* Customers involved */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-label mb-1.5 block">Client One *</label>
                    <select
                      required
                      className="input w-full text-sm bg-white"
                      value={form.customerOne}
                      onChange={e => setForm(p => ({ ...p, customerOne: e.target.value }))}
                    >
                      <option value="">Select Candidate</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.firstName} {c.lastName} ({c.gender})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-label mb-1.5 block">Client Two (Optional)</label>
                    <select
                      className="input w-full text-sm bg-white"
                      value={form.customerTwo}
                      onChange={e => setForm(p => ({ ...p, customerTwo: e.target.value }))}
                    >
                      <option value="">Select Partner</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.firstName} {c.lastName} ({c.gender})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Timing */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <label className="text-label mb-1.5 block">Date *</label>
                    <input
                      type="date"
                      required
                      className="input w-full text-sm font-medium text-gray-700 bg-white"
                      value={form.date}
                      onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="text-label mb-1.5 block">Start Time *</label>
                    <input
                      type="time"
                      required
                      className="input w-full text-sm font-medium text-gray-700 bg-white"
                      value={form.startTime}
                      onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="text-label mb-1.5 block">End Time *</label>
                    <input
                      type="time"
                      required
                      className="input w-full text-sm font-medium text-gray-700 bg-white"
                      value={form.endTime}
                      onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="text-label mb-1.5 block">Location / Coordinate</label>
                  <input
                    type="text"
                    placeholder="e.g. Google Meet Link, Office, Cafe Address"
                    className="input w-full text-sm"
                    value={form.location}
                    onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                  />
                </div>

                {/* Notes/Description */}
                <div>
                  <label className="text-label mb-1.5 block">Meeting Notes & Description</label>
                  <textarea
                    rows={3}
                    placeholder="Provide details, agendas, and matchmaker briefing logs..."
                    className="input w-full resize-none py-2 text-sm"
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  />
                </div>
              </form>

              {/* Actions Footer */}
              <div className="px-6 py-4.5 border-t border-border-subtle flex items-center justify-between bg-gray-50">
                {selectedMeeting ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="btn btn-danger gap-1.5 font-bold shadow-sm"
                  >
                    <Trash2 size={13} /> Cancel Event
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="btn btn-secondary font-semibold"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleSave}
                    className="btn btn-primary font-bold shadow-sm"
                  >
                    {selectedMeeting ? 'Update Appointment' : 'Schedule Meeting'}
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
