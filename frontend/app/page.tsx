'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/auth/session-provider';

export default function HomePage() {
  const router = useRouter();
  const { session, loading } = useSession();

  useEffect(() => {
    // Only redirect if not loading
    if (!loading) {
      if (!session) {
        // Not logged in
        router.push('/login');
      } else if (session?.user?.role === 'warehouse') {
        // Logged in as warehouse
        router.push('/warehouse-dashboard');
      } else {
        // Logged in as admin/other
        router.push('/dashboard');
      }
    }
  }, [router, session, loading]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-regal-yellow"></div>
    </div>
  );
}
