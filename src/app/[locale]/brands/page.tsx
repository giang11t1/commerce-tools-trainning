import { getBrands, type Brand } from '@/lib/brands';
import BrandGrid from '@/components/BrandGrid';
import { getTranslations } from 'next-intl/server';

export default async function BrandsPage() {
    const translate = await getTranslations('brands');
    let brands: Brand[] = [];
    let unavailable = false;
    try {
        brands = await getBrands();
    } catch (error) {
        console.error('Failed to load brands', error);
        unavailable = true;
    }

    return (
        <main className="container mx-auto px-4 py-10">
            <h1 className="mb-8 text-3xl font-bold">{translate('all')}</h1>
            {unavailable ? <p role="status" className="rounded-lg border border-yellow-300 bg-yellow-50 px-6 py-8 text-center">{translate('unavailable')}</p> : <BrandGrid brands={brands} />}
        </main>
    );
}
