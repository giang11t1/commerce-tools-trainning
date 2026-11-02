import React, {FC, useContext, useEffect, useLayoutEffect, useRef, useState} from 'react';
import { useTranslations } from 'use-intl';
import Button from '@/components/commercetools-ui/atoms/button';
import Link from '@/components/commercetools-ui/atoms/link';
import MarketButtonMobile from '@/components/commercetools-ui/organisms/market-button/market-button-mobile';
import { AccountContext } from "../../../../../context/account";
import { useRouter } from '../../../../../i18n/routing';
import { Category } from '../../../types/entity/category';
import MobileMenuNavButton from '../atoms/menu-nav-button';
import {logout} from "@/lib/auth";
import {useCompare} from "@/context/CompareContext";

export interface Props {
  showMenu: boolean;
  insertCategory: (category: Category) => void;
  hideHeaderMenu: () => void;
    isLoggedIn?: boolean;
}

const MobileMenuFooter: FC<Props> = ({ showMenu, hideHeaderMenu, insertCategory, isLoggedIn }) => {
  const router = useRouter();
  const translate = useTranslations();
  const marketButtonRef = useRef<HTMLDivElement>(null);
  const { account, logout } = useContext(AccountContext);
  const [languageMenuTop, setLanguageMenuTop] = useState(false);
  const { compareProducts } = useCompare();
  const compareCount = compareProducts.length;

  const tabs = [
    { name: translate('account.my-account'), href: '/account' },
    { name: translate('account.orders'), href: '/account/?hash=orders' },
    {
      name: translate('account.customer-support'),
      href: '/account/?hash=support',
    },
  ];

  const accountButton: Category = {
    categoryId: 'myAccount',
    name: translate('account.my-account'),
    depth: 1,
    descendants: tabs.map((tab) => {
      return { categoryId: tab.href, name: tab.name, slug: tab.href, descendants: [], depth: 1, _urls: {} };
    }),
    _urls: {},
  };

  // const handleLogout = () => {
  //   logout().then(() => router.push('/login'));
  //   hideHeaderMenu();
  // };

    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null!);

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

  useLayoutEffect(() => {
    if (marketButtonRef.current) {
      if (window.innerHeight - marketButtonRef.current.getBoundingClientRect().bottom < 100) setLanguageMenuTop(true);
      else setLanguageMenuTop(false);
    }
  }, [showMenu]);

  return (
    <>
      <div className="mb-4 mt-3 w-full border border-neutral-400" />

      {account ? (
        <div className="ml-6 mr-6 block pt-4 md:hidden">
          <MobileMenuNavButton
            link={accountButton}
            onClick={() => insertCategory(accountButton)}
            hideHeaderMenu={hideHeaderMenu}
          />
        </div>
      ) : (
        <div className="ml-6 mr-6 block py-4 md:hidden">
          <Link link="/help" onClick={hideHeaderMenu} className="py-4">
            <p className="text-14 text-primary">{translate('common.help-and-support')}</p>
          </Link>{' '}
        </div>
      )}

      <div className="mx-6 flex flex-col py-4">
          {isLoggedIn ? (
              <>
                  <Link
                      link="/account"
                      className="block py-4 "
                      role="menuitem"
                      onClick={() => setIsOpen(false)}
                  >
                      My Account
                  </Link>
                  <Link
                      link="/account/orders"
                      className="block py-4"
                      role="menuitem"
                      onClick={() => setIsOpen(false)}
                  >
                      My Orders
                  </Link>
                  <hr className="my-4 border-gray-200" />
                  <button
                      onClick={handleLogout}
                      className="block w-full text-left py-4 text-red-600 hover:bg-gray-100"
                      role="menuitem"
                  >
                      Log Out
                  </button>
              </>
          ) : (
              <>
                  <Link
                      link="/login"
                      className="block py-4"
                      role="menuitem"
                      onClick={() => setIsOpen(false)}
                  >
                      Log In
                  </Link>
                  <Link
                      link="/register"
                      className="block py-4"
                      role="menuitem"
                      onClick={() => setIsOpen(false)}
                  >
                      Sign Up
                  </Link>
              </>
          )}
      </div>

        <div className="mb-4 mt-3 w-full border border-neutral-400" />

        {compareCount > 0 && <Link href="/compare" className="inline-flex font-bold py-6 items-center gap-2 whitespace-nowrap px-6 hover:underline">Compare ({compareCount})</Link>}

      <div className="p-4" ref={marketButtonRef}>
        <MarketButtonMobile menuTop={languageMenuTop} />
      </div>
    </>
  );
};

export default MobileMenuFooter;
