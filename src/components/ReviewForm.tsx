'use client';

import React, { FormEvent, useState } from 'react';
import { StarIcon } from '@heroicons/react/24/solid';
import {XMarkIcon} from "@heroicons/react/24/outline";
import Modal from '@/components/commercetools-ui/organisms/modal';

interface ReviewFormProps {
    productId: string;
    setShowForm: (showForm: boolean) => void;
}

export default function ReviewForm({
                                       productId,
                                       setShowForm
                                   }: ReviewFormProps) {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [authorName, setAuthorName] = useState('');
    const [title, setTitle] = useState('');
    const [text, setText] = useState('');

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        setError('');
        setSuccess(false);

        if (!rating) {
            setError('Please select a rating.');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/reviews', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    productId,
                    authorName,
                    title,
                    text,
                    rating,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || 'Unable to submit review'
                );
            }

            setSuccess(true);

            setRating(0);
            setAuthorName('');
            setTitle('');
            setText('');
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : 'Unable to submit review'
            );
        } finally {
            setLoading(false);
        }
    }

    const displayedRating = hoverRating || rating;

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-5 p-6 rounded-lg border bg-white shadow-md"
        >
            <div>
                <label className="mb-2 block font-medium">
                    Your rating
                </label>

                <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((value) => (
                        <button
                            key={value}
                            type="button"
                            aria-label={`Rate ${value} stars`}
                            onMouseEnter={() =>
                                setHoverRating(value)
                            }
                            onMouseLeave={() =>
                                setHoverRating(0)
                            }
                            onClick={() => setRating(value)}
                        >
                            <StarIcon
                                className={
                                    value <= displayedRating
                                        ? 'text-yellow-400'
                                        : 'text-gray-300'
                                }
                                width={28}
                                height={28}
                            />
                        </button>
                    ))}
                </div>
            </div>

            <div className="float-field">
                <input
                    id="review-name"
                    type="text"
                    value={authorName}
                    onChange={(event) =>
                        setAuthorName(event.target.value)
                    }
                    required
                    placeholder=" "
                />
                <label htmlFor="review-name">Name</label>
            </div>

            <div className="float-field">
                <input
                    id="review-title"
                    type="text"
                    value={title}
                    onChange={(event) =>
                        setTitle(event.target.value)
                    }
                    placeholder=" "
                />
                <label htmlFor="review-title">Review title</label>
            </div>

            <div className="float-field">
                <textarea
                    id="review-text"
                    value={text}
                    onChange={(event) =>
                        setText(event.target.value)
                    }
                    required
                    rows={5}
                    placeholder=" "
                />
                <label htmlFor="review-text">Your review</label>
            </div>

            {error && (
                <p className="text-sm text-red-600">
                    {error}
                </p>
            )}

            <Modal
                shouldCloseOnOverlayClick
                preventScroll
                isOpen={success} onRequestClose={() => setShowForm(false)}
                className="w-full max-w-150! rounded-lg bg-white px-6 py-4 shadow-xl outline-none"
            >
                <div className="mx-auto p-6 md:ml-6 lg:ml-0 relative">
                    <div className="flex w-full cursor-pointer justify-end absolute top-4 right-4"  onClick={() => {
                        setSuccess(false);
                        setShowForm(false);
                    }}>
                        <XMarkIcon className="w-6 text-gray-600" />
                    </div>
                    <div className="mt-8 flex h-full flex-col items-center text-center">
                        <h2
                            id="review-success-title"
                            className="mb-4 text-xl font-semibold text-gray-900"
                        >
                            Review submitted
                        </h2>
                        <p className="mb-8 text-sm text-gray-600">
                            Thank you! Your review has been submitted
                            successfully and is waiting for approval.
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                setSuccess(false);
                                setShowForm(false);
                            }}
                            className="rounded bg-yellow-400 px-6 py-3 font-medium text-white transition-colors hover:bg-yellow-500 cursor-pointer"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </Modal>

            <div className="mt-6 flex justify-center gap-4">
                <button type="button"
                        onClick={() => {setShowForm(false)}}
                        className="rounded bg-gray-300 px-6 py-3 disabled:opacity-50 transition-colors hover:bg-gray-400 cursor-pointer">
                    Cancel
                </button>

                <button
                    type="submit"
                    disabled={loading}
                    className="rounded bg-yellow-400 px-6 py-3 text-white disabled:opacity-50 transition-colors hover:bg-yellow-500 cursor-pointer"
                >
                    {loading
                        ? 'Submitting...'
                        : 'Submit review'}
                </button>
            </div>
        </form>
    );
}
