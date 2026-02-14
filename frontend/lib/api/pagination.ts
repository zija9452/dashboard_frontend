import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination';

/**
 * Converts page-based pagination parameters to backend query parameters
 * @param page Page number (starting from 1)
 * @param limit Number of items per page
 * @returns Object with skip and limit properties for backend API
 */
export function pageToQueryParams(page: number = 1, limit: number = DEFAULT_PAGE_SIZE) {
  const skip = (page - 1) * limit;
  return {
    skip,
    limit
  };
}

/**
 * Calculates pagination metadata from API response
 * @param currentPage Current page number
 * @param pageSize Number of items per page
 * @param total Total number of items
 * @returns Object with pagination metadata
 */
export function calculatePaginationMeta(currentPage: number, pageSize: number, total: number) {
  const totalPages = Math.ceil(total / pageSize);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  return {
    currentPage,
    pageSize,
    total,
    totalPages,
    hasNextPage,
    hasPrevPage,
    startItemIndex: (currentPage - 1) * pageSize + 1,
    endItemIndex: Math.min(currentPage * pageSize, total),
  };
}

/**
 * Gets the page size from either URL params or environment variable
 * @param urlPageSize Page size from URL params (if any)
 * @returns Validated page size
 */
export function getPageSize(urlPageSize?: string) {
  const pageSize = urlPageSize ? parseInt(urlPageSize, 10) : DEFAULT_PAGE_SIZE;

  // Validate page size is within acceptable range
  if (pageSize < 1) return DEFAULT_PAGE_SIZE;
  if (pageSize > 100) return 100; // Cap at 100 to prevent performance issues

  return pageSize;
}