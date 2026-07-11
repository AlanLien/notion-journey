import React from 'react';
import { CalendarDays, BedDouble, CalendarCheck, CheckSquare, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TabType = 'home' | 'stay_transport' | 'tasks' | 'expense' | 'reservations';

interface BottomNavProps {
    currentTab: TabType;
    onTabChange: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange }) => {
    const tabs: { id: TabType; label: string; icon: any }[] = [
        { id: 'home', label: '行程', icon: CalendarDays },
        { id: 'stay_transport', label: '住宿交通', icon: BedDouble },
        { id: 'tasks', label: '任務', icon: CheckSquare },
        { id: 'expense', label: '記帳', icon: Wallet },
        { id: 'reservations', label: '預訂', icon: CalendarCheck },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-[768px] z-50 bg-white/90 backdrop-blur-xl border-t border-slate-200 pb-6 pt-2 px-1">
            <div className="flex justify-between items-end w-full mx-auto">
                {tabs.map((tab) => {
                    const isActive = currentTab === tab.id;
                    const Icon = tab.icon;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={cn(
                                "flex flex-col items-center justify-center flex-1 py-1.5 transition-all duration-200 active:scale-95",
                                isActive ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            <div className={cn(
                                "p-1 rounded-xl transition-all mb-0.5",
                                isActive && "bg-blue-50"
                            )}>
                                <Icon size={isActive ? 20 : 19} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className="text-[9px] font-medium tracking-tight">
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
