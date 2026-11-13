
import 'server-only';

import sgMail from '@sendgrid/mail';

type SendPasswordResetEmailInput = {
    email: string;
    customerName: string;
    resetUrl: string;
    expiresIn: string;
};

export async function sendPasswordResetEmail({
                                                 email,
                                                 customerName,
                                                 resetUrl,
                                                 expiresIn,
                                             }: SendPasswordResetEmailInput) {
    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL;
    const templateId =
        process.env.SENDGRID_RESET_PASSWORD_TEMPLATE_ID;

    if (!apiKey || !fromEmail || !templateId) {
        throw new Error(
            'Password reset email configuration is missing'
        );
    }

    sgMail.setApiKey(apiKey);

    const [response] = await sgMail.send({
        to: email,
        from: fromEmail,
        templateId,
        dynamicTemplateData: {
            customerName,
            resetUrl,
            expiresIn,
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

    console.info('[Password Reset] SendGrid accepted', {
        statusCode: response.statusCode,
    });

    return response.statusCode;
}
