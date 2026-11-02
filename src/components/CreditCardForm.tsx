'use client';

import { useEffect, useRef } from 'react';
import {
    AdyenCheckout,
    Card,
} from '@adyen/adyen-web';

import '@adyen/adyen-web/styles/adyen.css';

interface AdyenSession {
    id: string;
    sessionData: string;
}

interface CreditCardFormProps {
    clientKey: string;
    environment?: 'test' | 'live';
    session: {
        id: string;
        sessionData: string;
    };
    onPaymentCompleted: () => void;
}

export default function CreditCardForm({
    clientKey,
    environment,
    session,
     onPaymentCompleted,
}: CreditCardFormProps) {
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!session?.id || !session?.sessionData) {
            return;
        }

        let card: Card | undefined;

        async function initializeAdyen() {
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
                        console.log('Payment completed:', result);

                        onPaymentCompleted();
                    },
                    onPaymentFailed: (result) => {
                        console.log('Payment failed:', result);
                    },
                    onError: (error) => {
                        console.error('Adyen error:', error);
                    },
                });

                card = new Card(checkout, {
                    showPayButton: true,
                });

                if (cardRef.current) {
                    card.mount(cardRef.current);
                }
            } catch (error) {
                console.error(
                    'Failed to initialize Adyen:',
                    error
                );
            }
        }

        initializeAdyen();

        return () => {
            card?.unmount();
        };
    }, [clientKey, environment, session]);

    return (
        <div className="adyen-card-container">
            <div ref={cardRef} />
        </div>
    );
}
