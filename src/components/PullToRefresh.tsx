"use client";

import React, { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
    children: React.ReactNode;
    onRefresh?: () => Promise<void>;
    className?: string;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ children, onRefresh, className }) => {
    const router = useRouter();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const [startY, setStartY] = useState(0);

    // Threshold to trigger refresh
    const REFRESH_THRESHOLD = 80;
    const MAX_PULL = 150;

    const onTouchStart = (e: React.TouchEvent) => {
        if (scrollRef.current && scrollRef.current.scrollTop === 0) {
            setStartY(e.touches[0].clientY);
        }
    };

    const onTouchMove = (e: React.TouchEvent) => {
        if (!startY || isRefreshing) return;

        const currentY = e.touches[0].clientY;
        const diff = currentY - startY;

        // Give some resistance
        if (scrollRef.current && scrollRef.current.scrollTop <= 0 && diff > 0) {
            // Prevent default? Maybe not, rely on CSS overscroll-behavior if possible,
            // but we want custom UI. 
            // Note: Preventing default on passive listener is hard.

            // Logarithmic resistance
            const damped = Math.min(diff * 0.5, MAX_PULL);
            setPullDistance(damped);
        } else {
            setPullDistance(0);
        }
    };

    const onTouchEnd = async () => {
        if (isRefreshing) return;

        if (pullDistance > REFRESH_THRESHOLD) {
            setIsRefreshing(true);
            setPullDistance(REFRESH_THRESHOLD); // Stay at threshold

            try {
                if (onRefresh) {
                    await onRefresh();
                } else {
                    router.refresh();
                    // Artificial delay for UX
                    await new Promise(r => setTimeout(r, 1000));
                }
            } finally {
                setIsRefreshing(false);
                setPullDistance(0);
                setStartY(0);
            }
        } else {
            setPullDistance(0);
            setStartY(0);
        }
    };

    return (
        <div className={cn("relative h-full flex flex-col overflow-hidden", className)}>
            {/* Loading Indicator */}
            <div
                className="absolute w-full flex justify-center pointer-events-none z-10"
                style={{
                    top: isRefreshing ? '20px' : '-40px',
                    transform: isRefreshing ? 'none' : `translateY(${pullDistance}px)`,
                    opacity: isRefreshing ? 1 : Math.min(pullDistance / REFRESH_THRESHOLD, 1),
                    transition: isRefreshing ? 'top 0.3s' : 'none'
                }}
            >
                <div className="bg-white/80 backdrop-blur rounded-full p-2 shadow-sm border border-slate-100">
                    <Loader2 className={cn("text-blue-600", isRefreshing && "animate-spin")} size={24} />
                </div>
            </div>

            {/* Scroll Container */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto overscroll-contain"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                style={{
                    transform: isRefreshing ? `translateY(${REFRESH_THRESHOLD}px)` : `translateY(${pullDistance}px)`,
                    transition: isRefreshing ? 'transform 0.3s' : 'transform 0.1s ease-out'
                }}
            >
                {children}
            </div>
        </div>
    );
};
