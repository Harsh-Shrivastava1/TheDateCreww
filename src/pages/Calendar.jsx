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
  'Scheduled': { bg: 'bg-blue-50 border-blue-150', text: 'text-blue-700', dot: 'bg-blue-500' },
  'Completed': { bg: 'bg-emerald-50 border-emerald-150', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'Cancelled': { bg: 'bg-red-50 border-red-150', text: 'text-red-700', dot: 'bg-red-500' },
  'Pending': { bg: 'bg-amber-50 border-amber-150', text: 'text-amber-700', dot: 'bg-amber-500' },
};

export default function Calendar() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentView, setCurrentView] = useState('Month'); // Month, Week, Day, Agenda
  const [currentDate, setCurrentDate] = useState(new Date());

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
          <button onClick={() => openCreateModal()} className="btn btn-primary btn-sm gap-1.5 shadow-xs">
            <Plus size={13} strokeWidth={2.5} /> Schedule Meeting
          </button>
        }
      />

      <div className="px-8 py-6 space-y-6">

        {/* Navigation Controls & Search Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-3">

          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900 w-44 tracking-tight leading-none truncate">
              {viewMonthName}
            </h2>

            <div className="flex gap-1.5">
              <button onClick={handlePrev} className="w-7 h-7 rounded border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors">
                <ChevronLeft size={14} />
              </button>
              <button onClick={handleToday} className="px-2.5 h-7 rounded border border-gray-200 bg-white hover:bg-gray-50 text-[11px] font-bold text-gray-500 hover:text-gray-800 transition-colors">
                Today
              </button>
              <button onClick={handleNext} className="w-7 h-7 rounded border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 self-stretch md:self-auto flex-wrap">
            {/* View selectors */}
            <div className="flex border border-gray-200 rounded-lg p-0.5 bg-white shadow-3xs">
              {['Month', 'Agenda'].map(view => (
                <button
                  key={view}
                  onClick={() => setCurrentView(view)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${currentView === view
                      ? 'bg-gray-900 text-white shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                    }`}
                >
                  {view}
                </button>
              ))}
            </div>

            {/* Search inputs */}
            <div className="relative w-full sm:w-56">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search appointments..."
                className="input input-sm pl-8.5"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Calendar Body */}
        {loading ? (
          <div className="grid grid-cols-7 border border-gray-200 rounded-xl overflow-hidden bg-white">
            {Array.from({ length: 42 }).map((_, i) => (
              <div key={i} className="h-28 border border-gray-100 p-2 space-y-1">
                <Skeleton className="h-3 w-5 rounded" />
                <Skeleton className="h-8 w-full rounded" />
              </div>
            ))}
          </div>
        ) : currentView === 'Month' ? (

          /* ── Month Grid View ── */
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs bg-white">

            {/* Weekdays names header */}
            <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200 text-center font-bold text-[10px] text-gray-400 uppercase py-2 tracking-wider">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <span key={d}>{d}</span>)}
            </div>

            {/* Month Days */}
            <div className="grid grid-cols-7">
              {monthData.map((day, idx) => {
                const dayMeetings = monthMeetingsGroup[day.dateStr] || [];
                const isToday = day.dateStr === new Date().toISOString().split('T')[0];

                return (
                  <div
                    key={idx}
                    className={`min-h-28 border-r border-b border-gray-150 p-2 flex flex-col justify-between hover:bg-gray-50/30 transition-colors group cursor-pointer ${day.isCurrentMonth ? '' : 'bg-gray-50/10'
                      }`}
                    onClick={(e) => {
                      if (e.target === e.currentTarget) openCreateModal(day.dateStr);
                    }}
                  >
                    {/* Day indicator */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-semibold w-5 h-5 rounded-full flex items-center justify-center ${!day.isCurrentMonth ? 'text-gray-300' : 'text-gray-700'
                          } ${isToday ? 'bg-[#4F46E5] text-white font-bold' : ''
                          }`}
                      >
                        {day.dayNum}
                      </span>
                      <button
                        onClick={() => openCreateModal(day.dateStr)}
                        className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded hover:bg-gray-150 flex items-center justify-center text-gray-400 hover:text-gray-800 transition-all"
                        title="Add meeting to date"
                      >
                        <Plus size={11} />
                      </button>
                    </div>

                    {/* Day Meetings */}
                    <div className="space-y-1 mt-1 flex-1 overflow-y-auto max-h-20 scrollbar-none">
                      {dayMeetings.map(m => {
                        const style = STATUS_CONFIG[m.status] || STATUS_CONFIG['Scheduled'];
                        return (
                          <div
                            key={m.id}
                            onClick={() => openEditModal(m)}
                            className={`px-1.5 py-0.5 rounded border text-[9.5px] font-bold leading-tight truncate flex items-center gap-1 hover:shadow-2xs ${style.bg} ${style.text}`}
                            title={`${m.title} (${m.startTime})`}
                          >
                            <span className={`w-1 h-1 rounded-full ${style.dot}`} />
                            <span className="opacity-90">{m.startTime}</span>
                            <span>
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
          <div className="space-y-4">
            {filteredMeetings.length === 0 ? (
              <EmptyState
                icon={CalendarIcon}
                title="No meetings found"
                description="Use the search bar above or schedule a new meeting."
              />
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs divide-y divide-gray-150">
                {filteredMeetings.map(m => {
                  const style = STATUS_CONFIG[m.status] || STATUS_CONFIG['Scheduled'];
                  return (
                    <div
                      key={m.id}
                      onClick={() => openEditModal(m)}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg text-gray-500 flex-shrink-0">
                          <CalendarIcon size={18} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-gray-800">{m.title}</h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10.5px] text-gray-400 font-semibold">
                            <span className="flex items-center gap-1">
                              <Clock size={10} />
                              {m.date} at {formatTime(m.startTime)} – {formatTime(m.endTime)}
                            </span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <MapPin size={10} />
                              {m.location || 'Google Meet'}
                            </span>
                          </div>
                          {m.description && (
                            <p className="text-[11px] text-gray-500 mt-1 leading-relaxed max-w-xl italic">
                              "{m.description}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Clients involved */}
                      <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            <Avatar name={`${m.c1?.firstName || 'Client'} ${m.c1?.lastName || 'One'}`} photo={m.c1?.photo} size="xs" />
                            <Avatar name={`${m.c2?.firstName || 'Client'} ${m.c2?.lastName || 'Two'}`} photo={m.c2?.photo} size="xs" />
                          </div>
                          <span className="text-xs text-gray-600 font-bold">
                            {m.c1?.firstName || 'Client'} & {m.c2?.firstName || 'Client'}
                          </span>
                        </div>

                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${style.bg} ${style.text}`}>
                          {m.status}
                        </span>
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
              <div className="px-6 py-5 border-b border-gray-150 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-650 flex-shrink-0">
                    <CalendarIcon size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 tracking-tight">
                      {selectedMeeting ? 'Modify Appointment' : 'Schedule Matchmaker Meeting'}
                    </h3>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">
                      Configure matches synchronization parameters
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-gray-150 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors"
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
              <div className="px-6 py-4.5 border-t border-gray-150 flex items-center justify-between bg-gray-50">
                {selectedMeeting ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="btn btn-secondary border-red-200 text-red-655 hover:bg-red-50 hover:border-red-300 gap-1.5 font-bold shadow-sm"
                    style={{ color: '#ef4444' }}
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
                    style={{ color: '#374151', backgroundColor: '#ffffff', borderColor: '#d1d5db' }}
                  >
                    Close
                  </button>
                  <button
                    onClick={handleSave}
                    className="btn btn-primary font-bold shadow-sm bg-indigo-650 hover:bg-indigo-700 border-indigo-650 text-white"
                    style={{ color: '#ffffff' }}
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
