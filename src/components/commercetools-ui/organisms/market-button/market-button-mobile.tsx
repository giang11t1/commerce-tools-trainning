import React, { FC, useCallback, useMemo } from 'react';
import { MenuItem } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'use-intl';
import Button from '@/components/commercetools-ui/atoms/button';
import Dropdown from '@/components/commercetools-ui/atoms/dropdown';
import FlagIcons from '@/components/icons/flags';
import useClassNames from '@/helpers/hooks/useClassNames';
import {useLocale} from "next-intl";
import {usePathname, useRouter} from "../../../../../i18n/navigation";

export interface Props {
  menuTop?: boolean;
}
const MarketButtonMobile: FC<Props> = ({ menuTop }) => {
  const translate = useTranslations();
    const pathname = usePathname();

    const locales = [
        {
            icon: 'us',
            code: 'en',
            label: 'United States',
        },
        {
            icon: 'de',
            code: 'de',
            label: 'Germany',
        },
    ];


    const locale = useLocale();
    const router = useRouter();

    const selectedLocale = locales.find((item) => item.code === locale);
    const changeLocale = (newLocale: string) => {
        if (newLocale === locale) {
            return;
        }

        router.replace(pathname, {
            locale: newLocale,
        });
    };

  const marketButtonClassNames = useCallback(
    (open?: boolean) => {
      return `flex h-12 w-full items-center justify-between border ${
        open
          ? `rounded-t-sm border-x-neutral-500 ${
              menuTop ? 'border-b-neutral-500 border-t-neutral-400' : 'border-t-neutral-500 border-b-neutral-400'
            }`
          : 'rounded-sm border-neutral-500'
      } bg-white px-4 py-4 active:border-gray-500 focus:border-gray-500 focus:shadow-md`;
    },
    [menuTop],
  );

  const marketMenuWrapperClassNames = useClassNames([menuTop ? 'bottom-10' : 'top-10', 'absolute left-0 w-full']);

  const marketMenuClassNames = useCallback(
    (open?: boolean) => {
      return `max-h-300 overflow-scroll rounded-b-sm border ${
        open
          ? `border-x-neutral-500 ${menuTop ? 'border-t-neutral-500' : 'border-b-neutral-500'}`
          : 'border-neutral-400'
      } bg-white`;
    },
    [menuTop],
  );

  const marketButtonElement = useMemo(() => {
    return (
      <div className="flex w-full cursor-pointer justify-between">
        <div className="flex w-fit items-center justify-start">
            <FlagIcons
                flagName={selectedLocale?.icon}
                className="mr-3 h-16 w-24"
            />

            {selectedLocale?.label}
        </div>
        <div className="flex justify-end">
          <ChevronDownIcon strokeWidth={2} className="w-4 text-gray-600" />
        </div>
      </div>
    );
  }, [selectedLocale]);

  return (
    <>
      {locales && locales.length !== 0 && (
        <>
          <p className="pb-2 text-14 font-semibold text-gray-700">{translate('common.shop-ship-title')}</p>
          <Dropdown
            customButtonElement={marketButtonElement}
            customMenuWrapperClassNames={marketMenuWrapperClassNames}
            customButtonClassNames={marketButtonClassNames}
            customMenuClassNames={marketMenuClassNames}
          >
            {locales.map((item) => (
              <MenuItem key={item.label}>
                <div className="overflow-y-scroll hover:bg-neutral-200 active:bg-neutral-200">
                  <Button
                    variant="ghost"
                    size="full"
                    onClick={() => changeLocale(item.code)}
                    className={`flex items-center gap-2 px-4 cursor-pointer  ${locale === item.code ? 'font-bold underline text-green-600' : ''}`}
                  >
                    <div className="flex w-fit items-center justify-start">
                        <FlagIcons flagName={item.icon} className=" h-4 w-6 mr-4" />
                        <span className="text-14 font-normal text-gray-900 ">
                            {item.label}
                        </span>
                        {locale === item.code && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24"
                                 stroke="currentColor" data-alpine-devtools-right-click="">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                        )}

                    </div>
                  </Button>
                </div>
              </MenuItem>
            ))}
          </Dropdown>
        </>
      )}
    </>
  );
};

export default MarketButtonMobile;
