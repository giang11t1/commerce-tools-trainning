'use client';

import Link from '@/components/commercetools-ui/atoms/link';
import { usePathname } from 'next/navigation';

interface NavItem {
    label: string;
    href: string;
}

export default function AccountSidebarItem({ item }: { item: NavItem }) {
    const pathname = usePathname();
    const isActive = pathname === item.href;

    return (
        <Link
            link={item.href}
            className={`px-4 py-3 text-sm font-medium border-l-4 transition-colors ${
                isActive
                    ? 'text-blue-600 bg-blue-50 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600 border-transparent'
            }`}
        >
            {item.label}
        </Link>
    );
}
