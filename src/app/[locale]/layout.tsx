import './globals.css';
import type { Metadata } from 'next';
import { Lato } from 'next/font/google';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { CartProvider } from '../../context/CartContext';
import { WishlistProvider } from '../../context/WishlistContext';
import BodyClass from './BodyClass';
import { getCart } from '@/lib/cart';
import 'flag-icons/css/flag-icons.min.css';
import {
    NextIntlClientProvider,
} from 'next-intl';
import {
    getLocale,
    getMessages,
} from 'next-intl/server';
import {CompareProvider} from "@/context/CompareContext";

const lato = Lato({
    subsets: ['latin'],
    weight: ['100', '300', '400', '700', '900'],
    variable: '--font-lato',
});

export const metadata: Metadata = {
    title: 'Commercetools Store',
    description: 'Next.js + commercetools',
};

export default async function RootLayout({
                                             children,
                                             params,
                                         }: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
})  {
    const cart = await getCart();

    const { locale } = await params;

    const messages = await getMessages({
        locale,
    });


    return (
        <html lang={locale}>
        <body
            className={`${lato.variable} ${lato.className} min-h-screen bg-[#ededed] flex flex-col`}
        >
        <NextIntlClientProvider
            locale={locale}
            messages={messages}
        >
            <BodyClass />
            <CartProvider initialCart={cart}>
                <CompareProvider>
                    <WishlistProvider>
                        <Header />
                        <main className="container mx-auto flex-grow pt-8 px-4 pb-12">
                            {children}
                        </main>
                        <Footer />
                    </WishlistProvider>
                </CompareProvider>
            </CartProvider>
        </NextIntlClientProvider>
        </body>
        </html>
    );
}
