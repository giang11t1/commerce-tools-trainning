'use client'
import Link from 'next/link';
import { Category } from '@commercetools/platform-sdk';
import Slider from '@/components/commercetools-ui/atoms/slider';
import React, { useMemo } from 'react';
import useMediaQuery from '@/helpers/hooks/useMediaQuery';
import useTouchDevice from '@/helpers/hooks/useTouchDevice';
import { desktop, mediumDesktop, tablet } from '@/helpers/untils/screensizes';
import Tile, { Props as TileProps } from './tile';
import Wrapper from '../components/HOC/wrapper';

interface BestSellerCategoriesProps {
    tiles: Array<TileProps['tile']>;
}

export default function BestSellerCategories({ tiles }: BestSellerCategoriesProps) {
    // For now, we'll just take the first 3 categories as "best sellers"
    // In a real scenario, this could be filtered by a custom attribute or key

    const { isTouchDevice } = useTouchDevice();

    const [isDesktopSize] = useMediaQuery(mediumDesktop);

    const showArrows = useMemo(
        () => !isTouchDevice && !((isDesktopSize && tiles.length <= 4) || (!isDesktopSize && tiles.length <= 2)),
        [isDesktopSize, isTouchDevice, tiles.length],
    );

    return (
        <section className="lg:mb-12 mt-10">

            <Wrapper background="neutral-200" clearDefaultStyles className="px-4 lg:px-10">
                <Slider
                    containerClassName={showArrows ? 'px-12' : ''}
                    slidesPerView={isTouchDevice ? 2.3 : 1.3}
                    dots={false}
                    spaceBetween={8}
                    arrows={true}
                    innerArrows
                    allowTouchMove={!showArrows}
                    slidesOffsetAfter={8}
                    breakpoints={{
                        [tablet]: {
                            spaceBetween: 12,
                            slidesPerView: 2.3,
                            slidesOffsetAfter: 12,
                        },
                        [desktop]: {
                            slidesOffsetAfter: 0,
                        },
                        [mediumDesktop]: {
                            spaceBetween: 16,
                            slidesPerView: 4,
                        },
                    }}
                >
                    {tiles.map((tile, index) => (
                        <Tile key={index} tile={tile} />
                    ))}
                </Slider>
            </Wrapper>

        </section>
    );
}
