'use client';

import React from 'react';

interface TripMemoryBannerProps {
    imageSrc?: string;
    className?: string;
}

export const TripMemoryBanner: React.FC<TripMemoryBannerProps> = ({
    imageSrc = '/couple/hero-wide.jpg',
    className = '',
}) => (
    <section className={`mx-4 mb-5 overflow-hidden rounded-3xl bg-[#fffaf4] border border-white/80 shadow-sm ${className}`}>
        <div className="relative h-48 overflow-hidden">
            <img
                src={imageSrc}
                alt="Couple trip memory"
                className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-slate-900/10 to-transparent" />
            <div className="absolute left-4 right-4 bottom-4 text-white">
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/75">
                    Double L for USA
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-tight leading-tight drop-shadow-sm">
                    30歲的30天美國冒險！
                </h2>
            </div>
        </div>
    </section>
);
