'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils/cn';
import { triggerHaptic } from '@/lib/utils/haptics';

interface NativeButtonProps extends HTMLMotionProps<'button'> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  hapticFeedback?: 'light' | 'medium' | 'success' | 'warning';
}

export default function NativeButton({
  children,
  className,
  variant = 'primary',
  hapticFeedback = 'light',
  onClick,
  ...props
}: NativeButtonProps) {
  
  const baseClasses = "relative w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-[16px] font-bold tracking-tight transition-colors overflow-hidden select-none touch-manipulation";
  
  const variantClasses = {
    primary: "bg-[var(--primary)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),_0_8px_20px_-5px_var(--primary-glow)]",
    secondary: "bg-[var(--card-subtle)] text-[var(--foreground)] border border-[var(--card-border)]",
    danger: "bg-[var(--danger)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),_0_8px_20px_-5px_rgba(239,68,68,0.35)]",
    ghost: "bg-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
  };

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(baseClasses, variantClasses[variant], className)}
      onClick={(e) => {
        if (hapticFeedback) triggerHaptic(hapticFeedback);
        if (onClick) onClick(e);
      }}
      {...props}
    >
      {children}
    </motion.button>
  );
}
