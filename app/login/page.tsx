'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Dumbbell,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  ShieldCheck,
} from 'lucide-react';
import { useAccount } from '@/lib/context/AccountContext';
import { triggerHaptic } from '@/lib/utils/haptics';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAccount();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    triggerHaptic('light');

    try {
      const res = await login({ email, password });
      if (!res.success) {
        setErrorMsg(res.errorMessage || 'Invalid email or password.');
        triggerHaptic('warning');
      } else {
        setSuccessMsg('Welcome back! Logging you in...');
        triggerHaptic('success');
        setTimeout(() => {
          router.push('/');
        }, 600);
      }
    } catch {
      setErrorMsg('An unexpected error occurred during log in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-md mx-auto w-full animate-page-enter">
      <div className="w-full gym-card p-6 sm:p-8 shadow-2xl flex flex-col gap-6 relative overflow-hidden">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-xl shadow-emerald-950/60">
            <Dumbbell className="w-7 h-7 text-zinc-950 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Sign In to IronTrack
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Access your daily workouts, personal records, and duo rooms
            </p>
          </div>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-950/60 border border-rose-800/80 rounded-2xl text-xs text-rose-300 font-semibold flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-950/60 border border-emerald-800/80 rounded-2xl text-xs text-emerald-300 font-semibold flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl pl-10 pr-3.5 py-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Password
              </label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl pl-10 pr-10 py-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-50 text-emerald-950 font-black rounded-2xl flex items-center justify-center gap-2 text-sm shadow-lg shadow-emerald-500/25 transition-all mt-2"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Security / Privacy Badge */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-500 border-t border-zinc-850 pt-4">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Local-First Cryptographic Security & Cloud Ready</span>
        </div>

        {/* Links to Signup or Guest */}
        <div className="flex flex-col gap-2.5 text-center text-xs">
          <p className="text-zinc-400">
            Don&apos;t have an account yet?{' '}
            <Link
              href="/signup"
              className="text-emerald-400 font-bold hover:underline ml-1"
            >
              Sign Up here
            </Link>
          </p>

          <Link
            href="/"
            className="text-zinc-500 hover:text-zinc-400 text-[11px] py-1 transition-colors"
          >
            Continue as Guest without signing in
          </Link>
        </div>
      </div>
    </div>
  );
}
