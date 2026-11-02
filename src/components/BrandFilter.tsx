'use client';

import { useId } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'use-intl';

export type BrandFilterOption = {
    key: string;
    name: string;
    slug: string;
};

interface BrandFilterProps {
    brands?: BrandFilterOption[];
    selectedKey?: string;
    mode?: 'query' | 'route';
}

export default function BrandFilter({
    brands = [],
    selectedKey,
    mode = 'query',
}: BrandFilterProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const translate = useTranslations('product');
    const filterId = useId();

    if (!brands.length) return null;

    const handleChange = (brandKey: string, checked: boolean) => {
        const selectedBrand = checked ? brands.find((brand) => brand.key === brandKey) : undefined;
        const params = new URLSearchParams(searchParams.toString());
        params.delete('page');

        if (mode === 'route') {
            params.delete('brand');
            const brandBasePath = pathname.slice(0, pathname.lastIndexOf('/'));
            const nextPath = selectedBrand
                ? `${brandBasePath}/${encodeURIComponent(selectedBrand.slug)}`
                : brandBasePath;
            const queryString = params.toString();
            router.push(queryString ? `${nextPath}?${queryString}` : nextPath);
            return;
        }

        if (selectedBrand) {
            params.set('brand', selectedBrand.key);
        } else {
            params.delete('brand');
        }
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <fieldset>
            <legend className="mb-4 block text-lg font-bold">
                {translate('brand')}
            </legend>
            <div className="flex max-h-60 flex-col gap-3 overflow-y-auto">
                {brands.map((brand) => (
                    <label
                        key={brand.key}
                        htmlFor={`${filterId}-${brand.key}`}
                        className="flex cursor-pointer items-center gap-3 text-sm text-gray-700"
                    >
                        <input
                            id={`${filterId}-${brand.key}`}
                            type="checkbox"
                            checked={selectedKey === brand.key}
                            onChange={(event) => handleChange(brand.key, event.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 accent-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                        />
                        <span>{brand.name}</span>
                    </label>
                ))}
            </div>
        </fieldset>
    );
}
