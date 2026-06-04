import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Pencil, Trash2, Plus, Check, X } from 'lucide-react';
import { addNote, updateNote, deleteNote } from '../../services/firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { Skeleton } from '../ui/Skeleton';
import toast from 'react-hot-toast';

function formatTs(ts) {
  if (!ts) return '';
  try {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return formatDistanceToNow(d, { addSuffix: true });
  } catch { return ''; }
}

function NoteItem({ note, onEdit, onDelete }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteNote(note.id);
      toast.success('Note deleted');
      onDelete();
    } catch {
      toast.error('Failed to delete note');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="group relative p-3.5 rounded-lg transition-colors"
      style={{ background: '#F9FAFB', border: '1px solid #F3F4F6' }}
    >
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{note.note}</p>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-gray-400">{formatTs(note.createdAt)}</span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(note)}
            className="btn btn-ghost btn-xs gap-1 text-gray-400 hover:text-gray-700"
          >
            <Pencil size={11} />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="btn btn-ghost btn-xs gap-1 text-gray-400 hover:text-red-500"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}

function NoteEditor({ initialValue = '', onSave, onCancel, saving }) {
  const [text, setText] = useState(initialValue);

  return (
    <div>
      <textarea
        className="input"
        rows={4}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Add a note about this customer…"
        style={{ resize: 'vertical', lineHeight: '1.6' }}
        autoFocus
      />
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => onSave(text)}
          disabled={!text.trim() || saving}
          className="btn btn-primary btn-sm gap-1.5"
        >
          {saving
            ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <Check size={12} />}
          Save
        </button>
        <button onClick={onCancel} className="btn btn-secondary btn-sm">
          <X size={12} /> Cancel
        </button>
      </div>
    </div>
  );
}

export default function NotesPanel({ customerId, notes = [], loading, onNotesChange }) {
  const { user } = useAuth();
  const [adding, setAdding]     = useState(false);
  const [editing, setEditing]   = useState(null); // note object
  const [saving, setSaving]     = useState(false);

  const handleAdd = async (text) => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await addNote(customerId, text.trim(), user?.email || 'Matchmaker');
      toast.success('Note added');
      setAdding(false);
      onNotesChange?.();
    } catch {
      toast.error('Failed to add note');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (text) => {
    if (!text.trim() || !editing) return;
    setSaving(true);
    try {
      await updateNote(editing.id, text.trim());
      toast.success('Note updated');
      setEditing(null);
      onNotesChange?.();
    } catch {
      toast.error('Failed to update note');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Add button */}
      {!adding && !editing && (
        <button
          onClick={() => setAdding(true)}
          className="btn btn-secondary btn-sm w-full justify-start gap-2 text-gray-500"
        >
          <Plus size={13} /> Add a note…
        </button>
      )}

      {/* Add form */}
      {adding && (
        <NoteEditor
          onSave={handleAdd}
          onCancel={() => setAdding(false)}
          saving={saving}
        />
      )}

      {/* Notes list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : notes.length === 0 && !adding ? (
        <p className="text-xs text-gray-400 py-4 text-center">No notes yet. Add your first note above.</p>
      ) : (
        <div className="space-y-2">
          {notes.map(note => (
            editing?.id === note.id ? (
              <NoteEditor
                key={note.id}
                initialValue={note.note}
                onSave={handleEdit}
                onCancel={() => setEditing(null)}
                saving={saving}
              />
            ) : (
              <NoteItem
                key={note.id}
                note={note}
                onEdit={setEditing}
                onDelete={onNotesChange}
              />
            )
          ))}
        </div>
      )}
    </div>
  );
}
