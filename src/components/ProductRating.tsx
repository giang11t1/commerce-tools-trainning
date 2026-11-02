'use client';

import { StarIcon } from '@heroicons/react/24/solid';

interface ProductRatingProps {
    rating: number;
    reviewCount?: number;
    size?: number;
    showCount?: boolean;
}

export default function ProductRating({
                                          rating,
                                          reviewCount,
                                          size = 18,
                                          showCount = true,
                                      }: ProductRatingProps) {
    return (
        <div className="flex items-center gap-2">
            <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => {
                    const fillPercentage = Math.min(
                        Math.max(rating - star + 1, 0),
                        1
                    ) * 100;

                    return (
                        <div
                            key={star}
                            className="relative"
                            style={{
                                width: size,
                                height: size,
                            }}
                        >
                            {/* Empty star */}
                            <StarIcon
                                className="absolute inset-0 text-gray-300"
                                style={{
                                    width: size,
                                    height: size,
                                }}
                            />

                            {/* Filled star */}
                            <div
                                className="absolute inset-0 overflow-hidden"
                                style={{
                                    width: `${fillPercentage}%`,
                                }}
                            >
                                <StarIcon
                                    className="text-yellow-400"
                                    style={{
                                        width: size,
                                        height: size,
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {showCount && reviewCount !== undefined && (
                <span className="text-sm text-gray-600">
              ({reviewCount})
            </span>
            )}
        </div>
    );
}
