
import 'server-only';

import { prisma } from '@/lib/prisma';
import {
    addNewsletterContact,
    removeNewsletterContact,
} from './sendgrid-contacts';

const MAX_ATTEMPTS = 3;

export async function processNewsletterSyncJobs() {
    const jobs = await prisma.newsletterSyncJob.findMany({
        where: {
            status: 'pending',
            nextAttemptAt: { lte: new Date() },
        },
        take: 10,
        orderBy: { createdAt: 'asc' },
    });

    let synced = 0;
    let failed = 0;

    for (const job of jobs) {
        const claimed = await prisma.newsletterSyncJob.updateMany({
            where: {
                id: job.id,
                status: 'pending',
            },
            data: {
                status: 'processing',
                attempts: { increment: 1 },
                lockedUntil: new Date(Date.now() + 60_000),
            },
        });

        if (claimed.count !== 1) continue;

        try {
            const subscriber =
                await prisma.newsletterSubscriber.findUnique({
                    where: { id: job.subscriberId },
                });

            if (!subscriber) {
                throw new Error('Subscriber not found');
            }

            if (subscriber.status === 'unsubscribed') {
                await removeNewsletterContact(subscriber.email);
            } else if (subscriber.status === 'subscribed') {
                await addNewsletterContact(
                    subscriber.email,
                    subscriber.locale
                );
            }

            await prisma.newsletterSyncJob.update({
                where: { id: job.id },
                data: {
                    status: 'sent',
                    lockedUntil: null,
                    lastError: null,
                },
            });

            synced++;
        } catch (error) {
            const attempts = job.attempts + 1;
            const shouldRetry = attempts < MAX_ATTEMPTS;

            await prisma.newsletterSyncJob.update({
                where: { id: job.id },
                data: {
                    status: shouldRetry ? 'pending' : 'failed',
                    attempts,
                    lockedUntil: null,
                    nextAttemptAt: new Date(
                        Date.now() + 2 ** attempts * 60_000
                    ),
                    lastError:
                        error instanceof Error
                            ? error.message
                            : 'Unknown error',
                },
            });

            failed++;
        }
    }

    return { total: jobs.length, synced, failed };
}
