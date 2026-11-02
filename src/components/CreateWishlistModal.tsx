'use client';

import { useState } from 'react';

interface CreateWishlistModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string) => Promise<void>;
}

export default function CreateWishlistModal({
                                                isOpen,
                                                onClose,
                                                onCreate,
                                            }: CreateWishlistModalProps) {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) {
        return null;
    }

    const handleSubmit = async (
        e: React.FormEvent
    ) => {
        e.preventDefault();

        const wishlistName = name.trim();

        if (!wishlistName) {
            return;
        }

        try {
            setLoading(true);

            await onCreate(wishlistName);

            setName('');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-semibold">
                        Create a wishlist
                    </h2>

                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <label
                        htmlFor="wishlist-name"
                        className="block text-sm font-medium text-gray-700 mb-2"
                    >
                        Wishlist name
                    </label>

                    <input
                        id="wishlist-name"
                        type="text"
                        value={name}
                        onChange={(e) =>
                            setName(e.target.value)
                        }
                        placeholder="e.g. Favorites"
                        autoFocus
                        className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={
                                loading ||
                                !name.trim()
                            }
                            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading
                                ? 'Creating...'
                                : 'Create wishlist'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
