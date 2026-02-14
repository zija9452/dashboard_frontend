'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/auth/session-provider';

const LogoutPage = () => {
  const { signOut } = useSession();
  const router = useRouter();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        await signOut();
        router.push('/login');
        router.refresh();
      } catch (error) {
        console.error('Logout error:', error);
        // Even if backend logout fails, redirect to login
        router.push('/login');
      }
    };

    handleLogout();
  }, [signOut, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Logging out...
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please wait while we log you out securely.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LogoutPage;