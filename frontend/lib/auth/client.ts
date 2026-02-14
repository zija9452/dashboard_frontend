// Mock implementation of Better-Auth client functions
// In a real implementation, this would import from better-auth/client

export const signIn = async (provider: string, options: any) => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: options.username,
        password: options.password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || 'Login failed' };
    }

    return { ok: true, data };
  } catch (error) {
    return { error: 'Network error occurred' };
  }
};

export const signOut = async (options: { redirect: boolean; redirectTo?: string }) => {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
    });

    if (options.redirect && options.redirectTo) {
      window.location.href = options.redirectTo;
    }

    return response.ok;
  } catch (error) {
    console.error('Sign out error:', error);
    return false;
  }
};