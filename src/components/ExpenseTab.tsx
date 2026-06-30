'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { format, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Plus, X, Wallet, TrendingUp, Receipt, Utensils, ShoppingBag, MapPin, Plane, HelpCircle } from 'lucide-react';
import { useFormState, useFormStatus } from 'react-dom';
import { createExpenseAction } from '@/app/actions';
import { ExpenseItem } from '@/lib/notion';
import { cn } from '@/lib/utils';

const EXPENSE_CATEGORIES = [
    { value: 'restaurant', label: '餐飲', emoji: '🍜', icon: Utensils, color: 'bg-orange-100 text-orange-600' },
    { value: 'shopping', label: '購物', emoji: '🛍️', icon: ShoppingBag, color: 'bg-pink-100 text-pink-600' },
    { value: 'visit', label: '景點', emoji: '📍', icon: MapPin, color: 'bg-emerald-100 text-emerald-600' },
    { value: 'transport', label: '交通', emoji: '✈️', icon: Plane, color: 'bg-blue-100 text-blue-600' },
    { value: 'hotel', label: '住宿', emoji: '🏨', icon: Wallet, color: 'bg-indigo-100 text-indigo-600' },
    { value: 'other', label: '其他', emoji: '📌', icon: HelpCircle, color: 'bg-slate-100 text-slate-600' },
];

function getCategoryInfo(value: string) {
    return EXPENSE_CATEGORIES.find(c => c.value === value) || EXPENSE_CATEGORIES[5];
}

function AddExpenseSubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full py-3.5 rounded-2xl bg-amber-500 text-white font-bold text-base shadow-lg shadow-amber-200 active:scale-95 transition-all disabled:opacity-60"
        >
            {pending ? '記帳中...' : '新增記帳'}
        </button>
    );
}

interface ExpenseTabProps {
    expenses: ExpenseItem[];
    currency: string;
    isAuthenticated: boolean;
}

export const ExpenseTab: React.FC<ExpenseTabProps> = ({ expenses, currency, isAuthenticated }) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [state, formAction] = useFormState(createExpenseAction, null);

    useEffect(() => {
        if (state?.success) setShowAddForm(false);
    }, [state]);

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Group by date (already sorted newest first)
    const grouped = expenses.reduce((acc, item) => {
        const date = item.date.slice(0, 10);
        if (!acc[date]) acc[date] = [];
        acc[date].push(item);
        return acc;
    }, {} as Record<string, ExpenseItem[]>);

    const groupDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    // Category totals
    const categoryTotals = expenses.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
    }, {} as Record<string, number>);

    const topCategories = Object.entries(categoryTotals)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);

    const formatAmount = (n: number) =>
        n.toLocaleString('zh-TW', { maximumFractionDigits: 0 });

    return (
        <div className="pb-32 pt-4 px-4 relative min-h-full">
            {/* Total Card */}
            <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-3xl p-5 mb-5 text-white shadow-lg shadow-amber-200">
                <p className="text-sm font-medium opacity-80 mb-1">旅程總花費</p>
                <p className="text-4xl font-bold tracking-tight">
                    {formatAmount(total)}
                    <span className="text-lg font-medium opacity-70 ml-2">{currency}</span>
                </p>
                {topCategories.length > 0 && (
                    <div className="flex gap-2 mt-4 flex-wrap">
                        {topCategories.map(([cat, amount]) => {
                            const catInfo = getCategoryInfo(cat);
                            return (
                                <div key={cat} className="flex items-center gap-1.5 bg-white/20 rounded-xl px-3 py-1.5">
                                    <span className="text-sm">{catInfo.emoji}</span>
                                    <span className="text-xs font-semibold">{formatAmount(amount)}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Expense List */}
            {expenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
                    <Receipt size={48} className="text-slate-200" strokeWidth={1.5} />
                    <p className="text-sm">還沒有記帳紀錄</p>
                    {isAuthenticated && <p className="text-xs text-slate-300">點右下角 + 新增</p>}
                </div>
            ) : (
                <div className="space-y-6">
                    {groupDates.map(dateStr => {
                        const dayItems = grouped[dateStr];
                        const dayTotal = dayItems.reduce((s, i) => s + i.amount, 0);
                        return (
                            <div key={dateStr}>
                                {/* Date Header */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                        <span className="text-sm font-bold text-slate-600">
                                            {format(parseISO(dateStr), 'MM/dd EEE', { locale: zhTW })}
                                        </span>
                                    </div>
                                    <span className="text-sm font-bold text-amber-600">{formatAmount(dayTotal)} {currency}</span>
                                </div>

                                <div className="space-y-2">
                                    {dayItems.map(item => {
                                        const catInfo = getCategoryInfo(item.category);
                                        return (
                                            <div key={item.id} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5 shadow-sm border border-slate-100">
                                                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-lg", catInfo.color)}>
                                                    {catInfo.emoji}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-slate-800 truncate">{item.title}</p>
                                                    {item.description && (
                                                        <p className="text-xs text-slate-400 truncate">{item.description}</p>
                                                    )}
                                                </div>
                                                <p className="text-base font-bold text-slate-800 shrink-0">
                                                    {formatAmount(item.amount)}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* FAB (auth only) - portal to escape motion.div transform */}
            {isAuthenticated && createPortal(
                <button
                    onClick={() => setShowAddForm(true)}
                    className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-amber-500 text-white shadow-xl shadow-amber-300/60 flex items-center justify-center active:scale-95 transition-all hover:bg-amber-600"
                    aria-label="新增記帳"
                >
                    <Plus size={28} strokeWidth={2.5} />
                </button>,
                document.body
            )}

            {/* Add Expense Modal */}
            {showAddForm && (
                <div
                    className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowAddForm(false); }}
                >
                    <div className="w-full max-w-[768px] bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 rounded-full bg-slate-200" />
                        </div>
                        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                            <h2 className="text-lg font-bold text-slate-800">新增記帳</h2>
                            <button onClick={() => setShowAddForm(false)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
                                <X size={20} />
                            </button>
                        </div>

                        <form action={formAction} className="px-5 py-4 space-y-4 pb-8">
                            {state?.message && (
                                <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{state.message}</p>
                            )}

                            {/* Title */}
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">消費名稱</label>
                                <input
                                    name="title"
                                    type="text"
                                    placeholder="例：午餐拉麵"
                                    required
                                    autoFocus
                                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-base"
                                />
                            </div>

                            {/* Amount */}
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">金額（{currency}）</label>
                                <input
                                    name="amount"
                                    type="number"
                                    inputMode="decimal"
                                    placeholder="0"
                                    min="0"
                                    step="1"
                                    required
                                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-base"
                                />
                            </div>

                            {/* Date */}
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">日期</label>
                                <input
                                    name="date"
                                    type="date"
                                    defaultValue={new Date().toISOString().slice(0, 10)}
                                    required
                                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-base"
                                />
                            </div>

                            {/* Category */}
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">分類</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {EXPENSE_CATEGORIES.map((cat) => (
                                        <label key={cat.value} className="cursor-pointer">
                                            <input type="radio" name="category" value={cat.value} defaultChecked={cat.value === 'restaurant'} className="sr-only peer" />
                                            <div className="peer-checked:bg-amber-50 peer-checked:border-amber-400 peer-checked:text-amber-700 border border-slate-200 rounded-xl px-2 py-2.5 flex flex-col items-center gap-1 text-slate-500 transition-all">
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
                                <input
                                    name="description"
                                    type="text"
                                    placeholder="補充說明..."
                                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-base"
                                />
                            </div>

                            <AddExpenseSubmitButton />
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
