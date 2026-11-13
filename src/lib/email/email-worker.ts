
import 'server-only';

import { prisma } from '@/lib/prisma';
import { apiRoot } from '@/lib/commercetools';
import { sendOrderConfirmation } from './order-confirmation';
import { sendWelcomeEmail } from './welcome-email';

const MAX_ATTEMPTS = 3;
const LOCK_DURATION_MS = 60_000;

export async function processPendingEmails() {
    const now = new Date();

    const jobs = await prisma.emailJob.findMany({
        where: {
            status: 'pending',
            nextAttemptAt: { lte: now },
        },
        orderBy: {
            createdAt: 'asc',
        },
        take: 10,
    });

    let sent = 0;
    let failed = 0;

    for (const job of jobs) {
        // Atomically claim the job.
        const claimed = await prisma.emailJob.updateMany({
            where: {
                id: job.id,
                status: 'pending',
            },
            data: {
                status: 'processing',
                attempts: { increment: 1 },
                lockedUntil: new Date(
                    Date.now() + LOCK_DURATION_MS
                ),
            },
        });

        if (claimed.count !== 1) {
            continue;
        }

        try {
            const projectKey = process.env.CT_PROJECT_KEY;

            if (!projectKey) {
                throw new Error(
                    'CT_PROJECT_KEY is not configured'
                );
            }

            let statusCode: number | undefined;

            if (job.type === 'welcome_email') {
                if (!job.customerId) {
                    throw new Error(
                        `Missing customerId for job ${job.id}`
                    );
                }

                // Fetch Customer from commercetools.
                const response = await apiRoot
                    .withProjectKey({ projectKey })
                    .customers()
                    .withId({ ID: job.customerId })
                    .get()
                    .execute();

                // Send Welcome Email.
                await sendWelcomeEmail(response.body);

            } else if (job.type === 'order_confirmation') {
                if (!job.orderId) {
                    throw new Error(
                        `Missing orderId for job ${job.id}`
                    );
                }

                // Fetch Order from commercetools.
                const response = await apiRoot
                    .withProjectKey({ projectKey })
                    .orders()
                    .withId({ ID: job.orderId })
                    .get()
                    .execute();

                // Send Order Confirmation.
                statusCode = await sendOrderConfirmation(
                    response.body
                );

            } else {
                throw new Error(
                    `Unsupported email job type: ${job.type}`
                );
            }

            // Mark as sent after SendGrid accepts.
            await prisma.emailJob.update({
                where: { id: job.id },
                data: {
                    status: 'sent',
                    sentAt: new Date(),
                    lockedUntil: null,
                    lastError: null,
                },
            });

            sent++;

            console.info('[Email Worker] Sent', {
                jobId: job.id,
                type: job.type,
                orderId: job.orderId,
                customerId: job.customerId,
                statusCode,
            });

        } catch (error) {
            const attempts = job.attempts + 1;
            const shouldRetry = attempts < MAX_ATTEMPTS;

            const delayMs =
                Math.min(2 ** attempts, 60) * 60_000;

            await prisma.emailJob.update({
                where: { id: job.id },
                data: {
                    status: shouldRetry
                        ? 'pending'
                        : 'failed',
                    lockedUntil: null,
                    nextAttemptAt: new Date(
                        Date.now() + delayMs
                    ),
                    lastError:
                        error instanceof Error
                            ? error.message
                            : 'Unknown error',
                },
            });

            failed++;

            console.error('[Email Worker] Failed', {
                jobId: job.id,
                type: job.type,
                orderId: job.orderId,
                customerId: job.customerId,
                attempts,
                shouldRetry,
                error,
            });
        }
    }

    return {
        total: jobs.length,
        sent,
        failed,
    };
}
