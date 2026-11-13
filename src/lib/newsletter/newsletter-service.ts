
import 'server-only';

import crypto from 'node:crypto';
import sgMail from '@sendgrid/mail';
import { prisma } from '@/lib/prisma';
import { addNewsletterContact } from './sendgrid-contacts';

const TOKEN_EXPIRY_HOURS = 24;

function hashToken(token: string) {
    return crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
}


type SubscribeNewsletterResult =
    | { status: 'already_subscribed'; success: false }
    | { status: 'pending'; success: true }
    | { status: 'unsubscribed'; success: false };

export async function subscribeNewsletter(
    email: string,
    locale: 'en' | 'de'
): Promise<SubscribeNewsletterResult> {
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await prisma.newsletterSubscriber.findUnique({
        where: { email: normalizedEmail },
    });

    // 1. Already subscribed: show duplicate email error.
    if (existing?.status === 'subscribed') {
        return {
            status: 'already_subscribed',
            success: false,
        };
    }

    // 2. Preserve existing unsubscribe behavior.
    // Do not automatically re-subscribe without new consent.
    if (existing?.status === 'unsubscribed') {
        return {
            status: 'unsubscribed',
            success: false,
        };
    }

    // 3. New subscriber or pending subscriber.
    const token = crypto.randomBytes(32).toString('hex');
    const confirmationTokenHash = hashToken(token);

    const confirmationExpiresAt = new Date(
        Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
    );

    // 4. Validate SendGrid configuration.
    const apiKey = process.env.SENDGRID_API_KEY;
    const from = process.env.SENDGRID_FROM_EMAIL;
    const templateId =
        process.env.SENDGRID_NEWSLETTER_CONFIRM_TEMPLATE_ID;
    const siteUrl = process.env.SITE_URL;

    if (!apiKey || !from || !templateId || !siteUrl) {
        throw new Error(
            'Newsletter email configuration is missing'
        );
    }

    // 5. Create or refresh confirmation token.
    await prisma.newsletterSubscriber.upsert({
        where: { email: normalizedEmail },
        create: {
            email: normalizedEmail,
            locale,
            status: 'pending',
            consentAt: new Date(),
            confirmationTokenHash,
            confirmationExpiresAt,
        },
        update: {
            locale,
            confirmationTokenHash,
            confirmationExpiresAt,
        },
    });

    // 6. Build confirmation URL.
    sgMail.setApiKey(apiKey);

    const confirmationUrl = new URL(
        '/api/newsletter/confirm',
        siteUrl
    );

    confirmationUrl.searchParams.set('token', token);

    // 7. Send confirmation email.
    await sgMail.send({
        to: normalizedEmail,
        from,
        templateId,
        dynamicTemplateData: {
            confirmationUrl: confirmationUrl.toString(),
        },
        trackingSettings: {
            clickTracking: {
                enable: false,
                enableText: false,
            },
            openTracking: {
                enable: false,
            },
        },
    });

    return {
        status: 'pending',
        success: true,
    };
}


export async function confirmNewsletter(token: string) {
    const confirmationTokenHash = hashToken(token);

    const subscriber =
        await prisma.newsletterSubscriber.findFirst({
            where: {
                confirmationTokenHash,
                status: 'pending',
                confirmationExpiresAt: {
                    gt: new Date(),
                },
            },
        });

    if (!subscriber) {
        return false;
    }

    const updated = await prisma.newsletterSubscriber.updateMany({
        where: {
            id: subscriber.id,
            status: 'pending',
            confirmationTokenHash,
            confirmationExpiresAt: {
                gt: new Date(),
            },
        },
        data: {
            status: 'subscribed',
            confirmedAt: new Date(),
            confirmationTokenHash: null,
            confirmationExpiresAt: null,
        },
    });

    if (updated.count !== 1) {
        return false;
    }

    try {
        await addNewsletterContact(
            subscriber.email,
            subscriber.locale
        );

        await prisma.newsletterSubscriber.update({
            where: { id: subscriber.id },
            data: { sendgridSyncedAt: new Date() },
        });
    } catch (error) {
        console.error('[Newsletter] SendGrid sync failed', {
            subscriberId: subscriber.id,
            errorType:
                error instanceof Error ? error.name : 'Unknown',
        });
    }

    return true;

}
