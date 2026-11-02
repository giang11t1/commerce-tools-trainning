'use client';

import { useState } from 'react';
import type { Address } from '@commercetools/platform-sdk';
import {
    createInitialFormData,
    type CheckoutFormData,
} from '@/components/checkout/types';

export function useCheckoutForm(
    shippingAddress?: Address | null,
    billingAddress?: Address | null,
    email?: string | null,
) {
    const [formData, setFormData] = useState<CheckoutFormData>(() =>
        createInitialFormData(shippingAddress, billingAddress, email)
    );

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        if (name.startsWith('billingAddress.')) {
            const field = name.slice('billingAddress.'.length) as keyof CheckoutFormData['billingAddress'];
            setFormData((prev) => ({
                ...prev,
                billingAddress: {
                    ...prev.billingAddress,
                    [field]: value,
                },
            }));
            return;
        }

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    return {
        formData,
        setFormData,
        handleInputChange,
    };
}
