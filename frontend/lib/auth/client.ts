// Better-Auth compatible client that interfaces with your Python/FastAPI backend
// This mimics Better-Auth's API but works with your existing backend

export interface SignInResult {
  error?: string;
  data?: any;
  ok: boolean;
}

export interface SignOutOptions {
  redirect?: boolean;
  redirectTo?: string;
}

export interface SessionData {
  user?: {
    id: string;
    username: string;
    role: string;
    company_id: string | null;
  };
  expiresAt?: Date;
}

let cachedSession: SessionData | null = null;
let sessionTimestamp: number | null = null;
const SESSION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const signIn = async (provider: string, options: any): Promise<SignInResult> => {
  try {
    if (provider !== 'credentials') {
      return { error: 'Only credentials provider is supported' };
    }

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: options.username,
        password: options.password,
        role: options.role, // Include the selected role
      }),
      credentials: 'include', // Important: include cookies in requests
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || data.detail || 'Login failed' };
    }

    // Clear cached session on successful login
    cachedSession = null;
    sessionTimestamp = null;

    return { ok: true, data };
  } catch (error) {
    console.error('Sign in error:', error);
    return { error: 'Network error occurred' };
  }
};

export const signOut = async (options: SignOutOptions = {}) => {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });

    // Clear cached session
    cachedSession = null;
    sessionTimestamp = null;

    if (options.redirect && options.redirectTo) {
      window.location.href = options.redirectTo;
    }

    return response.ok;
  } catch (error) {
    console.error('Sign out error:', error);
    return false;
  }
};

export const getSession = async (): Promise<SessionData | null> => {
  // Check if we have a cached session that's still valid
  if (cachedSession && sessionTimestamp) {
    const now = Date.now();
    if (now - sessionTimestamp < SESSION_CACHE_DURATION) {
      return cachedSession;
    }
  }

  try {
    const response = await fetch('/api/auth/session', {
      credentials: 'include',
    });

    if (!response.ok) {
      // Clear session on any error (401, 404, 500, etc.)
      cachedSession = null;
      sessionTimestamp = null;
      
      // Don't throw error for 401/404/500 - just return null
      // This prevents the error from breaking the UI
      if (response.status === 401 || response.status === 404 || response.status === 500) {
        console.log(`Session invalid or backend error (${response.status}) - clearing session`);
        return null;
      }
      
      throw new Error(`Session check failed: ${response.status}`);
    }

    const sessionData = await response.json();

    // Cache the session
    cachedSession = sessionData;
    sessionTimestamp = Date.now();

    return sessionData;
  } catch (error) {
    console.error('Get session error:', error);
    cachedSession = null;
    sessionTimestamp = null;
    return null;
  }
};