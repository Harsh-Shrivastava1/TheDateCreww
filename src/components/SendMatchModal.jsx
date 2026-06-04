import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Check, MapPin, Briefcase, GraduationCap, Sparkles } from 'lucide-react';
import { generateIntro } from '../services/ai';
import { saveMatch, updateMatchStatus, logActivity, updateCustomer } from '../services/firebase/firestore';
import toast from 'react-hot-toast';

export default function SendMatchModal({ isOpen, onClose, customer, match }) {
  const [intro, setIntro] = useState('');
  const [loadingIntro, setLoadingIntro] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const profile = match?.profile;

  useEffect(() => {
    if (isOpen && customer && profile && !intro) {
      fetchIntro();
    }
  }, [isOpen]);

  const fetchIntro = async () => {
    setLoadingIntro(true);
    try {
      const data = await generateIntro(customer, profile);
      setIntro(data.intro);
    } catch {
      setIntro(`Hi ${customer?.firstName}, we found a promising match who shares your values and future plans. We'd love to introduce you to ${profile?.firstName}.`);
    } finally {
      setLoadingIntro(false);
    }
  };

  const handleSend = async () => {
    setSending(true);
    try {
      // Save match record
      const matchDoc = await saveMatch({
        customerId: customer.id,
        matchedProfileId: profile.id,
        score: match.score,
        aiLabel: match.aiLabel,
        explanation: match.details?.join('; ') || '',
        status: 'Sent',
        introMessage: intro,
      });

      // Update customer status
      await updateCustomer(customer.id, { status: 'Match Sent' });

      // Log activity
      await logActivity(customer.id, `Match Sent — ${profile.firstName} ${profile.lastName} (${match.score}% compatible)`);

      setSent(true);
      toast.success(`Match sent to ${customer.firstName}!`);
      setTimeout(() => {
        setSent(false);
        setIntro('');
        onClose?.();
      }, 2000);
    } catch (e) {
      console.error(e);
      toast.error('Failed to send match');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen || !customer || !profile) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(20,20,20,0.7)', backdropFilter: 'blur(4px)' }}
        onClick={(e) => e.target === e.currentTarget && onClose?.()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl w-full max-w-lg overflow-hidden"
          style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #f0e4cc' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #c9a84c, #b8920e)' }}>
                <Send size={16} className="text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-800 text-base">Send Match</h2>
                <p className="text-xs text-gray-400">Review and confirm</p>
              </div>
            </div>
            <button onClick={onClose} className="btn-ghost p-2">
              <X size={18} />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Profiles */}
            <div className="flex items-center gap-4">
              {/* Customer */}
              <div className="flex-1 rounded-xl p-4 text-center" style={{ background: '#fdfaf6', border: '1px solid #f0e4cc' }}>
                <img
                  src={customer.photo || `https://ui-avatars.com/api/?name=${customer.firstName}&background=c9a84c&color=fff`}
                  alt={customer.firstName}
                  className="w-14 h-14 rounded-full object-cover mx-auto mb-2"
                  style={{ border: '2px solid #e4cfa8' }}
                  onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${customer.firstName}&background=c9a84c&color=fff`; }}
                />
                <p className="font-semibold text-sm text-gray-800">{customer.firstName}</p>
                <p className="text-xs text-gray-400">{customer.age} · {customer.city}</p>
              </div>

              {/* Heart */}
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #c9a84c20, #b8920e20)', border: '1.5px solid #c9a84c40' }}>
                  <span className="text-xl">💛</span>
                </div>
                <span className="text-xs font-bold" style={{ color: '#b8920e' }}>{match?.score}%</span>
              </div>

              {/* Match profile */}
              <div className="flex-1 rounded-xl p-4 text-center" style={{ background: '#fdfaf6', border: '1px solid #f0e4cc' }}>
                <img
                  src={profile.photo || `https://ui-avatars.com/api/?name=${profile.firstName}&background=b8920e&color=fff`}
                  alt={profile.firstName}
                  className="w-14 h-14 rounded-full object-cover mx-auto mb-2"
                  style={{ border: '2px solid #e4cfa8' }}
                  onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${profile.firstName}&background=b8920e&color=fff`; }}
                />
                <p className="font-semibold text-sm text-gray-800">{profile.firstName}</p>
                <p className="text-xs text-gray-400">{profile.age} · {profile.city}</p>
              </div>
            </div>

            {/* AI Label */}
            <div className="flex items-center justify-center">
              <span
                className="px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5"
                style={{ background: 'rgba(201,168,76,0.12)', color: '#b8920e' }}
              >
                <Sparkles size={12} /> {match?.aiLabel}
              </span>
            </div>

            {/* Match Details */}
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { icon: MapPin, label: profile.city },
                { icon: Briefcase, label: profile.designation },
                { icon: GraduationCap, label: profile.degree },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="rounded-lg p-2" style={{ background: '#fdfaf6' }}>
                  <Icon size={14} className="mx-auto mb-1" style={{ color: '#c9a84c' }} />
                  <p className="text-xs text-gray-600 truncate">{label}</p>
                </div>
              ))}
            </div>

            {/* AI Intro */}
            <div>
              <label className="label">
                <Sparkles size={11} className="inline mr-1" style={{ color: '#c9a84c' }} />
                AI-Generated Introduction
              </label>
              {loadingIntro ? (
                <div className="space-y-2 p-3 rounded-xl" style={{ background: '#fdfaf6', border: '1px solid #f0e4cc' }}>
                  <div className="h-3 rounded shimmer" />
                  <div className="h-3 rounded shimmer w-5/6" />
                  <div className="h-3 rounded shimmer w-4/6" />
                </div>
              ) : (
                <textarea
                  className="input-field resize-none"
                  rows={4}
                  value={intro}
                  onChange={(e) => setIntro(e.target.value)}
                />
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-4" style={{ borderTop: '1px solid #f0e4cc' }}>
            <button onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || sent || loadingIntro}
              className="btn-primary flex-1"
            >
              {sent ? (
                <><Check size={16} /> Sent!</>
              ) : sending ? (
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <><Send size={16} /> Confirm & Send</>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
