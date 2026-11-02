'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'use-intl';

export default function ClearAllFiltersButton() {
    const translate = useTranslations('product');
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const handleClearAll = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('minPrice');
        params.delete('maxPrice');
        params.delete('color');
        params.delete('brand');
        params.delete('page');
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <button
            onClick={handleClearAll}
            className="text-xs font-semibold text-gray-500 hover:text-red-600 transition-colors underline underline-offset-4 ml-2 cursor-pointer"
        >
            {translate('clear-all')}
        </button>
    );
}
