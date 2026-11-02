import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getSession } from '@/lib/auth';
import { getOrderById } from '@/lib/orders';
import AccountSidebar from '@/components/AccountSidebar';
import PriceDisplay from '@/components/PriceDisplay';
import { getCartTaxAmount, getSubtotalMoney } from '@/lib/checkout-utils';

interface OrderDetailPageProps {
    params: Promise<{ orderId: string }>;
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
    const customerId = await getSession();
    const { orderId } = await params;

    if (!customerId) {
        redirect('/login');
    }

    const result = await getOrderById(orderId);

    if (!result.success || !result.order) {
        notFound();
    }

    const order = result.order;

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const subtotal = getSubtotalMoney(order.lineItems);
    const taxAmount = getCartTaxAmount({ taxedPrice: order.taxedPrice });
    const discountAmount = order.discountOnTotalPrice?.discountedAmount;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mx-auto">
                <div className="flex items-center mb-8">
                    <Link href="/account/orders" className="mr-4 text-gray-500 hover:text-gray-700">
                        <ChevronLeft size={24} />
                    </Link>
                    <h1 className="text-3xl font-bold">Order Details</h1>
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
                                    <p className="text-sm text-gray-500 uppercase font-semibold">Order Number</p>
                                    <p className="text-lg font-bold">{order.orderNumber || order.id}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 uppercase font-semibold">Placed On</p>
                                    <p className="text-gray-900">{formatDate(order.createdAt)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 uppercase font-semibold">Status</p>
                                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                                        ${order.orderState === 'Complete' ? 'bg-success/10 text-success' :
                                        order.orderState === 'Cancelled' ? 'bg-danger/10 text-danger' :
                                        order.orderState === 'Confirmed' ? 'bg-brand-soft text-brand' :
                                        order.orderState === 'Open' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-gray-100 text-gray-700'}`}>
                                        {order.orderState}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold mb-4">Items</h2>
                                <div className="divide-y divide-gray-100">
                                    {order.lineItems.map((item) => (
                                        <div key={item.id} className="py-4 flex items-center">
                                            {item.variant.images && item.variant.images.length > 0 && (
                                                <div className="w-20 h-20 flex-shrink-0 bg-gray-50 rounded-md overflow-hidden mr-4 border border-gray-100">
                                                    <img
                                                        src={item.variant.images[0].url}
                                                        alt={item.name['en-US'] || item.name['en'] || Object.values(item.name)[0]}
                                                        className="w-full h-full object-contain"
                                                    />
                                                </div>
                                            )}
                                            <div className="flex-grow">
                                                <h3 className="font-medium text-gray-900">
                                                    {item.name['en-US'] || item.name['en'] || Object.values(item.name)[0]}
                                                </h3>
                                                <p className="text-sm text-gray-500">
                                                    Qty: {item.quantity} × <PriceDisplay money={item.price.value} />
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-medium text-gray-900">
                                                    <PriceDisplay money={item.totalPrice} />
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-6 mt-6">
                                <div className="flex justify-end">
                                    <div className="w-full md:w-64 space-y-2">
                                        {subtotal && (
                                            <div className="flex justify-between text-gray-600">
                                                <span>Subtotal</span>
                                                <span><PriceDisplay money={subtotal} /></span>
                                            </div>
                                        )}
                                        {discountAmount && (
                                            <div className="flex justify-between text-gray-600">
                                                <span>Discount</span>
                                                <span>
                                                    -<PriceDisplay
                                                        money={discountAmount}
                                                    />
                                                </span>
                                            </div>
                                        )}
                                        {order.shippingInfo && (
                                            <div className="flex justify-between text-gray-600">
                                                <span>Shipping</span>
                                                <span>
                                                    <PriceDisplay money={order.shippingInfo.price} />
                                                </span>
                                            </div>
                                        )}
                                        {taxAmount && (
                                            <div className="flex justify-between text-gray-600">
                                                <span>Tax</span>
                                                <span><PriceDisplay money={taxAmount} /></span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-100">
                                            <span>Total</span>
                                            <span><PriceDisplay money={order.totalPrice} /></span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                                <h2 className="text-lg font-semibold mb-4 text-gray-900">Shipping Address</h2>
                                {order.shippingAddress ? (
                                    <address className="not-italic text-gray-600 space-y-1">
                                        <p className="font-medium text-gray-900">{order.shippingAddress.firstName} {order.shippingAddress.lastName}</p>
                                        <p>{order.shippingAddress.streetName} {order.shippingAddress.streetNumber}</p>
                                        <p>{order.shippingAddress.city}, {order.shippingAddress.postalCode}</p>
                                        <p>{order.shippingAddress.country}</p>
                                    </address>
                                ) : (
                                    <p className="text-gray-500 italic">No shipping address provided.</p>
                                )}
                            </div>

                            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                                <h2 className="text-lg font-semibold mb-4 text-gray-900">Billing Address</h2>
                                {order.billingAddress ? (
                                    <address className="not-italic text-gray-600 space-y-1">
                                        <p className="font-medium text-gray-900">{order.billingAddress.firstName} {order.billingAddress.lastName}</p>
                                        <p>{order.billingAddress.streetName} {order.billingAddress.streetNumber}</p>
                                        <p>{order.billingAddress.city}, {order.billingAddress.postalCode}</p>
                                        <p>{order.billingAddress.country}</p>
                                    </address>
                                ) : (
                                    <p className="text-gray-500 italic">No billing address provided.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
