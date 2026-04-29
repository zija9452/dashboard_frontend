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
  onPageSizeChange?: (size: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  baseUrl,
  onPageChange,
  onPageSizeChange
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

  // Generate page numbers to show (max 5 visible at a time, sliding window)
  const getPageNumbers = () => {
    const maxVisible = 5; // Show maximum 5 page buttons
    const range = [];
    
    if (totalPages <= maxVisible) {
      // If total pages <= 5, show all
      for (let i = 1; i <= totalPages; i++) {
        range.push(i);
      }
    } else {
      // Sliding window: show 5 pages centered around current page
      let startPage = Math.max(1, currentPage - 2);
      let endPage = Math.min(totalPages, startPage + maxVisible - 1);
      
      // Adjust if we're near the end
      if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        range.push(i);
      }
      
      // Add dots if there are more pages ahead
      // if (endPage < totalPages) {
      //   range.push('...');
      // }
    }
    
    return range;
  };

  const pageNumbers = getPageNumbers();

  if (totalPages === 0) return null;

  return (
    <div className="regal-pagination !px-0 sm:!px-6">
      <div className="flex flex-nowrap items-center justify-center gap-0.5 sm:gap-2 w-full overflow-x-auto py-2">
        {/* First button */}
        <Link
          href={getPageHref(1)}
          onClick={() => handlePageChange(1)}
          className={`regal-pagination-prev-next !px-1.5 sm:!px-4 !py-1 sm:!py-2 text-[10px] sm:text-sm ${
            currentPage === 1
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
          aria-disabled={currentPage === 1}
        >
          First
        </Link>

        {/* Previous button */}
        <Link
          href={getPageHref(Math.max(1, currentPage - 1))}
          onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
          className={`regal-pagination-prev-next !px-1.5 sm:!px-4 !py-1 sm:!py-2 text-[10px] sm:text-sm ${
            currentPage === 1
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
          aria-disabled={currentPage === 1}
        >
          &lt;
        </Link>

        {/* Page numbers */}
        {pageNumbers.map((page, index) => (
          <React.Fragment key={index}>
            {/* {page === '...' ? (
              <span className="px-2 sm:px-3 py-1">...</span>
            ) : ( */}
              <Link
                href={getPageHref(page as number)}
                onClick={() => handlePageChange(page as number)}
                className={`${
                  currentPage === page
                    ? 'regal-pagination-current'
                    : 'regal-pagination-default'
                } !px-2.5 sm:!px-4 !py-1 sm:!py-2 text-[10px] sm:text-sm`}
                aria-current={currentPage === page ? 'page' : undefined}
              >
                {page}
              </Link>
            {/* )} */}
          </React.Fragment>
        ))}

        {/* Next button */}
        <Link
          href={getPageHref(Math.min(totalPages, currentPage + 1))}
          onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
          className={`regal-pagination-prev-next !px-1.5 sm:!px-4 !py-1 sm:!py-2 text-[10px] sm:text-sm ${
            currentPage === totalPages
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
          aria-disabled={currentPage === totalPages}
        >
          &gt;
        </Link>

        {/* Last button */}
        <Link
          href={getPageHref(totalPages)}
          onClick={() => handlePageChange(totalPages)}
          className={`regal-pagination-prev-next !px-1.5 sm:!px-4 !py-1 sm:!py-2 text-[10px] sm:text-sm ${
            currentPage === totalPages
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
          aria-disabled={currentPage === totalPages}
        >
          Last
        </Link>
      </div>
    </div>
  );
};

export default Pagination;