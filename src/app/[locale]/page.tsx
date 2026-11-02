import { getProducts } from '../../lib/products';
import {getCategories} from '../../lib/categories';
import { getBrands } from '@/lib/brands';
import BrandGrid from '@/components/BrandGrid';
import BestSellerCategories from '../../components/BestSellerCategories';
import Banner from '../../components/Banner';
import ProductSlider from '../../components/ProductSlider';
import { Link } from '@/../i18n/navigation';
import {getProductRating} from "@/lib/reviews";
import {ProductProjection} from "@commercetools/platform-sdk";
import {getInventoryMapBySkus} from "@/lib/inventory";
import {isProductAvailableInCustomerStore} from "@/lib/cart";
import { getTranslations } from 'next-intl/server';

const getAllVariants = (product: ProductProjection) => [
    product.masterVariant,
    ...(product.variants ?? []),
];

const getVariantSkus = (products: ProductProjection[]) =>
    products
        .flatMap(getAllVariants)
        .map((variant) => variant.sku)
        .filter(Boolean) as string[];

/**
 * Stock per variant SKU, so the card's add-to-cart button
 * follows the variant selected via the color swatches.
 */
const getVariantQuantities = (
    product: ProductProjection,
    inventoryMap: Record<string, number>,
) =>
    getAllVariants(product).reduce<Record<string, number>>((map, variant) => {
        if (variant.sku) {
            map[variant.sku] =
                inventoryMap[variant.sku] ??
                variant.availability?.availableQuantity ?? 0;
        }

        return map;
    }, {});

/**
 * Stock shown on the card. Products outside the customer's store
 * cannot be added to the cart, so they render as out of stock up front
 * instead of failing after the click.
 */
const getProductStock = (
    product: ProductProjection,
    inventoryMap: Record<string, number>,
    isAvailableInStore: boolean,
) => {
    if (!isAvailableInStore) {
        return {
            availableQuantity: 0,
            variantQuantities: Object.fromEntries(
                getAllVariants(product)
                    .filter((variant) => variant.sku)
                    .map((variant) => [variant.sku as string, 0]),
            ),
        };
    }

    return {
        availableQuantity:
            inventoryMap[product.masterVariant.sku ?? ''] ??
            product.masterVariant.availability?.availableQuantity ?? 0,
        variantQuantities: getVariantQuantities(product, inventoryMap),
    };
};

export default async function Home({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const [products, categories, brands, translate] = await Promise.all([
        getProducts(locale),
        getCategories(),
        getBrands().catch((error) => {
            console.error('Failed to load homepage brands', error);
            return [];
        }),
        getTranslations('brands'),
    ]);

    const reversedProducts = products.slice().reverse();

    const productsWithRatings = await Promise.all(
        products.map(async (product: ProductProjection) => ({
            product,
            rating: await getProductRating(product.id),
        })),
    );

    const skus = getVariantSkus(products);

    const [inventoryMap, storeAvailability] = await Promise.all([
        getInventoryMapBySkus(skus),
        Promise.all(
            products.map(
                async (product) =>
                    [product.id, await isProductAvailableInCustomerStore(product.id)] as const,
            ),
        ),
    ]);

    const availableInStore = new Map(storeAvailability);

    const productsWithInventory = productsWithRatings.map(
        ({ product, rating }) => ({
            product,
            rating,
            ...getProductStock(
                product,
                inventoryMap,
                availableInStore.get(product.id) ?? true,
            ),
        })
    );

    const productsWithRatingsRevert = await Promise.all(
        reversedProducts.map(async (product: ProductProjection) => ({
            product,
            rating: await getProductRating(product.id),
        })),
    );


    const skusRevert = getVariantSkus(reversedProducts);

    const inventoryMapRevert =
        await getInventoryMapBySkus(skusRevert);

    const productsWithInventoryRevert = productsWithRatingsRevert.map(
        ({ product, rating }) => ({
            product,
            rating,
            ...getProductStock(
                product,
                inventoryMapRevert,
                availableInStore.get(product.id) ?? true,
            ),
        })
    );

    const images  = [
        'https://res.cloudinary.com/dlwdq84ig/image/upload/c_fill,w_640,x_3130,y_2544/f_auto/q_auto/v1/o5quh2svt6gtgsokqr8w?_a=BAVMn6AQ0',
        'https://res.cloudinary.com/dlwdq84ig/image/upload/c_fill,w_640,x_3996,y_1948/f_auto/q_auto/v1/kqdbxkymj5mwzltpp4l7?_a=BAVMn6AQ0',
        'https://res.cloudinary.com/dlwdq84ig/image/upload/c_fill,w_640,g_auto/f_auto/q_auto/v1/hjuqp0znaebkmgcvy6ax?_a=BAVMn6AQ0',
        'https://res.cloudinary.com/dlwdq84ig/image/upload/c_fill,w_640,g_auto/f_auto/q_auto/v1/w6m0l0rw2j8okyyv0twm?_a=BAVMn6AQ0',
        'https://res.cloudinary.com/dlwdq84ig/image/upload/c_fill,w_640,g_auto/f_auto/q_auto/v1/xlxghgt7fegiy1zbqxcr?_a=BAVMn6AQ0'
    ];

    const tiles = await Promise.all(
        categories.map(async (category, index) => ({
            title: category.name['en-US'] ?? '',
            slug: category.slug['en-US'] ?? '',
            image: images[index % images.length],
        }))
    );


    return (
        <>

            <Banner />
            <BestSellerCategories tiles={tiles} />


           <div className={ `container mx-auto px-4 py-8`}>


               <div className="flex justify-between items-center my-4 lg:my-10">
                   <h2 className="text-2xl font-bold">Top Sellers</h2>
               </div>

               <ProductSlider products={productsWithInventory} />

               <div className="flex justify-between items-center my-10 lg:mt-20">
                   <h2 className="text-2xl font-bold">{translate('title')}</h2>
                   <Link href="/brands" className="text-blue-500 hover:underline">{translate('viewAll')}</Link>
               </div>
               <BrandGrid brands={brands} />


               <div className="flex justify-between items-center my-10 mt-20">
                   <h2 className="text-2xl font-bold">Featured Products</h2>
               </div>

               <ProductSlider products={productsWithInventoryRevert} />
           </div>

        </>
    );
}
