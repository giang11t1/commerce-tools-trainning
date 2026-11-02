'use client';

import { useState, FormEvent } from 'react';

const countries = [
    { code: 'US', name: 'United States' },
    { code: 'AU', name: 'Australia' },
    { code: 'CA', name: 'Canada' },
    { code: 'GB', name: 'United Kingdom' },
];

const states: Record<
    string,
    { code: string; name: string }[]
> = {
    US: [
        { code: 'AL', name: 'Alabama' },
        { code: 'AK', name: 'Alaska' },
        { code: 'AZ', name: 'Arizona' },
        { code: 'CA', name: 'California' },
        { code: 'FL', name: 'Florida' },
        { code: 'IL', name: 'Illinois' },
        { code: 'NY', name: 'New York' },
        { code: 'TX', name: 'Texas' },
        { code: 'WA', name: 'Washington' },
    ],

    AU: [
        { code: 'ACT', name: 'Australian Capital Territory' },
        { code: 'NSW', name: 'New South Wales' },
        { code: 'NT', name: 'Northern Territory' },
        { code: 'QLD', name: 'Queensland' },
        { code: 'SA', name: 'South Australia' },
        { code: 'TAS', name: 'Tasmania' },
        { code: 'VIC', name: 'Victoria' },
        { code: 'WA', name: 'Western Australia' },
    ],

    CA: [
        { code: 'AB', name: 'Alberta' },
        { code: 'BC', name: 'British Columbia' },
        { code: 'MB', name: 'Manitoba' },
        { code: 'ON', name: 'Ontario' },
        { code: 'QC', name: 'Quebec' },
    ],

    GB: [
        { code: 'ENG', name: 'England' },
        { code: 'SCT', name: 'Scotland' },
        { code: 'WLS', name: 'Wales' },
        { code: 'NIR', name: 'Northern Ireland' },
    ],
};

interface Address {
    id?: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    streetName?: string;
    streetNumber?: string;
    additionalStreetInfo?: string;
    city?: string;
    postalCode?: string;
    state?: string;
    region?: string;
    country?: string;
    phone?: string;
    email?: string;
}

interface EditAddressFormProps {
    address: Address;
    addressId: string;
    isBilling: boolean;
    isShipping: boolean;
    action: (formData: FormData) => void | Promise<void>;
    cancelHref?: string;
}

interface FormErrors {
    firstName?: string;
    lastName?: string;
    streetName?: string;
    city?: string;
    postalCode?: string;
    country?: string;
}

