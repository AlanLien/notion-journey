'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, ChevronDown } from 'lucide-react';
import { useFormState, useFormStatus } from 'react-dom';
import { createJourneyAction } from '@/app/actions';
import { cn } from '@/lib/utils';

const CATEGORIES = [
    { value: '🦬 visit', label: '景點', emoji: '🦬' },
    { value: '🍕 restaurant', label: '餐廳', emoji: '🍕' },
    { value: '🛒 shopping', label: '購物', emoji: '🛒' },
    { value: '🏠 hotel', label: '住宿', emoji: '🏠' },
    { value: '🚗 transport', label: '交通', emoji: '🚗' },
    { value: '📌 other', label: '其他', emoji: '📌' },
];

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full py-3.5 rounded-2xl bg-blue-600 text-white font-bold text-base shadow-lg shadow-blue-200 active:scale-95 transition-all disabled:opacity-60"
        >
            {pending ? '新增中...' : '新增行程'}
        </button>
    );
}

interface AddJourneyModalProps {
    defaultDate?: string; // YYYY-MM-DD
}

export const AddJourneyModal: React.FC<AddJourneyModalProps> = ({ defaultDate }) => {
    const [open, setOpen] = useState(false);
    const [state, formAction] = useFormState(createJourneyAction, null);

    // Default datetime = today 09:00 or provided date
    const today = defaultDate || new Date().toISOString().slice(0, 10);
    const defaultDatetime = `${today}T09:00`;

    useEffect(() => {
        if (state?.success) {
            setOpen(false);
        }
    }, [state]);

    return (
        <>
            {/* FAB */}
            <button
                onClick={() => setOpen(true)}
                className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-blue-600 text-white shadow-xl shadow-blue-300/60 flex items-center justify-center active:scale-95 transition-all hover:bg-blue-700"
                aria-label="新增行程"
            >
                <Plus size={28} strokeWidth={2.5} />
            </button>

            {/* Backdrop */}
            {open && (
                <div
                    className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center"
                    onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
                >
                    {/* Sheet */}
                    <div className="w-full max-w-[768px] bg-white rounded-t-3xl shadow-2xl animate-slide-up">
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 rounded-full bg-slate-200" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                            <h2 className="text-lg font-bold text-slate-800">新增行程</h2>
                            <button onClick={() => setOpen(false)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Form */}
                        <form action={formAction} className="px-5 py-4 space-y-4 pb-8">
                            {state?.message && (
                                <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{state.message}</p>
                            )}

                            {/* Title */}
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">行程名稱</label>
                                <input
                                    name="title"
                                    type="text"
                                    placeholder="例：新宿御苑"
                                    required
                                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-base"
                                />
                            </div>

                            {/* Date */}
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">日期與時間</label>
                                <input
                                    name="date"
                                    type="datetime-local"
                                    defaultValue={defaultDatetime}
                                    required
                                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-base"
                                />
                            </div>

                            {/* Category */}
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">類別</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {CATEGORIES.map((cat) => (
                                        <label key={cat.value} className="cursor-pointer">
                                            <input type="radio" name="category" value={cat.value} defaultChecked={cat.value === '🦬 visit'} className="sr-only peer" />
                                            <div className="peer-checked:bg-blue-50 peer-checked:border-blue-400 peer-checked:text-blue-700 border border-slate-200 rounded-xl px-2 py-2.5 flex flex-col items-center gap-1 text-slate-500 transition-all">
                                                <span className="text-xl">{cat.emoji}</span>
                                                <span className="text-xs font-medium">{cat.label}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">備註 <span className="font-normal text-slate-400">（選填）</span></label>
                                <textarea
                                    name="description"
                                    placeholder="行程說明..."
                                    rows={2}
                                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-base resize-none"
                                />
                            </div>

                            {/* Maps URL */}
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">地圖連結 <span className="font-normal text-slate-400">（選填）</span></label>
                                <input
                                    name="mapsUrl"
                                    type="url"
                                    placeholder="https://maps.google.com/..."
                                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-base"
                                />
                            </div>

                            <SubmitButton />
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};
