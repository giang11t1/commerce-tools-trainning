'use client';

import ConfirmDialog from '@/components/ConfirmDialog';
import { useTranslations } from 'use-intl';

interface AddToCartPopupProps {
    isOpen: boolean;
    onClose: () => void;
    productName: string;
    imageUrl?: string;
    quantity: number;
    priceLabel?: string;
}

export default function AddToCartPopup({
    isOpen,
    onClose,
    productName,
    imageUrl,
    quantity,
    priceLabel,
}: AddToCartPopupProps) {
    const translate = useTranslations();

    return (
        <ConfirmDialog
            isOpen={isOpen}
            title={translate('product.cart-added')}
            message=""
            onCancel={onClose}
            onConfirm={onClose}
            cancelLabel={translate('cart.continue-shopping')}
            confirmLabel={translate('cart.cart-go')}
            confirmHref="/cart"
            portal
        >
            <div className="mt-5 flex items-center gap-4 rounded-md border border-gray-200 p-3">
                {imageUrl ? (
                    // Use a native image here because product images come from customer-configured hosts.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        width="88"
                        height="88"
                        src={imageUrl}
                        className="h-[88px] w-[88px] shrink-0 object-contain"
                        alt={productName}
                    />
                ) : (
                    <div className="h-[88px] w-[88px] shrink-0 rounded bg-gray-100" aria-hidden="true" />
                )}
                <div className="min-w-0">
                    <p className="line-clamp-2 font-medium text-gray-900">{productName}</p>
                    <p className="mt-1 text-sm text-gray-500">× {quantity}</p>
                    {priceLabel && <p className="mt-1 text-sm font-medium text-gray-800">{priceLabel}</p>}
                </div>
            </div>
        </ConfirmDialog>
    );
}
