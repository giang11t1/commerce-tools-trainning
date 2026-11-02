'use client';

import { Link, usePathname } from '../../i18n/navigation';
import { useSearchParams } from 'next/navigation';

interface PaginationProps {
    total: number;
    limit: number;
    currentPage: number;
    pageParam?: string;
    className?: string;
}
export default function Pagination({
                                       total,
                                       limit,
                                       currentPage,
                                       pageParam = 'page',
                                       className = 'mt-12',
                                   }: PaginationProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const totalPages = Math.ceil(total / limit);

    if (totalPages <= 1) return null;

    const createPageUrl = (pageNumber: number) => {
        const params = new URLSearchParams(searchParams.toString());

        if (pageNumber === 1) {
            params.delete(pageParam);
        } else {
            params.set(pageParam, pageNumber.toString());
        }

        const query = params.toString();

        return query ? `${pathname}?${query}` : pathname;
    };

    const pages = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(
        totalPages,
        startPage + maxVisiblePages - 1
    );

    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(
            1,
            endPage - maxVisiblePages + 1
        );
    }

    for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
    }

    return (
        <div className={`flex justify-center items-center gap-2 ${className}`}>
            {currentPage > 1 && (
                <Link
                    href={createPageUrl(currentPage - 1)}
                    className="px-4 py-2 border border-gray-200 rounded-md text-sm font-medium bg-white hover:bg-gray-50 transition-colors"
                >
                    Previous
                </Link>
            )}

            {startPage > 1 && (
                <>
                    <Link
                        href={createPageUrl(1)}
                        className="px-4 py-2 border border-gray-200 rounded-md text-sm font-medium bg-white hover:bg-gray-50 transition-colors"
                    >
                        1
                    </Link>

                    {startPage > 2 && (
                        <span className="text-gray-400">...</span>
                    )}
                </>
            )}

            {pages.map((page) => (
                <Link
                    key={page}
                    href={createPageUrl(page)}
                    className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
                        currentPage === page
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-gray-200 text-gray-700 hover:bg-gray-50 bg-white'
                    }`}
                >
                    {page}
                </Link>
            ))}

            {endPage < totalPages && (
                <>
                    {endPage < totalPages - 1 && (
                        <span className="text-gray-400">...</span>
                    )}

                    <Link
                        href={createPageUrl(totalPages)}
                        className="px-4 py-2 border border-gray-200 rounded-md text-sm font-medium bg-white hover:bg-gray-50 transition-colors"
                    >
                        {totalPages}
                    </Link>
                </>
            )}

            {currentPage < totalPages && (
                <Link
                    href={createPageUrl(currentPage + 1)}
                    className="px-4 py-2 border border-gray-200 rounded-md text-sm font-medium bg-white hover:bg-gray-50 transition-colors"
                >
                    Next
                </Link>
            )}
        </div>
    );
}
