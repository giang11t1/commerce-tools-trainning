import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { getMyQuotes } from '@/lib/quotes';
import { getMyQuoteRequests } from '@/lib/quote-requests';
import AccountSidebar from '@/components/AccountSidebar';
import Pagination from '@/components/Pagination';
import QuoteSearchForm from '@/components/QuoteSearchForm';
import {
    formatMoney,
    parsePage,
    QUOTES_PAGE_SIZE,
    quoteRequestStateBadgeClass,
    quoteStateBadgeClass,
} from '@/lib/quote-utils';
import type { Quote, QuoteRequest } from '@commercetools/platform-sdk';

export default async function QuotesPage({
    searchParams,
}: {
    searchParams: Promise<{
        requested?: string;
        // Quote request table
        rq?: string;
        rpage?: string;
        // Quote table
        q?: string;
        page?: string;
    }>;
}) {
    const customerId = await getSession();

    if (!customerId) {
        redirect('/login');
    }

    const { requested, rq, rpage, q, page } = await searchParams;
    const quoteRequestSearch = rq?.trim() || '';
    const quoteRequestPage = parsePage(rpage);
    const quoteSearch = q?.trim() || '';
    const quotePage = parsePage(page);

    const [result, quoteRequestsResult] = await Promise.all([
        getMyQuotes({ search: quoteSearch, page: quotePage }),
        getMyQuoteRequests({ search: quoteRequestSearch, page: quoteRequestPage }),
    ]);
    const quotes: Quote[] = result.success ? result.quotes || [] : [];
    const quoteRequests: QuoteRequest[] = quoteRequestsResult.success
        ? quoteRequestsResult.quoteRequests || []
        : [];

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">My Quotes</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Sidebar Navigation */}
                    <div className="md:col-span-1">
                        <AccountSidebar />
                    </div>

                    {/* Main Content */}
                    <div className="md:col-span-3">
                        {requested && (
                            <div className="p-4 mb-4 rounded-md bg-green-50 text-green-700 text-sm">
                                Your quote request has been submitted. Our sales team will review it and send you a quote.
                            </div>
                        )}

                        <h2 className="text-xl font-bold mb-4">Quote Requests</h2>

                        <QuoteSearchForm
                            name="rq"
                            defaultValue={quoteRequestSearch}
                            placeholder="Search by request #, status, comment, PO number, product or SKU"
                            preserve={{ q: quoteSearch, page }}
                            basePath="/account/quotes"
                        />

                        {!quoteRequestsResult.success && (
                            <div className="p-4 mb-4 rounded-md bg-red-50 text-red-700 text-sm">
                                {quoteRequestsResult.error}
                            </div>
                        )}

                        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden mb-8">
                            {quoteRequests.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    {quoteRequestSearch ? (
                                        <p>No quote requests match &quot;{quoteRequestSearch}&quot;.</p>
                                    ) : (
                                        <p>You have no quote requests yet. You can request a quote from your cart.</p>
                                    )}
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-100">
                                                <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Request #</th>
                                                <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                                                <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Items</th>
                                                <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider text-right">Total</th>
                                                <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider text-right"><span className="sr-only">Actions</span></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {quoteRequests.map((quoteRequest) => (
                                                <tr
                                                    key={quoteRequest.id}
                                                    className={`hover:bg-gray-50 transition-colors ${quoteRequest.id === requested ? 'bg-green-50' : ''}`}
                                                >
                                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                                        {quoteRequest.key || quoteRequest.id.substring(0, 8)}
                                                        {quoteRequest.comment && (
                                                            <p className="mt-1 max-w-xs truncate text-xs font-normal text-gray-500">
                                                                {quoteRequest.comment}
                                                            </p>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {new Date(quoteRequest.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${quoteRequestStateBadgeClass(quoteRequest.quoteRequestState)}`}>
                                                            {quoteRequest.quoteRequestState}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {quoteRequest.lineItems.reduce((total, item) => total + item.quantity, 0)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                                        {formatMoney(quoteRequest.totalPrice.centAmount, quoteRequest.totalPrice.currencyCode)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <Link
                                                            href={`/account/quotes/requests/${quoteRequest.id}`}
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
                            <Pagination
                                total={quoteRequestsResult.total ?? 0}
                                limit={QUOTES_PAGE_SIZE}
                                currentPage={quoteRequestPage}
                                pageParam="rpage"
                                className="px-6 py-4 border-t border-gray-100"
                            />
                        </div>

                        <h2 className="text-xl font-bold mb-4">Quotes Final</h2>

                        <QuoteSearchForm
                            name="q"
                            defaultValue={quoteSearch}
                            placeholder="Search by quote #, status, comment, PO number, product or SKU"
                            preserve={{ rq: quoteRequestSearch, rpage }}
                            basePath="/account/quotes"
                        />

                        {!result.success && (
                            <div className="p-4 mb-4 rounded-md bg-red-50 text-red-700 text-sm">
                                {result.error}
                            </div>
                        )}

                        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                            {quotes.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    {quoteSearch ? (
                                        <p>No quotes match &quot;{quoteSearch}&quot;.</p>
                                    ) : (
                                        <p>You have no quotes yet.</p>
                                    )}
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-100">
                                                <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Quote #</th>
                                                <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                                                <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Valid To</th>
                                                <th className="px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {quotes.map((quote) => (
                                                <tr key={quote.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                                        {quote.key || quote.id.substring(0, 8)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {new Date(quote.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${quoteStateBadgeClass(quote.quoteState)}`}>
                                                            {quote.quoteState}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {quote.validTo
                                                            ? new Date(quote.validTo).toLocaleDateString()
                                                            : '—'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                                        {formatMoney(quote.totalPrice.centAmount, quote.totalPrice.currencyCode)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            <Pagination
                                total={result.total ?? 0}
                                limit={QUOTES_PAGE_SIZE}
                                currentPage={quotePage}
                                className="px-6 py-4 border-t border-gray-100"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
