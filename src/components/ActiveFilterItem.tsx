'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'use-intl';

interface ActiveFilterItemProps {
    label: string;
    filterKey: string;
}

export default function ActiveFilterItem({ label, filterKey }: ActiveFilterItemProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const translate = useTranslations('product');

    const handleRemove = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete(filterKey);
        params.delete('page');
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
            {label}
            <button
                onClick={handleRemove}
                className="hover:text-blue-900 transition-colors p-0.5"
                aria-label={translate('removeFilter', { filter: label })}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </span>
    );
}
