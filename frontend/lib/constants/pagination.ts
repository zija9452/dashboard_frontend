// Default page size for all list endpoints
export const DEFAULT_PAGE_SIZE = parseInt(process.env.NEXT_PUBLIC_PAGE_SIZE || '8', 10);

// Maximum allowed page size to prevent performance issues
export const MAX_PAGE_SIZE = 100;

// Available page size options for the UI
export const PAGE_SIZE_OPTIONS = [8, 10, 20, 50];