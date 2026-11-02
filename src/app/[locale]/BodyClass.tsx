
'use client';

import { usePathname } from '../../../i18n/navigation';
import { useEffect } from 'react';

export default function BodyClass() {
    const pathname = usePathname();

    useEffect(() => {
        const isProductPage = pathname.startsWith('/products/');
        const isHomePage =  pathname === '/';

        document.body.classList.toggle('product-detail-page', isProductPage);
        document.body.classList.toggle('bg-white', isProductPage);
        document.body.classList.toggle('homepage', isHomePage);

        return () => {
            document.body.classList.remove(
                'product-detail-page',
                'bg-white'
            );
        };
    }, [pathname]);

    return null;
}
