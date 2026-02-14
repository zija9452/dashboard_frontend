'use client';

import React from 'react';
import { PAGE_SIZE_OPTIONS } from '@/lib/constants/pagination';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  baseUrl: string; // Base URL without query parameters
  onPageChange?: (page: number) => void; // Optional callback for client-side navigation
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  baseUrl,
  onPageChange
}) => {
  const searchParams = useSearchParams();
  const otherParams = searchParams?.toString() || '';

  // Generate page links
  const getPageHref = (page: number) => {
    const params = new URLSearchParams(otherParams);
    params.set('page', page.toString());
    params.set('limit', pageSize.toString());
    return `${baseUrl}?${params.toString()}`;
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    if (onPageChange) {
      onPageChange(page);
    }
  };

  // Generate page numbers to show
  const getPageNumbers = () => {
    const delta = 2; // How many pages to show around current page
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="regal-pagination">
      <div className="text-sm text-gray-700 mb-2">
        Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
        <span className="font-medium">
          {Math.min(currentPage * pageSize, totalItems)}
        </span>{' '}
        of <span className="font-medium">{totalItems}</span> results
      </div>

      <div className="flex items-center space-x-2">
        {/* Previous button */}
        <Link
          href={getPageHref(Math.max(1, currentPage - 1))}
          onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
          className={`regal-pagination-prev-next ${currentPage === 1
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          aria-disabled={currentPage === 1}
        >
          Previous
        </Link>

        {/* Page numbers */}
        {pageNumbers.map((page, index) => (
          <React.Fragment key={index}>
            {page === '...' ? (
              <span className="px-3 py-1">...</span>
            ) : (
              <Link
                href={getPageHref(page as number)}
                onClick={() => handlePageChange(page as number)}
                className={`${
                  currentPage === page
                    ? 'regal-pagination-current'
                    : 'regal-pagination-default'
                }`}
                aria-current={currentPage === page ? 'page' : undefined}
              >
                {page}
              </Link>
            )}
          </React.Fragment>
        ))}

        {/* Next button */}
        <Link
          href={getPageHref(Math.min(totalPages, currentPage + 1))}
          onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
          className={`regal-pagination-prev-next ${currentPage === totalPages
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          aria-disabled={currentPage === totalPages}
        >
          Next
        </Link>
      </div>

      {/* Page size selector */}
      <div className="mt-4 flex items-center">
        <label htmlFor="pageSize" className="mr-2 text-sm text-gray-700">
          Show
        </label>
        <select
          id="pageSize"
          value={pageSize}
          onChange={(e) => {
            const newSize = parseInt(e.target.value, 10);
            const params = new URLSearchParams(otherParams);
            params.set('limit', newSize.toString());
            params.set('page', '1'); // Reset to first page when changing page size
            window.location.href = `${baseUrl}?${params.toString()}`;
          }}
          className="border border-gray-300 rounded-md px-2 py-1 text-sm"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span className="ml-2 text-sm text-gray-700">per page</span>
      </div>
    </div>
  );
};

export default Pagination;