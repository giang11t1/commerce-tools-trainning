
import 'server-only';
import sgMail from '@sendgrid/mail';
import type { Order, Money } from '@commercetools/platform-sdk';


function formatMoney(money: Money): string {
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: money.currencyCode,
    });

    const fractionDigits: number =
        'fractionDigits' in money &&
        typeof money.fractionDigits === 'number'
            ? money.fractionDigits
            : formatter.resolvedOptions().maximumFractionDigits ?? 2;

    return formatter.format(
        money.centAmount / Math.pow(10, fractionDigits)
    );
}


export async function sendOrderConfirmation(
    order: Order
) {
    const apiKey = process.env.SENDGRID_API_KEY;
    const from = process.env.SENDGRID_FROM_EMAIL;
    const templateId =
        process.env.SENDGRID_ORDER_TEMPLATE_ID;

    if (!apiKey || !from || !templateId) {
        throw new Error('Missing SendGrid configuration');
    }

    if (!order.customerEmail) {
        throw new Error('Order customer email is missing');
    }

    sgMail.setApiKey(apiKey);

    const items = order.lineItems.map((item) => ({
        name:
            item.name['en-US'] ??
            Object.values(item.name)[0] ??
            'Product',
        quantity: item.quantity,
        unitPrice: formatMoney(item.price.value),
        totalPrice: formatMoney(item.totalPrice),
    }));

    const [response] = await sgMail.send({
        to: order.customerEmail,
        from,
        templateId,
        dynamicTemplateData: {
            customerName:
                order.shippingAddress?.firstName ?? 'Customer',
            orderNumber: order.orderNumber ?? order.id,
            items,
            shippingCost: order.shippingInfo
                ? formatMoney(order.shippingInfo.price)
                : formatMoney({
                    ...order.totalPrice,
                    centAmount: 0,
                }),
            total: formatMoney(order.totalPrice),
        },
    });

    return response.statusCode;
}
