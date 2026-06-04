import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Sparkles, Copy, Check } from 'lucide-react';
import { generateIntro } from '../../services/ai';
import { saveMatch, logActivity, updateCustomer } from '../../services/firebase/firestore';
import Avatar from '../ui/Avatar';
import toast from 'react-hot-toast';

export default function SendMatchModal({ isOpen, match, customer, onClose, onSent }) {
  const [intro, setIntro]           = useState('');
  const [introLoading, setIntroLoading] = useState(false);
  const [sending, setSending]       = useState(false);
  const [copied, setCopied]         = useState(false);

  if (!isOpen || !match) return null;
  const { profile, score, breakdown } = match;

  const handleGenerateIntro = async () => {
    setIntroLoading(true);
    try {
      const res = await generateIntro(customer, profile, score);
      setIntro(res.intro);
    } catch {
      toast.error('Could not generate introduction');
    } finally {
      setIntroLoading(false);
    }
  };

  const handleSend = async () => {
    setSending(true);
    try {
      await saveMatch({
        customerId: customer.id,
        profileId:  profile.id,
        score,
        breakdown,
        intro,
        status:     'Sent',
        customerName: `${customer.firstName} ${customer.lastName}`,
        profileName:  `${profile.firstName} ${profile.lastName}`,
      });
      await logActivity(customer.id, `Match Sent → ${profile.firstName} ${profile.lastName}`);
      await updateCustomer(customer.id, { status: 'Match Sent' });
      toast.success(`Match sent to ${profile.firstName}!`);
      onSent?.();
      onClose();
    } catch {
      toast.error('Failed to send match');
    } finally {
      setSending(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(intro);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ duration: 0.18 }}
            className="modal"
          >
            {/* Header */}
            <div className="modal-header">
              <div>
                <h2 className="text-base font-semibold text-gray-800">Send Match</h2>
                <p className="text-xs text-gray-400 mt-0.5">Confirm and send this match introduction</p>
              </div>
              <button onClick={onClose} className="btn btn-ghost btn-xs p-1">
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="modal-body">
              {/* Match summary */}
              <div
                className="flex items-center gap-4 p-4 rounded-lg mb-5"
                style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar name={`${customer.firstName} ${customer.lastName}`} photo={customer.photo} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">{customer.firstName} {customer.lastName}</p>
                    <p className="text-[10px] text-gray-400">Customer</p>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                  <div
                    className="text-sm font-bold"
                    style={{
                      color: score >= 75 ? '#10B981' : score >= 55 ? '#3B82F6' : '#F59E0B'
                    }}
                  >
                    {score}%
                  </div>
                  <div className="text-[9px] font-medium text-gray-400 uppercase tracking-wide">Match</div>
                </div>

                <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
                  <div className="text-right min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">{profile.firstName} {profile.lastName}</p>
                    <p className="text-[10px] text-gray-400">Match</p>
                  </div>
                  <Avatar name={`${profile.firstName} ${profile.lastName}`} photo={profile.photo} size="sm" />
                </div>
              </div>

              {/* Introduction message */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="form-label">Introduction Message</label>
                  <button
                    onClick={handleGenerateIntro}
                    disabled={introLoading}
                    className="btn btn-ghost btn-xs gap-1.5 text-gray-500"
                  >
                    {introLoading
                      ? <span className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                      : <Sparkles size={11} />}
                    {intro ? 'Regenerate' : 'Generate with AI'}
                  </button>
                </div>

                <div className="relative">
                  <textarea
                    className="input"
                    rows={6}
                    style={{ resize: 'vertical', lineHeight: '1.6' }}
                    value={intro}
                    onChange={e => setIntro(e.target.value)}
                    placeholder="Write a personalised introduction for this match, or generate one with AI…"
                  />
                  {intro && (
                    <button
                      onClick={handleCopy}
                      className="absolute top-2 right-2 btn btn-ghost btn-xs gap-1"
                    >
                      {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className="btn btn-primary gap-1.5"
              >
                {sending
                  ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Send size={13} />}
                Send Match
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
