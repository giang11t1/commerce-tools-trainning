import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import type { Address, LocalizedString } from '@commercetools/platform-sdk';
import { getSession } from '@/lib/auth';
import { getQuoteRequestById } from '@/lib/quote-requests';
import { formatMoney, quoteRequestStateBadgeClass } from '@/lib/quote-utils';
import AccountSidebar from '@/components/AccountSidebar';

interface QuoteRequestDetailPageProps {
    params: Promise<{ quoteRequestId: string }>;
}

function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function localize(value: LocalizedString) {
    return value['en-US'] || value['en'] || Object.values(value)[0] || '';
}

function AddressBlock({ title, address }: { title: string; address?: Address }) {
    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">{title}</h2>
            {address ? (
                <address className="not-italic text-gray-600 space-y-1">
                    <p className="font-medium text-gray-900">{address.firstName} {address.lastName}</p>
                    {address.company && <p>{address.company}</p>}
                    <p>{address.streetName} {address.streetNumber}</p>
                    <p>{address.city}, {address.postalCode}</p>
                    <p>{address.country}</p>
                </address>
            ) : (
                <p className="text-gray-500 italic">No {title.toLowerCase()} provided.</p>
            )}
        </div>
    );
}

export default async function QuoteRequestDetailPage({ params }: QuoteRequestDetailPageProps) {
    const customerId = await getSession();
    const { quoteRequestId } = await params;

    if (!customerId) {
        redirect('/login');
    }

    const result = await getQuoteRequestById(quoteRequestId);

    if (!result.success || !result.quoteRequest) {
        notFound();
    }

    const quoteRequest = result.quoteRequest;
    const { totalPrice, taxedPrice, shippingInfo } = quoteRequest;
    const itemCount = quoteRequest.lineItems.reduce((total, item) => total + item.quantity, 0);

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mx-auto">
                <div className="flex items-center mb-8">
                    <Link href="/account/quotes" className="mr-4 text-gray-500 hover:text-gray-700">
                        <ChevronLeft size={24} />
                    </Link>
                    <h1 className="text-3xl font-bold">Quote Request Details</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Sidebar Navigation */}
                    <div className="md:col-span-1">
                        <AccountSidebar />
                    </div>

                    {/* Main Content */}
                    <div className="md:col-span-3 space-y-6">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                            <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-gray-100 pb-4 mb-4 gap-4">
                                <div>
                                    <p className="text-sm text-gray-500 uppercase font-semibold">Request Number</p>
                                    <p className="text-lg font-bold">{quoteRequest.key || quoteRequest.id}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 uppercase font-semibold">Requested On</p>
                                    <p className="text-gray-900">{formatDate(quoteRequest.createdAt)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 uppercase font-semibold">Status</p>
                                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${quoteRequestStateBadgeClass(quoteRequest.quoteRequestState)}`}>
                                        {quoteRequest.quoteRequestState}
                                    </span>
                                </div>
                            </div>

                            {(quoteRequest.purchaseOrderNumber || quoteRequest.comment) && (
                                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-gray-100 pb-4 mb-4">
                                    {quoteRequest.purchaseOrderNumber && (
                                        <div>
                                            <dt className="text-sm text-gray-500 uppercase font-semibold">Purchase Order Number</dt>
                                            <dd className="text-gray-900">{quoteRequest.purchaseOrderNumber}</dd>
                                        </div>
                                    )}
                                    {quoteRequest.comment && (
                                        <div className="md:col-span-2">
                                            <dt className="text-sm text-gray-500 uppercase font-semibold">Comment</dt>
                                            <dd className="text-gray-900 whitespace-pre-line">{quoteRequest.comment}</dd>
                                        </div>
                                    )}
                                </dl>
                            )}

                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold mb-4">Items ({itemCount})</h2>
                                <div className="divide-y divide-gray-100">
                                    {quoteRequest.lineItems.map((item) => {
                                        const name = localize(item.name);
                                        const image = item.variant.images?.[0];

                                        return (
                                            <div key={item.id} className="py-4 flex items-center">
                                                {image && (
                                                    <div className="w-20 h-20 flex-shrink-0 bg-gray-50 rounded-md overflow-hidden mr-4 border border-gray-100">
                                                        <img
                                                            src={image.url}
                                                            alt={name}
                                                            className="w-full h-full object-contain"
                                                        />
                                                    </div>
                                                )}
                                                <div className="flex-grow">
                                                    <h3 className="font-medium text-gray-900">{name}</h3>
                                                    {item.variant.sku && (
                                                        <p className="text-xs text-gray-400">SKU: {item.variant.sku}</p>
                                                    )}
                                                    <p className="text-sm text-gray-500">
                                                        Qty: {item.quantity} × {formatMoney(item.price.value.centAmount, item.price.value.currencyCode)}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-medium text-gray-900">
                                                        {formatMoney(item.totalPrice.centAmount, item.totalPrice.currencyCode)}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {quoteRequest.customLineItems.map((item) => (
                                        <div key={item.id} className="py-4 flex items-center">
                                            <div className="flex-grow">
                                                <h3 className="font-medium text-gray-900">{localize(item.name)}</h3>
                                                <p className="text-sm text-gray-500">
                                                    Qty: {item.quantity} × {formatMoney(item.money.centAmount, item.money.currencyCode)}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-medium text-gray-900">
                                                    {formatMoney(item.totalPrice.centAmount, item.totalPrice.currencyCode)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-6 mt-6">
                                <div className="flex justify-end">
                                    <div className="w-full md:w-64 space-y-2">
                                        {taxedPrice && (
                                            <div className="flex justify-between text-gray-600">
                                                <span>Subtotal (net)</span>
                                                <span>{formatMoney(taxedPrice.totalNet.centAmount, taxedPrice.totalNet.currencyCode)}</span>
                                            </div>
                                        )}
                                        {shippingInfo && (
                                            <div className="flex justify-between text-gray-600">
                                                <span>Shipping ({shippingInfo.shippingMethodName})</span>
                                                <span>{formatMoney(shippingInfo.price.centAmount, shippingInfo.price.currencyCode)}</span>
                                            </div>
                                        )}
                                        {taxedPrice?.totalTax && (
                                            <div className="flex justify-between text-gray-600">
                                                <span>Tax</span>
                                                <span>{formatMoney(taxedPrice.totalTax.centAmount, taxedPrice.totalTax.currencyCode)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-100">
                                            <span>Total</span>
                                            <span>
                                                {taxedPrice
                                                    ? formatMoney(taxedPrice.totalGross.centAmount, taxedPrice.totalGross.currencyCode)
                                                    : formatMoney(totalPrice.centAmount, totalPrice.currencyCode)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            Requested prices. Final pricing will be confirmed in the quote from our sales team.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <AddressBlock title="Shipping Address" address={quoteRequest.shippingAddress} />
                            <AddressBlock title="Billing Address" address={quoteRequest.billingAddress} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
