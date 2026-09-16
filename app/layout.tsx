import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AccountProvider } from '@/lib/context/AccountContext';
import { WorkoutProvider } from '@/lib/context/WorkoutContext';
import BottomNav from '@/components/layout/BottomNav';
import Header from '@/components/layout/Header';
import DesktopSidebar from '@/components/layout/DesktopSidebar';

export const viewport: Viewport = {
  themeColor: '#09090b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'IronTrack - Gym Workout Tracker & Partner Collab',
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
      <body className="min-h-full bg-zinc-950 text-zinc-100 selection:bg-emerald-500 selection:text-zinc-950 font-sans">
        <AccountProvider>
          <WorkoutProvider>
            <div className="w-full min-h-screen flex flex-col md:flex-row bg-zinc-950">
              {/* Desktop Sidebar (visible on md+) */}
              <DesktopSidebar />

              {/* Main App Canvas */}
              <div className="flex-1 flex flex-col min-h-screen md:pl-64 w-full">
                {/* Mobile Top Header */}
                <div className="md:hidden">
                  <Header />
                </div>

                {/* Content Container (Mobile-first width on phone, wide structured layout on desktop) */}
                <div className="w-full max-w-md md:max-w-4xl lg:max-w-5xl mx-auto flex-1 flex flex-col pb-24 md:pb-12 md:py-6">
                  {children}
                </div>

                {/* Mobile Bottom Navigation */}
                <BottomNav />
              </div>
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
