
import { NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';

export async function POST(request: Request) {
    try {
        const apiKey = process.env.SENDGRID_API_KEY;
        const from = process.env.SENDGRID_FROM_EMAIL;

        if (!apiKey || !from) {
            return NextResponse.json(
                { error: 'SendGrid is not configured' },
                { status: 500 }
            );
        }

        sgMail.setApiKey(apiKey);

        // Lab only: use a fixed recipient from environment.
        const to = process.env.SENDGRID_TEST_EMAIL;

        if (!to) {
            return NextResponse.json(
                { error: 'Test email is not configured' },
                { status: 500 }
            );
        }

        await sgMail.send({
            to,
            from,
            subject: 'Test email from commercetools storefront',
            text: 'SendGrid integration is working!',
            html: '<h2>SendGrid integration is working!</h2>',
        });

        return NextResponse.json({
            success: true,
            message: 'Email accepted by SendGrid',
        });
    } catch (error: any) {
        console.error('SendGrid error:', {
            statusCode: error.code,
            message: error.message,
            errors: error.response?.body?.errors,
        });

        return NextResponse.json(
            {
                error: 'Failed to send email',
                statusCode: error.code,
                details: error.response?.body?.errors,
            },
            { status: 500 }
        );
    }
}
