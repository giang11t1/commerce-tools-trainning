'use client';

import React from 'react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { MenuItem } from '@headlessui/react';
import Dropdown from '@/components/commercetools-ui/atoms/dropdown';
import Link from '@/components/commercetools-ui/atoms/link';
import AccountSidebarItem from './AccountSidebarItem';
import { usePathname } from '../../i18n/navigation';

interface NavItem {
    label: string;
    href: string;
}

const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/account' },
    { label: 'My Orders', href: '/account/orders' },
    { label: 'My Quotes', href: '/account/quotes' },
    { label: 'Company', href: '/account/company' },
    { label: 'My Wishlist', href: '/account/wishlist' },
    { label: 'Addresses', href: '/account/addresses' },
];

export default function AccountSidebar() {
    const pathname = usePathname();

    const activeItem =
        navItems.find((item) => pathname === item.href) ?? navItems[0];

    return (
        <div className="rounded-lg border border-gray-100 bg-white shadow-sm">
            {/* Mobile */}
            <div className="block md:hidden">
                <Dropdown
                    customButtonElement={
                        <button
                            type="button"
                            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-700"
                        >
                            <span>{activeItem.label}</span>

                            <ChevronDownIcon className="h-5 w-5" />
                        </button>
                    }
                    customButtonClassNames={(open) =>
                        `w-full ${open ? 'bg-gray-50' : 'bg-white'}`
                    }
                    customMenuWrapperClassNames="relative w-full"
                    customMenuClassNames={() =>
                        'absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-gray-100 bg-white shadow-lg'
                    }
                >
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;

                        return (
                            <MenuItem key={item.href}>
                                <Link
                                    link={item.href}
                                    className={`block px-4 py-3 text-sm font-medium transition-colors ${
                                        isActive
                                            ? 'bg-blue-50 text-blue-600'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
                                    }`}
                                >
                                    {item.label}
                                </Link>
                            </MenuItem>
                        );
                    })}
                </Dropdown>
            </div>

            {/* Desktop */}
            <nav className="hidden flex-col md:flex">
                {navItems.map((item) => (
                    <AccountSidebarItem
                        key={item.href}
                        item={item}
                    />
                ))}
            </nav>
        </div>
    );
}
