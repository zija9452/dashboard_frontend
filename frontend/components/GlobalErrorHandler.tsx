'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Global error handler for 401 redirects
 * Automatically redirects to login page on session expiry
 */
export function GlobalErrorHandler({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    // Store original fetch
    const originalFetch = window.fetch;

    // Override fetch to intercept 401s
    window.fetch = async function(...args: Parameters<typeof window.fetch>) {
      try {
        const response = await originalFetch(...args);
        
        // Check for 401 Unauthorized
        if (response.status === 401) {
          // Clear localStorage
          localStorage.clear();
          
          // Redirect to login
          router.push('/login');
        }
        
        return response;
      } catch (error) {
        console.error('Fetch error:', error);
        throw error;
      }
    };

    // Cleanup on unmount
    return () => {
      window.fetch = originalFetch;
    };
  }, [router]);

  return <>{children}</>;
}
