'use client';

import { useEffect, useRef } from 'react';
import {
    AdyenCheckout,
    PayPal,
} from '@adyen/adyen-web';

import '@adyen/adyen-web/styles/adyen.css';

interface PayPalFormProps {
    clientKey: string;
    environment: 'test' | 'live';
    session: {
        id: string;
        sessionData: string;
    };
    onSuccess?: (result: any) => void;
}

export default function PayPalForm({
    clientKey,
    environment,
    session,
    onSuccess,
}: PayPalFormProps) {
    const paypalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!session?.id || !session?.sessionData) {
            return;
        }

        let paypal: PayPal | undefined;

        async function initializePayPal() {
            try {
                const checkout = await AdyenCheckout({
                    environment,
                    clientKey,
                    countryCode: 'VN',
                    session: {
                        id: session.id,
                        sessionData: session.sessionData,
                    },
                    onPaymentCompleted: (result) => {
                        console.log('PayPal payment completed:', result);
                        if (onSuccess) {
                            onSuccess(result);
                        }
                    },
                    onPaymentFailed: (result) => {
                        console.log('PayPal payment failed:', result);
                    },
                    onError: (error) => {
                        console.error('PayPal Adyen error:', error);
                    },
                });

                paypal = new PayPal(checkout, {
                    showPayButton: true,
                });

                if (paypalRef.current) {
                    paypal.mount(paypalRef.current);
                }
            } catch (error) {
                console.error(
                    'Failed to initialize PayPal:',
                    error
                );
            }
        }

        initializePayPal();

        return () => {
            paypal?.unmount();
        };
    }, [clientKey, environment, session]);

    return (
        <div className="adyen-paypal-container">
            <div ref={paypalRef} />
        </div>
    );
}
