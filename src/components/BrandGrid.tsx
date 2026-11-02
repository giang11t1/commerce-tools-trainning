'use client';

import { Link } from '@/../i18n/navigation';
import { useTranslations } from 'next-intl';
import type { Brand } from '@/lib/brands';
import BrandLogo from '@/components/BrandLogo';

export default function BrandGrid({ brands }: { brands: Brand[] }) {
    const translate = useTranslations('brands');
    if (!brands.length) {
        return <p className="rounded-lg border bg-white px-6 py-12 text-center text-gray-600">{translate('empty')}</p>;
    }

    return (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {brands.map((brand) => (
                <Link key={brand.key} href={`/brands/${encodeURIComponent(brand.slug)}`} className="group rounded-lg bg-white p-4 transition-shadow hover:shadow-md group">
                    <div className="flex aspect-square items-center justify-center overflow-hidden bg-gray-50 p-5">
                        <BrandLogo name={brand.name} logoUrl={brand.logoUrl} className="max-h-full max-w-full text-4xl" />
                    </div>
                    <h2 className="mt-3 text-center font-bold uppercase text-gray-900 group-hover:text-blue-700">{brand.name}</h2>
                </Link>
            ))}
        </div>
    );
}
