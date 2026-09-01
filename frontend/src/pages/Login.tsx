import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Film, Mail, Lock, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please fill in all fields');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      showToast('success', 'Welcome Back!', 'Logged in successfully to CineCast AI.');
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Invalid email or password';
      setErrorMsg(msg);
      showToast('error', 'Login Failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0d12] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glowing Orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#f5b94d]/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#42e09a]/15 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl relative z-10"
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <Link to="/" className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#f5b94d] to-[#42e09a] p-0.5 shadow-lg mb-3">
            <div className="w-full h-full bg-[#0b0d12] rounded-[14px] flex items-center justify-center">
              <Film className="w-6 h-6 text-[#f5b94d]" />
            </div>
          </Link>
          <h2 className="text-2xl font-bold font-headline text-white tracking-tight">
            Sign In to CineCast AI
          </h2>
          <p className="text-xs text-gray-400 mt-1 font-body">
            Access your personalized recommendation engine
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 font-semibold text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-[#111318] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#f5b94d]/60 focus:ring-1 focus:ring-[#f5b94d]/60 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#111318] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#f5b94d]/60 focus:ring-1 focus:ring-[#f5b94d]/60 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-4 py-3.5 rounded-xl bg-gradient-to-r from-[#f5b94d] to-[#42e09a] text-[#111318] font-bold text-sm hover:brightness-110 transition-all shadow-[0_0_20px_rgba(245,185,77,0.3)] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-spin" /> Authenticating...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Sign In <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-gray-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-[#f5b94d] font-bold hover:underline ml-1">
            Register now
          </Link>
        </div>
      </motion.div>
    </div>
  );
};
