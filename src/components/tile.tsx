import React from 'react';
import Image, { ImageProps } from '@/components/commercetools-ui/atoms/image';
import useImageSizes from '@/helpers/hooks/useImageSizes';
import { Reference } from '@/../types/reference';
import Link from '@/components/commercetools-ui/atoms/link';

export interface Props {
  tile: {
    title: string;
    image: string;
    target?: Reference;
  };
}

const Tile: React.FC<Props> = ({ tile }) => {
  return (
    <Link link={`/categories/${tile.slug}`} className="block shrink-0 grow basis-0">
      <div className="relative" style={{ paddingBottom: '122%' }}>
          <Image
              alt={tile.title}
              fill
              style={{ objectFit: 'cover' }}
              className="brightness-75"
              fetchPriority={'high'}
              quality={100}
              src={tile.image}
              />
      </div>
      <h2 className="mt-5 block overflow-hidden truncate rounded-b-sm border-neutral-300 py-5 text-center text-14 text-primary md:text-16 lg:mt-0 lg:border lg:bg-white lg:py-10 text-xl font-semibold uppercase">
        {tile.title}
      </h2>
    </Link>
  );
};

export default Tile;
