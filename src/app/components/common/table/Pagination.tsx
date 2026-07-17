"use client";

import Image from "next/image";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) => {
  const pages = [];

  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center gap-4">
      <button
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="h-12 w-12 rounded-xl border bg-purple-100 disabled:opacity-40 flex items-center justify-center"
      >
        ←
      </button>

      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`h-12 w-12 rounded-xl border text-lg font-medium transition
            ${
              currentPage === page
                ? "bg-purple-500 text-white border-purple-500"
                : "bg-white hover:bg-gray-50"
            }`}
        >
          {page}
        </button>
      ))}

      <button
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="h-12 w-12 rounded-xl border bg-purple-100 disabled:opacity-40 flex items-center justify-center"
      >
        →
      </button>
    </div>
  );
};

export default Pagination;