'use client';

import { useState } from 'react';
import SearchSuggestions from '@/components/SearchSuggestions';
import AccountDropdown from '@/components/AccountDropdown';
import WishlistIcon from '@/components/WishlistIcon';
import CartIcon from '@/components/CartIcon';
import useScrollDirection from '@/helpers/hooks/useScrollDirection';
import useClassNames from "@/helpers/hooks/useClassNames";
import {Reference} from "../../types/reference";
import {Category} from "../../types/entity/category";
import HeaderNavigationMobile from "@/components/header-navigation/header-navigation-mobile";
import Link from '@/components/commercetools-ui/atoms/link';
import { usePathname } from '../../i18n/navigation';

interface HeaderActionsProps {
    isLoggedIn: boolean;
    logo?: string;
    logoLink?: Reference;
    links: Category[];
}

export default function HeaderActions({
                                          isLoggedIn,
                                          links, logo, logoLink,
                                      }: HeaderActionsProps) {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const scrollDirection = useScrollDirection(5, -1);
    const pathname = usePathname();
    const isCheckoutPage = pathname === '/checkout';

    const searchClassNames = useClassNames([
        'flex lg:hidden items-center  lg:static lg:w-full duration-150 transition-all  bg-white ',
        scrollDirection === 'down'
            ? 'min-h-0 h-0 opacity-0 px-0 py-0'
            : 'min-h-19 opacity-100 pointer-events-auto px-6 py-4 lg:px-0 lg:py-0',

        isSearchOpen
            ? 'min-h-19 opacity-100 pointer-events-auto px-6 py-4 lg:px-0 lg:py-0'
            : '',
    ]);

    return (
        <>

            <div className="mx-6 h-16 lg:container lg:mx-auto lg:px-8 flex items-center justify-between gap-x-10 relative">
                <div className="flex items-center gap-x-2 shrink-0">
                    {!isCheckoutPage && (
                        <HeaderNavigationMobile logo={'Giang\'s STORE'} links={links} logoLink={'/'} isLoggedIn={isLoggedIn}  />
                    )}
                    <div className="flex items-center gap-8 shrink-0">
                        <Link link="/" className="text-xl font-bold tracking-tight uppercase text-blue-600">
                            Giang's STORE
                        </Link>
                    </div>
                </div>

                <div className="flex items-center gap-x-10 w-full justify-end">
                    {!isCheckoutPage && (
                        <div className="hidden lg:flex w-full">
                            <SearchSuggestions
                                isSearchOpen={isSearchOpen}
                            />
                        </div>
                    )}

                    <div className="flex items-center gap-2 shrink-0">
                        <AccountDropdown
                            isLoggedIn={isLoggedIn}
                            onSearchClick={() => {
                                setIsSearchOpen(!isSearchOpen);
                            }}
                        />

                        <WishlistIcon />
                        <CartIcon />
                    </div>
                </div>
            </div>


            {!isCheckoutPage && (
                <div className={searchClassNames}>
                    <SearchSuggestions isSearchOpen={isSearchOpen}/>
                </div>
            )}

        </>
    );
}
