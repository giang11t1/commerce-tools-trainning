import React, { useMemo } from 'react';
import Button from '@/components/commercetools-ui/atoms/button';
import Image, { ImageProps } from '@/components/commercetools-ui/atoms/image';
import Link from '@/components/commercetools-ui/atoms/link';
import { Reference } from '@/../types/reference';

export interface HeroProps {
  image: ImageProps;
  title: string;
  subtitle: string;
  ctaLabel?: string;
  ctaReference?: Reference;
  isPriority: boolean;
  imageQuality: number;
  src?: string;
}

const Hero: React.FC<HeroProps> = ({ image, title, subtitle, ctaLabel, ctaReference, isPriority, imageQuality, src }) => {
  const cropFocus = useMemo(() => {
    if (image.gravity?.coordinates) {
      const right = Math.ceil((image.gravity?.coordinates.x / (image.media?.width as number)) * 100);
      const top = Math.ceil((image.gravity?.coordinates.y / (image.media?.height as number)) * 100);

      return `right ${right.toString()}% top ${top.toString()}%`;
    }

    if (image.gravity?.mode === 'center') {
      return 'center';
    }

    return 'initial';
  }, [image]);

  return (
    <div className="relative w-full">
      {image && (
        <div className="relative h-196 md:h-[532px] lg:h-[668px]">
          <Image
            {...image}
            alt={title}
            fill
            style={{ objectFit: 'cover', objectPosition: cropFocus }}
            className="brightness-75"
            priority={isPriority}
            fetchPriority={isPriority ? 'high' : 'auto'}
            quality={imageQuality}
            src={src}
          />
        </div>
      )}

        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center">
            <div className="container mx-auto px-8 md:px-12">
                <div className="max-w-xl">
                        <span className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider text-white uppercase bg-blue-600 rounded-full">
                            New Collection 2026
                        </span>
                    <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
                        Elevate Your Style With Our Latest Arrivals
                    </h1>
                    <p className="text-lg text-gray-200 mb-8 max-w-md">
                        Discover the perfect blend of comfort and elegance. Shop the new season&rsquo;s most-wanted pieces.
                    </p>
                    <div className="flex flex-wrap gap-4">
                        <Link
                            href="/categories"
                            className="px-8 py-3 bg-white text-gray-900 font-bold rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
                        >
                            Shop Now
                        </Link>
                        <Link
                            href="/categories"
                            className="px-8 py-3 bg-transparent border-2 border-white text-white font-bold rounded-lg hover:bg-white/10 transition-colors"
                        >
                            Learn More
                        </Link>
                    </div>
                </div>
            </div>
        </div>
      {/*<div className="absolute left-0 top-1/2 w-full -translate-y-1/2 px-48 text-center">*/}
      {/*  <p className="text-center text-14 text-white md:text-18">{subtitle}</p>*/}
      {/*  <h1 className="mt-22 text-center text-26 text-white md:mt-32 md:text-36 lg:text-58">{title}</h1>*/}
      {/*  {ctaLabel && (*/}
      {/*    <Link link={ctaReference}>*/}
      {/*      <Button className="mt-22 md:mt-36 md:px-48 md:py-12 lg:mt-32">*/}
      {/*        <span className="text-12 text-neutral-150 md:text-14 lg:text-16">{ctaLabel}</span>*/}
      {/*      </Button>*/}
      {/*    </Link>*/}
      {/*  )}*/}
      {/*</div>*/}
    </div>
  );
};

export default Hero;
