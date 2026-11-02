'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from '@/components/commercetools-ui/atoms/link';
import { logout } from '../lib/auth';
import Drawer from '@/components/commercetools-ui/atoms/drawer';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import useScrollDirection from '@/helpers/hooks/useScrollDirection';
import useClassNames from "@/helpers/hooks/useClassNames";

interface AccountDropdownProps {
    isLoggedIn: boolean;
    onSearchClick: () => void;
}

export default function AccountDropdown({ isLoggedIn, onSearchClick, }: AccountDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null!);
    const scrollDirection = useScrollDirection(5, -1);
    const searchClassNames = useClassNames([
        'block lg:hidden cursor-pointer duration-150 transition-all overflow-hidden p-2',
        scrollDirection === 'up' ? 'opacity-0 pointer-events-none h-0' : 'h-10 opacity-100 pointer-events-auto',
    ]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleLogout = async () => {
        await logout();
        setIsOpen(false);
        window.location.href = '/login';
    };

    return (
        <div className="relative flex items-center gap-2" ref={dropdownRef}>
            <button className={searchClassNames} onClick={onSearchClick}>
                <MagnifyingGlassIcon className="h-6 w-6 text-gray-600" aria-label="Search"/>
            </button>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-gray-600 hover:text-blue-600 transition-colors cursor-pointer hidden xl:block"
                title="Account"
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isLoggedIn ? 'text-gray-600' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            </button>

            <Drawer
                isOpen={isOpen}
                direction="right"
                className="w-[90%] max-w-108 bg-white h-screen"
                onClose={() => setIsOpen(!isOpen)}
            >
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-gray-900">
                        {isLoggedIn ? (
                            <>My Account</>
                        ) : (
                            <>Login / Register</>
                        )}
                    </h3>

                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="text-gray-400 hover:text-gray-600"
                        aria-label="Close cart"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                        >
                            <path
                                fillRule="evenodd"
                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </button>
                </div>

                <div className="py-2" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                    {isLoggedIn ? (
                        <>
                            <Link
                                link="/account"
                                className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-600"
                                role="menuitem"
                                onClick={() => setIsOpen(false)}
                            >
                                My Account
                            </Link>
                            <Link
                                link="/account/orders"
                                className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-600"
                                role="menuitem"
                                onClick={() => setIsOpen(false)}
                            >
                                My Orders
                            </Link>
                            <hr className="my-4 border-gray-200" />
                            <button
                                onClick={handleLogout}
                                className="block w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-gray-100"
                                role="menuitem"
                            >
                                Log Out
                            </button>
                        </>
                    ) : (
                        <>
                            <Link
                                link="/login"
                                className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-600"
                                role="menuitem"
                                onClick={() => setIsOpen(false)}
                            >
                                Log In
                            </Link>
                            <Link
                                link="/register"
                                className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-600"
                                role="menuitem"
                                onClick={() => setIsOpen(false)}
                            >
                                Sign Up
                            </Link>
                        </>
                    )}
                </div>

            </Drawer>
        </div>
    );
}
