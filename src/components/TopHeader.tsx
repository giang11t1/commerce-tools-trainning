'use client';
import useScrollDirection from '@/helpers/hooks/useScrollDirection';
import useClassNames from "@/helpers/hooks/useClassNames";
import { useTranslations } from 'use-intl';
import MarketButton from '@/components/commercetools-ui/organisms/market-button/market-button';
import Link from '@/components/commercetools-ui/atoms/link';
import { useCompare } from '@/context/CompareContext';

export default function TopHeader() {

    const translate = useTranslations();

    const scrollDirection = useScrollDirection(5, -1);
    const navigationClassNames = useClassNames([
        'relative  w-full bg-neutral-800  duration-150 transition-all flex items-center justify-center',
        scrollDirection === 'down' ? 'opacity-0 pointer-events-none h-0' : 'h-8 md:h-10 lg:h-11 opacity-100 pointer-events-auto',
    ]);

    const { compareProducts } = useCompare();

    const compareCount = compareProducts.length;

    return (
        <div className="top-header">
            <div className={navigationClassNames}>
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <p className="whitespace-nowrap text-center text-12 leading-loose text-white text-xs">
                        {translate('common.announcement')}
                    </p>
                </div>
                <div className="hidden xl:flex justify-end w-full pr-16 text-white gap-4 ">
                    {compareCount > 0 && <Link link="/compare" className="flex items-center gap-2 whitespace-nowrap pr-10 hover:underline">Compare ({compareCount})</Link>}
                    <MarketButton />
                </div>
            </div>
        </div>
    );
}
