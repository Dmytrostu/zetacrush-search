import React from 'react';
import { useSearch } from '../../context/SearchContext';
import { useTheme } from '../../context/ThemeContext';

interface PaginationProps {
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ onPageChange }) => {
  const { currentPage, totalResults, pageSize, setPageSize, isLoading } = useSearch();
  const { theme } = useTheme();
  
  // Calculate total pages
  const totalPages = Math.ceil(totalResults / pageSize);
  
  // Don't show pagination if there's only one page or no results or still loading
  if (totalPages <= 1 || isLoading) return null;
  
  // Calculate the range of pages to show (Google-style)
  const getPageRange = () => {
    const visiblePages = 10; // Maximum number of page buttons to show
    let startPage = Math.max(1, currentPage - Math.floor(visiblePages / 2));
    const endPage = Math.min(totalPages, startPage + visiblePages - 1);
    
    // Adjust startPage if we're near the end to always show the same number of pages
    startPage = Math.max(1, endPage - visiblePages + 1);
    
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  };
  
  const pageRange = getPageRange();
  
  // Button styles based on theme
  const buttonBaseStyles = `h-9 min-w-9 mx-0.5 flex items-center justify-center text-sm transition-colors duration-200 border`;
  const activeButtonStyles = theme === 'dark'
    ? 'bg-blue-600 text-white border-blue-600'
    : 'bg-blue-500 text-white border-blue-500';
  const inactiveButtonStyles = theme === 'dark'
    ? 'bg-zeta-gray-800 text-zeta-gray-300 border-zeta-gray-700 hover:bg-zeta-gray-700'
    : 'bg-white text-zeta-gray-700 border-zeta-gray-200 hover:bg-zeta-gray-100';
  const disabledButtonStyles = theme === 'dark'
    ? 'bg-zeta-gray-800 text-zeta-gray-600 border-zeta-gray-700 cursor-not-allowed'
    : 'bg-white text-zeta-gray-400 border-zeta-gray-200 cursor-not-allowed';
  
  return (
    <div className="w-full flex flex-col items-center mt-8 mb-4">
      {/* Results count */}
      <div className={`mb-4 text-sm ${theme === 'dark' ? 'text-zeta-gray-400' : 'text-zeta-gray-600'}`}>
        Showing results {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalResults)} of {totalResults}
      </div>
      
      {/* Google-style pagination */}
      <div className="flex items-center">
        {/* Previous button with Google-style arrow */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`${buttonBaseStyles} rounded-l-full px-4 ${currentPage === 1 ? disabledButtonStyles : inactiveButtonStyles}`}
          aria-label="Previous page"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Prev
        </button>
        
        {/* Page numbers */}
        {pageRange.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`${buttonBaseStyles} rounded ${currentPage === page ? activeButtonStyles : inactiveButtonStyles}`}
            aria-current={currentPage === page ? 'page' : undefined}
          >
            {page}
          </button>
        ))}
        
        {/* Show ellipsis if not showing the last page */}
        {pageRange[pageRange.length - 1] < totalPages && (
          <div className={`${buttonBaseStyles} ${inactiveButtonStyles} cursor-default`}>
            ...
          </div>
        )}
        
        {/* Show last page if not in range */}
        {pageRange[pageRange.length - 1] < totalPages && (
          <button
            onClick={() => onPageChange(totalPages)}
            className={`${buttonBaseStyles} rounded ${inactiveButtonStyles}`}
          >
            {totalPages}
          </button>
        )}
        
        {/* Next button with Google-style arrow */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`${buttonBaseStyles} rounded-r-full px-4 ${currentPage === totalPages ? disabledButtonStyles : inactiveButtonStyles}`}
          aria-label="Next page"
        >
          Next
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Pagination;