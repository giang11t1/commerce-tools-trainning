import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { getMyOrders } from '@/lib/orders';
import AccountSidebar from '@/components/AccountSidebar';
import PriceDisplay from '@/components/PriceDisplay';

export default async function OrdersPage() {
    const customerId = await getSession();

    if (!customerId) {
        redirect('/login');
    }

    const result = await getMyOrders();
    const orders = result.success ? result.orders || [] : [];

    console.log('Orders:', orders);
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">My Orders</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Sidebar Navigation */}
                    <div className="md:col-span-1">
                        <AccountSidebar />
                    </div>

                    {/* Main Content */}
                    <div className="md:col-span-3">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                            {orders.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    <p className="mb-4">You haven&apos;t placed any orders yet.</p>
                                    <Link
                                        href="/categories"
                                        className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                                    >
                                        Start shopping
                                    </Link>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-100">
                                                <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Order #</th>
                                                <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                                                <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider text-right">Total</th>
                                                <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {orders.map((order: { id: string, orderNumber?: string, createdAt: string, orderState: string, totalPrice: { centAmount: number, currencyCode: string } }) => (
                                                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                                        {order.orderNumber || order.id.substring(0, 8)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {new Date(order.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                                                            ${order.orderState === 'Complete' ? 'bg-success/10 text-success' :
                                                              order.orderState === 'Cancelled' ? 'bg-danger/10 text-danger' :
                                                              order.orderState === 'Confirmed' ? 'bg-brand-soft text-brand' :
                                                              order.orderState === 'Open' ? 'bg-yellow-100 text-yellow-700' :
                                                              'bg-gray-100 text-gray-700'}`}>
                                                            {order.orderState}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                                        <PriceDisplay money={order.totalPrice} />
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <Link
                                                            href={`/account/orders/${order.id}`}
                                                            className="text-blue-600 hover:text-blue-900"
                                                        >
                                                            View Details
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
