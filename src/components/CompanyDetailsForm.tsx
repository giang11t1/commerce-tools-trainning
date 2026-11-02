'use client';

import { useActionState } from 'react';
import type { CompanyDetailsState } from '@/app/[locale]/account/company/actions';

interface CompanyDetailsFormProps {
    name: string;
    contactEmail?: string;
    action: (state: CompanyDetailsState, formData: FormData) => Promise<CompanyDetailsState>;
}

export default function CompanyDetailsForm({ name, contactEmail, action }: CompanyDetailsFormProps) {
    const [state, formAction, pending] = useActionState(action, {});

    return (
        <form action={formAction} className="bg-white rounded-lg border border-gray-100 shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-6">Update Company Details</h2>

            {state.error && (
                <div className="p-4 mb-4 rounded-md bg-red-50 text-red-700 text-sm">{state.error}</div>
            )}
            {state.success && (
                <div className="p-4 mb-4 rounded-md bg-green-50 text-green-700 text-sm">
                    Company details updated.
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="float-field">
                    <input
                        id="name"
                        name="name"
                        type="text"
                        placeholder=" "
                        required
                        defaultValue={name}
                        className="address-input"
                    />
                    <label htmlFor="name">Company Name *</label>
                </div>

                <div className="float-field">
                    <input
                        id="contactEmail"
                        name="contactEmail"
                        type="email"
                        placeholder=" "
                        defaultValue={contactEmail || ''}
                        className="address-input"
                    />
                    <label htmlFor="contactEmail">Contact Email</label>
                </div>
            </div>

            <div className="mt-8 flex justify-end">
                <button
                    type="submit"
                    disabled={pending}
                    className="px-5 py-2.5 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
                >
                    {pending ? 'Saving…' : 'Save Changes'}
                </button>
            </div>
        </form>
    );
}
