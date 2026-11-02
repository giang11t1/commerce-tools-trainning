import React from 'react';
import { useTranslations } from 'use-intl';
import {usePathname, useRouter, useSearchParams} from "next/navigation";

const SortFacet: React.FC = () => {
  const translate = useTranslations();

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const currentSort = searchParams.get('sort') || 'newest';
    const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('sort', e.target.value);
        params.delete('page');
        router.push(`${pathname}?${params.toString()}`);
    };

  return (
      <select
          value={currentSort}
          onChange={handleSortChange}
          className="w-full p-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      >
          <option value="newest">{translate('product.newest')}</option>
          <option value="name-asc">{translate('product.nameAsc')}</option>
          <option value="name-desc">{translate('product.nameDesc')}</option>
      </select>
  );
};

export default SortFacet;
