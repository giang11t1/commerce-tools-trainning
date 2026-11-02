import { NextRequest, NextResponse } from 'next/server';
import { apiRoot } from '@/lib/commercetools';

type RegistrationBody = {
    firstName?: unknown;
    lastName?: unknown;
    email?: unknown;
    password?: unknown;
};

function getCommercetoolsError(error: unknown) {
    if (!error || typeof error !== 'object') return undefined;

    return error as {
        statusCode?: number;
        body?: { errors?: { code?: string }[] };
    };
}

export async function POST(request: NextRequest) {
    let body: RegistrationBody;

    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 });
    }

    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!firstName || !lastName || !email || !password) {
        return NextResponse.json({ message: 'All fields are required.' }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ message: 'Enter a valid email address.' }, { status: 400 });
    }

    if (password.length < 8) {
        return NextResponse.json(
            { message: 'Password must be at least 8 characters.' },
            { status: 400 }
        );
    }

    try {
        const response = await apiRoot
            .withProjectKey({ projectKey: process.env.CT_PROJECT_KEY! })
            .customers()
            .post({ body: { firstName, lastName, email, password } })
            .execute();

        return NextResponse.json(
            {
                success: true,
                customer: {
                    id: response.body.customer.id,
                    email: response.body.customer.email,
                    firstName: response.body.customer.firstName,
                    lastName: response.body.customer.lastName,
                },
            },
            { status: 201 }
        );
    } catch (error) {
        const ctError = getCommercetoolsError(error);
        const errorCodes = ctError?.body?.errors?.map((item) => item.code) ?? [];

        if (errorCodes.includes('DuplicateField')) {
            return NextResponse.json(
                { message: 'An account with this email already exists.' },
                { status: 409 }
            );
        }

        if (ctError?.statusCode === 401 || ctError?.statusCode === 403) {
            console.error('commercetools customer registration was unauthorized.');
            return NextResponse.json(
                { message: 'Account registration is not available right now.' },
                { status: 503 }
            );
        }

        console.error('commercetools customer registration failed.');
        return NextResponse.json(
            { message: 'Unable to create account. Please try again.' },
            { status: 502 }
        );
    }
}
