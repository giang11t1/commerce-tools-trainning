'use server';

import { cookies } from 'next/headers';
import { loginCustomer } from './customer';

const SESSION_COOKIE_NAME = 'ct_customer_id';
const ACCESS_TOKEN_COOKIE_NAME = "ct_customer_access_token";
// Set for store-scoped customers; their token only works on /in-store/key={storeKey}/me endpoints.
const STORE_KEY_COOKIE_NAME = "ct_customer_store_key";


async function getCustomerAccessToken(
    email: string,
    password: string,
    storeKey?: string
): Promise<string> {
    const authUrl = process.env.CT_AUTH_URL?.replace(/\/$/, "");
    const projectKey = process.env.CT_PROJECT_KEY;
    const clientId = process.env.CT_CLIENT_ID;
    const clientSecret = process.env.CT_CLIENT_SECRET;

    if (!authUrl || !projectKey || !clientId || !clientSecret) {
        throw new Error('Customer authentication is not configured');
    }

    const credentials = Buffer.from(
        `${clientId}:${clientSecret}`
    ).toString("base64");

    // Store-scoped customers must use the in-store password flow.
    const tokenPath = storeKey
        ? `in-store/key=${encodeURIComponent(storeKey)}/customers/token`
        : "customers/token";

    const response = await fetch(
        `${authUrl}/oauth/${projectKey}/${tokenPath}`,
        {
            method: "POST",
            headers: {
                Authorization: `Basic ${credentials}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                grant_type: "password",
                username: email,
                password,
                scope: `manage_my_business_units:${projectKey}`,
            }),
            cache: "no-store",
        }
    );

    if (!response.ok) {
        console.error("Customer OAuth token request failed:", response.status);
        throw new Error(
            response.status === 400 || response.status === 401
                ? 'Your account was authenticated, but your customer profile permissions could not be loaded.'
                : 'Could not establish the customer session.'
        );
    }

    const data = await response.json();
    if (typeof data.access_token !== 'string' || !data.access_token) {
        throw new Error('Customer token response did not include an access token');
    }
    return data.access_token;
}

export async function login(formData: any) {
    const email = (formData.get('email') as string | null)?.trim().toLowerCase();
    const password = formData.get('password') as string;

    if (!email || !password) {
        return { error: 'Email and password are required' };
    }

    const result = await loginCustomer(email, password);

    if (!result.success) {
        return { error: result.error || 'Email or password is incorrect.' };
    }

    if (!result.customer) {
        return { error: 'Customer login did not return an account.' };
    }

    let accessToken: string | undefined;
    try {
        accessToken = await getCustomerAccessToken(email, password, result.storeKey);
    } catch {
        // The commercetools login endpoint already verified the customer's
        // credentials. A customer token is only needed for scoped /me APIs.
        console.error('Customer profile token could not be established.');
    }

    const cookieStore = await cookies();

    cookieStore.set(SESSION_COOKIE_NAME, result.customer.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
    });

    if (accessToken) {
        cookieStore.set(ACCESS_TOKEN_COOKIE_NAME, accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60,
            path: "/",
        });
    } else {
        cookieStore.delete(ACCESS_TOKEN_COOKIE_NAME);
    }

    if (result.storeKey) {
        cookieStore.set(STORE_KEY_COOKIE_NAME, result.storeKey, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60,
            path: "/",
        });
    } else {
        cookieStore.delete(STORE_KEY_COOKIE_NAME);
    }

    return { success: true };
}

export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    cookieStore.delete(ACCESS_TOKEN_COOKIE_NAME);
    cookieStore.delete(STORE_KEY_COOKIE_NAME);
}

export async function getSession() {
    const cookieStore = await cookies();
    return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}
