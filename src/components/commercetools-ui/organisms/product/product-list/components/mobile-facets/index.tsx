'use client';
import { useMemo, useState } from 'react';
import { XMarkIcon as CloseIcon } from '@heroicons/react/24/outline';
import { AdjustmentsHorizontalIcon as FiltersIcon } from '@heroicons/react/24/solid';
import { useTranslations } from 'use-intl';
import Accordion from '@/components/commercetools-ui/atoms/accordion';
import Drawer from '@/components/commercetools-ui/atoms/drawer';
import SortFacet from '../facets/sort';
import {Category} from "@commercetools/platform-sdk";
import {usePathname, useRouter, useSearchParams} from "next/navigation";
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

export default function MobileFacets({
    colors,
    brands,
    selectedBrandKey,
    brandFilterMode,
}: CategorySidebarProps) {
  const translate = useTranslations();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentColor = searchParams.get('color') || '';

  const [isOpen, setIsOpen] = useState(false);

  const accordionClassNames = useMemo(
    () => ({
      root: 'py-5 px-4 border-b border-neutral-400',
      icon: 'stroke-gray-600  w-5 stroke-2',
      border: 'border-b border-neutral-400',
      button: 'text-14',
    }),
    [],
  );

  const sortFacet = useMemo(
    () => (
      <Accordion
        className={accordionClassNames.root}
        buttonClassName={accordionClassNames.button}
        closedSectionTitle={translate('product.sortBy')}
        variant="arrow"
        iconClassName={accordionClassNames.icon}
      >
        <div className="px-0 py-6">
          <SortFacet />
        </div>
      </Accordion>
    ),
    [translate, accordionClassNames],
  );

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
        params.delete('brand');
        params.delete('page');
        router.push(`${pathname}?${params.toString()}`);
    };


  return (
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
                       closedSectionTitle={translate('product.color')}
                       variant="arrow"
                       iconClassName={accordionClassNames.icon}
            >
                <div className="flex flex-wrap gap-2 py-4">
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
            </Accordion>

            <div className="border-b border-neutral-400 px-4 py-5">
                <BrandFilter
                    brands={brands}
                    selectedKey={selectedBrandKey ?? searchParams.get('brand') ?? ''}
                    mode={brandFilterMode}
                />
            </div>

            <Accordion className={accordionClassNames.root}
                       buttonClassName={accordionClassNames.button}
                       closedSectionTitle={translate('product.price')}
                       variant="arrow"
                       iconClassName={accordionClassNames.icon}
            >
                <form key={`${searchParams.get('minPrice') ?? ''}:${searchParams.get('maxPrice') ?? ''}`} onSubmit={handleFilterSubmit} className="space-y-4 py-4">
                    <div className="flex flex-col gap-2">
                        <label htmlFor="minPrice" className="text-xs text-gray-500 uppercase font-semibold">{translate('product.min')}</label>
                        <input
                            type="number"
                            id="minPrice"
                            name="minPrice"
                            defaultValue={searchParams.get('minPrice') ?? ''}
                            placeholder={translate('product.min')}
                            className="w-full p-2 border border-gray-300 bg-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label htmlFor="maxPrice" className="text-xs text-gray-500 uppercase font-semibold">{translate('product.max')}</label>
                        <input
                            type="number"
                            id="maxPrice"
                            name="maxPrice"
                            defaultValue={searchParams.get('maxPrice') ?? ''}
                            placeholder={translate('product.max')}
                            className="w-full p-2 border border-gray-300 bg-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="submit"
                            className="flex-1 bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                            {translate('product.applyFilters')}
                        </button>
                        {(searchParams.has('minPrice') || searchParams.has('maxPrice')) && (
                            <button
                                type="button"
                                onClick={handleClearFilters}
                                className="px-3 py-2 border border-gray-200 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                {translate('product.clear')}
                            </button>
                        )}
                    </div>
                </form>
            </Accordion>

          {sortFacet}
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
  );
};
