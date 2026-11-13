'use client';

import { useState } from 'react';
import AddToCartButton from './AddToCartButton';
import {ProductProjection, Attribute, ProductVariant, Price} from '@commercetools/platform-sdk';
import ProductGallery from '@/components/ProductGallery';
import {
    Disclosure,
    DisclosureButton,
    DisclosurePanel,
} from '@headlessui/react';
import { ChevronDownIcon, TruckIcon } from '@heroicons/react/20/solid';
import {useLocale} from "use-intl";
import { getLocalizationInfo } from '@/../project.config';
import { useTranslations } from 'use-intl';
import PriceDisplay from '@/components/PriceDisplay';
import ProductRating from "@/components/ProductRating";
import BrandLogo from '@/components/BrandLogo';
import Link from '@/components/commercetools-ui/atoms/link';
import type { Brand } from '@/lib/brands';
import type { RecurrencePolicySchedule } from '@commercetools/platform-sdk';
import {
    selectSubscriptionOffersForVariant,
    type SubscriptionOffer,
} from '@/lib/subscription-offers';

interface ProductProps {
    rating: {
        averageRating: number;
        reviewCount: number;
    };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export default function ProductDetails({
    product,
    brand,
    rating,
    inventoryMap,
    recurringOffers,
    subscriptionOptionsUnavailable = false,
    isAvailableInStore = true,
}: {
    product: ProductProjection;
    brand: Brand | null;
    rating: ProductProps['rating'];
    inventoryMap: Record<string, number>;
    recurringOffers: SubscriptionOffer[];
    subscriptionOptionsUnavailable?: boolean;
    isAvailableInStore?: boolean;
}) {
    const locale = useLocale();
    const ctLocale = getLocalizationInfo(locale).locale;
    const subscriptionTranslate = useTranslations('subscriptions');

    const allVariants = [product.masterVariant, ...product.variants];
    const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(product.masterVariant);
    const galleryImages = selectedVariant.images || product.masterVariant.images || [];
    const [purchaseOption, setPurchaseOption] = useState<
        { type: 'one-time' } | { type: 'subscription'; policyId: string }
    >({ type: 'one-time' });


    const name =
        typeof product.name === 'object'
            ? product.name[ctLocale] ?? product.name['en-US']
            : product.name;

    const description =
        typeof product.description === 'object'
            ? product.description[ctLocale] ?? product.description['en-US']
            : product.description;

    const selectedPrice =
        (selectedVariant as ProductVariant & {
            price?: Price;
        }).price;

    const price =
        selectedPrice ||
        selectedVariant.prices?.[0] ||
        product.masterVariant.prices?.[0];

    const discountedPrice =
        price?.discounted &&
        price.discounted.value.centAmount < price.value.centAmount
            ? price.discounted
            : undefined;

    const currentImage = selectedVariant.images?.[0]?.url || product.masterVariant.images?.[0]?.url;


    const getSalePercent = (price: Price) => {
        if (!price.discounted) {
            return 0;
        }

        const original = price.value.centAmount;
        const discounted = price.discounted.value.centAmount;

        if (discounted <= 0 || discounted >= original) {
            return 0;
        }

        return Math.round(
            ((original - discounted) / original) * 100
        );
    };

    const salePercent = price
        ? getSalePercent(price)
        : 0;
    const variantSubscriptionOffers = selectSubscriptionOffersForVariant(
        recurringOffers,
        selectedVariant.sku,
    );
    const selectedSubscriptionOffer =
        purchaseOption.type === 'subscription'
            ? variantSubscriptionOffers.find(
                  (offer) => offer.recurrencePolicyId === purchaseOption.policyId,
              )
            : undefined;

    const formatSchedule = (schedule: RecurrencePolicySchedule) => {
        if (schedule.type === 'dayOfMonth') {
            return subscriptionTranslate('dayOfMonth', { day: schedule.day });
        }

        const unit =
            schedule.intervalUnit === 'Days'
                ? subscriptionTranslate(schedule.value === 1 ? 'day' : 'days')
                : schedule.intervalUnit === 'Weeks'
                  ? subscriptionTranslate(schedule.value === 1 ? 'week' : 'weeks')
                  : subscriptionTranslate(schedule.value === 1 ? 'month' : 'months');

        return schedule.value === 1
            ? subscriptionTranslate('frequencyEveryOne', { unit })
            : subscriptionTranslate('frequencyEvery', {
                  count: schedule.value,
                  unit,
              });
    };

    const getSavingsPercent = (offer: SubscriptionOffer) => {
        const oneTimePrice =
            discountedPrice?.value.centAmount ?? price?.value.centAmount;
        if (!oneTimePrice || offer.price.centAmount >= oneTimePrice) return 0;
        return Math.round(
            ((oneTimePrice - offer.price.centAmount) / oneTimePrice) * 100,
        );
    };

    const getAttributeValue = (attr: Attribute) => {
        if (isRecord(attr.value)) {
            const label = isRecord(attr.value.label) ? attr.value.label : undefined;
            const localizedLabel = label?.['en-US'];
            if (typeof localizedLabel === 'string') return localizedLabel;

            const fallbackLabel = label && Object.values(label).find(
                (value): value is string => typeof value === 'string',
            );
            if (fallbackLabel) return fallbackLabel;

            return JSON.stringify(attr.value['en-US'] ?? attr.value);
        }
        return String(attr.value);
    };

    const translate = useTranslations();

    return (
        <>
            <div className="pt-6 pb-8 md:grid md:grid-cols-12 md:items-start">
                <ProductGallery images={galleryImages} productName={name} salePercent={salePercent} />

                <div className="md:col-span-5 lg:col-span-4 mt-6 md:mt-0">
                    {brand && (
                        <Link link={`/brands/${encodeURIComponent(brand.slug)}`} className="mb-4 inline-flex items-center gap-3 text-sm text-gray-700 hover:text-blue-700">
                            <BrandLogo name={brand.name} logoUrl={brand.logoUrl} className="h-10 w-10 rounded object-contain" />
                            <span>{brand.name}</span>
                        </Link>
                    )}
                    <h1 className="text-3xl font-bold mb-4">{name}</h1>
                    <div className="flex items-baseline gap-2 mb-6">
                        {discountedPrice ? (
                            <>
                                <p className="text-2xl font-semibold text-red-600">
                                    <PriceDisplay money={discountedPrice.value} locale={ctLocale} />
                                </p>

                                <p className="text-lg text-gray-500 line-through">
                                    {price && <PriceDisplay money={price.value} locale={ctLocale} />}
                                </p>
                            </>
                        ) : price ? (
                            <p className="text-2xl font-semibold text-blue-600">
                                <PriceDisplay money={price.value} locale={ctLocale} />
                            </p>
                        ) : null}
                    </div>

                    <div className="mb-6">
                        <ProductRating
                            rating={rating.averageRating}
                            reviewCount={rating.reviewCount}
                        />
                    </div>

                    <fieldset className="mb-6 space-y-3 rounded-lg border border-gray-200 p-4">
                        <legend className="px-1 text-sm font-semibold text-gray-900">
                            {subscriptionTranslate('purchaseOptions')}
                        </legend>
                        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-gray-200 p-3">
                            <input
                                type="radio"
                                name={`purchase-option-${product.id}`}
                                checked={purchaseOption.type === 'one-time'}
                                onChange={() => setPurchaseOption({ type: 'one-time' })}
                                className="mt-1"
                            />
                            <span className="flex flex-1 items-center justify-between gap-3">
                                <span className="font-medium text-gray-800">
                                    {subscriptionTranslate('oneTimePurchase')}
                                </span>
                                {price && (
                                    <span className="font-semibold text-gray-900">
                                        <PriceDisplay money={discountedPrice?.value ?? price.value} locale={ctLocale} />
                                    </span>
                                )}
                            </span>
                        </label>

                        {variantSubscriptionOffers.map((offer) => {
                            const savings = getSavingsPercent(offer);
                            return (
                                <label
                                    key={offer.recurrencePolicyId}
                                    className="flex cursor-pointer items-start gap-3 rounded-md border border-gray-200 p-3"
                                >
                                    <input
                                        type="radio"
                                        name={`purchase-option-${product.id}`}
                                        checked={
                                            purchaseOption.type === 'subscription' &&
                                            purchaseOption.policyId === offer.recurrencePolicyId
                                        }
                                        onChange={() =>
                                            setPurchaseOption({
                                                type: 'subscription',
                                                policyId: offer.recurrencePolicyId,
                                            })
                                        }
                                        className="mt-1"
                                    />
                                    <span className="flex flex-1 flex-col gap-1">
                                        <span className="flex flex-wrap items-center justify-between gap-2">
                                            <span className="font-medium text-gray-800">
                                                {subscriptionTranslate('subscribeAndSave')}
                                            </span>
                                            <span className="font-semibold text-gray-900">
                                                <PriceDisplay money={offer.price} locale={ctLocale} />
                                            </span>
                                        </span>
                                        <span className="text-sm text-gray-600">
                                            {offer.recurrencePolicyName} · {formatSchedule(offer.schedule)}
                                        </span>
                                        {savings > 0 && (
                                            <span className="text-sm font-medium text-green-700">
                                                {subscriptionTranslate('savePercent', { percent: savings })}
                                            </span>
                                        )}
                                    </span>
                                </label>
                            );
                        })}

                        {subscriptionOptionsUnavailable && (
                            <p role="status" className="text-sm text-amber-800">
                                {subscriptionTranslate('optionsUnavailable')}
                            </p>
                        )}
                    </fieldset>

                    {allVariants.length >= 1 && (
                        <div className="mb-8">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">
                                Select Color
                            </h3>
                            <div className="flex flex-wrap gap-6">
                                {allVariants.map((variant) => (
                                    <div key={variant.id} className="flex items-center flex-col gap-2">
                                        <span className="text-xs font-medium text-gray-700">{
                                            variant.attributes?.find(
                                                (attribute) => attribute.name === 'color-label'
                                            )?.value['en-US']
                                        }</span>
                                        <button
                                            key={variant.id}
                                            onClick={() => {
                                                setSelectedVariant(variant);
                                                setPurchaseOption({ type: 'one-time' });
                                            }}
                                            className={`h-6 w-6 rounded-full cursor-pointer inline-block transition-all border-2 ${
                                                selectedVariant.id === variant.id
                                                    ? 'border-blue-600 ring-1 ring-blue-600'
                                                    : 'border-gray-300 hover:border-gray-400'
                                            }`}

                                            style={{
                                                backgroundColor: variant.attributes?.find(
                                                    (attribute) => attribute.name === 'color-code'
                                                )?.value
                                            }}
                                        >
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-4 mb-8 w-full">
                        <AddToCartButton
                            product={{
                                id: product.id,
                                name: `${name}${selectedVariant.sku ? ` (${selectedVariant.sku})` : ''}`,
                                price:
                                    discountedPrice?.value.centAmount ??
                                    price?.value.centAmount ??
                                    0,
                                currency: price?.value.currencyCode ?? 'USD',
                                image: currentImage,
                                availableQuantity:
                                    inventoryMap[selectedVariant.sku ?? ''] ??
                                    selectedVariant.availability?.availableQuantity ?? 0,

                            }}
                            wishlistProduct={product}
                            variantId={selectedVariant.id}
                            recurrencePolicyId={selectedSubscriptionOffer?.recurrencePolicyId}
                            isAvailableInStore={isAvailableInStore}
                            compareProduct={product}
                        />
                    </div>

                    <div className="mt-6 grid gap-3"><p
                        className="text-14 font-bold leading-[16px] text-gray-700">Shipping methods</p>
                        <div className="overflow-hidden rounded-md border border-neutral-400 bg-white">
                            <div className="flex items-center gap-5 p-4">
                                <TruckIcon className="h-5 w-5" />
                                <div className="grid gap-2">
                                    <div className="flex flex-wrap gap-4"><p
                                        className="text-14 font-semibold leading-tight text-gray-700"
                                        data-alpine-devtools-right-click="">3-5 business days</p></div>
                                    <div><p className="text-14 leading-tight text-gray-600">Standard Delivery</p></div>
                                </div>
                            </div>
                            <div className="flex items-center gap-5 p-4 border-t border-neutral-400">
                                <TruckIcon className="h-5 w-5" />
                                <div className="grid gap-2">
                                    <div className="flex flex-wrap gap-4"><p
                                        className="text-14 font-semibold leading-tight text-gray-700">1-2 business
                                        days</p></div>
                                    <div><p className="text-14 leading-tight text-gray-600">Express shipping</p></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="prose prose-blue mt-8 grid gap-y-5 md:col-span-7 md:mb-10 md:pr-20 lg:col-span-8 lg:pr-15">

                    <Disclosure
                        as="div"
                        className="border-b border-gray-200"
                    >
                        {({ open }) => (
                            <>
                                <DisclosureButton className="flex w-full items-center justify-between py-5 text-left cursor-pointer">
                                    <h2 className="text-lg font-bold mb-4">{translate('product.product-desc')}</h2>

                                    <ChevronDownIcon
                                        className={`h-5 w-5 transition-transform ${
                                            open ? 'rotate-180' : ''
                                        }`}
                                    />
                                </DisclosureButton>

                                <DisclosurePanel className="pb-5 text-sm leading-6 text-gray-600">
                                    <p className="text-gray-700">{description || 'No description available.'}</p>
                                </DisclosurePanel>
                            </>
                        )}
                    </Disclosure>


                    <Disclosure
                        as="div"
                        className="border-b border-gray-200"
                    >
                        {({ open }) => (
                            <>
                                <DisclosureButton className="flex w-full items-center justify-between py-5 text-left cursor-pointer">
                                    <h2 className="text-lg font-bold mb-4">{translate('product.details-additional')}</h2>

                                    <ChevronDownIcon
                                        className={`h-5 w-5 transition-transform ${
                                            open ? 'rotate-180' : ''
                                        }`}
                                    />
                                </DisclosureButton>

                                <DisclosurePanel className="pb-5 text-sm leading-6 text-gray-600">
                                    {selectedVariant.attributes && selectedVariant.attributes.length > 0 && (
                                        <dl className="grid grid-cols-1 gap-y-3">
                                            {selectedVariant.attributes.map((attr) => (
                                                <div key={attr.name} className="flex justify-between border-b pb-2">
                                                    <dt className="font-semibold text-gray-600">{attr.name}</dt>
                                                    <dd className="text-gray-900">{getAttributeValue(attr)}</dd>
                                                </div>
                                            ))}
                                        </dl>
                                    )}
                                </DisclosurePanel>
                            </>
                        )}
                    </Disclosure>


                </div>
            </div>
        </>
    );
}
