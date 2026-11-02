import type { ReactNode } from 'react';
import { Lato } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import './ui-kit.css';

const lato = Lato({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-lato' });

export default function DevLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${lato.variable} min-h-screen bg-page font-sans text-ink`}>
        <NextIntlClientProvider
          locale="en"
          messages={{ common: { 'caret-down': 'Open options', fieldIsRequired: 'This field is required' } }}
        >
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
