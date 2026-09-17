'use client';

import React from 'react';
import { Drawer } from 'vaul';
import { cn } from '@/lib/utils/cn';

interface NativeBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  snapPoints?: (string | number)[];
}

export default function NativeBottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  snapPoints,
}: NativeBottomSheetProps) {
  const commonProps = { open, onOpenChange };
  const content = (
    <Drawer.Portal>
      <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] transition-opacity" />
      <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[100] mt-24 flex h-auto max-h-[90%] flex-col rounded-t-[32px] bg-[var(--card)] border-t border-[var(--card-border)] outline-none overflow-hidden shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
        
        <div className="flex-1 overflow-y-auto bg-[var(--card)] p-4 rounded-t-[32px]">
          {/* iOS-style grabber */}
          <div className="mx-auto mt-2 mb-6 h-1.5 w-12 flex-shrink-0 rounded-full bg-[var(--border-subtle)]" />
          
          {(title || description) && (
            <div className="mb-6 px-2 text-center">
              {title && <Drawer.Title className="text-xl font-bold tracking-tight mb-2">{title}</Drawer.Title>}
              {description && <Drawer.Description className="text-sm text-[var(--muted)]">{description}</Drawer.Description>}
            </div>
          )}
          
          <div className="pb-safe">
            {children}
          </div>
        </div>
        
      </Drawer.Content>
    </Drawer.Portal>
  );

  if (snapPoints) {
    return (
      <Drawer.Root {...commonProps} snapPoints={snapPoints} fadeFromIndex={0}>
        {content}
      </Drawer.Root>
    );
  }

  return (
    <Drawer.Root {...commonProps}>
      {content}
    </Drawer.Root>
  );
}
