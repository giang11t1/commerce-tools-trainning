'use client';

import { useState } from 'react';
import Link from '@/components/commercetools-ui/atoms/link';
import { useRouter } from '@/../i18n/navigation';
import { useCart } from '@/context/CartContext';
import { createQuoteRequest } from '@/lib/quote-requests';
import { getCouponErrorTranslationKey } from '@/lib/coupon-utils';
import { useTranslations } from 'use-intl';

export default function RequestQuoteForm() {
    const router = useRouter();
    const { clearCart } = useCart();
    const translate = useTranslations('checkout');

    const [isOpen, setIsOpen] = useState(false);
    const [comment, setComment] = useState('');
    const [purchaseOrderNumber, setPurchaseOrderNumber] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [requiresLogin, setRequiresLogin] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!comment.trim()) {
            setError('Please describe what you would like quoted');
            return;
        }

        setError('');
        setRequiresLogin(false);
        setIsSubmitting(true);

        try {
            const result = await createQuoteRequest({
                comment,
                purchaseOrderNumber,
            });

            if (!result.success) {
                const couponErrorKey = getCouponErrorTranslationKey(result.error);
                setError(
                    couponErrorKey
                        ? translate(couponErrorKey)
                        : result.error,
                );
                setRequiresLogin(!!result.requiresLogin);
                return;
            }

            clearCart();
            router.push(`/account/quotes?requested=${result.quoteRequest.id}`);
        } catch (err) {
            console.error('Failed to request quote:', err);
            setError('Failed to create quote request');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="w-full border-2 border-blue-600 text-blue-600 py-3 rounded-lg font-bold hover:bg-blue-50 transition-colors"
            >
                Request a Quote
            </button>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 p-4">
            <h3 className="font-bold text-gray-900">Request a Quote</h3>

            <div className="flex flex-col gap-1">
                <label htmlFor="quote-comment" className="text-sm font-medium text-gray-700">
                    Message to sales
                </label>
                <textarea
                    id="quote-comment"
                    rows={4}
                    value={comment}
                    onChange={(e) => {
                        setComment(e.target.value);
                        setError('');
                    }}
                    disabled={isSubmitting}
                    placeholder="e.g. We need 500 units delivered monthly. Can you offer volume pricing?"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <div className="flex flex-col gap-1">
                <label htmlFor="quote-po" className="text-sm font-medium text-gray-700">
                    Purchase order number (optional)
                </label>
                <input
                    id="quote-po"
                    type="text"
                    value={purchaseOrderNumber}
                    onChange={(e) => setPurchaseOrderNumber(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {error && (
                <p className="text-sm text-red-600">
                    {error}
                    {requiresLogin && (
                        <>
                            {' '}
                            <Link link="/login" className="font-medium underline">
                                Log in
                            </Link>
                        </>
                    )}
                </p>
            )}

            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    disabled={isSubmitting}
                    className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
            </div>
        </form>
    );
}
