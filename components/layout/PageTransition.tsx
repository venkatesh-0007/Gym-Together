'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import React from 'react';

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 12, scale: 0.98, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -4, scale: 0.98, filter: 'blur(4px)' }}
        transition={{ type: 'spring', stiffness: 350, damping: 28, mass: 0.8 }}
        className="flex-1 flex flex-col w-full h-full origin-top"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
