'use client';
import React from 'react';
import { useTranslations } from 'use-intl';
import Button from '@/components/commercetools-ui/atoms/button';
import Link from '@/components/commercetools-ui/atoms/link';

const NotFound = () => {
  const translate = useTranslations();

  return (
    <div className="flex w-full h-full flex-col items-center justify-center gap-0 py-20 md:py-30 lg:flex-row-reverse lg:gap-20">
      <div className="relative mx-2 w-38 md:w-50 lg:w-87">
          <img src="https://res.cloudinary.com/dlwdq84ig/image/upload/c_fill,w_1920,h_1624,g_auto/f_auto/q_auto/v1/dgmn0beritdbc6haxm9k?_a=BAVMn6AQ0" alt=""/>
      </div>
      <div className="mx-24 mt-6 text-center md:mx-0 lg:mt-0 lg:text-left">
        <h1 className="text-xl leading-[1.25] text-gray-700 lg:text-4xl">
          {translate('common.page-notFound')}
        </h1>
        <p className="mb-6 mt-3 text-sm leading-[1.5] text-gray-600 md:text-16 lg:mb-7 lg:mt-6">
          {translate('common.page-notFound-desc')}
        </p>
        <Link link="/">
          <Button variant="primary">{translate('common.page-notFound-cta')}</Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
