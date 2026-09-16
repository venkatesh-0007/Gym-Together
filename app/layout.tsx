import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AccountProvider } from '@/lib/context/AccountContext';
import { WorkoutProvider } from '@/lib/context/WorkoutContext';
import BottomNav from '@/components/layout/BottomNav';
import Header from '@/components/layout/Header';

export const viewport: Viewport = {
  themeColor: '#09090b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'IronTrack - Mobile Gym Workout Tracker',
  description: 'Fast, native-feeling gym workout timer, duo partner workouts and community rankings',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'IronTrack',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full bg-zinc-950 text-zinc-100 flex flex-col items-center justify-start selection:bg-emerald-500 selection:text-zinc-950 font-sans">
        <AccountProvider>
          <WorkoutProvider>
            {/* Mobile frame wrapper: Max 480px width on desktop/tablet, full width on phones */}
            <div className="w-full max-w-md min-h-screen flex flex-col bg-zinc-950 shadow-2xl relative border-x border-zinc-900/40">
              <Header />
              <main className="flex-1 flex flex-col pb-24">{children}</main>
              <BottomNav />
            </div>
          </WorkoutProvider>
        </AccountProvider>

        {/* Register service worker for offline support */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost')) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.log('SW registration skipped:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
