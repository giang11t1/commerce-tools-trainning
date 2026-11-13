import 'server-only';

import sgMail from '@sendgrid/mail';
import { apiRoot } from '@/lib/commercetools';
import { sendPasswordResetEmail } from '@/lib/email/password-reset-email';

const TOKEN_TTL_MINUTES = 30;

function getConfiguration() {
    const projectKey = process.env.CT_PROJECT_KEY;
    const apiKey = process.env.SENDGRID_API_KEY;
    const from = process.env.SENDGRID_FROM_EMAIL;
    const siteUrl = process.env.SITE_URL;
    if (process.env.PASSWORD_RECOVERY_ENABLED !== 'true' || !projectKey || !apiKey || !from || !siteUrl) {
        throw new Error('Password recovery configuration is missing.');
    }

    const url = new URL(siteUrl);
    if (url.username || url.password || url.search || url.hash ||
        (url.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && url.protocol === 'http:'))) {
        throw new Error('SITE_URL must be an HTTPS URL without credentials, query, or fragment.');
    }
    return { projectKey, apiKey, from, siteUrl: url };
}

export async function requestPasswordRecovery(email: string, locale: 'en' | 'de') {
    const { projectKey, apiKey, from, siteUrl } = getConfiguration();
    const project = apiRoot.withProjectKey({ projectKey });
    const escaped = email.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    let offset = 0;
    sgMail.setApiKey(apiKey);

    while (true) {
        const { body } = await project.customers().get({
            queryArgs: { where: `email="${escaped}"`, limit: 100, offset },
        }).execute();

        for (const customer of body.results) {
            if (customer.authenticationMode !== 'Password') continue;
            const storeKey = customer.stores?.[0]?.key;
            const customers = storeKey
                ? project.inStoreKeyWithStoreKeyValue({ storeKey }).customers()
                : project.customers();
            const token = await customers.passwordToken().post({
                body: { email: customer.email, ttlMinutes: TOKEN_TTL_MINUTES },
            }).execute();

            const resetUrl = new URL(`/${locale}/reset-password`, siteUrl);
            const fragment = new URLSearchParams({ token: token.body.value });
            if (storeKey) fragment.set('store', storeKey);
            resetUrl.hash = fragment.toString();
            await sendPasswordResetEmail({
                email: customer.email,
                customerName:
                    customer.firstName ||
                    customer.lastName ||
                    'Customer',
                resetUrl: resetUrl.toString(),
                expiresIn: '30 minutes',
            });
        }

        offset += body.results.length;
        if (body.results.length < 100) break;
    }
}

export async function resetCustomerPassword(token: string, password: string, storeKey?: string) {
    const projectKey = process.env.CT_PROJECT_KEY;
    if (process.env.PASSWORD_RECOVERY_ENABLED !== 'true' || !projectKey) {
        throw new Error('Password recovery configuration is missing.');
    }
    const project = apiRoot.withProjectKey({ projectKey });
    const customers = storeKey
        ? project.inStoreKeyWithStoreKeyValue({ storeKey }).customers()
        : project.customers();
    await customers.passwordReset().post({
        body: { tokenValue: token, newPassword: password },
    }).execute();
}
