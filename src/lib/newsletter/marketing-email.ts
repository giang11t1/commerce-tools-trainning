
import 'server-only';

import sgMail from '@sendgrid/mail';
import { createUnsubscribeUrl } from './unsubscribe';

type Subscriber = {
    id: string;
    email: string;
    locale: string;
    status: string;
};

export async function sendNewsletterEmail(
    subscriber: Subscriber,
    templateId: string
) {
    if (subscriber.status !== 'subscribed') {
        return { skipped: true };
    }

    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL;

    if (!apiKey || !fromEmail) {
        throw new Error('SendGrid configuration missing');
    }

    const unsubscribeUrl = createUnsubscribeUrl(subscriber);

    sgMail.setApiKey(apiKey);

    const [response] = await sgMail.send({
        to: subscriber.email,
        from: fromEmail,
        templateId,
        dynamicTemplateData: {
            unsubscribeUrl,
            shopUrl: new URL(
                `/${subscriber.locale === 'de' ? 'de' : 'en'}`,
                process.env.SITE_URL!
            ).toString(),
        },
        trackingSettings: {
            clickTracking: {
                enable: false,
                enableText: false,
            },
        },
    });

    return {
        skipped: false,
        statusCode: response.statusCode,
    };
}
