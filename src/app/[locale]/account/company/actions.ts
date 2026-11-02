'use server';

import { redirect } from 'next/navigation';
import { refresh } from 'next/cache';
import type { BaseAddress } from '@commercetools/platform-sdk';
import {
    addBusinessUnitAddress,
    removeBusinessUnitAddress,
    updateBusinessUnitAddress,
    updateBusinessUnitDetails,
} from '@/lib/business-units';

export interface CompanyDetailsState {
    success?: boolean;
    error?: string;
}

function companyUrl(unitKey: string, path = '', params: Record<string, string> = {}) {
    const query = new URLSearchParams({ unit: unitKey, ...params }).toString();

    return `/account/company${path}?${query}`;
}

const ADDRESS_FIELDS = [
    'firstName',
    'lastName',
    'company',
    'streetName',
    'streetNumber',
    'additionalStreetInfo',
    'city',
    'postalCode',
    'state',
    'region',
    'phone',
    'email',
] as const;

function addressFromFormData(formData: FormData): BaseAddress {
    const fields = ADDRESS_FIELDS
        .map((field) => [field, String(formData.get(field) || '').trim()] as const)
        .filter(([, value]) => value);

    return {
        ...Object.fromEntries(fields),
        country: String(formData.get('country') || ''),
    };
}

function defaultsFromFormData(formData: FormData) {
    return {
        isShipping: formData.get('isShipping') === 'on',
        isBilling: formData.get('isBilling') === 'on',
    };
}

export async function saveCompanyDetails(
    unitKey: string,
    _prevState: CompanyDetailsState,
    formData: FormData,
): Promise<CompanyDetailsState> {
    const name = String(formData.get('name') || '').trim();
    const contactEmail = String(formData.get('contactEmail') || '').trim();

    if (!name) {
        return { error: 'Company name is required' };
    }

    const result = await updateBusinessUnitDetails(unitKey, { name, contactEmail });

    if (!result.success) {
        return { error: result.error };
    }

    refresh();

    return { success: true };
}

export async function addCompanyAddress(unitKey: string, formData: FormData) {
    const result = await addBusinessUnitAddress(
        unitKey,
        addressFromFormData(formData),
        defaultsFromFormData(formData),
    );

    if (!result.success) {
        redirect(companyUrl(unitKey, '/addresses/add', { error: result.error }));
    }

    redirect(companyUrl(unitKey));
}

export async function updateCompanyAddress(unitKey: string, formData: FormData) {
    const addressId = String(formData.get('addressId') || '');

    const result = await updateBusinessUnitAddress(
        unitKey,
        addressId,
        addressFromFormData(formData),
        defaultsFromFormData(formData),
    );

    if (!result.success) {
        redirect(companyUrl(unitKey, `/addresses/${addressId}/edit`, { error: result.error }));
    }

    redirect(companyUrl(unitKey));
}

export async function deleteCompanyAddress(unitKey: string, formData: FormData) {
    const addressId = String(formData.get('addressId') || '');
    const result = await removeBusinessUnitAddress(unitKey, addressId);

    redirect(companyUrl(unitKey, '', result.success ? {} : { error: result.error }));
}
