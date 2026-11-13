
import 'server-only';

const BASE_URL = 'https://api.sendgrid.com/v3';

async function sendgridRequest(
    path: string,
    options: RequestInit
) {
    const apiKey = process.env.SENDGRID_API_KEY;

    if (!apiKey) {
        throw new Error('SENDGRID_API_KEY is missing');
    }

    const response = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            ...options.headers,
        },
        cache: 'no-store',
    });

    if (!response.ok) {
        throw new Error(
            `SendGrid Contacts API failed: ${response.status}`
        );
    }

    return response;
}

export async function addNewsletterContact(
    email: string,
    locale: string
) {
    const listId = process.env.SENDGRID_MARKETING_LIST_ID;

    if (!listId) {
        throw new Error('SENDGRID_MARKETING_LIST_ID is missing');
    }

    const response = await sendgridRequest(
        '/marketing/contacts',
        {
            method: 'PUT',
            body: JSON.stringify({
                list_ids: [listId],
                contacts: [
                    {
                        email,
                        custom_fields: {},
                    },
                ],
            }),
        }
    );

    const result = await response.json() as {
        job_id?: string;
    };

    console.info('[Newsletter] SendGrid import accepted', {
        jobId: result.job_id,
        locale,
    });

    return result;
}



export async function removeNewsletterContact(
    email: string
) {
    const apiKey = process.env.SENDGRID_API_KEY;
    const listId = process.env.SENDGRID_MARKETING_LIST_ID;

    if (!apiKey || !listId) {
        throw new Error('SendGrid configuration missing');
    }

    // First resolve the SendGrid contact ID.
    const lookup = await fetch(
        'https://api.sendgrid.com/v3/marketing/contacts/search/emails',
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ emails: [email] }),
            cache: 'no-store',
        }
    );

    if (!lookup.ok) {
        throw new Error(`SendGrid lookup failed: ${lookup.status}`);
    }

    const data = await lookup.json() as {
        result?: Record<string, {
            contact?: { id?: string };
        }>;
    };

    const contactId = data.result?.[email]?.contact?.id;

    if (!contactId) {
        return { removed: false, reason: 'not_found' };
    }

    const response = await fetch(
        `https://api.sendgrid.com/v3/marketing/lists/${encodeURIComponent(listId)}/contacts?contact_ids=${encodeURIComponent(contactId)}`,
        {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
            cache: 'no-store',
        }
    );

    if (!response.ok) {
        throw new Error(
            `SendGrid list removal failed: ${response.status}`
        );
    }

    return { removed: true };
}
