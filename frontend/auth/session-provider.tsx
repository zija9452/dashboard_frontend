'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getSession } from './adapter';

// Define the session context type
interface SessionContextType {
  session: any | null;
  loading: boolean;
  signIn: (credentials: { username: string; password: string; role?: string }) => Promise<void>;
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
  const signIn = async (credentials: { username: string; password: string; role?: string }) => {
    try {
      // Use Better-Auth's signIn function
      const result = await import('./adapter').then(adapter => adapter.signIn(credentials));

      if (result.error) {
        throw new Error(result.error);
      }

      // Don't wait for session update - it will be fetched on next page load
      // This makes login faster
      setSession({ user: { username: credentials.username, role: credentials.role } });
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      // Use Better-Auth's signOut function
      await import('./adapter').then(adapter => adapter.signOut());
      
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