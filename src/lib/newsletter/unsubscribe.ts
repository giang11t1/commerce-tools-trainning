
import 'server-only';

import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { enqueueNewsletterSync } from './newsletter-sync-jobs';

const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

function getSecret() {
    const secret = process.env.NEWSLETTER_TOKEN_SECRET;

    if (!secret || secret.length < 32) {
        throw new Error('NEWSLETTER_TOKEN_SECRET is missing');
    }

    return secret;
}

function sign(payload: string) {
    return crypto
        .createHmac('sha256', getSecret())
        .update(payload)
        .digest('hex');
}

export function createUnsubscribeToken(
    subscriberId: string
) {
    const expiresAt = Math.floor(Date.now() / 1000)
        + TOKEN_TTL_SECONDS;

    const payload = `${subscriberId}.${expiresAt}`;

    return `${payload}.${sign(payload)}`;
}

export async function unsubscribeNewsletter(
    token: string
) {
    const parts = token.split('.');

    if (parts.length !== 3) return false;

    const [subscriberId, expiry, signature] = parts;

    if (
        !subscriberId ||
        !/^\d+$/.test(expiry) ||
        !/^[a-f0-9]{64}$/.test(signature)
    ) {
        return false;
    }

    const expiresAt = Number(expiry);

    if (
        !Number.isSafeInteger(expiresAt) ||
        expiresAt < Math.floor(Date.now() / 1000)
    ) {
        return false;
    }

    const expected = sign(`${subscriberId}.${expiry}`);

    if (!crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expected, 'hex')
    )) {
        return false;
    }


    const updated = await prisma.newsletterSubscriber.updateMany({
        where: {
            id: subscriberId,
            status: 'subscribed',
        },
        data: {
            status: 'unsubscribed',
            unsubscribedAt: new Date(),
            sendgridSyncedAt: null,
        },
    });

    if (updated.count !== 1) {
        return false;
    }

    try {
        await enqueueNewsletterSync(
            subscriberId,
            'unsubscribe'
        );
    } catch (error) {
        console.error('[Newsletter] Failed to enqueue sync', {
            subscriberId,
            error,
        });
    }

    return true;

}


export function createUnsubscribeUrl(
    subscriber: {
        id: string;
        locale: string;
    }
) {
    const siteUrl = process.env.SITE_URL;

    if (!siteUrl) {
        throw new Error('SITE_URL is missing');
    }

    const locale = subscriber.locale === 'de' ? 'de' : 'en';

    const url = new URL(
        `/${locale}/newsletter/unsubscribe`,
        siteUrl
    );

    const token = createUnsubscribeToken(subscriber.id);

    // Fragment is not sent to the server on page load.
    url.hash = new URLSearchParams({ token }).toString();

    return url.toString();
}
