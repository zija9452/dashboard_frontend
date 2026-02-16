import { signIn as betterSignIn, signOut as betterSignOut, getSession as betterGetSession } from '@/lib/auth/client';

// Better-Auth adapter implementation
export const signIn = async (credentials: { username: string; password: string; role?: string }) => {
  try {
    // Call the Better-Auth sign-in function
    // Note: Better-Auth expects specific credential properties, so we'll pass role separately
    const signInOptions: any = {
      username: credentials.username,
      password: credentials.password,
      redirect: false, // We'll handle redirects in the component
    };
    
    // Add role to the options if provided
    if (credentials.role) {
      signInOptions.role = credentials.role;
    }

    const result = await betterSignIn('credentials', signInOptions);

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
      redirect: false, // We'll handle redirects in the component
    });
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

// Function to get the current session
export const getSession = async () => {
  try {
    // Use Better-Auth's built-in session function
    const session = await betterGetSession();
    return session;
  } catch (error) {
    console.error('Get session error:', error);
    return null;
  }
};