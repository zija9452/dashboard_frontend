import { signIn as betterSignIn, signOut as betterSignOut } from '@/lib/auth/client';

// Better-Auth adapter implementation
export const signIn = async (credentials: { username: string; password: string }) => {
  try {
    // Call the Better-Auth sign-in function
    const result = await betterSignIn('credentials', {
      username: credentials.username,
      password: credentials.password,
      redirect: false, // We'll handle redirects in the component
    });

    if (result?.error) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    // Call the Better-Auth sign-out function
    await betterSignOut({
      redirect: true,
      redirectTo: '/login', // Redirect to login page after logout
    });
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

// Function to get the current session
export const getSession = async () => {
  try {
    const response = await fetch('/api/auth/session');
    if (!response.ok) {
      if (response.status === 401) {
        return null; // Not authenticated
      }
      throw new Error('Failed to get session');
    }

    const session = await response.json();
    return session;
  } catch (error) {
    console.error('Get session error:', error);
    return null;
  }
};