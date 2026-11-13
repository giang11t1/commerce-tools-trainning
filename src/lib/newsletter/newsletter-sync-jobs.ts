
import 'server-only';

import { prisma } from '@/lib/prisma';

export async function enqueueNewsletterSync(
    subscriberId: string,
    action: 'subscribe' | 'unsubscribe'
) {
    return prisma.newsletterSyncJob.upsert({
        where: { subscriberId },
        create: {
            subscriberId,
            action,
            status: 'pending',
        },
        update: {
            action,
            status: 'pending',
            attempts: 0,
            nextAttemptAt: new Date(),
            lockedUntil: null,
            lastError: null,
        },
    });
}
