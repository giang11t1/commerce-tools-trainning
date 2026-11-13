
import 'server-only';

import sgMail from '@sendgrid/mail';
import type { Customer } from '@commercetools/platform-sdk';

export async function sendWelcomeEmail(customer: Customer) {
    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL;
    const templateId = process.env.SENDGRID_WELCOME_TEMPLATE_ID;

    if (!apiKey || !fromEmail || !templateId) {
        throw new Error('Welcome email configuration is missing.');
    }

    sgMail.setApiKey(apiKey);

    const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ??
        'http://localhost:3000';

    const customerName =
        [customer.firstName, customer.lastName]
            .filter(Boolean)
            .join(' ') || 'Customer';

    const [response] = await sgMail.send({
        to: customer.email,
        from: fromEmail,
        templateId,
        dynamicTemplateData: {
            customerName,
            shopUrl: siteUrl,
        },
    });

    console.info('[Welcome Email] SendGrid accepted', {
        customerId: customer.id,
        statusCode: response.statusCode,
    });
}
