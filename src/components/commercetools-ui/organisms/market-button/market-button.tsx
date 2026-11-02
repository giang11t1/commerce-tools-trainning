import React, {useState} from 'react';
import {XMarkIcon} from '@heroicons/react/24/outline';
import {useTranslations} from 'use-intl';
import Button from '@/components/commercetools-ui/atoms/button';
import Drawer from '@/components/commercetools-ui/atoms/drawer';
import FlagIcons from '@/components/icons/flags';
import {useShipAndLanguage} from '@/../providers/ship-and-language';
import {useLocale} from 'next-intl';
import {usePathname, useRouter} from '../../../../../i18n/navigation';

const locales = [{icon: 'us', code: 'en', label: 'United States',}, {icon: 'de', code: 'de', label: 'Germany',},];
const MarketButton = () => {
    const [showMarket, setShowMarket] = useState(false);
    const {locations, selectedLocation, selectedLanguage, onLocationSelect, onLanguageSelect,} = useShipAndLanguage();
    const translate = useTranslations();
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const selectedLocale = locales.find((item) => item.code === locale);
    const showMarketMenu = () => {
        setShowMarket(true);
    };
    const hideMarketMenu = () => {
        setShowMarket(false);
    };
    const changeLocale = (newLocale: string) => {
        if (newLocale === locale) {
            hideMarketMenu();
            return;
        }

        hideMarketMenu();

        router.replace(pathname, {
            locale: newLocale,
        });
    };

    return (
        <div className="hidden w-fit justify-center lg:flex">
            {selectedLocation && selectedLanguage && (
                <Button variant="ghost" size="fit" onClick={showMarketMenu} className="flex w-fit items-center">
                    <FlagIcons flagName={selectedLocale.icon} className="mr-3 h-16 w-24"/> {selectedLocale.label}
                </Button>
            )}
            <Drawer
            isOpen={showMarket}
            direction="right"
            className="h-screen w-[90%] max-w-108 bg-white"
            onClose={hideMarketMenu}>
            <div className="flex w-full items-center justify-between border-b border-neutral-400 px-4 py-5"><h5
                className="text-xl uppercase text-gray-900"> {translate('common.select-country')} </h5> <Button
                variant="ghost" onClick={hideMarketMenu} title={translate('common.close')} className="p-0!"> <XMarkIcon
                className="w-6 text-gray-600"/> </Button></div>
                <div className="px-3 pt-5 text-14 text-gray-900">
                    <p className="mt-4 mb-6 font-semibold text-gray-700">
                    {translate('common.shop-ship-title')}
                    </p>
                    {locales.map((item) => (
                    <button key={item.code} type="button" onClick={() => changeLocale(item.code)}
                            disabled={locale === item.code}
                            className={`mb-6 flex cursor-pointer items-center gap-2 ${locale === item.code ? 'font-bold text-green-600 underline' : ''}`}>
                        <FlagIcons flagName={item.icon} className="h-4 w-6"/>
                        <span className="text-14 font-normal text-gray-900"> {item.label} </span>
                        {locale === item.code && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24"
                                 stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                            </svg>
                            )}
                    </button>
                ))}
            </div>
        </Drawer>
        </div>
    );
};
export default MarketButton;
