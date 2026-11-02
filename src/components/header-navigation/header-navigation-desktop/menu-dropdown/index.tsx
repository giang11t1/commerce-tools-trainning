'use client';
import React, { FC, useEffect, useRef } from 'react';
import { Tile } from '@/components/types';
import useClassNames from '@/helpers/hooks/useClassNames';
import { Category } from '@/../types/entity/category';
import HeaderDropdownTile from './header-menu-tile';
// import Link from "next/link";
import Link from '@/components/commercetools-ui/atoms/link';

export interface Props {
  show: boolean | undefined;
  links: Category[];
  tileContent?: Tile;
  onClick?: () => void;
    locale: string;
}

const MenuDropdown: FC<Props> = ({ show, links, tileContent, onClick, locale }) => {
    console.log('tileContent', tileContent);

  const ref = useRef<any>(null);
  const wrapperClassNames = useClassNames([
    'transition absolute flex justify-between bottom-0 left-0 duration-300 ease-in-out min-h-[300px] w-[100%] translate-y-full',
    show ? 'opacity-100 z-20 delay-300' : 'opacity-0 z-[-999] pointer-events-none',
    'border-b-2 border-t-2 border-b-accent border-t-neutral-400 bg-white pl-13 pr-12 py-8',
  ]);

  const linksClassNames = useClassNames(['grid grid-cols-4 gap-x-29 gap-y-7', tileContent ? 'pr-29' : '']);
  useEffect(() => {
    if (show && links?.length) {
      ref.current?.focus();
    }
  }, [show, links]);

    const getLocalizedValue = (
        values: Record<string, string>,
        locale: string,
    ) => {
        if (!values) return '';

        if (values[locale]) {
            return values[locale];
        }

        const language = locale.split('-')[0];

        const key = Object.keys(values).find(
            (key) => key.split('-')[0] === language,
        );

        return key ? values[key] : Object.values(values)[0] || '';
    };

  return (
    <div className={wrapperClassNames}>
      <ul className={linksClassNames}>
        {links?.map((link, index) => (
          <li key={link.categoryId}>
            {link.depth === 1 ? (
              <>
                <div className="w-min pb-8 whitespace-nowrap">
                  <Link
                    link={link?._url}
                    variant="menu-header"
                  >
                    <p className="text-14 whitespace-nowrap">{getLocalizedValue(link.name, locale)}</p>
                  </Link>
                </div>
                {link.descendants?.map((field) => (
                  <div key={field.categoryId} className="w-min pb-8">
                    <Link link={field?._url} onClick={onClick} variant="menu-item" >
                      <p className="text-14 whitespace-nowrap">{getLocalizedValue(field.name, locale)}</p>
                    </Link>
                  </div>
                ))}
              </>
            ) : (
              <Link key={link.categoryId} link={link?._url} variant="menu-header" >
                <p className="text-14 whitespace-nowrap">{getLocalizedValue(link.name, locale)}</p>
              </Link>
            )}
          </li>
        ))}
      </ul>
      {tileContent && <HeaderDropdownTile {...{ tileContent }} />}
    </div>
  );
};

export default MenuDropdown;
