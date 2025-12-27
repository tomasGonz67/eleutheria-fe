import { useState, useEffect } from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  color?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  color = '#AA633F'
}: PaginationProps) {
  const [isMobile, setIsMobile] = useState(false);

  // Detect screen size on client only
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    // Set initial value
    checkMobile();

    // Update on resize
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Generate smart pagination with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showPages = 10; // Maximum pages to show at once

    if (totalPages <= showPages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Smart pagination with ellipsis
      // Use fewer siblings on mobile (1), more on desktop (3)
      const leftSiblings = isMobile ? 1 : 3;
      const rightSiblings = isMobile ? 1 : 3;
      
      // Always show first page
      pages.push(1);
      
      // Calculate range around current page
      const startPage = Math.max(2, currentPage - leftSiblings);
      const endPage = Math.min(totalPages - 1, currentPage + rightSiblings);
      
      // Add ellipsis after first page if needed
      if (startPage > 2) {
        pages.push('...');
      }
      
      // Add pages around current page
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      // Add ellipsis before last page if needed
      if (endPage < totalPages - 1) {
        pages.push('...');
      }
      
      // Always show last page
      pages.push(totalPages);
    }
    
    return pages;
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="mt-8 flex flex-wrap justify-center items-center gap-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 sm:px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
      >
        Previous
      </button>

      <div className="flex flex-wrap gap-1 justify-center">
        {getPageNumbers().map((page, index) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${index}`} className="px-2 sm:px-4 py-2 text-gray-500 text-sm sm:text-base">
                ...
              </span>
            );
          }
          
          return (
            <button
              key={page}
              onClick={() => onPageChange(page as number)}
              className={`px-3 sm:px-4 py-2 rounded-lg font-semibold transition text-sm sm:text-base ${
                page === currentPage
                  ? 'text-white'
                  : 'border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              style={
                page === currentPage
                  ? { backgroundColor: color }
                  : {}
              }
            >
              {page}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 sm:px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
      >
        Next
      </button>
    </div>
  );
}

