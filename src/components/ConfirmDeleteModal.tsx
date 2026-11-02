'use client';

import { useEffect } from 'react';
import Modal from 'react-modal';

interface ConfirmDeleteModalProps {
    isOpen: boolean;
    title?: string;
    message?: string;
    isDeleting?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    name?: string;
}

export default function ConfirmDeleteModal({
                                               isOpen,
                                               title = 'Delete wishlist?',
                                               message = 'Are you sure you want to delete this wishlist?',
                                               isDeleting = false,
                                               onConfirm,
                                               onCancel,
                                               name,
                                           }: ConfirmDeleteModalProps) {
    useEffect(() => {
        Modal.setAppElement('body');
    }, []);

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={isDeleting ? undefined : onCancel}
            shouldCloseOnOverlayClick={!isDeleting}
            shouldCloseOnEsc={!isDeleting}
            contentLabel={title}
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl outline-none"
            overlayClassName="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4"
        >
            <div>
                <h2 className="text-lg font-semibold text-gray-900">
                    {title}
                </h2>

                <p className="mt-2 text-sm text-gray-600">
                    {`Are you sure you want to delete this ${name}?`}
                </p>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isDeleting}
                        className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
