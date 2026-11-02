'use client';

import { useState } from 'react';

export default function BrandLogo({ name, logoUrl, className = '' }: { name: string; logoUrl?: string; className?: string }) {
    const [failed, setFailed] = useState(false);
    if (!logoUrl || failed) {
        return <span aria-hidden="true" className={`flex items-center justify-center bg-gray-50 font-semibold text-gray-400 ${className}`}>{name.slice(0, 1).toUpperCase()}</span>;
    }

    // Brand logos may be hosted on merchant-managed domains not listed in next.config.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt={`${name} logo`} loading="lazy" onError={() => setFailed(true)} className={`object-contain transition-transform duration-300 group-hover:scale-105 ${className}`} />;
}
