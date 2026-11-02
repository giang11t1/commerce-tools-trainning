import { getProductBySlug, getRelatedProducts } from '../../../../lib/products';
import Link from '@/components/commercetools-ui/atoms/link';
import { notFound } from 'next/navigation';
import ProductDetails from './ProductDetails';
import ProductSlider from "@/components/ProductSlider";
import {getProductRating, getProductReviews} from "@/lib/reviews";
import {getInventoryMapBySkus} from "@/lib/inventory";
import { isProductAvailableInCustomerStore } from '@/lib/cart';
import ProductReviews from "@/components/ProductReviews";
import { getBrandByKey, getProductBrandKey } from '@/lib/brands';

interface ProductPageProps {
    params: Promise<{ locale: string; slug: string }>;
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
    const { locale, slug } = await params;
    let product, relatedProducts;

    try {
        product = await getProductBySlug(slug, locale);
        relatedProducts = product
            ? await getRelatedProducts(product, locale)
            : [];

    } catch (error) {
        console.error('Error fetching product:', error);
        return notFound();
    }


    if (!product) {
        return notFound();
    }

    const productBrandKey = getProductBrandKey(product);
    const brand = productBrandKey
        ? await getBrandByKey(productBrandKey).catch((error) => {
            console.error('Error fetching product brand:', { productId: product.id, error });
            return null;
        })
        : null;

    console.log("productBrandKey", productBrandKey);
    console.log("brand: ", brand);
    const productName = product.name['en'] || Object.values(product.name)[0];
    const category = product.categories?.[0]?.obj;
    const categoryName = category ? (category.name['en'] || Object.values(category.name)[0]) : null;

    const [rating, reviews] = await Promise.all([
        getProductRating(product.id),
        getProductReviews(product.id),
    ]);

    const skus = [
        product.masterVariant.sku,
        ...product.variants.map((v) => v.sku),
    ].filter(Boolean) as string[];

    const relatedSkus = relatedProducts
        .flatMap((relatedProduct) => [
            relatedProduct.masterVariant,
            ...(relatedProduct.variants ?? []),
        ])
        .map((variant) => variant.sku)
        .filter((sku): sku is string => Boolean(sku));

    const [inventoryMap, isAvailableInStore, relatedInventoryMap, relatedRatings] = await Promise.all([
        getInventoryMapBySkus(skus),
        isProductAvailableInCustomerStore(product.id),
        getInventoryMapBySkus(relatedSkus),
        Promise.all(relatedProducts.map((relatedProduct) => getProductRating(relatedProduct.id))),
    ]);

    const relatedProductsWithInventory = relatedProducts.map((relatedProduct, index) => {
        const variants = [relatedProduct.masterVariant, ...(relatedProduct.variants ?? [])];
        const variantQuantities = Object.fromEntries(
            variants
                .filter((variant) => variant.sku)
                .map((variant) => [
                    variant.sku as string,
                    relatedInventoryMap[variant.sku as string] ??
                        variant.availability?.availableQuantity ?? 0,
                ]),
        );

        return {
            product: relatedProduct,
            rating: relatedRatings[index],
            availableQuantity:
                relatedInventoryMap[relatedProduct.masterVariant.sku ?? ''] ??
                relatedProduct.masterVariant.availability?.availableQuantity ?? 0,
            variantQuantities,
        };
    });

    return (
        <main className="mx-auto lg:px-4 lg:py-8">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4 lg:mb-8">
                <Link link="/" className="hover:text-blue-600">Home</Link>
                <span>/</span>
                <Link link="/categories" className="hover:text-blue-600">Categories</Link>
                {category && (
                    <>
                        <span>/</span>
                        <Link  link={`/categories/${category.slug['en-US']}`} className="hover:text-blue-600">
                            {categoryName}
                        </Link>
                    </>
                )}
                <span>/</span>
                <span className="font-medium text-gray-900">{productName}</span>
            </div>

            <ProductDetails product={product} brand={brand} rating={rating} inventoryMap={inventoryMap} isAvailableInStore={isAvailableInStore} />

            <div className="pt-6 pb-8 md:grid md:grid-cols-12 md:items-start">
                <div className="grid gap-y-5 md:col-span-7 md:mb-10 md:pr-20 lg:col-span-8 lg:pr-15">
                    <ProductReviews productId={product.id} />
                </div>
            </div>


            {relatedProducts.length > 0 && (
                <section className="mt-12">
                    <h2 className="text-2xl font-bold mb-6">Related Products</h2>

                    <ProductSlider products={relatedProductsWithInventory} />
                </section>
            )}
        </main>
    );
}
