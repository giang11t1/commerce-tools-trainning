import React, { FC } from 'react';
import Image from 'next/image';
import { Tile } from '@/components/types';
import useClassNames from '@/helpers/hooks/useClassNames';
// import Link from "next/link";
import Link from '@/components/commercetools-ui/atoms/link';

export interface Props {
  tileContent: Tile;
}

const HeaderDropdownTile: FC<Props> = ({ tileContent }) => {

  const tileHeaderTextClassName = useClassNames([
    'text-white drop-shadow-xl pb-15 text-center text-28',
    tileContent?.tileHeaderDecoration,
  ]);
  const tileButtonClassName = useClassNames(['border-b-2 drop-shadow-xl', tileContent?.tileButtonLabelDecoration]);

  return (
    <div className="relative mt-2 h-125 w-[30%] ">
      <img
         src={tileContent?.tileImage.media?.url || ''}
        style={{ objectFit: 'cover' }}
        className="brightness-75"
        alt={tileContent?.tileImage.title ?? ''}
      />
      <div className="absolute left-1/2 top-[42%] h-35 w-full -translate-x-1/2 -translate-y-1/2">
        <h3 className={tileHeaderTextClassName}>{tileContent?.tileHeaderText}</h3>
        <div className="flex justify-center">
          <Link variant="primary" link={tileContent?.tileButtonLink} className={tileButtonClassName}>
            <p className="text-22 text-white">{tileContent?.tileButtonLabel}</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HeaderDropdownTile;
