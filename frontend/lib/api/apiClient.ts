/**
 * API Client with automatic 401 handling
 * Redirects to login page if session expires
 */

// Base fetch wrapper with auth check
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const defaultOptions: RequestInit = {
    credentials: 'include', // Include session cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, defaultOptions);

  // Check for 401 Unauthorized or 403 Forbidden
  if (response.status === 401 || response.status === 403) {
    // Attempt to call logout API to clear server-side cookies
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {
      // Ignore errors if logout fails
    }
    
    // Clear any local storage if needed
    localStorage.clear();
    
    // Redirect to login page
    window.location.href = '/login';
    
    // Return response to prevent further processing
    return response;
  }

  return response;
}

// GET request helper
export async function getWithAuth(url: string, options: RequestInit = {}) {
  return fetchWithAuth(url, {
    method: 'GET',
    ...options,
  });
}

// POST request helper
export async function postWithAuth(
  url: string,
  data?: any,
  options: RequestInit = {}
) {
  return fetchWithAuth(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
    ...options,
  });
}

// PUT request helper
export async function putWithAuth(
  url: string,
  data?: any,
  options: RequestInit = {}
) {
  return fetchWithAuth(url, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
    ...options,
  });
}

// DELETE request helper
export async function deleteWithAuth(url: string, options: RequestInit = {}) {
  return fetchWithAuth(url, {
    method: 'DELETE',
    ...options,
  });
}
