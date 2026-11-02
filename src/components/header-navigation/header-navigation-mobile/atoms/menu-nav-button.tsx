import React, { FC } from 'react';
import { useLocale } from 'next-intl';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import Link from '@/components/commercetools-ui/atoms/link';
import { Category } from '@/../types/entity/category';
import  useClassNames  from '../../../../helpers/hooks/useClassNames';

export interface Props {
    link: Category;
    categoriesNavigator: Category[];
    onClick: () => void;
    hideHeaderMenu: () => void;
}

const MobileMenuNavButton: FC<Props> = ({
                                            link,
                                            categoriesNavigator,
                                            onClick,
                                            hideHeaderMenu,
                                        }) => {
    const locale = useLocale();

    const linkName =
        link.name?.[locale] ??
        link.name?.['en-US'] ??
        link.name?.['en-GB'] ??
        '';

    const linkClassNames = useClassNames([
        'flex justify-between',
        categoriesNavigator?.length === 0
            ? 'py-4'
            : link?.categoryId === 'myAccount'
                ? 'pb-4'
                : 'pb-9',
    ]);

    return (
        <div key={link.categoryId} className="cursor-pointer">
            {link?.descendants && link.descendants.length > 0 ? (
                <div
                    onClick={onClick}
                    className={linkClassNames}
                >
                    <p className="text-primary">
                        {linkName}
                    </p>

                    <ChevronRightIcon className="w-5 text-gray-600" />
                </div>
            ) : (
                <div
                    onClick={hideHeaderMenu}
                    className={linkClassNames}
                >
                    <Link link={link?._url}>
                        <p className="text-primary">
                            {linkName}
                        </p>
                    </Link>
                </div>
            )}
        </div>
    );
};

export default MobileMenuNavButton;
