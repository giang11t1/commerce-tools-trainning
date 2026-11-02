import { redirect } from 'next/navigation';

export default async function ConfirmationRedirect({
    params,
    searchParams,
}: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ orderId?: string | string[] }>;
}) {
    const [{ locale }, { orderId }] = await Promise.all([params, searchParams]);
    const confirmedOrderId = Array.isArray(orderId) ? orderId[0] : orderId;

    if (confirmedOrderId) {
        redirect(`/${locale}/confirmation/${encodeURIComponent(confirmedOrderId)}`);
    }

    redirect(`/${locale}/confirmation/processing`);
}
