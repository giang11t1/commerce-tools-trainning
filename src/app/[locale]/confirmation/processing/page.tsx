import OrderProcessing from './OrderProcessing';

export default async function OrderProcessingPage({
    searchParams,
}: {
    searchParams: Promise<{ orderId?: string | string[] }>;
}) {
    const { orderId } = await searchParams;
    const candidateOrderId = Array.isArray(orderId) ? orderId[0] : orderId;
    return <OrderProcessing candidateOrderId={candidateOrderId} />;
}
