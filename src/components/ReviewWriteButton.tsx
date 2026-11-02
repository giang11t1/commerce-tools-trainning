'use client';

import { useState } from 'react';
import ReviewForm from './ReviewForm';

interface Props {
    productId: string;
}

export default function ReviewWriteButton({ productId }: Props) {
    const [showForm, setShowForm] = useState(false);

    return (
        <div className={`mt-2 ${showForm ? 'w-full' : ''}`}>

            {!showForm ? (
                <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="rounded bg-yellow-400 px-6 py-3 text-white disabled:opacity-50 mx-auto block transition-colors hover:bg-yellow-500 cursor-pointer"
                >
                    Write a review
                </button>
            ) : (
                <div>
                    <h3 className="mb-5 text-xl font-semibold text-center">
                        Write a review
                    </h3>
                    <ReviewForm productId={productId} setShowForm={setShowForm}/>
                </div>
            )}
        </div>
    );
}
