'use client';

import { useEffect, useState } from 'react';
import { getConfiguredPaymentMethods } from '@/lib/payments';
import type {
    CheckoutFormData,
    PaymentMethod,
} from '@/components/checkout/types';

export function usePaymentMethods(
    setFormData: React.Dispatch<React.SetStateAction<CheckoutFormData>>
) {
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [isLoadingPayments, setIsLoadingPayments] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const fetchPayments = async () => {
            setIsLoadingPayments(true);

            try {
                const methods = await getConfiguredPaymentMethods();

                if (!cancelled) {
                    setPaymentMethods(methods);

                    setFormData((prev) => {
                        if (prev.paymentMethod || methods.length === 0) {
                            return prev;
                        }

                        return {
                            ...prev,
                            paymentMethod: methods[0].id,
                        };
                    });
                }
            } catch (error) {
                console.error('Failed to fetch payment methods:', error);

                if (!cancelled) {
                    setPaymentMethods([]);
                }
            } finally {
                if (!cancelled) {
                    setIsLoadingPayments(false);
                }
            }
        };

        fetchPayments();

        return () => {
            cancelled = true;
        };
    }, [setFormData]);

    return {
        paymentMethods,
        isLoadingPayments,
    };
}
