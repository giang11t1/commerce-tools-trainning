'use client';
import React, { useRef, useState } from 'react';
import HeaderNavigationButtonDesktop from './header-navigation-button';
import { Tile } from '../../types';
import useClassNames from '@/helpers/hooks/useClassNames';
import { useFocusOutside } from '@/helpers/hooks/useFocusOutside';
import useOnClickOutside from '@/helpers/hooks/useOnClickOutside';
import useScrollDirection from '@/helpers/hooks/useScrollDirection';
import { Category } from '../../../../types/entity/category';
import MenuDropdown from './menu-dropdown';
import { usePathname } from '../../../../i18n/navigation';

export interface Props {
  links: Category[];
  tiles: Tile[];
  locale: string;
}

const HeaderNavigationDesktop: React.FC<Props> = ({ links, tiles , locale}) => {
  const [activeCategory, setActiveCategory] = useState<Category>();
    const pathname = usePathname();
    const isCheckoutPage = pathname === '/checkout';

  const tileContent = tiles.filter((tile) => tile.tileCategory === activeCategory?.name['en-US']);

  const showSubMenu = (category?: Category) => {
    setActiveCategory(category);
  };
  const hideSubMenu = () => {
    setActiveCategory(undefined);
  };

  const showTimeout = useRef<NodeJS.Timeout | null>(null) as React.MutableRefObject<NodeJS.Timeout | null>;

  const clearShowTimeout = () => {
    if (showTimeout.current) {
      clearTimeout(showTimeout.current);
      showTimeout.current = null;
    }
  };

  const focusMenu = (category: Category) => {
    clearShowTimeout();
    if (activeCategory)
      showSubMenu(category); //Already opened do not delay
    else showTimeout.current = setTimeout(() => showSubMenu(category), 500);
  };

  const blurMenu = () => {
    clearShowTimeout();
    hideSubMenu();
  };

  const scrollDirection = useScrollDirection(5, -1);
  const navigationClassNames = useClassNames([
    'container mx-auto items-center justify-between px-8 hidden xl:flex duration-150 transition-all',
    scrollDirection === 'down' ? 'opacity-0 pointer-events-none h-0' : 'h-13 opacity-100 pointer-events-auto',
  ]);

  const { ref } = useFocusOutside(blurMenu);
  useOnClickOutside(ref, blurMenu);

  return (
    <>
      {links && !isCheckoutPage && (
        <div className={navigationClassNames} onMouseLeave={blurMenu} ref={ref} >
          <div className="flex w-fit justify-start -mx-2.5">
            {links.map((link) => (
              <div key={link?.categoryId} onMouseEnter={() => focusMenu(link)} onFocus={() => focusMenu(link)}>
                <HeaderNavigationButtonDesktop
                  show={link.categoryId === activeCategory?.categoryId}
                  link={link}
                  updateSubMenu={hideSubMenu}
                />
              </div>
            ))}
          </div>
          <MenuDropdown
            show={!!activeCategory && activeCategory.descendants && activeCategory.descendants.length > 0}
            onClick={hideSubMenu}
            links={activeCategory?.descendants ?? []}
            tileContent={tileContent[0]}
            locale={locale}
          />
        </div>
      )}
    </>
  );
};

export default HeaderNavigationDesktop;
