'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getSession } from './adapter';

// Define the session context type
interface SessionContextType {
  session: any | null;
  loading: boolean;
  signIn: (credentials: { username: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  updateSession: () => void;
}

// Create the context
const SessionContext = createContext<SessionContextType | undefined>(undefined);

// Session provider component
export const SessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch session on mount
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const sessionData = await getSession();
        setSession(sessionData);
      } catch (error) {
        console.error('Failed to fetch session:', error);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, []);

  // Function to update session
  const updateSession = async () => {
    try {
      const sessionData = await getSession();
      setSession(sessionData);
    } catch (error) {
      console.error('Failed to update session:', error);
      setSession(null);
    }
  };

  // Sign in function
  const signIn = async (credentials: { username: string; password: string }) => {
    try {
      // Call the frontend API route which forwards to the backend
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password,
        }),
        credentials: 'include', // Include cookies
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Sign in failed');
      }

      // Update session after sign in
      await updateSession();
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      // Call the backend to invalidate the session
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include', // Include cookies
      });

      // Clear the session
      setSession(null);
    } catch (error) {
      console.error('Sign out error:', error);
      // Even if the backend call fails, clear the local session
      setSession(null);
    }
  };

  const value: SessionContextType = {
    session,
    loading,
    signIn,
    signOut,
    updateSession,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};

// Hook to use the session context
export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};