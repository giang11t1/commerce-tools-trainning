'use client';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import useClassNames from '@/helpers/hooks/useClassNames';
import { classnames } from '@/helpers/untils/classnames';
import { FC, useEffect, useState } from 'react';
import { Category } from '@/../types/entity/category';
import {useLocale} from "use-intl";
import { getLocalizationInfo } from '@/../project.config';
import Link from '@/components/commercetools-ui/atoms/link';

export interface Props {
  show: boolean;
  link: Category;
  updateSubMenu: () => void;
}

const HeaderNavigationButtonDesktop: FC<Props> = ({ show, link, updateSubMenu }) => {
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
    const locale = useLocale();

  const navLinkClassNames = useClassNames([
    'flex py-4 cursor-pointer relative hover:[&>:nth-child(1)]:border-b-2 hover:[&>:nth-child(1)]:font-semibold',
  ]);


    const ctLocale = getLocalizationInfo(locale).locale;
    const categoryName =
        typeof link.name === 'object'
            ? link.name[ctLocale] ?? link.name[ctLocale]
            : link.name;


  useEffect(() => {
    setIsLoaded(true);
  }, []);

  if (!isLoaded) return <></>;



  return (
    <div onClick={updateSubMenu} className="px-2.5 ">
      <Link link={link?._url} title={categoryName} className={navLinkClassNames}>
        <span
          className={classnames(
            'block'
          )}
        >
           {categoryName}
        </span>
        {link?.descendants && link?.descendants.length > 0 && <ChevronDownIcon className="ml-2.5 w-4 text-gray-600" />}
      </Link>
    </div>
  );
};
export default HeaderNavigationButtonDesktop;
