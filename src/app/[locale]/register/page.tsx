'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from '@/components/commercetools-ui/atoms/link';

export default function RegisterPage() {
    const router = useRouter();

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<
        Partial<Record<keyof typeof formData, string>>
    >({});

    const handleChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const { name, value } = event.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
        setFieldErrors((prev) => ({
            ...prev,
            [name]: undefined,
        }));
    };

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        setError('');
        const nextFieldErrors: Partial<
            Record<keyof typeof formData, string>
        > = {};

        if (!formData.firstName.trim()) {
            nextFieldErrors.firstName = 'First name is required.';
        }
        if (!formData.lastName.trim()) {
            nextFieldErrors.lastName = 'Last name is required.';
        }
        if (!formData.email.trim()) {
            nextFieldErrors.email = 'Email address is required.';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            nextFieldErrors.email = 'Enter a valid email address.';
        }
        if (!formData.password) {
            nextFieldErrors.password = 'Password is required.';
        } else if (formData.password.length < 8) {
            nextFieldErrors.password = 'Password must be at least 8 characters.';
        }
        if (!formData.confirmPassword) {
            nextFieldErrors.confirmPassword = 'Confirm password is required.';
        } else if (formData.password !== formData.confirmPassword) {
            nextFieldErrors.confirmPassword = 'Passwords do not match.';
        }

        setFieldErrors(nextFieldErrors);
        if (Object.keys(nextFieldErrors).length > 0) {
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email,
                    password: formData.password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || 'Unable to create account.'
                );
            }

            router.push('/login?registered=true');
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : 'Unable to create account.'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="flex min-h-[70vh] items-center justify-center px-4 py-12">
            <div className="w-full max-w-md">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-semibold">
                        Create an account
                    </h1>

                    <p className="mt-2 text-sm text-gray-600">
                        Register to start shopping with us.
                    </p>
                </div>

                <form
                    onSubmit={handleSubmit}
                    noValidate
                    className="space-y-5"
                >
                    {/* First name */}
                    <div>
                        <label
                            htmlFor="firstName"
                            className="mb-2 block text-sm font-medium"
                        >
                            First name <span aria-hidden="true" className="text-red-600">*</span>
                        </label>

                        <input
                            id="firstName"
                            name="firstName"
                            type="text"
                            value={formData.firstName}
                            onChange={handleChange}
                            autoComplete="given-name"
                            required
                            aria-invalid={Boolean(fieldErrors.firstName)}
                            aria-describedby={fieldErrors.firstName ? 'firstName-error' : undefined}
                            className="w-full rounded-md bg-white border border-gray-300 px-4 py-3 outline-none transition focus:border-black"
                        />
                        {fieldErrors.firstName && (
                            <p id="firstName-error" className="mt-1 text-sm text-red-600" role="alert">
                                {fieldErrors.firstName}
                            </p>
                        )}
                    </div>

                    {/* Last name */}
                    <div>
                        <label
                            htmlFor="lastName"
                            className="mb-2 block text-sm font-medium"
                        >
                            Last name <span aria-hidden="true" className="text-red-600">*</span>
                        </label>

                        <input
                            id="lastName"
                            name="lastName"
                            type="text"
                            value={formData.lastName}
                            onChange={handleChange}
                            autoComplete="family-name"
                            required
                            aria-invalid={Boolean(fieldErrors.lastName)}
                            aria-describedby={fieldErrors.lastName ? 'lastName-error' : undefined}
                            className="w-full rounded-md bg-white border border-gray-300 px-4 py-3 outline-none transition focus:border-black"
                        />
                        {fieldErrors.lastName && (
                            <p id="lastName-error" className="mt-1 text-sm text-red-600" role="alert">
                                {fieldErrors.lastName}
                            </p>
                        )}
                    </div>

                    {/* Email */}
                    <div>
                        <label
                            htmlFor="email"
                            className="mb-2 block text-sm font-medium"
                        >
                            Email address <span aria-hidden="true" className="text-red-600">*</span>
                        </label>

                        <input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            autoComplete="email"
                            required
                            aria-invalid={Boolean(fieldErrors.email)}
                            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                            className="w-full rounded-md bg-white border border-gray-300 px-4 py-3 outline-none transition focus:border-black"
                        />
                        {fieldErrors.email && (
                            <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
                                {fieldErrors.email}
                            </p>
                        )}
                    </div>

                    {/* Password */}
                    <div>
                        <label
                            htmlFor="password"
                            className="mb-2 block text-sm font-medium"
                        >
                            Password <span aria-hidden="true" className="text-red-600">*</span>
                        </label>

                        <input
                            id="password"
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleChange}
                            autoComplete="new-password"
                            minLength={8}
                            required
                            aria-invalid={Boolean(fieldErrors.password)}
                            aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                            className="w-full rounded-md bg-white border border-gray-300 px-4 py-3 outline-none transition focus:border-black"
                        />

                        {fieldErrors.password ? (
                            <p id="password-error" className="mt-1 text-sm text-red-600" role="alert">
                                {fieldErrors.password}
                            </p>
                        ) : (
                            <p className="mt-1 text-xs text-gray-500">
                                Minimum 8 characters.
                            </p>
                        )}
                    </div>

                    {/* Confirm password */}
                    <div>
                        <label
                            htmlFor="confirmPassword"
                            className="mb-2 block text-sm font-medium"
                        >
                            Confirm password <span aria-hidden="true" className="text-red-600">*</span>
                        </label>

                        <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            autoComplete="new-password"
                            required
                            aria-invalid={Boolean(fieldErrors.confirmPassword)}
                            aria-describedby={fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined}
                            className="w-full rounded-md border bg-white border-gray-300 px-4 py-3 outline-none transition focus:border-black"
                        />
                        {fieldErrors.confirmPassword && (
                            <p id="confirmPassword-error" className="mt-1 text-sm text-red-600" role="alert">
                                {fieldErrors.confirmPassword}
                            </p>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600" role="alert">
                            {error}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-md bg-blue-600 px-4 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading
                            ? 'Creating account...'
                            : 'Create account'}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-600">
                    Already have an account?{' '}
                    <Link
                        link="/login"
                        className="font-medium text-blue-600 underline"
                    >
                        Sign in
                    </Link>
                </p>
            </div>
        </main>
    );
}
