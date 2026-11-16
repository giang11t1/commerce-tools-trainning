'use client';

import React from 'react';

interface SampleCreditCardFormProps {
    isSubmitting?: boolean;
    error?: string;
    onPlaceOrder: () => Promise<void>;
    // Overrides used when paying an existing Order instead of creating one.
    labels?: {
        description: string;
        submit: string;
        submitting: string;
    };
}

export default function SampleCreditCardForm({
    isSubmitting = false,
    error,
    onPlaceOrder,
    labels,
}: SampleCreditCardFormProps) {
    return (
        <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-6">
            <h3 className="mb-2 text-lg font-semibold">
                Mock Payment (development only)
            </h3>
            <p className="mb-4 text-sm text-gray-700">
                {labels?.description ?? (
                    <>
                        This creates an unpaid test order only. No payment is processed.
                        Do not enter card details.
                    </>
                )}
            </p>

            {error ? <p className="mb-4 text-sm text-red-700" role="alert">{error}</p> : null}
            <button
                type="button"
                onClick={onPlaceOrder}
                disabled={isSubmitting}
                className={`w-full rounded-md px-4 py-2 text-sm font-medium text-white ${
                    isSubmitting
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-700 hover:bg-green-800'
                }`}
            >
                {isSubmitting
                    ? labels?.submitting ?? 'Placing Test Order...'
                    : labels?.submit ?? 'Place Unpaid Test Order'}
            </button>
        </div>
    );
}
