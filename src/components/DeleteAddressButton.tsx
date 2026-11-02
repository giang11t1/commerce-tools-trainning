'use client';

import { useState } from 'react';

interface DeleteAddressButtonProps {
    addressId: string;
    action: (formData: FormData) => void | Promise<void>;
}

export default function DeleteAddressButton({
                                                addressId,
                                                action,
                                            }: DeleteAddressButtonProps) {
    const [showConfirm, setShowConfirm] = useState(false);

    return (
        <>
            {/* Delete button */}
            <button
                type="button"
                onClick={() => setShowConfirm(true)}
                className="text-sm font-medium text-red-600 hover:text-red-500"
            >
                Delete
            </button>

            {/* Confirmation popup */}
            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Overlay */}
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setShowConfirm(false)}
                    />

                    {/* Modal */}
                    <div className="relative z-10 w-full max-w-md mx-4 rounded-lg bg-white p-6 shadow-xl">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Delete address?
                        </h2>

                        <p className="mt-2 text-sm text-gray-600">
                            Are you sure you want to delete this address?
                            This action cannot be undone.
                        </p>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowConfirm(false)}
                                className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>

                            <form action={action}>
                                <input
                                    type="hidden"
                                    name="addressId"
                                    value={addressId}
                                />

                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700"
                                >
                                    Delete
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
