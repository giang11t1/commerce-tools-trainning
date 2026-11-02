import React from 'react';
import PayPalForm from '@/components/PayPalForm';
import CreditCardForm from '@/components/CreditCardForm';
import SampleCreditCardForm from '@/components/SampleCreditCardForm';
import type { CheckoutFormData, PaymentMethod } from '@/components/checkout/types';
import type { AdyenSession } from '@/components/checkout/types';

interface PaymentInfoProps {
    isLoadingPayments: boolean;
    paymentMethods: PaymentMethod[];
    formData: CheckoutFormData;
    setFormData: React.Dispatch<React.SetStateAction<CheckoutFormData>>;
    adyenSession: AdyenSession | null;
    adyenClientKey: string | null;
    onPaymentSubmit: () => Promise<void>;
    currentStep: number;
    setCurrentStep: (step: number) => void;
    isSubmitting: boolean;
    mockOrderError: string;
    onMockOrderSubmit: () => Promise<void>;
}

export const PaymentInfo: React.FC<PaymentInfoProps> = ({
    isLoadingPayments,
    paymentMethods,
    formData,
    setFormData,
    adyenSession,
    adyenClientKey,
    onPaymentSubmit,
    currentStep,
    setCurrentStep,
    isSubmitting,
    mockOrderError,
    onMockOrderSubmit,
}) => {
    return (
        <section>
            <h2 className="text-2xl font-semibold mb-6 text-[#4a0f0a] border-b pb-2">
                Payment Method
            </h2>

            {isLoadingPayments ? (
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                    <span className="ml-3 text-gray-600">
                        Loading payment methods...
                    </span>
                </div>
            ) : (
                <div className="space-y-6">
                    <div>
                        <h3 className="font-semibold mb-3 text-gray-700">
                            Standard Payment
                        </h3>

                        {paymentMethods.map((method) => (
                            <div className="mb-6" key={method.id}>
                                <label
                                    className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer ${
                                        formData.paymentMethod === method.id
                                            ? 'border-blue-600 bg-blue-50'
                                            : 'border-gray-300'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value={method.id}
                                        checked={
                                            formData.paymentMethod === method.id
                                        }
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                paymentMethod: e.target.value,
                                            }))
                                        }
                                    />
                                    <span>
                                        {method.id === 'credit_card_sample'
                                            ? 'Mock Payment (development only)'
                                            : method.name}
                                    </span>
                                </label>

                                {method.id === 'credit_card' &&
                                    formData.paymentMethod === 'credit_card' &&
                                    adyenSession &&
                                    adyenClientKey && (
                                        <CreditCardForm
                                            clientKey={adyenClientKey}
                                            environment="test"
                                            session={adyenSession}
                                            onPaymentCompleted={async () => {
                                                await onPaymentSubmit();
                                            }}
                                        />
                                    )}

                                {method.id === 'credit_card_sample' &&
                                    formData.paymentMethod ===
                                        'credit_card_sample' && (
                                        <SampleCreditCardForm
                                            isSubmitting={isSubmitting}
                                            error={mockOrderError}
                                            onPlaceOrder={onMockOrderSubmit}
                                        />
                                    )}

                                {method.id === 'paypal' &&
                                    formData.paymentMethod === 'paypal' &&
                                    adyenSession &&
                                    adyenClientKey && (
                                        <div className="mt-6 p-6 border rounded-lg">
                                            <PayPalForm
                                                clientKey={adyenClientKey}
                                                environment="test"
                                                session={adyenSession}
                                                onSuccess={onPaymentSubmit}
                                            />
                                        </div>
                                    )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex gap-2 mt-8">
                {currentStep === 2 && (
                    <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="w-60 py-3 px-6 rounded-lg font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-all text-center"
                    >
                        Back to Shipping
                    </button>
                )}

                {formData.paymentMethod !== 'credit_card_sample' && (
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        data-ctc-selector={
                            currentStep === 2 ? 'confirmMethod' : undefined
                        }
                        className={`w-60 py-3 px-6 rounded-lg font-bold text-white text-lg transition-all shadow-lg ${
                            isSubmitting
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                        {isSubmitting ? (
                            <span className="flex items-center justify-center">
                                Processing...
                            </span>
                        ) : currentStep === 1 ? (
                            'Continue to Payment'
                        ) : (
                            'Place Order'
                        )}
                    </button>
                )}
            </div>

            <p className="mt-4 text-center text-sm text-gray-500">
                By placing an order, you agree to our terms and conditions.
            </p>
        </section>
    );
};
