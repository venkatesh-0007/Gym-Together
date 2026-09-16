'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Dumbbell,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Sparkles,
} from 'lucide-react';
import { useAccount } from '@/lib/context/AccountContext';
import { PRESET_AVATARS } from '@/lib/types/account';
import { triggerHaptic } from '@/lib/utils/haptics';

export default function SignUpPage() {
  const router = useRouter();
  const { signup } = useAccount();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState('⚡');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get('email');
      if (emailParam) {
        setEmail(emailParam);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    triggerHaptic('light');

    try {
      const res = await signup({
        name,
        email,
        password,
        username: username.trim() || undefined,
        avatar,
      });

      if (!res.success) {
        setErrorMsg(res.errorMessage || 'Failed to create account.');
        triggerHaptic('warning');
      } else {
        setSuccessMsg('Account created successfully! Preparing dashboard...');
        triggerHaptic('success');
        setTimeout(() => {
          router.push('/');
        }, 600);
      }
    } catch {
      setErrorMsg('An unexpected error occurred during account creation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-md mx-auto w-full animate-page-enter">
      <div className="w-full gym-card p-6 sm:p-8 shadow-2xl flex flex-col gap-6 relative overflow-hidden">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center shadow-xl shadow-accent">
            <Dumbbell className="w-7 h-7 text-white stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight">
              Create Satatam Account
            </h1>
            <p className="text-xs text-[var(--muted)] mt-1">
              Start tracking daily gym workouts and hit personal records
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

        {/* Sign Up Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Avatar Selector */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
                Choose Lifter Avatar
              </label>
              <span className="text-[10px] text-accent flex items-center gap-1 font-semibold">
                <Sparkles className="w-3 h-3" /> Selected: {avatar}
              </span>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {PRESET_AVATARS.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => {
                    setAvatar(av);
                    triggerHaptic('light');
                  }}
                  className={`h-10 text-xl rounded-xl border flex items-center justify-center transition-all ${
                    avatar === av
                      ? 'bg-accent-subtle border-accent scale-105 shadow-md shadow-accent/20'
                      : 'bg-[var(--card-subtle)] border-[var(--card-border)] hover:border-[var(--card-hover-border)]'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          {/* Full Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[var(--muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="e.g. Alex Thorne"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[var(--card-subtle)] border border-[var(--card-border)] focus:border-accent rounded-xl pl-10 pr-3.5 py-3 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)]/60 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Email Address */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[var(--muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="alex@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[var(--card-subtle)] border border-[var(--card-border)] focus:border-accent rounded-xl pl-10 pr-3.5 py-3 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)]/60 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[var(--muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[var(--card-subtle)] border border-[var(--card-border)] focus:border-accent rounded-xl pl-10 pr-10 py-3 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)]/60 focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Username / Handle (Optional) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
              Username Handle <span className="text-[var(--muted)] font-normal">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. @alex_lifts"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[var(--card-subtle)] border border-[var(--card-border)] focus:border-accent rounded-xl px-3.5 py-3 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)]/60 focus:outline-none font-mono transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 gym-btn-primary active:scale-[0.98] disabled:opacity-50 font-black rounded-2xl flex items-center justify-center gap-2 text-sm transition-all mt-2"
          >
            <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Links */}
        <div className="flex flex-col gap-2.5 text-center text-xs border-t border-[var(--card-border)] pt-4">
          <p className="text-[var(--muted)]">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-accent font-bold hover:underline ml-1"
            >
              Sign In here
            </Link>
          </p>

          <Link
            href="/"
            className="text-[var(--muted)] hover:text-[var(--foreground)] text-[11px] py-1 transition-colors"
          >
            Continue as Guest without signing in
          </Link>
        </div>
      </div>
    </div>
  );
}
