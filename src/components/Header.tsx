import { getCategories } from '../lib/categories';
import { getSession } from '../lib/auth';
import HeaderNavigationDesktop from "@/components/header-navigation/header-navigation-desktop";
import { sampleTiles, transformCategories } from '@/lib/nav-data';
import TopHeader from '@/components/TopHeader';
import { getLocale } from 'next-intl/server';
import HeaderActions from "@/components/HeaderActions";

export default async function Header() {
    const rawCategories = await getCategories();
    const locale = await getLocale();

    const categories = transformCategories(rawCategories, locale);
    const customerId = await getSession();
    const isLoggedIn = !!customerId;


    // Use top-level categories for the main nav (those without a parent)
    const topLevelCategories = categories.filter(cat => !cat.parentId);

    return (
        <>
            <div className="block h-46 lg:h-29 bg-white"></div>
            <header className="fixed top-0 z-50 w-full bg-white backdrop-blur">
                <TopHeader />
                <HeaderActions isLoggedIn={isLoggedIn} links={topLevelCategories} />
                <HeaderNavigationDesktop links={topLevelCategories} tiles={sampleTiles} locale={locale}/>
            </header>
        </>
    );
}
