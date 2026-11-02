import React, { FC } from 'react';
import { useLocale } from 'use-intl';
// import Image, { ImageProps } from 'components/commercetools-ui/atoms/image';
import Link from '@/components/commercetools-ui/atoms/link';
import useImageSizes from '@/helpers/hooks/useImageSizes';
import { Reference } from '@/../types/reference';

export interface Props {
  logo: string;
  logoLink: Reference;
  imageClassName?: string;
  onClick?: () => void;
}

const HeaderLogo: FC<Props> = ({ logoLink, logo, imageClassName, onClick }) => {
  const logoImageSizes = useImageSizes({ sm: 1, md: 0.5, lg: 0.15, defaultSize: 0.15 });
  // const locale = useLocale();
  // const availableLocales = logo?.title ? Object.keys(logo.title) : [];
  //
  // const matchingLocale = availableLocales.find((key) => key.startsWith(locale));

  return (
    <div className="relative  md:mt-0" onClick={onClick}>
      <Link className={imageClassName} link={logoLink}>
        <h2 className="whitespace-nowrap text-blue-600 font-bold">{logo}</h2>
      </Link>
    </div>
  );
};

export default HeaderLogo;
