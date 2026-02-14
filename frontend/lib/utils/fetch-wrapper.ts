// Centralized fetch wrapper with error handling and retry policy
export interface FetchOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
}

export const fetchWrapper = async <T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> => {
  const { retries = 3, retryDelay = 1000, ...fetchOptions } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        credentials: 'include', // Include session cookies by default
        ...fetchOptions,
      });

      if (!response.ok) {
        // Handle specific status codes
        if (response.status === 401) {
          // Unauthorized - possibly session expired
          localStorage.removeItem('session');
          window.location.href = '/login';
          throw new Error('Session expired. Please log in again.');
        } else if (response.status >= 500) {
          // Server error - worth retrying
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        } else {
          // Client error - don't retry
          const errorText = await response.text();
          throw new Error(errorText || `HTTP error: ${response.status} ${response.statusText}`);
        }
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        // For non-JSON responses, return text
        return response.text() as unknown as T;
      }
    } catch (error) {
      lastError = error as Error;

      // Don't retry on certain errors
      if (error instanceof TypeError || (error as Error).message.includes('Session expired')) {
        throw error;
      }

      // If this is the last attempt, throw the error
      if (attempt === retries) {
        throw lastError;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt))); // Exponential backoff
    }
  }

  throw lastError;
};

export default fetchWrapper;