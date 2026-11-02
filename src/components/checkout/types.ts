import type { Address, TypedMoney } from '@commercetools/platform-sdk';
import type { MoneyValue } from '@/lib/checkout-utils';

export interface CheckoutFormData {
    email: string;
    address: string;
    firstName: string;
    lastName: string;
    company: string;
    streetName: string;
    streetNumber: string;
    additionalStreetInfo: string;
    city: string;
    postalCode: string;
    state: string;
    region: string;
    country: string;
    phone: string;
    billingAddress: CheckoutAddressFormData;
    shippingMethod: string;
    paymentMethod: string;
}

export interface CheckoutAddressFormData {
    firstName: string;
    lastName: string;
    company: string;
    streetName: string;
    streetNumber: string;
    additionalStreetInfo: string;
    city: string;
    postalCode: string;
    state: string;
    region: string;
    country: string;
    phone: string;
}

export interface CheckoutShippingOption {
    id: string;
    name: string;
    localizedName?: Record<string, string>;
    price?: MoneyValue | TypedMoney;
}

export type PaymentMethod = {
    id: string;
    name: string;
    enabled?: boolean;
};

export type AdyenSession = {
    id: string;
    sessionData: string;
};

export type CheckoutSessionState = {
    sessionId: string;
    projectKey: string;
    region: string;
};

export function createInitialFormData(
    shippingAddress?: Address | null,
    billingAddress?: Address | null,
    email?: string | null,
): CheckoutFormData {
    return {
        email: email ?? '',
        address: shippingAddress?.streetName ?? '',
        firstName: shippingAddress?.firstName ?? '',
        lastName: shippingAddress?.lastName ?? '',
        company: shippingAddress?.company ?? '',
        streetName: shippingAddress?.streetName ?? '',
        streetNumber: shippingAddress?.streetNumber ?? '',
        additionalStreetInfo: shippingAddress?.additionalStreetInfo ?? '',
        city: shippingAddress?.city ?? '',
        postalCode: shippingAddress?.postalCode ?? '',
        state: shippingAddress?.state ?? '',
        region: shippingAddress?.region ?? '',
        country: shippingAddress?.country ?? '',
        phone: shippingAddress?.phone ?? '',
        billingAddress: {
            firstName: billingAddress?.firstName ?? '',
            lastName: billingAddress?.lastName ?? '',
            company: billingAddress?.company ?? '',
            streetName: billingAddress?.streetName ?? '',
            streetNumber: billingAddress?.streetNumber ?? '',
            additionalStreetInfo: billingAddress?.additionalStreetInfo ?? '',
            city: billingAddress?.city ?? '',
            postalCode: billingAddress?.postalCode ?? '',
            state: billingAddress?.state ?? '',
            region: billingAddress?.region ?? '',
            country: billingAddress?.country ?? shippingAddress?.country ?? '',
            phone: billingAddress?.phone ?? '',
        },
        shippingMethod: '',
        paymentMethod: '',
    };
}
