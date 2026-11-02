'use client';
import React from 'react';
import type { Address } from '@commercetools/platform-sdk';
import type {
    CheckoutFormData,
    CheckoutShippingOption,
} from '@/components/checkout/types';
import PriceDisplay from '@/components/PriceDisplay';
import { useLocale, useTranslations } from 'use-intl';
import { getCommerceMarket } from '@/lib/commerce-market';

export type { CheckoutFormData };

interface ShippingInfoProps {
    formData: CheckoutFormData;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    isLoadingShippingMethods: boolean;
    isUpdatingShippingMethod: boolean;
    shippingMethods: CheckoutShippingOption[];
    customerEmail?: string | null;
    hasLoadedShippingMethods: boolean;
    hasShippingError: boolean;
    canContinue: boolean;
    onRetryShippingMethods: () => void;
    shippingAddress?: Address | null;
    billingAddress?: Address | null;
}

export const ShippingInfo: React.FC<ShippingInfoProps> = ({
    formData,
    handleInputChange,
    isLoadingShippingMethods,
    isUpdatingShippingMethod,
    shippingMethods,
    customerEmail,
    hasLoadedShippingMethods,
    hasShippingError,
    canContinue,
    onRetryShippingMethods,
    shippingAddress,
    billingAddress,
}) => {
    const translate = useTranslations();
    const locale = useLocale();
    const marketLocale = getCommerceMarket(locale).locale;

    return (
        <>

            {/* Shipping Information */}
            <section>
                <h2 className="text-2xl font-semibold mb-6 text-[#4a0f0a] border-b pb-2">
                    Shipping Information
                </h2>

                {customerEmail ? (
                    <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                        <span className="mr-2 text-sm text-gray-500">Email:</span>
                        <span className="text-sm font-medium text-gray-900">{customerEmail}</span>
                    </div>
                ) : (
                    <div className="float-field mb-6">
                        <input
                            type="email"
                            name="email"
                            id="email"
                            required
                            placeholder=" "
                            value={formData.email}
                            onChange={handleInputChange}
                        />
                        <label htmlFor="email">Email Address *</label>
                    </div>
                )}

                {shippingAddress ? (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
                        <div className="flex items-start justify-between gap-4">
                            <div className="text-sm text-gray-700 space-y-1">
                                <p className="font-semibold text-gray-900">
                                    {shippingAddress.firstName}{' '}
                                    {shippingAddress.lastName}
                                </p>

                                {shippingAddress.company && (
                                    <p>{shippingAddress.company}</p>
                                )}

                                <p>
                                    {shippingAddress.streetName}{' '}
                                    {shippingAddress.streetNumber}
                                </p>

                                {shippingAddress.additionalStreetInfo && (
                                    <p>
                                        {shippingAddress.additionalStreetInfo}
                                    </p>
                                )}

                                <p>
                                    {shippingAddress.city},{' '}
                                    {shippingAddress.state}{' '}
                                    {shippingAddress.postalCode}
                                </p>

                                {shippingAddress.region && (
                                    <p>{shippingAddress.region}</p>
                                )}

                                <p>{shippingAddress.country}</p>

                                {shippingAddress.phone && (
                                    <p className="pt-2">
                                        {shippingAddress.phone}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
                        {/* First name */}
                        <div className="float-field">
                            <input
                                type="text"
                                name="firstName"
                                id="firstName"
                                required
                                placeholder=" "
                                value={formData.firstName}
                                onChange={handleInputChange}
                            />
                            <label htmlFor="firstName">First Name *</label>
                        </div>

                        {/* Last name */}
                        <div className="float-field">
                            <input
                                type="text"
                                name="lastName"
                                id="lastName"
                                required
                                placeholder=" "
                                value={formData.lastName}
                                onChange={handleInputChange}
                            />
                            <label htmlFor="lastName">Last Name *</label>
                        </div>

                        {/* Address */}
                        <div className="float-field sm:col-span-2">
                            <input
                                type="text"
                                name="address"
                                id="address"
                                required
                                placeholder=" "
                                value={formData.address}
                                onChange={handleInputChange}
                            />
                            <label htmlFor="address">Address *</label>
                        </div>

                        {/* City */}
                        <div className="float-field">
                            <input
                                type="text"
                                name="city"
                                id="city"
                                required
                                placeholder=" "
                                value={formData.city}
                                onChange={handleInputChange}
                            />
                            <label htmlFor="city">City *</label>
                        </div>

                        {/* Postal code */}
                        <div className="float-field">
                            <input
                                type="text"
                                name="postalCode"
                                id="postalCode"
                                required
                                placeholder=" "
                                value={formData.postalCode}
                                onChange={handleInputChange}
                            />
                            <label htmlFor="postalCode">Postal Code *</label>
                        </div>

                        {/* Country */}
                        <div className="float-field sm:col-span-2">
                            <select
                                id="country"
                                name="country"
                                required
                                value={formData.country}
                                data-empty={formData.country ? undefined : 'true'}
                                onChange={handleInputChange}
                            >
                                <option value="">
                                    {translate('common.select-country')}
                                </option>
                                <option value="US">
                                    United States
                                </option>

                                <option value="CA">
                                    Canada
                                </option>

                                <option value="GB">
                                    United Kingdom
                                </option>

                                <option value="DE">
                                    Germany
                                </option>

                                <option value="AU">
                                    Australia
                                </option>

                                <option value="VN">
                                    Vietnam
                                </option>
                            </select>
                            <label htmlFor="country">Country *</label>
                        </div>
                    </div>
                )}

            </section>

            <section>
                <h2 className="text-2xl font-semibold mb-6 text-[#4a0f0a] border-b pb-2">
                    {translate('checkout.billingAddress')}
                </h2>

                {billingAddress ? (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
                        <div className="text-sm text-gray-700 space-y-1">
                            <p className="font-semibold text-gray-900">
                                {billingAddress.firstName} {billingAddress.lastName}
                            </p>
                            {billingAddress.company && <p>{billingAddress.company}</p>}
                            <p>
                                {billingAddress.streetName} {billingAddress.streetNumber}
                            </p>
                            {billingAddress.additionalStreetInfo && (
                                <p>{billingAddress.additionalStreetInfo}</p>
                            )}
                            <p>
                                {billingAddress.city}, {billingAddress.state}{' '}
                                {billingAddress.postalCode}
                            </p>
                            {billingAddress.region && <p>{billingAddress.region}</p>}
                            <p>{billingAddress.country}</p>
                            {billingAddress.phone && <p className="pt-2">{billingAddress.phone}</p>}
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
                        <div className="float-field">
                            <input
                                type="text"
                                name="billingAddress.firstName"
                                id="billingFirstName"
                                autoComplete="billing given-name"
                                required
                                placeholder=" "
                                value={formData.billingAddress.firstName}
                                onChange={handleInputChange}
                            />
                            <label htmlFor="billingFirstName">
                                {translate('common.firstName')} *
                            </label>
                        </div>

                        <div className="float-field">
                            <input
                                type="text"
                                name="billingAddress.lastName"
                                id="billingLastName"
                                autoComplete="billing family-name"
                                required
                                placeholder=" "
                                value={formData.billingAddress.lastName}
                                onChange={handleInputChange}
                            />
                            <label htmlFor="billingLastName">
                                {translate('common.lastName')} *
                            </label>
                        </div>

                        <div className="float-field sm:col-span-2">
                            <input
                                type="text"
                                name="billingAddress.company"
                                id="billingCompany"
                                autoComplete="billing organization"
                                placeholder=" "
                                value={formData.billingAddress.company}
                                onChange={handleInputChange}
                            />
                            <label htmlFor="billingCompany">
                                {translate('common.company')}
                            </label>
                        </div>

                        <div className="float-field sm:col-span-2">
                            <input
                                type="text"
                                name="billingAddress.streetName"
                                id="billingStreetName"
                                autoComplete="billing address-line1"
                                required
                                placeholder=" "
                                value={formData.billingAddress.streetName}
                                onChange={handleInputChange}
                            />
                            <label htmlFor="billingStreetName">
                                {translate('common.address')} *
                            </label>
                        </div>

                        <div className="float-field">
                            <input
                                type="text"
                                name="billingAddress.streetNumber"
                                id="billingStreetNumber"
                                autoComplete="billing address-line2"
                                placeholder=" "
                                value={formData.billingAddress.streetNumber}
                                onChange={handleInputChange}
                            />
                            <label htmlFor="billingStreetNumber">
                                {translate('common.street-number')}
                            </label>
                        </div>

                        <div className="float-field">
                            <input
                                type="text"
                                name="billingAddress.city"
                                id="billingCity"
                                autoComplete="billing address-level2"
                                required
                                placeholder=" "
                                value={formData.billingAddress.city}
                                onChange={handleInputChange}
                            />
                            <label htmlFor="billingCity">
                                {translate('common.city')} *
                            </label>
                        </div>

                        <div className="float-field">
                            <input
                                type="text"
                                name="billingAddress.postalCode"
                                id="billingPostalCode"
                                autoComplete="billing postal-code"
                                required
                                placeholder=" "
                                value={formData.billingAddress.postalCode}
                                onChange={handleInputChange}
                            />
                            <label htmlFor="billingPostalCode">
                                {translate('common.postalCode')} *
                            </label>
                        </div>

                        <div className="float-field">
                            <input
                                type="text"
                                name="billingAddress.state"
                                id="billingState"
                                autoComplete="billing address-level1"
                                placeholder=" "
                                value={formData.billingAddress.state}
                                onChange={handleInputChange}
                            />
                            <label htmlFor="billingState">
                                {translate('common.state')}
                            </label>
                        </div>

                        <div className="float-field sm:col-span-2">
                            <select
                                id="billingCountry"
                                name="billingAddress.country"
                                autoComplete="billing country"
                                required
                                value={formData.billingAddress.country}
                                data-empty={formData.billingAddress.country ? undefined : 'true'}
                                onChange={handleInputChange}
                            >
                                <option value="">
                                    {translate('common.select-country')}
                                </option>
                                <option value="US">United States</option>
                                <option value="CA">Canada</option>
                                <option value="GB">United Kingdom</option>
                                <option value="AU">Australia</option>
                                <option value="DE">Germany</option>
                                <option value="VN">Vietnam</option>
                            </select>
                            <label htmlFor="billingCountry">
                                {translate('common.country')} *
                            </label>
                        </div>

                        <div className="float-field sm:col-span-2">
                            <input
                                type="tel"
                                name="billingAddress.phone"
                                id="billingPhone"
                                autoComplete="billing tel"
                                placeholder=" "
                                value={formData.billingAddress.phone}
                                onChange={handleInputChange}
                            />
                            <label htmlFor="billingPhone">
                                {translate('common.phone')}
                            </label>
                        </div>
                    </div>
                )}
            </section>

            {/* Delivery */}
            <section>
                <h2 className="text-2xl font-semibold mb-6 text-[#4a0f0a] border-b pb-2">
                    Delivery Method
                </h2>

                <div className="space-y-4">
                    {isLoadingShippingMethods ? (
                        <p className="text-sm text-gray-600" role="status" aria-live="polite">
                            {translate('checkout.loadingShippingMethods')}
                        </p>
                    ) : shippingMethods.length === 0 ? (
                        <p className="text-sm text-gray-600">
                            {hasLoadedShippingMethods
                                ? translate('checkout.shippingMethodsUnavailable')
                                : hasShippingError
                                  ? translate('checkout.shippingMethodsLoadError')
                                  : translate('checkout.calculateShippingFirst')}
                        </p>
                    ) : (
                        shippingMethods.map((method) => {
                            const inputId = `shipping-${method.id}`;
                            return (
                                <div
                                    key={method.id}
                                    className="flex items-center p-4 border rounded-lg cursor-pointer bg-white hover:bg-gray-50 transition-colors"
                                >
                                    <input
                                        id={inputId}
                                        name="shippingMethod"
                                        type="radio"
                                        value={method.id}
                                        checked={formData.shippingMethod === method.id}
                                        disabled={isUpdatingShippingMethod}
                                        onChange={handleInputChange}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                    />
                                    <label
                                        htmlFor={inputId}
                                        className="ml-3 flex justify-between items-center gap-4 w-full cursor-pointer"
                                    >
                                        <span className="block text-sm font-medium text-gray-700">
                                            {method.localizedName?.[marketLocale] ?? method.name}
                                        </span>
                                        <span className="block text-sm font-semibold text-gray-900">
                                            {method.price
                                                ? <PriceDisplay money={method.price} locale={locale} />
                                                : translate('checkout.shippingCalculated')}
                                        </span>
                                    </label>
                                </div>
                            );
                        })
                    )}
                    {shippingMethods.length === 0 &&
                        (hasLoadedShippingMethods || hasShippingError) && (
                            <button
                                type="button"
                                onClick={onRetryShippingMethods}
                                disabled={isLoadingShippingMethods}
                                className="text-sm font-medium text-blue-700 underline disabled:opacity-50"
                            >
                                {translate('checkout.retryShippingMethods')}
                            </button>
                        )}
                    {isUpdatingShippingMethod && (
                        <p className="text-sm text-gray-600" role="status" aria-live="polite">
                            {translate('checkout.updatingShippingMethod')}
                        </p>
                    )}
                </div>
            </section>

            {/* Step 1 Actions */}
            <div className="pt-8 border-t flex justify-end">
                <button
                    type="submit"
                    disabled={
                        isLoadingShippingMethods ||
                        isUpdatingShippingMethod ||
                        (shippingMethods.length > 0 && !canContinue) ||
                        (hasLoadedShippingMethods && shippingMethods.length === 0)
                    }
                    className="w-full sm:w-auto py-3 px-10 rounded-lg font-bold text-white bg-[#4a0f0a] hover:bg-[#5a1f1a] transition-all disabled:opacity-50 flex items-center justify-center uppercase tracking-widest"
                >
                    {isLoadingShippingMethods ? (
                        <span className="flex items-center">
                            <svg
                                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                />

                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l-2.647z"
                                />
                            </svg>

                            {translate('checkout.loadingShippingMethods')}
                        </span>
                    ) : isUpdatingShippingMethod ? (
                        translate('checkout.updatingShippingMethod')
                    ) : (
                        shippingMethods.length === 0 && !hasLoadedShippingMethods
                            ? translate('checkout.loadShippingMethods')
                            : shippingMethods.length === 0
                              ? translate('checkout.shippingMethodsUnavailable')
                              : translate('checkout.continueToPayment')
                    )}
                </button>
            </div>
        </>
    );
};
