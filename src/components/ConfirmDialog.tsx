'use client';

import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Link from '@/components/commercetools-ui/atoms/link';

interface ConfirmDialogProps {
    isOpen: boolean;
    title?: string;
    message?: string;
    onConfirm: () => void;
    onCancel: () => void;
    loading?: boolean;
    children?: ReactNode;
    cancelLabel?: string;
    confirmLabel?: string;
    confirmHref?: string;
    portal?: boolean;
}

export default function ConfirmDialog({
                                          isOpen,
                                          title = 'Remove item?',
                                          message = 'Are you sure you want to remove this item from your cart?',
                                          onConfirm,
                                          onCancel,
                                          loading = false,
                                          children,
                                          cancelLabel = 'Cancel',
                                          confirmLabel = 'Remove',
                                          confirmHref,
                                          portal = false,
                                      }: ConfirmDialogProps) {
    if (!isOpen) return null;

    const dialog = (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center h-screen"
            role="dialog"
            aria-modal="true"
        >
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onCancel}
            />

            {/* Dialog */}
            <div className="relative w-full max-w-md mx-4 rounded-lg bg-white shadow-xl">
                <div className="p-6">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {title}
                    </h2>

                    {message && (
                        <p className="mt-2 text-sm text-gray-600">
                            {message}
                        </p>
                    )}
                    {children}
                </div>

                <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>

                    {confirmHref ? (
                        <Link
                            link={confirmHref}
                            onClick={onConfirm}
                            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            {confirmLabel}
                        </Link>
                    ) : (
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={loading}
                            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading ? 'Removing...' : confirmLabel}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    return portal ? createPortal(dialog, document.body) : dialog;
}
