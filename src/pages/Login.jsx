import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Shield, Users, Sparkles, Calendar, BarChart2 } from 'lucide-react';
import { signIn } from '../services/firebase/auth';
import toast from 'react-hot-toast';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@tdc.com');
  const [password, setPassword] = useState('password123');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch (err) {
      const msg =
        err.code === 'auth/invalid-credential' ||
          err.code === 'auth/user-not-found' ||
          err.code === 'auth/wrong-password'
          ? 'Incorrect email or password.'
          : 'Sign in failed. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen lg:h-screen w-full flex flex-col lg:flex-row bg-[#FAFAF9] font-sans overflow-y-auto lg:overflow-hidden relative">

      {/* ── Top Left Brand Name ── */}

      {/* ── Left Column — Marketing & Branding (Hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-[52%] h-full flex-col justify-center p-8 sm:p-12 lg:px-20 xl:px-24 bg-[#FAFAF9] select-none">
        <div className="max-w-[520px] space-y-5">
          <div className="text-base font-bold text-gray-800 tracking-tight mb-6 hidden lg:block">
            TDC Matchmaker
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#EEF2FF] text-[#4F46E5] rounded-md text-[13px] font-semibold">
            <Shield size={13} className="fill-[#4F46E5]/10" />
            Internal Access Only
          </div>

          <h2 className="text-4xl sm:text-[42px] lg:text-[44px] xl:text-[46px] font-extrabold text-[#111827] tracking-tight leading-[1.18]">
            Empowering matchmakers to build <span className="text-[#4F46E5]">meaningful connections.</span>
          </h2>

          <p className="text-gray-500 text-[14.5px] leading-relaxed">
            TDC Matchmaker Pro is the internal platform built for professional matchmakers to manage profiles, evaluate compatibility, and guide every relationship journey.
          </p>

          <div className="w-full h-px bg-gray-200/80 my-6" />

          {/* Features Vertical Stack */}
          <div className="space-y-5">
            {/* Feature 1 */}
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#EEF2FF] text-[#6366F1] flex-shrink-0">
                <Users size={19} />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-[14px] font-bold text-gray-800 tracking-wide uppercase">Client Management</h4>
                <p className="text-[13px] text-gray-400 leading-normal">Organize and review all client profiles in one place</p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#ECFDF5] text-[#10B981] flex-shrink-0">
                <Sparkles size={19} />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-[14px] font-bold text-gray-800 tracking-wide uppercase">Smart Matching</h4>
                <p className="text-[13px] text-gray-400 leading-normal">AI-powered compatibility scoring and insights</p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#EFF6FF] text-[#3B82F6] flex-shrink-0">
                <Calendar size={19} />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-[14px] font-bold text-gray-800 tracking-wide uppercase">Journey Tracking</h4>
                <p className="text-[13px] text-gray-400 leading-normal">Track interactions, follow-ups, and meeting schedules</p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#FFFBEB] text-[#F59E0B] flex-shrink-0">
                <BarChart2 size={19} />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-[14px] font-bold text-gray-800 tracking-wide uppercase">Performance Insights</h4>
                <p className="text-[13px] text-gray-400 leading-normal">Monitor your pipeline and conversion metrics</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Column — Login Card ── */}
      <div className="lg:w-[48%] h-full flex items-center justify-center p-6 sm:p-12 lg:p-20 bg-white lg:bg-[#FAFAF9]">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-[450px] p-8 sm:p-10 rounded-2xl bg-white border border-gray-200 shadow-xl"
          style={{
            boxShadow: '0 25px 60px -15px rgba(17, 24, 39, 0.05), 0 0 0 1px rgba(17, 24, 39, 0.015)'
          }}
        >
          {/* Card Header */}
          <div className="text-center mb-6">
            <h3 className="text-[30px] font-bold text-[#111827] tracking-tight leading-none">
              Welcome back
            </h3>
            <p className="text-[14px] text-gray-400 mt-2.5 font-medium">
              Sign in to your matchmaker workspace
            </p>
            <div className="w-full h-px bg-gray-150 mt-5" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email field */}
            <div className="space-y-1.5">
              <label className="text-[13.5px] font-semibold text-gray-700 block">
                Email address
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  type="email"
                  className="input pl-10 py-2 bg-white border-gray-200 hover:border-gray-300 focus:border-gray-900 transition-colors rounded-lg min-h-[44px]"
                  style={{ height: '44px', fontSize: '14px' }}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <label className="text-[13.5px] font-semibold text-gray-700 block">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input pl-10 pr-10 py-2 bg-white border-gray-200 hover:border-gray-300 focus:border-gray-900 transition-colors rounded-lg min-h-[44px]"
                  style={{ height: '44px', fontSize: '14px' }}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Remember me & Forgot Password */}
            <div className="flex items-center justify-between text-[13.5px] pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="rounded border-gray-300 text-[#4F46E5] w-4.5 h-4.5 focus:ring-[#4F46E5]"
                />
                <span>Remember me</span>
              </label>
              <a href="#" onClick={(e) => { e.preventDefault(); toast.error("Please contact your IT administrator to reset your password."); }} className="text-[#4F46E5] font-semibold hover:underline">
                Forgot password?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-2 font-semibold text-[13.5px] justify-center mt-4 transition-all shadow-sm rounded-lg min-h-[44px]"
              style={{ height: '44px', background: '#111827', color: '#FFFFFF' }}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <div className="flex items-center gap-1.5">
                  <span>Sign in to workspace</span>
                  <ArrowRight size={15} className="mt-0.5" />
                </div>
              )}
            </button>
          </form>

          {/* Footer Security disclaimer */}
          <div className="flex items-center justify-center gap-1.5 mt-6 text-[12px] text-gray-400 font-medium">
            <Shield size={13} />
            <span>Internal access only • Authorized matchmakers</span>
          </div>

          {/* Demo account tooltip box */}
          <div className="mt-4 p-2.5 rounded-lg border border-dashed border-gray-200 bg-gray-50/50 text-[11px] text-center text-gray-400">
            Demo workspace: <strong className="text-gray-600">admin@tdc.com</strong> / <strong className="text-gray-600">password123</strong>
          </div>
        </motion.div>
      </div>

    </div>
  );
}
