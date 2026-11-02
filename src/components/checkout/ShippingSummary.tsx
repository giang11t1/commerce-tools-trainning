import React from 'react';
import type { CheckoutFormData } from '@/components/checkout/types';

interface ShippingSummaryProps {
    formData: CheckoutFormData;
    setCurrentStep: (step: number) => void;
    shippingMethodName: string;
}

export const ShippingSummary: React.FC<ShippingSummaryProps> = ({
    formData,
    setCurrentStep,
    shippingMethodName,
}) => {
    return (
        <section className="bg-blue-50 p-6 rounded-lg border border-blue-100">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-[#4a0f0a]">
                    Shipping & Delivery Summary
                </h2>

                <button
                    type="button"
                    onClick={() =>
                        setCurrentStep(1)
                    }
                    className="text-sm text-blue-600 hover:underline font-medium"
                >
                    Edit
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <p className="text-gray-500 uppercase text-xs font-bold tracking-wider">
                        Shipping Address
                    </p>

                    <p className="mt-1 text-gray-900">
                        {
                            formData.firstName
                        }{' '}
                        {
                            formData.lastName
                        }
                        <br />
                        {
                            formData.address
                        }
                        <br />
                        {
                            formData.city
                        }
                        ,{' '}
                        {
                            formData.postalCode
                        }
                        <br />
                        {
                            formData.country
                        }
                    </p>
                </div>

                <div>
                    <p className="text-gray-500 uppercase text-xs font-bold tracking-wider">
                        Delivery Method
                    </p>

                    <p className="mt-1 text-gray-900 capitalize">
                        {shippingMethodName}
                    </p>

                    <p className="mt-2 text-gray-500 uppercase text-xs font-bold tracking-wider">
                        Contact
                    </p>

                    <p className="mt-1 text-gray-900">
                        {formData.email}
                    </p>
                </div>
            </div>
        </section>
    );
};