export default function EditAddressForm({
                                            address,
                                            addressId,
                                            isBilling,
                                            isShipping,
                                            action,
                                            cancelHref = '/account/addresses',
                                        }: EditAddressFormProps) {
    const [country, setCountry] = useState(
        address.country || 'US'
    );
    const [state, setState] = useState(address.state || '');
    const [errors, setErrors] = useState<FormErrors>({});

    const countryStates = states[country] || [];

    const validate = (formData: FormData): boolean => {
        const newErrors: FormErrors = {};

        if (!formData.get('firstName')) {
            newErrors.firstName = 'First name is required';
        }
        if (!formData.get('lastName')) {
            newErrors.lastName = 'Last name is required';
        }
        if (!formData.get('streetName')) {
            newErrors.streetName = 'Street is required';
        }
        if (!formData.get('city')) {
            newErrors.city = 'City is required';
        }
        if (!formData.get('postalCode')) {
            newErrors.postalCode = 'Postal code is required';
        }
        if (!formData.get('country')) {
            newErrors.country = 'Country is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setErrors((prev) => ({
            ...prev,
            [name]: value ? undefined : `${name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, ' $1').trim()} is required`,
        }));
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new window.FormData(event.currentTarget);

        if (validate(formData)) {
            await action(formData);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="bg-white rounded-lg border border-gray-100 shadow-sm p-6"
        >
            <input
                type="hidden"
                name="addressId"
                value={addressId}
            />

            <h2 className="text-xl font-semibold mb-6">
                Address Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                {/* First Name */}
                <div>
                    <div className="float-field">
                        <input
                            id="firstName"
                            name="firstName"
                            type="text"
                            placeholder=" "
                            defaultValue={address.firstName || ''}
                            onChange={handleChange}
                            className={`address-input ${errors.firstName ? 'border-red-500 focus:border-red-500' : ''}`}
                        />
                        <label htmlFor="firstName">First Name *</label>
                    </div>
                    {errors.firstName && (
                        <p className="mt-1 text-xs text-red-500">
                            {errors.firstName}
                        </p>
                    )}
                </div>

                {/* Last Name */}
                <div>
                    <div className="float-field">
                        <input
                            id="lastName"
                            name="lastName"
                            type="text"
                            placeholder=" "
                            defaultValue={address.lastName || ''}
                            onChange={handleChange}
                            className={`address-input ${errors.lastName ? 'border-red-500 focus:border-red-500' : ''}`}
                        />
                        <label htmlFor="lastName">Last Name *</label>
                    </div>
                    {errors.lastName && (
                        <p className="mt-1 text-xs text-red-500">
                            {errors.lastName}
                        </p>
                    )}
                </div>

                {/* Company */}
                <div className="sm:col-span-2">
                    <div className="float-field">
                        <input
                            id="company"
                            name="company"
                            type="text"
                            placeholder=" "
                            defaultValue={address.company || ''}
                            className="address-input"
                        />
                        <label htmlFor="company">Company</label>
                    </div>
                </div>

                {/* Street */}
                <div>
                    <div className="float-field">
                        <input
                            id="streetName"
                            name="streetName"
                            type="text"
                            placeholder=" "
                            defaultValue={address.streetName || ''}
                            onChange={handleChange}
                            className={`address-input ${errors.streetName ? 'border-red-500 focus:border-red-500' : ''}`}
                        />
                        <label htmlFor="streetName">Street *</label>
                    </div>
                    {errors.streetName && (
                        <p className="mt-1 text-xs text-red-500">
                            {errors.streetName}
                        </p>
                    )}
                </div>

                {/* Street Number */}
                <div>
                    <div className="float-field">
                        <input
                            id="streetNumber"
                            name="streetNumber"
                            type="text"
                            placeholder=" "
                            defaultValue={address.streetNumber || ''}
                            className="address-input"
                        />
                        <label htmlFor="streetNumber">Street Number</label>
                    </div>
                </div>

                {/* Additional Street */}
                <div className="sm:col-span-2">
                    <div className="float-field">
                        <input
                            id="additionalStreetInfo"
                            name="additionalStreetInfo"
                            type="text"
                            placeholder=" "
                            defaultValue={
                                address.additionalStreetInfo || ''
                            }
                            className="address-input"
                        />
                        <label htmlFor="additionalStreetInfo">Apartment, Suite, etc.</label>
                    </div>
                </div>

                {/* City */}
                <div>
                    <div className="float-field">
                        <input
                            id="city"
                            name="city"
                            type="text"
                            placeholder=" "
                            defaultValue={address.city || ''}
                            onChange={handleChange}
                            className={`address-input ${errors.city ? 'border-red-500 focus:border-red-500' : ''}`}
                        />
                        <label htmlFor="city">City *</label>
                    </div>
                    {errors.city && (
                        <p className="mt-1 text-xs text-red-500">
                            {errors.city}
                        </p>
                    )}
                </div>

                {/* Postal Code */}
                <div>
                    <div className="float-field">
                        <input
                            id="postalCode"
                            name="postalCode"
                            type="text"
                            placeholder=" "
                            defaultValue={address.postalCode || ''}
                            onChange={handleChange}
                            className={`address-input ${errors.postalCode ? 'border-red-500 focus:border-red-500' : ''}`}
                        />
                        <label htmlFor="postalCode">Postal Code *</label>
                    </div>
                    {errors.postalCode && (
                        <p className="mt-1 text-xs text-red-500">
                            {errors.postalCode}
                        </p>
                    )}
                </div>

                {/* Country */}
                <div>
                    <div className="float-field">
                        <select
                            id="country"
                            name="country"
                            value={country}
                            data-empty={country ? undefined : 'true'}
                            onChange={(e) => {
                                setCountry(e.target.value);
                                setState('');
                                handleChange(e);
                            }}
                            className={`address-input ${errors.country ? 'border-red-500 focus:border-red-500' : ''}`}
                        >
                            {countries.map((item) => (
                                <option
                                    key={item.code}
                                    value={item.code}
                                >
                                    {item.name}
                                </option>
                            ))}
                        </select>
                        <label htmlFor="country">Country *</label>
                    </div>
                    {errors.country && (
                        <p className="mt-1 text-xs text-red-500">
                            {errors.country}
                        </p>
                    )}
                </div>

                {/* State */}
                <div>
                    <div className="float-field">
                        <select
                            id="state"
                            name="state"
                            value={state}
                            data-empty={state ? undefined : 'true'}
                            onChange={(e) => setState(e.target.value)}
                            className="address-input"
                            disabled={!countryStates.length}
                        >
                            <option value="">
                                Select state / province
                            </option>

                            {countryStates.map((item) => (
                                <option
                                    key={item.code}
                                    value={item.code}
                                >
                                    {item.name}
                                </option>
                            ))}
                        </select>
                        <label htmlFor="state">State / Province</label>
                    </div>
                </div>

                {/* Region */}
                <div>
                    <div className="float-field">
                        <input
                            id="region"
                            name="region"
                            type="text"
                            placeholder=" "
                            defaultValue={address.region || ''}
                            className="address-input"
                        />
                        <label htmlFor="region">Region</label>
                    </div>
                </div>

                {/* Phone */}
                <div>
                    <div className="float-field">
                        <input
                            id="phone"
                            name="phone"
                            type="tel"
                            placeholder=" "
                            defaultValue={address.phone || ''}
                            className="address-input"
                        />
                        <label htmlFor="phone">Phone</label>
                    </div>
                </div>

                {/* Email */}
                <div>
                    <div className="float-field">
                        <input
                            id="email"
                            name="email"
                            type="email"
                            placeholder=" "
                            defaultValue={address.email || ''}
                            className="address-input"
                        />
                        <label htmlFor="email">Email</label>
                    </div>
                </div>
            </div>

            {/* Address Type */}
            <div className="mt-8 border-t border-gray-100 pt-6">
                <h3 className="text-base font-semibold mb-4">
                    Address Type
                </h3>

                <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            name="isShipping"
                            defaultChecked={isShipping}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600"
                        />

                        <span className="text-sm text-gray-700">
                            Use as default shipping address
                        </span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            name="isBilling"
                            defaultChecked={isBilling}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600"
                        />

                        <span className="text-sm text-gray-700">
                            Use as default billing address
                        </span>
                    </label>
                </div>
            </div>

            {/* Actions */}
            <div className="mt-8 flex justify-end gap-3">
                <a
                    href={cancelHref}
                    className="px-5 py-2.5 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                    Cancel
                </a>

                <button
                    type="submit"
                    className="px-5 py-2.5 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                >
                    Save Changes
                </button>
            </div>
        </form>
    );
}
