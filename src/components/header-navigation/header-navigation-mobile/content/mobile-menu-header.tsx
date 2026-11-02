import React, { FC } from 'react';
import { ChevronLeftIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useLocale, useTranslations } from 'next-intl';
import Button from '@/components/commercetools-ui/atoms/button';
import HeaderLogo from '@/components/commercetools-ui/organisms/header/header-logo';
import { Category } from '@/../types/entity/category';
import { Reference } from '@/../types/reference';

export interface Props {
  logo: string;
  logoLink: Reference;
  categories: Category[];
  onArrowClick: () => void;
  hideHeaderMenu: () => void;
}

const MobileMenuHeader: FC<Props> = ({
                                         onArrowClick,
                                         logo,
                                         logoLink,
                                         hideHeaderMenu,
                                         categories,
                                     }) => {
    const locale = useLocale();
    const translate = useTranslations();

    const currentCategory =
        categories[categories.length - 1];

    const categoryName =
        currentCategory?.name?.[locale] ??
        currentCategory?.name?.['en-US'] ??
        currentCategory?.name?.['en-GB'] ??
        '';

    return (
        <div className="flex h-13 w-full justify-between border-b border-neutral-400 px-5">
            {categories.length > 0 ? (
                <div className="flex h-full items-center justify-start">
                    <Button
                        variant="ghost"
                        size="fit"
                        onClick={onArrowClick}
                        className="px-0"
                    >
                        <ChevronLeftIcon className="w-5 text-gray-600" />
                    </Button>
                </div>
            ) : (
                <HeaderLogo
                    logo={logo}
                    logoLink={logoLink}
                    onClick={hideHeaderMenu}
                    imageClassName="flex h-full items-center justify-center text-center text-16 font-bold md:text-28 uppercase"
                />
            )}

            {categories.length > 0 && (
                <div className="flex w-full items-center justify-center whitespace-nowrap">
                    <p className="text-center font-medium">
                        {categoryName}
                    </p>
                </div>
            )}

            <div className="flex h-full items-center justify-end">
                <Button
                    variant="ghost"
                    size="xs"
                    onClick={hideHeaderMenu}
                    title={translate('common.close')}
                    className="px-0"
                >
                    <XMarkIcon className="w-6 text-gray-600" />
                </Button>
            </div>
        </div>
    );
};

export default MobileMenuHeader;
