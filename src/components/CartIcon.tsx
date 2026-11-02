'use client';

import { useEffect, useState } from 'react';
import { CART_ITEM_ADDED_EVENT, useCart } from '../context/CartContext';
import Minicart from './Minicart';
import Drawer from '@/components/commercetools-ui/atoms/drawer';

export default function CartIcon() {
    const { cartCount } = useCart();
    const [isMinicartOpen, setIsMinicartOpen] = useState(false);

    useEffect(() => {
        const openMinicart = () => setIsMinicartOpen(true);
        window.addEventListener(CART_ITEM_ADDED_EVENT, openMinicart);

        return () => window.removeEventListener(CART_ITEM_ADDED_EVENT, openMinicart);
    }, []);

    const toggleMinicart = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsMinicartOpen(!isMinicartOpen);
    };

    return (
        <div className="relative">
            <button
                onClick={toggleMinicart}
                className="p-2 text-gray-600 hover:text-blue-600 transition-colors relative"
                title="Cart"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {cartCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-blue-600 rounded-full">
                        {cartCount}
                    </span>
                )}
            </button>
            <Drawer
                isOpen={isMinicartOpen}
                direction="right"
                className="w-[90%] max-w-108 bg-white h-screen"
                onClose={() => setIsMinicartOpen(false)}
            >
                <Minicart isOpen={isMinicartOpen} onClose={() => setIsMinicartOpen(false)} />
            </Drawer>
        </div>
    );
}
