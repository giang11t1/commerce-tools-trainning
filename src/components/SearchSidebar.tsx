'use client';

import {useMemo, useState} from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Category } from '@commercetools/platform-sdk';
import { XMarkIcon as CloseIcon } from '@heroicons/react/24/outline';
import { AdjustmentsHorizontalIcon as FiltersIcon } from '@heroicons/react/24/solid';
import { useTranslations } from 'use-intl';
import Accordion from '@/components/commercetools-ui/atoms/accordion';
import Drawer from '@/components/commercetools-ui/atoms/drawer';
import BrandFilter, { type BrandFilterOption } from '@/components/BrandFilter';

interface SearchSidebarProps {
    categories: Category[];
    brands: BrandFilterOption[];
}

export default function SearchSidebar({ categories, brands }: SearchSidebarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const currentSort = searchParams.get('sort') || 'newest';
    const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
    const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
    const [isOpen, setIsOpen] = useState(false);
    const translate = useTranslations();

    const accordionClassNames = useMemo(
        () => ({
            root: 'py-5 px-4 border-b border-neutral-400',
            icon: 'stroke-gray-600  w-5 stroke-2',
            border: 'border-b border-neutral-400',
            button: 'text-14',
        }),
        [],
    );

    const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('sort', e.target.value);
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams(searchParams.toString());

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

        router.push(`${pathname}?${params.toString()}`);
    };

    const handleClearFilters = () => {
        setMinPrice('');
        setMaxPrice('');
        const params = new URLSearchParams(searchParams.toString());
        params.delete('minPrice');
        params.delete('maxPrice');
        params.delete('brand');
        router.push(`${pathname}?${params.toString()}`);
    };

    const getCategoryName = (category: Category) => {
        return category.name['en'] || Object.values(category.name)[0];
    };

    return (
        <aside className="w-full md:w-64 flex-shrink-0 space-y-8">

            <>
                <div className="flex items-center justify-between border-b border-neutral-400 pb-4 pt-4 lg:hidden mb-8">
                    <div>
                        <button
                            className="flex min-w-20 cursor-pointer items-center gap-2 rounded-md border border-transparent bg-white px-3 py-2 text-14 leading-[20px] transition hover:border-gray-500"
                            onClick={() => setIsOpen(true)}
                        >
                            <span className="text-14">{translate('product.sortAndFilter')}</span>
                            <FiltersIcon className=" w-4 stroke-gray-600" />
                        </button>
                    </div>
                </div>
                <Drawer isOpen={isOpen} onClose={() => setIsOpen(false)} direction="left" className="w-[90%] max-w-400 bg-white">
                    <div className="flex items-center justify-between border-b border-neutral-400 px-3 py-4">
                        <h3 className="text-18">{translate('product.sortAndFilter')}</h3>
                        <CloseIcon className="w-6 stroke-gray-600" onClick={() => setIsOpen(false)} />
                    </div>
                    <div className="grow overflow-auto">

                        <Accordion className={accordionClassNames.root}
                                   buttonClassName={accordionClassNames.button}
                                   closedSectionTitle="Categories"
                                   variant="arrow"
                                   iconClassName={accordionClassNames.icon}
                        >
                            <nav className="flex flex-col gap-2">
                                {categories.map((category) => (
                                    <Link
                                        key={category.id}
                                        href={`/categories/${category.slug['en-US']}`}
                                        className="text-sm py-1 text-gray-600 hover:text-blue-600 transition-colors"
                                    >
                                        {getCategoryName(category)}
                                    </Link>
                                ))}
                            </nav>

                        </Accordion>

                        <div className="border-b border-neutral-400 px-4 py-5">
                            <BrandFilter brands={brands} selectedKey={searchParams.get('brand') ?? ''} />
                        </div>

                        <Accordion className={accordionClassNames.root}
                                   buttonClassName={accordionClassNames.button}
                                   closedSectionTitle={translate('product.sortBy')}
                                   variant="arrow"
                                   iconClassName={accordionClassNames.icon}
                        >
                            <div className="flex flex-col gap-2 py-4">
                                <label htmlFor="sort" className="text-xs text-gray-500 uppercase font-semibold">Sort By</label>
                                <select
                                    id="sort"
                                    value={currentSort}
                                    onChange={handleSortChange}
                                    className="w-full p-2 border border-gray-300 bg-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="newest">Newest</option>
                                    <option value="name-asc">Name: A to Z</option>
                                </select>
                            </div>
                        </Accordion>
                        <Accordion className={accordionClassNames.root}
                                   buttonClassName={accordionClassNames.button}
                                   closedSectionTitle={translate('product.price')}
                                   variant="arrow"
                                   iconClassName={accordionClassNames.icon}
                        >
                            <form onSubmit={handleFilterSubmit} className="space-y-4 py-4">
                                <div className="flex flex-col gap-2">
                                    <label htmlFor="minPrice" className="text-xs text-gray-500 uppercase font-semibold">Min Price</label>
                                    <input
                                        type="number"
                                        id="minPrice"
                                        value={minPrice}
                                        onChange={(e) => setMinPrice(e.target.value)}
                                        placeholder="Min"
                                        className="w-full p-2 border border-gray-300 bg-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label htmlFor="maxPrice" className="text-xs text-gray-500 uppercase font-semibold">Max Price</label>
                                    <input
                                        type="number"
                                        id="maxPrice"
                                        value={maxPrice}
                                        onChange={(e) => setMaxPrice(e.target.value)}
                                        placeholder="Max"
                                        className="w-full p-2 border border-gray-300 bg-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="submit"
                                        className="flex-1 bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                                    >
                                        Apply
                                    </button>
                                    {(searchParams.has('minPrice') || searchParams.has('maxPrice')) && (
                                        <button
                                            type="button"
                                            onClick={handleClearFilters}
                                            className="px-3 py-2 border border-gray-200 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                            </form>
                        </Accordion>
                    </div>
                    <div className="w-full bg-white py-6 border-t border-neutral-400 text-gray-600">
                        <div className="flex items-center gap-6 px-4">
                            <div className="w-full overflow-hidden rounded-md border border-transparent transition hover:border-blue-600">
                                <button
                                    onClick={() => {
                                        handleClearFilters();
                                        setIsOpen(false);
                                    }}
                                    className="w-full cursor-pointer border border-blue-600 rounded-md py-4 text-14 font-medium"
                                >
                                    {translate('product.clear-all')}
                                </button>
                            </div>
                            <button
                                className="w-full rounded-md bg-blue-600 py-4 text-14 font-medium text-white transition hover:bg-gray-500"
                                onClick={() => setIsOpen(false)}
                            >
                                {translate('product.done')}
                            </button>
                        </div>
                    </div>
                </Drawer>
            </>

            <div className="hidden lg:block">
                <div>
                    <h3 className="text-lg font-bold mb-4">Categories</h3>
                    <nav className="flex flex-col gap-2">
                        {categories.map((category) => (
                            <Link
                                key={category.id}
                                href={`/categories/${category.slug['en-US']}`}
                                className="text-sm py-1 text-gray-600 hover:text-blue-600 transition-colors"
                            >
                                {getCategoryName(category)}
                            </Link>
                        ))}
                    </nav>
                </div>

                <BrandFilter brands={brands} selectedKey={searchParams.get('brand') ?? ''} />

                <div>
                    <h3 className="text-lg font-bold mb-4">Sort By</h3>
                    <select
                        value={currentSort}
                        onChange={handleSortChange}
                        className="w-full p-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                        <option value="newest">Newest</option>
                        <option value="name-asc">Name: A to Z</option>
                        <option value="name-desc">Name: Z to A</option>
                        <option value="price-asc">Price: Low to High</option>
                        <option value="price-desc">Price: High to Low</option>
                    </select>
                </div>

                <div className="pt-4 border-t">
                    <h3 className="text-lg font-bold mb-4">Price Range</h3>
                    <form onSubmit={handleFilterSubmit} className="space-y-4">
                        <div className="flex flex-col gap-2">
                            <label htmlFor="minPrice" className="text-xs text-gray-500 uppercase font-semibold">Min Price</label>
                            <input
                                type="number"
                                id="minPrice"
                                value={minPrice}
                                onChange={(e) => setMinPrice(e.target.value)}
                                placeholder="Min"
                                className="w-full p-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label htmlFor="maxPrice" className="text-xs text-gray-500 uppercase font-semibold">Max Price</label>
                            <input
                                type="number"
                                id="maxPrice"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(e.target.value)}
                                placeholder="Max"
                                className="w-full p-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                className="flex-1 bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                            >
                                Apply
                            </button>
                            {(searchParams.has('minPrice') || searchParams.has('maxPrice')) && (
                                <button
                                    type="button"
                                    onClick={handleClearFilters}
                                    className="px-3 py-2 border border-gray-200 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>

        </aside>
    );
}
