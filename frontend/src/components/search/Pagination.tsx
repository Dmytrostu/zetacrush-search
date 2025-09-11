import React from 'react';
import { useSearch } from '../../context/SearchContext';

interface PaginationProps {
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ onPageChange }) => {
  const { currentPage, totalResults, pageSize, isLoading } = useSearch();
  
  // Calculate total pages
  const totalPages = Math.ceil(totalResults / pageSize);
  
  // Don't show pagination if there's only one page or no results
  if (totalPages <= 1 || isLoading) return null;
  
  // Calculate which page numbers to show
  const getPageNumbers = () => {
    const pages = [];
    
    // Always show first page
    pages.push(1);
    
    // Add current page and neighbors
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      if (!pages.includes(i)) {
        pages.push(i);
      }
    }
    
    // Always show last page if there is more than 1 page
    if (totalPages > 1) {
      pages.push(totalPages);
    }
    
    // Add ellipses where needed
    const result = [];
    let prevPage = null;
    
    for (const page of pages) {
      if (prevPage && page - prevPage > 1) {
        result.push("...");
      }
      result.push(page);
      prevPage = page;
    }
    
    return result;
  };
  
  const pageNumbers = getPageNumbers();
  
  return (
    <nav className="flex justify-center mt-8 mb-4">
      <ul className="flex items-center space-x-2">
        {/* Previous button */}
        <li>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded-md ${
              currentPage === 1
                ? 'text-zeta-gray-400 cursor-not-allowed'
                : 'text-zeta-gray-700 hover:bg-zeta-gray-100 dark:text-zeta-gray-300 dark:hover:bg-zeta-gray-800'
            }`}
            aria-label="Previous page"
          >
            Previous
          </button>
        </li>
        
        {/* Page numbers */}
        {pageNumbers.map((page, index) => (
          <li key={index}>
            {page === "..." ? (
              <span className="px-3 py-1 text-zeta-gray-500 dark:text-zeta-gray-400">...</span>
            ) : (
              <button
                onClick={() => onPageChange(Number(page))}
                className={`w-10 h-10 flex items-center justify-center rounded-md ${
                  currentPage === page
                    ? 'bg-zeta-gray-800 text-white dark:bg-zeta-gray-700'
                    : 'text-zeta-gray-700 hover:bg-zeta-gray-100 dark:text-zeta-gray-300 dark:hover:bg-zeta-gray-800'
                }`}
                aria-current={currentPage === page ? 'page' : undefined}
              >
                {page}
              </button>
            )}
          </li>
        ))}
        
        {/* Next button */}
        <li>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`px-3 py-1 rounded-md ${
              currentPage === totalPages
                ? 'text-zeta-gray-400 cursor-not-allowed'
                : 'text-zeta-gray-700 hover:bg-zeta-gray-100 dark:text-zeta-gray-300 dark:hover:bg-zeta-gray-800'
            }`}
            aria-label="Next page"
          >
            Next
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Pagination;
