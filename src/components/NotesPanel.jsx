import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import {
  StickyNote, Plus, Edit2, Trash2, Check, X, MessageSquare
} from 'lucide-react';
import { addNote, updateNote, deleteNote } from '../services/firebase/firestore';
import { logActivity } from '../services/firebase/firestore';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

function formatDate(ts) {
  if (!ts) return '';
  try {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return formatDistanceToNow(d, { addSuffix: true });
  } catch { return ''; }
}

export default function NotesPanel({ customerId, notes = [], onNotesChange }) {
  const { user } = useAuth();
  const [adding, setAdding] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!newNote.trim()) return;
    setLoading(true);
    try {
      await addNote(customerId, newNote.trim(), user?.email || 'Matchmaker');
      await logActivity(customerId, 'Note Added');
      setNewNote('');
      setAdding(false);
      toast.success('Note added');
      onNotesChange?.();
    } catch (e) {
      toast.error('Failed to add note');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id) => {
    if (!editText.trim()) return;
    setLoading(true);
    try {
      await updateNote(id, editText.trim());
      setEditId(null);
      toast.success('Note updated');
      onNotesChange?.();
    } catch (e) {
      toast.error('Failed to update note');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this note?')) return;
    try {
      await deleteNote(id);
      toast.success('Note deleted');
      onNotesChange?.();
    } catch (e) {
      toast.error('Failed to delete note');
    }
  };

  return (
    <div>
      {/* Add Note Button */}
      <div className="flex items-center justify-between mb-4">
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="btn-primary text-xs px-3 py-2"
          >
            <Plus size={14} /> Add Note
          </button>
        )}
      </div>

      {/* New Note Input */}
      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-4 rounded-xl p-4"
            style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)' }}
          >
            <textarea
              className="input-field resize-none mb-3"
              rows={3}
              placeholder="Write a note about this customer..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={loading || !newNote.trim()}
                className="btn-primary text-xs px-3 py-1.5"
              >
                <Check size={13} /> Save
              </button>
              <button
                onClick={() => { setAdding(false); setNewNote(''); }}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                <X size={13} /> Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare size={28} className="mx-auto mb-2" style={{ color: '#d4b483' }} />
          <p className="text-sm text-gray-400">No notes yet. Add your first note.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {notes.map((note, i) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-xl p-4 group"
                style={{
                  background: 'rgba(253,250,246,0.8)',
                  border: '1px solid #f0e4cc',
                }}
              >
                {editId === note.id ? (
                  <div>
                    <textarea
                      className="input-field resize-none mb-3"
                      rows={3}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdate(note.id)}
                        className="btn-primary text-xs px-3 py-1.5"
                      >
                        <Check size={13} /> Save
                      </button>
                      <button
                        onClick={() => setEditId(null)}
                        className="btn-secondary text-xs px-3 py-1.5"
                      >
                        <X size={13} /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <StickyNote size={13} style={{ color: '#c9a84c' }} />
                          <span className="text-xs font-medium" style={{ color: '#c9a84c' }}>
                            {note.createdBy || 'Matchmaker'}
                          </span>
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs text-gray-400">{formatDate(note.createdAt)}</span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{note.note}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditId(note.id); setEditText(note.note); }}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(note.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
