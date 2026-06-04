import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getCustomers, getAllNotes, addNote, updateNote, deleteNote } from '../services/firebase/firestore';
import PageHeader from '../components/layout/PageHeader';
import { Skeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import Avatar from '../components/ui/Avatar';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

// Correct icon imports from lucide
import { 
  Pin as PinIcon, Trash2 as TrashIcon, Bold as BoldIcon, Italic as ItalicIcon, 
  Heading as HeadingIcon, List as ListIcon, Search as SearchIcon, RefreshCw as RefreshIcon, 
  ChevronRight as ChevronRightIcon, Clock as ClockIcon, User as UserIcon, MessageSquare as MessageSquareIcon,
  FileText
} from 'lucide-react';

export default function Notes() {
  const navigate = useNavigate();
  
  // Data states
  const [notes, setNotes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering states
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('All');
  const [filterPinned, setFilterPinned] = useState(false);
  
  // Create Form states
  const [newNote, setNewNote] = useState('');
  const [targetCustomerId, setTargetCustomerId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const textareaRef = useRef(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [notesData, custsData] = await Promise.all([
        getAllNotes(),
        getCustomers()
      ]);
      setNotes(notesData);
      setCustomers(custsData.sort((a,b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load notes data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Format Helper: Markdown-to-HTML parser
  const renderMarkdown = (text) => {
    if (!text) return '';
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    
    // Bold: **text**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic: *text*
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Headings: ### text
    html = html.replace(/^### (.*?)$/gm, '<h3 class="text-xs font-bold text-gray-800 mt-2 mb-1">$1</h3>');
    // Bullet list: - text
    html = html.replace(/^- (.*?)$/gm, '<li class="ml-4 list-disc text-gray-600">$1</li>');
    // Paragraphs
    html = html.replace(/\n/g, '<br />');
    
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  // Editor Actions
  const insertText = (before, after = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const selected = value.substring(start, end);
    const replacement = before + (selected || '') + after;

    setNewNote(value.substring(0, start) + replacement + value.substring(end));
    
    // Focus back & reposition cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + (selected || '').length);
    }, 10);
  };

  // Create note submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newNote.trim() || !targetCustomerId) {
      toast.error('Please write a note and select a customer');
      return;
    }

    setIsSubmitting(true);
    try {
      await addNote(targetCustomerId, newNote.trim(), 'Admin Matchmaker');
      setNewNote('');
      toast.success('Note added successfully');
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to add note');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Pinned
  const handleTogglePin = async (note) => {
    try {
      const targetState = !note.pinned;
      await updateNote(note.id, { pinned: targetState });
      setNotes(prev =>
        prev.map(n => n.id === note.id ? { ...n, pinned: targetState } : n)
      );
      toast.success(targetState ? 'Note pinned to top' : 'Note unpinned');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update pin status');
    }
  };

  // Delete note
  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    try {
      await deleteNote(noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
      toast.success('Note deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete note');
    }
  };

  // Filter notes
  const filteredNotes = useMemo(() => {
    const custMap = {};
    customers.forEach(c => { custMap[c.id] = c; });

    let list = notes.map(n => ({
      ...n,
      customer: custMap[n.customerId] || null,
    }));

    if (selectedCustomerId !== 'All') {
      list = list.filter(n => n.customerId === selectedCustomerId);
    }

    if (filterPinned) {
      list = list.filter(n => n.pinned);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(n =>
        (n.note || '').toLowerCase().includes(q) ||
        (n.createdBy || '').toLowerCase().includes(q) ||
        (n.customer ? `${n.customer.firstName} ${n.customer.lastName}`.toLowerCase().includes(q) : false)
      );
    }

    // Sort pinned notes to the absolute top, then by timestamp
    return list.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      
      const ta = a.createdAt?.toMillis?.() ?? 0;
      const tb = b.createdAt?.toMillis?.() ?? 0;
      return tb - ta;
    });
  }, [notes, customers, selectedCustomerId, filterPinned, search]);

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
        title="CRM Matchmaker Notes"
        subtitle="Workspace logs, candidate records updates, and operational matching annotations"
        actions={
          <button onClick={loadData} className="btn btn-secondary btn-sm gap-1.5 shadow-xs">
            <RefreshIcon size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        }
      />

      <div className="px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* ── Left Sidebar: Client selectors ── */}
          <div className="w-full lg:w-60 flex-shrink-0 space-y-4">
            <div className="card p-4 bg-white">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Folders</h3>
              
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedCustomerId('All')}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${
                    selectedCustomerId === 'All'
                      ? 'bg-gray-900 text-white shadow-xs'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span>All Candidates</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${selectedCustomerId === 'All' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {notes.length}
                  </span>
                </button>

                <div className="pt-2 mt-2 border-t border-gray-100 space-y-1 overflow-y-auto max-h-[300px] scrollbar-none">
                  {customers.map(c => {
                    const count = notes.filter(n => n.customerId === c.id).length;
                    if (count === 0) return null; // Only show customers who have notes

                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCustomerId(c.id)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between truncate ${
                          selectedCustomerId === c.id
                            ? 'bg-gray-900 text-white shadow-xs'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                      >
                        <span className="truncate pr-2">{c.firstName} {c.lastName}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${selectedCustomerId === c.id ? 'bg-white/20 text-white' : 'bg-gray-150 text-gray-500'}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Active Pinned Toggles */}
            <div className="card p-4 bg-white flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700">Filter Pinned Notes</span>
              <button
                onClick={() => setFilterPinned(p => !p)}
                className={`w-8 h-4 rounded-full transition-all relative p-0.5 ${filterPinned ? 'bg-gray-950' : 'bg-gray-200'}`}
              >
                <div className={`w-3 h-3 rounded-full bg-white transition-all ${filterPinned ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          {/* ── Main Pane ── */}
          <div className="flex-1 min-w-0 space-y-5">
            
            {/* Create CRM Note */}
            <div className="card p-5 bg-white shadow-xs border border-gray-200">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Add Customer Note</h3>
              
              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Linked Customer selector */}
                <div className="flex items-center gap-2 max-w-md">
                  <select
                    className="input input-sm w-full font-semibold"
                    value={targetCustomerId}
                    onChange={e => setTargetCustomerId(e.target.value)}
                    required
                  >
                    <option value="">Link Note to Candidate...</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName} ({c.city || 'Delhi'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Editor Textarea */}
                <div className="border border-gray-200 rounded-lg overflow-hidden focus-within:border-gray-400 focus-within:ring-1 focus-within:ring-gray-400">
                  {/* formatting toolbar */}
                  <div className="bg-gray-50 border-b border-gray-200 px-3 py-1.5 flex items-center gap-1.5">
                    <button 
                      type="button" 
                      onClick={() => insertText('**', '**')}
                      className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors"
                      title="Bold text"
                    >
                      <BoldIcon size={12} strokeWidth={3} />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => insertText('*', '*')}
                      className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors"
                      title="Italic text"
                    >
                      <ItalicIcon size={12} strokeWidth={3} />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => insertText('### ')}
                      className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors"
                      title="Heading"
                    >
                      <HeadingIcon size={12} strokeWidth={3} />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => insertText('- ')}
                      className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors"
                      title="Bullet list"
                    >
                      <ListIcon size={12} strokeWidth={3} />
                    </button>
                    <span className="text-[10px] text-gray-300 ml-auto font-semibold">Rich Formatting Markdown</span>
                  </div>
                  
                  <textarea
                    ref={textareaRef}
                    rows={3}
                    required
                    placeholder="Write matching logs, family preferences, background details..."
                    className="w-full border-none outline-none focus:ring-0 p-3 text-xs leading-relaxed text-gray-700 resize-none h-24"
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm px-4 gap-1 shadow-xs"
                    disabled={isSubmitting || !newNote.trim() || !targetCustomerId}
                  >
                    {isSubmitting ? 'Saving...' : 'Add Note'}
                  </button>
                </div>
              </form>
            </div>

            {/* Notes List Header / Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-2">
              <h3 className="text-sm font-bold text-gray-900 tracking-tight">
                {selectedCustomerId === 'All' ? 'All Workspace Notes' : 'Linked Notes Folder'}
              </h3>
              
              <div className="relative w-full sm:w-64">
                <SearchIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search inside notes..."
                  className="input input-sm pl-8.5"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Notes Render List */}
            {loading && filteredNotes.length === 0 ? (
              <div className="space-y-4">
                {[1, 2].map(i => (
                  <div key={i} className="card p-5 space-y-3">
                    <Skeleton className="h-4 w-1/4 rounded" />
                    <Skeleton className="h-10 w-full rounded" />
                  </div>
                ))}
              </div>
            ) : filteredNotes.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No notes logged"
                description="Use the input above to link and submit a new candidate note."
              />
            ) : (
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {filteredNotes.map((note) => {
                    const custName = note.customer
                      ? `${note.customer.firstName} ${note.customer.lastName}`
                      : 'System/Unknown';

                    return (
                      <motion.div
                        key={note.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className={`card p-5 bg-white hover:shadow-xs transition-shadow relative border ${
                          note.pinned ? 'border-indigo-150' : 'border-gray-200'
                        }`}
                      >
                        {/* Pinned label indicator bar */}
                        {note.pinned && (
                          <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-t-xl" />
                        )}

                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0">
                            {/* Note header links */}
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              {note.customer && (
                                <div
                                  className="flex items-center gap-1.5 cursor-pointer hover:underline text-xs font-bold text-gray-800"
                                  onClick={() => navigate(`/customers/${note.customerId}`)}
                                >
                                  <Avatar name={custName} photo={note.customer.photo} size="xs" />
                                  <span>{custName}</span>
                                </div>
                              )}
                              <span className="text-gray-300 text-xs">·</span>
                              <span className="text-[10px] text-gray-400 bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5">
                                Matchmaker: {note.createdBy || 'Admin'}
                              </span>
                            </div>

                            {/* Markdown Render Body */}
                            <div className="text-xs text-gray-600 leading-relaxed font-medium">
                              {renderMarkdown(note.note)}
                            </div>

                            {/* Stamp footer */}
                            <div className="flex items-center gap-1 mt-4 text-[10px] text-gray-400 font-semibold">
                              <ClockIcon size={10} />
                              <span>{formatTs(note.createdAt)}</span>
                            </div>
                          </div>

                          {/* Action controls */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => handleTogglePin(note)}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                note.pinned
                                  ? 'bg-indigo-50 border-indigo-150 text-[#4F46E5]'
                                  : 'bg-white border-gray-200 text-gray-400 hover:text-gray-800'
                              }`}
                              title={note.pinned ? 'Unpin note' : 'Pin note'}
                            >
                              <PinIcon size={12} className={note.pinned ? 'fill-indigo-500' : ''} />
                            </button>

                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-red-50 hover:border-red-200 text-gray-400 hover:text-red-600 transition-colors"
                              title="Delete note"
                            >
                              <TrashIcon size={12} />
                            </button>
                            
                            {note.customer && (
                              <button
                                className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-400 hover:text-gray-850 transition-colors"
                                onClick={() => navigate(`/customers/${note.customerId}`)}
                                title="Go to customer profile"
                              >
                                <ChevronRightIcon size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
