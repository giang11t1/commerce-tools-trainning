'use client';

import { useLocale } from 'use-intl';
import { getLocalizationInfo } from '@/../project.config';
import Breadcrumb from '@/components/commercetools-ui/molecules/breadcrumb';
import usePath from '@/helpers/hooks/usePath';
import {useMemo} from "react";
import Link from '@/components/commercetools-ui/atoms/link';

interface Category {
    id: string;
    name: Record<string, string>;
    slug: Record<string, string>;
    _url?: string;
    ancestors?: {
        typeId: string;
        id: string;
    }[];
    parent?: {
        typeId: string;
        id: string;
    };
}


interface BannerCategoryProps {
    category: Category;
    total: number;
    allCategories?: Category[];
    subCategories?: Category[];
}
function getLocalizedValue(
    value: Record<string, string> | undefined,
    locale: string,
): string {
    if (!value) {
        return '';
    }

    if (value[locale]) {
        return value[locale];
    }

    const language = locale.split('-')[0];

    const key = Object.keys(value).find(
        (key) => key.split('-')[0] === language,
    );

    if (key) {
        return value[key];
    }

    return Object.values(value)[0] ?? '';
}

export default function BannerCategory({
                                           category,
                                            total,
                                           allCategories,
                                           subCategories,
                                       }: BannerCategoryProps) {
    const locale = useLocale();

    const ctLocale = getLocalizationInfo(locale).locale;

    const categoryName = getLocalizedValue(
        category.name,
        ctLocale,
    );


    const ancestorCategories = useMemo(() => {
        if (!category?.ancestors?.length || !allCategories?.length) {
            return [];
        }

        const categoriesById = new Map(
            allCategories.map((item) => [item.id, item])
        );

        return category.ancestors
            .map((ancestor) => categoriesById.get(ancestor.id))
            .filter(
                (item): item is Category => Boolean(item)
            );
    }, [category, allCategories]);

    return (
        <div className="flex flex-col gap-4 mb-8 ">

            <Breadcrumb Separator="/" listClassName="py-6">
                <Link
                    link="/"
                    className="hover:text-blue-600"
                >
                    Home
                </Link>

                {ancestorCategories.map((parent) => (
                    <Link
                        key={parent.id}
                        link={`/categories/${parent.slug[ctLocale]}`}
                        className="px-2 py-5 text-12 hover:text-blue-600"
                    >
                        {getLocalizedValue(parent.name, ctLocale)}
                    </Link>
                ))}

                <span className="font-medium text-gray-500">
                    {categoryName}
                </span>
            </Breadcrumb>

            <h1 className="text-3xl font-bold text-center">
                {categoryName}
            </h1>

            <div className="flex justify-center items-center mb-6">
                {(total > 1) ? (
                    <span>Showing {total} products</span>
                ) : (
                    <span>Showing {total} product</span>
                )}
            </div>


            {subCategories && (
                <>
                <div className="flex items-center lg:justify-center gap-4 overflow-x-auto">
                    {subCategories.map((subcategory) => (
                        <Link
                            key={subcategory.name[ctLocale]}
                            link={`/categories/${subcategory.name[ctLocale].toLowerCase().replace(/\s+/g, '-')}`}
                            className="bg-white p-4 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <h3 className="text-lg font-semibold text-gray-800 whitespace-nowrap">
                                {subcategory.name[ctLocale]}
                            </h3>
                        </Link>
                    ))}
                </div>
                </>
            )}
        </div>
    );
}
