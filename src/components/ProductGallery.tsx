'use client';

import {useEffect, useRef, useState} from 'react';
import { Image } from '@commercetools/platform-sdk';
import { Splide, SplideSlide } from '@splidejs/react-splide';
import '@splidejs/react-splide/css';
import type { Splide as SplideInstance } from '@splidejs/splide';
import { Maximize2, X } from 'lucide-react';

export interface ProductGalleryProps {
    images: Image[];
    productName: string;
    salePercent?: number;
}

export default function ProductGallery({ images, productName, salePercent }: ProductGalleryProps) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const mainRef = useRef<SplideInstance | null>(null);
    const thumbnailRef = useRef<SplideInstance | null>(null);

    useEffect(() => {
        if (mainRef.current && thumbnailRef.current) {
            mainRef.current.sync(thumbnailRef.current);
        }
    }, []);


    if (!images || images.length === 0) {
        return (
            <div className="w-full h-[600px] bg-gray-100 flex items-center justify-center rounded-lg text-gray-400">
                No image available
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 md:col-span-7 lg:col-span-8 md:pr-26 lg:pr-15">
            <div className="relative w-full h-[500px] bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                {salePercent > 0 && (
                    <span className="sale-badge absolute top-2 right-2 z-9 bg-red-500 text-xs text-white px-2 py-1 rounded font-semibold">
                                -{salePercent}%
                            </span>
                )}
                <Splide
                    ref={(splide) => {
                        mainRef.current = splide?.splide ?? null;
                    }}
                    options={{
                        type: 'slide',
                        rewind: true,
                        pagination: false,
                        arrows: images.length > 1,
                    }}
                >
                    {images.map((image, index) => (
                        <SplideSlide key={`${image.url}-${index}`}>
                            <div className="w-full h-[500px] flex items-center justify-center">
                                <img
                                    src={image.url}
                                    alt={`${productName} ${index + 1}`}
                                    className="max-w-full max-h-full object-contain"
                                />
                            </div>
                        </SplideSlide>
                    ))}
                </Splide>
                {/* Zoom button */}
                <button
                    type="button"
                    onClick={() => setIsFullscreen(true)}
                    className="absolute right-4 bottom-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md hover:bg-white transition"
                    aria-label="Zoom image"
                >
                    <Maximize2 className="h-5 w-5" />
                </button>
            </div>

            {images.length > 1 && (
                <div className="w-full">
                    <Splide
                        ref={(splide) => {
                            thumbnailRef.current = splide?.splide ?? null;
                        }}
                        options={{
                            rewind: true,
                            fixedWidth: 100,
                            fixedHeight: 100,
                            gap: '1rem',
                            pagination: false,
                            arrows: images.length > 4,
                            isNavigation: true,
                            breakpoints: {
                                640: {
                                    fixedWidth: 80,
                                    fixedHeight: 80,
                                },
                            },
                        }}
                        aria-label="Product thumbnails"
                    >
                        {images.map((image, index) => (
                            <SplideSlide key={`${image.url}-${index}`}>
                                <button
                                    type="button"
                                    className="w-full h-full rounded-md overflow-hidden border border-gray-300"
                                >
                                    <img
                                        src={image.url}
                                        alt={`${productName} thumbnail ${index + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                </button>
                            </SplideSlide>
                        ))}
                    </Splide>
                </div>
            )}



            {isFullscreen && (
                <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center">
                    {/* Close */}
                    <button
                        type="button"
                        onClick={() => setIsFullscreen(false)}
                        className="absolute right-5 top-5 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                        aria-label="Close fullscreen"
                    >
                        <X className="h-6 w-6" />
                    </button>

                    {/* Fullscreen slider */}
                    <div className="w-full h-full px-12 py-16 flex items-center justify-center">
                        <Splide
                            options={{
                                type: 'slide',
                                rewind: true,
                                pagination: true,
                                arrows: images.length > 1,
                                height: '100%',
                            }}
                            aria-label="Fullscreen product images"
                        >
                            {images.map((image, index) => (
                                <SplideSlide key={`${image.url}-${index}`}>
                                    <div className="w-full h-full flex items-center justify-center">
                                        <img
                                            src={image.url}
                                            alt={`${productName} ${index + 1}`}
                                            className="max-w-[900px] max-h-[900px] object-contain"
                                        />
                                    </div>
                                </SplideSlide>
                            ))}
                        </Splide>
                    </div>
                </div>
            )}
        </div>
    );
}
