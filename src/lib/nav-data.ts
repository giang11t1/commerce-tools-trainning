import { Category as CTCategory } from '@commercetools/platform-sdk';
import { Category } from '../../types/entity/category';
import { Tile } from '@/components/types';

export function transformCategories(
    categories: any[],
    locale: string,
): Category[] {
    const categoryMap = new Map<string, Category>();

    categories.forEach((ctCat: any) => {
        const slug =
            ctCat.slug?.[locale] ||
            (ctCat.slug ? Object.values(ctCat.slug)[0] : '');

        categoryMap.set(ctCat.id, {
            categoryId: ctCat.id,
            categoryKey: ctCat.key,
            name:  ctCat.name
                ? Object.entries(ctCat.name).reduce(
                    (acc, [locale, val]) => {
                        acc[locale] = `${val}`;
                        return acc;
                    },
                    {} as Record<string, string>,
                )
                : {},
            slug: slug as string,
            _url: `/categories/${slug}`,
            _urls: ctCat.slug
                ? Object.entries(ctCat.slug).reduce(
                    (acc, [locale, val]) => {
                        acc[locale] = `/categories/${val}`;
                        return acc;
                    },
                    {} as Record<string, string>,
                )
                : {},
            parentId: ctCat.parent?.id,
            descendants: [],
            depth: 0,
        });
    });

    const rootCategories: Category[] = [];

    categoryMap.forEach((cat) => {
        if (cat.parentId && categoryMap.has(cat.parentId)) {
            const parent = categoryMap.get(cat.parentId)!;
            parent.descendants = parent.descendants || [];
            parent.descendants.push(cat);
        } else {
            rootCategories.push(cat);
        }
    });

    const setDepth = (cat: Category, depth: number) => {
        cat.depth = depth;
        cat.descendants?.forEach((child) => setDepth(child, depth + 1));
    };

    rootCategories.forEach((cat) => setDepth(cat, 0));

    return rootCategories;
}

export const sampleTiles: Tile[] = [
  {
    tileCategory: 'Furniture',
    tileImage: {
      media: {
        url: 'https://res.cloudinary.com/dlwdq84ig/image/upload/c_fill,ar_16:9,w_3840,g_faces:auto/f_auto/q_20/v1/svvbad0vkrdy8jrc8ozy?_a=BAVMn6AQ0',
      },
      title: 'Furniture',
    },
    tileHeaderText: 'Furniture',
    tileHeaderDecoration: 'uppercase',
    tileButtonLabel: 'SHOP NOW',
    tileButtonLabelDecoration: 'uppercase',
    tileButtonLink: {
      type: 'link',
      link: '/categories/furniture',
    },
  },
  {
    tileCategory: 'Kitchen',
    tileImage: {
      media: {
        url: 'https://res.cloudinary.com/dlwdq84ig/image/upload/c_fill,w_750,g_auto/f_auto/q_auto/v1/hjuqp0znaebkmgcvy6ax?_a=BAVMn6AQ0',
      },
      title: 'Kitchen',
    },
    tileHeaderText: 'Kitchen',
    tileHeaderDecoration: 'uppercase',
    tileButtonLabel: 'EXPLORE',
    tileButtonLabelDecoration: 'uppercase',
    tileButtonLink: {
      type: 'link',
      link: '/categories/kitchen',
    },
  },
    {
        tileCategory: 'Home Decor',
        tileImage: {
            media: {
                url: 'https://res.cloudinary.com/dlwdq84ig/image/upload/c_fill,w_750,g_auto/f_auto/q_auto/v1/nnxazvx2drjugcdennxv?_a=BAVMn6AQ0',
            },
            title: 'Home Decor',
        },
        tileHeaderText: 'Home Decor',
        tileHeaderDecoration: 'uppercase',
        tileButtonLabel: 'EXPLORE',
        tileButtonLabelDecoration: 'uppercase',
        tileButtonLink: {
            type: 'link',
            link: '/categories/home-decor',
        },
    },
] as Tile[];
