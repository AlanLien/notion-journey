import React, { useState, useEffect, useMemo } from 'react';

interface TopBarProps {
    title: string;
    subtitle: string;
    gmtOffset?: string;
}

function normalizeTimezone(gmtOffset: string) {
    const raw = gmtOffset.trim() || '+8';
    const cleaned = raw.replace(/^(GMT|UTC)\s*/i, '');
    const offset = parseFloat(cleaned);
    const labelOffset = raw.startsWith('+') || raw.startsWith('-') ? raw : `+${raw}`;

    return {
        label: /^(GMT|UTC)/i.test(raw) ? raw.toUpperCase().replace(/\s+/g, '') : `GMT${labelOffset}`,
        offset: Number.isFinite(offset) ? offset : 8,
    };
}

export const TopBar: React.FC<TopBarProps> = ({ title, subtitle, gmtOffset = '+8' }) => {
    const [timeStr, setTimeStr] = useState('');
    const timezone = useMemo(() => normalizeTimezone(gmtOffset), [gmtOffset]);

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
            const localDate = new Date(utc + (3600000 * timezone.offset));
            const hours = localDate.getHours().toString().padStart(2, '0');
            const minutes = localDate.getMinutes().toString().padStart(2, '0');

            setTimeStr(`${hours}:${minutes}`);
        };

        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, [timezone.offset]);

    return (
        <div className="absolute top-0 left-0 right-0 z-40 w-full overflow-hidden bg-white/70 backdrop-blur-xl border-b border-white/20 shadow-sm transition-colors duration-300 h-[calc(env(safe-area-inset-top)+78px)] pt-[env(safe-area-inset-top)]">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-purple-50/50 to-pink-50/50 opacity-80" />

            <div className="relative w-full h-full flex items-center justify-center px-4">
                <div className="flex flex-col items-center justify-center text-center">
                    <h1 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h1>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">{subtitle}</p>
                </div>

                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-end opacity-80">
                    <span className="text-[8px] uppercase font-bold text-slate-400 tracking-wider">當地時間</span>
                    <span className="text-sm font-bold text-slate-700 font-mono leading-none">{timeStr}</span>
                    <span className="mt-0.5 text-[9px] font-semibold text-slate-400 font-mono leading-none">{timezone.label}</span>
                </div>
            </div>
        </div>
    );
};
