'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Category } from '@commercetools/platform-sdk';
import { useTranslations } from 'use-intl';
import BrandFilter, { type BrandFilterOption } from '@/components/BrandFilter';

interface CategorySidebarProps {
    categories: Category[];
    currentCategoryId?: string;
    brands?: BrandFilterOption[];
    selectedBrandKey?: string;
    brandFilterMode?: 'query' | 'route';
    colors: {
        name: string;
        value: string;
        hex: string;
    }[];
}

export default function CategorySidebar({
    colors,
    brands,
    selectedBrandKey,
    brandFilterMode,
}: CategorySidebarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const translate = useTranslations('product');

    const currentSort = searchParams.get('sort') || 'newest';
    const currentColor = searchParams.get('color') || '';

    const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('sort', e.target.value);
        params.delete('page');
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleColorClick = (colorValue: string) => {
        const params = new URLSearchParams(searchParams.toString());

        if (currentColor === colorValue) {
            params.delete('color');
        } else {
            params.set('color', colorValue);
        }

        params.delete('page');

        router.push(`${pathname}?${params.toString()}`);
    };

    const handleFilterSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const params = new URLSearchParams(searchParams.toString());
        const formData = new FormData(e.currentTarget);
        const minPrice = String(formData.get('minPrice') ?? '').trim();
        const maxPrice = String(formData.get('maxPrice') ?? '').trim();

        if (minPrice) {
            params.set('minPrice', minPrice);
        } else {
            params.delete('minPrice');
        }

        if (maxPrice) {
            params.set('maxPrice', maxPrice);
        } else {
            params.delete('maxPrice');
        }
        params.delete('page');

        router.push(`${pathname}?${params.toString()}`);
    };

    const handleClearFilters = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('minPrice');
        params.delete('maxPrice');
        params.delete('color');
        params.delete('page');
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <aside className="w-full md:w-64 flex-shrink-0 space-y-8 hidden lg:block">
            <div className="flex items-center justify-between border-b pb-4">
                <h2 className="text-xl font-bold">{translate('sortAndFilter')}</h2>
            </div>

            <div>
                <h3 className="text-lg font-bold mb-4">{translate('sortBy')}</h3>
                <select
                    value={currentSort}
                    onChange={handleSortChange}
                    className="w-full p-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                    <option value="newest">{translate('newest')}</option>
                    <option value="name-asc">{translate('nameAsc')}</option>
                    <option value="name-desc">{translate('nameDesc')}</option>
                </select>
            </div>

            <div>
                <h3 className="text-lg font-bold mb-4">{translate('color')}</h3>
                <div className="flex flex-wrap gap-2">
                    {colors.map((color) => (
                        <button
                            key={color.value}
                            type="button"
                            onClick={() => handleColorClick(color.value)}
                            className="flex items-center gap-2 cursor-pointer"
                            title={color.name}
                            aria-pressed={currentColor === color.value}
                        >
                            <span
                                className={`h-5 w-5 rounded-full border ${
                                    currentColor === color.value
                                        ? 'ring-2 ring-blue-600 ring-offset-1'
                                        : ''
                                }`}
                                style={{ backgroundColor: color.hex }}
                            />
                        </button>
                    ))}
                </div>
            </div>

            <BrandFilter
                brands={brands}
                selectedKey={selectedBrandKey ?? searchParams.get('brand') ?? ''}
                mode={brandFilterMode}
            />

            <div className="pt-4 border-t">
                <h3 className="text-lg font-bold mb-4">{translate('price')}</h3>
                <form key={`${searchParams.get('minPrice') ?? ''}:${searchParams.get('maxPrice') ?? ''}`} onSubmit={handleFilterSubmit} className="space-y-4">
                    <div className="flex flex-col gap-2">
                        <label htmlFor="minPrice" className="text-xs text-gray-500 uppercase font-semibold">{translate('min')}</label>
                        <input
                            type="number"
                            id="minPrice"
                            name="minPrice"
                            defaultValue={searchParams.get('minPrice') ?? ''}
                            placeholder={translate('min')}
                            className="w-full p-2 border border-white bg-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label htmlFor="maxPrice" className="text-xs text-gray-500 uppercase font-semibold">{translate('max')}</label>
                        <input
                            type="number"
                            id="maxPrice"
                            name="maxPrice"
                            defaultValue={searchParams.get('maxPrice') ?? ''}
                            placeholder={translate('max')}
                            className="w-full p-2 border border-white bg-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="submit"
                            className="flex-1 bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                            {translate('applyFilters')}
                        </button>
                        {(searchParams.has('minPrice') || searchParams.has('maxPrice')) && (
                            <button
                                type="button"
                                onClick={handleClearFilters}
                                className="px-3 py-2 border border-gray-200 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                {translate('clear')}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </aside>
    );
}
