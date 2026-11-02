'use client';

import { useCart } from '@/context/CartContext';
import PriceDisplay from '@/components/PriceDisplay';
import {
    getCartDiscountAmount,
    getCartShippingDiscount,
    getCartShippingOriginalPrice,
    getCartShippingPrice,
    getCartTaxAmount,
    getCartSubtotalMoney,
    getTaxBasis,
} from '@/lib/checkout-utils';
import { useLocale, useTranslations } from 'use-intl';

export default function OrderSummary() {
    const { cart } = useCart();
    const locale = useLocale();
    const translate = useTranslations('checkout');

    if (!cart) return null;

    const taxBasis = getTaxBasis(cart);
    const subtotal = getCartSubtotalMoney(cart, taxBasis);
    const discount = getCartDiscountAmount(cart);
    const shipping = getCartShippingPrice(cart);
    const originalShipping = getCartShippingOriginalPrice(cart);
    const shippingDiscount = getCartShippingDiscount(cart);
    const tax = getCartTaxAmount(cart);
    const taxLabel =
        taxBasis === 'included'
            ? translate('includedTax')
            : taxBasis === 'excluded'
              ? translate('tax')
              : translate('taxDetails');

    return (
        <div className="bg-gray-50 rounded-lg p-6 lg:p-8 h-fit border border-gray-200">
            <h2 className="text-2xl font-semibold mb-6 text-[#4a0f0a] border-b pb-4">
                Order Summary
            </h2>

            <ul className="divide-y divide-gray-200 mb-6">
                {cart.lineItems.map((item) => {
                    const itemName =
                        item.name['en-US'] ??
                        Object.values(item.name)[0] ??
                        'Product';
                    const image = item.variant.images?.[0]?.url;

                    return (
                        <li key={item.id} className="py-4 flex items-center">
                            {image && (
                                <img
                                    src={image}
                                    alt={itemName}
                                    className="w-16 h-16 object-cover rounded mr-4"
                                />
                            )}

                            <div className="flex-1">
                                <h4 className="text-sm font-medium text-gray-900">
                                    {itemName}
                                </h4>
                                <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                                {item.taxRate && (
                                    <p className="text-[10px] text-blue-600">
                                        {translate('taxRateLabel')} ({item.taxRate.amount * 100}%)
                                        {item.taxRate.includedInPrice
                                            ? ` · ${translate('taxIncludedLabel')}`
                                            : ` · ${translate('taxExcludedLabel')}`}
                                    </p>
                                )}
                            </div>

                            <PriceDisplay
                                money={item.totalPrice}
                                locale={locale}
                                className="text-sm font-semibold text-gray-900"
                            />
                        </li>
                    );
                })}
            </ul>

            <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                    <span>
                        {taxBasis === 'included'
                            ? translate('subtotalIncludingTax')
                            : taxBasis === 'excluded'
                              ? translate('subtotalExcludingTax')
                              : translate('subtotal')}
                    </span>
                    <span>
                        {subtotal && <PriceDisplay money={subtotal} locale={locale} />}
                    </span>
                </div>

                {discount && discount.centAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                        <span>{translate('discount')}</span>
                        <span>
                            −<PriceDisplay money={discount} locale={locale} />
                        </span>
                    </div>
                )}

                <div className="flex justify-between text-gray-600">
                    <span>{translate('shipping')}</span>
                    <span>
                        {shippingDiscount && originalShipping && (
                            <span className="mr-2 text-gray-400 line-through">
                                <PriceDisplay money={originalShipping} locale={locale} />
                            </span>
                        )}
                        {shipping
                            ? <PriceDisplay money={shipping} locale={locale} />
                            : cart.shippingInfo?.shippingMethod
                              ? translate('shippingCalculated')
                              : translate('shippingNotSelected')}
                    </span>
                </div>

                {shippingDiscount && shippingDiscount.centAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                        <span>{translate('shippingDiscount')}</span>
                        <span>
                            −<PriceDisplay money={shippingDiscount} locale={locale} />
                        </span>
                    </div>
                )}

                <div className="flex justify-between text-gray-600">
                    <span>{taxLabel}</span>
                    <span>
                        {tax
                            ? <PriceDisplay money={tax} locale={locale} />
                            : translate('taxNotCalculated')}
                    </span>
                </div>
            </div>

            <div className="border-t pt-4 mb-8">
                <div className="flex justify-between text-xl font-bold text-gray-900">
                    <span>Total</span>
                    <PriceDisplay
                        money={cart.totalPrice}
                        locale={locale}
                        className="text-blue-600"
                    />
                </div>
            </div>
        </div>
    );
}
