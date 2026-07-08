'use client';

import React, { useActionState, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { format, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Plus, X, Receipt, Utensils, ShoppingBag, MapPin, Plane, HelpCircle, Wallet, ArrowLeftRight, Loader2, ChevronDown } from 'lucide-react';
import { useFormStatus } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { createExpenseAction } from '@/app/actions';
import { ExpenseItem } from '@/lib/notion';
import { cn } from '@/lib/utils';
import { TripMemoryBanner } from './TripMemoryBanner';

const EXPENSE_CATEGORIES = [
    { value: 'restaurant', label: '餐飲', emoji: '🍜', color: 'bg-orange-100 text-orange-600' },
    { value: 'shopping', label: '購物', emoji: '🛍️', color: 'bg-pink-100 text-pink-600' },
    { value: 'visit', label: '景點', emoji: '📍', color: 'bg-emerald-100 text-emerald-600' },
    { value: 'transport', label: '交通', emoji: '✈️', color: 'bg-blue-100 text-blue-600' },
    { value: 'hotel', label: '住宿', emoji: '🏨', color: 'bg-indigo-100 text-indigo-600' },
    { value: 'other', label: '其他', emoji: '📌', color: 'bg-slate-100 text-slate-600' },
];

function getCategoryInfo(value: string) {
    return EXPENSE_CATEGORIES.find(c => c.value === value) || EXPENSE_CATEGORIES[5];
}

function getPayerBadge(payer: string) {
    const trimmed = payer.trim() || '未指定';
    if (trimmed === '未指定') return '未';
    const firstLatin = trimmed.match(/[A-Za-z]/)?.[0];
    return firstLatin?.toUpperCase() || trimmed[0];
}

// ─── Sub-components defined OUTSIDE to avoid remount on every render ───────────

function AddExpenseSubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button type="submit" disabled={pending}
            className="w-full py-3.5 rounded-2xl bg-amber-500 text-white font-bold text-base shadow-lg shadow-amber-200 active:scale-95 transition-all disabled:opacity-60">
            {pending ? '記帳中...' : '新增記帳'}
        </button>
    );
}

interface CurrencyToggleProps {
    displayCurrency: string;
    foreignCurrency: string;
    rateLoading: boolean;
    onToggle: () => void;
}

function CurrencyToggle({ displayCurrency, foreignCurrency, rateLoading, onToggle }: CurrencyToggleProps) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className="flex items-center gap-1.5 bg-white/25 hover:bg-white/35 rounded-xl px-3 py-1.5 transition-all active:scale-95"
        >
            {rateLoading
                ? <Loader2 size={12} className="animate-spin" />
                : <ArrowLeftRight size={12} />
            }
            <span className="text-xs font-bold">
                {displayCurrency === 'TWD' ? `切換 ${foreignCurrency}` : '切換 TWD'}
            </span>
        </button>
    );
}

interface AddExpenseModalProps {
    open: boolean;
    onClose: () => void;
    formAction: (payload: FormData) => void;
    errorMessage?: string | null;
    foreignCurrency: string;
    twdRate: number | null;
    formCurrency: string;
    onFormCurrencyChange: (c: string) => void;
}

function AddExpenseModal({
    open, onClose, formAction, errorMessage, foreignCurrency, twdRate, formCurrency, onFormCurrencyChange
}: AddExpenseModalProps) {
    if (!open) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="w-full max-w-[768px] bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-slate-200" />
                </div>
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800">新增記帳</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form action={formAction} className="px-5 py-4 space-y-4 pb-8">
                    {errorMessage && (
                        <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{errorMessage}</p>
                    )}

                    {/* Currency Selector */}
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">支付幣別</label>
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
                            {[foreignCurrency, 'TWD'].map(cur => (
                                <button
                                    key={cur}
                                    type="button"
                                    onClick={() => onFormCurrencyChange(cur)}
                                    className={cn(
                                        "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all",
                                        formCurrency === cur
                                            ? "bg-white text-amber-600 shadow-sm"
                                            : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    {cur === 'TWD' ? '🇹🇼 TWD' : `💱 ${cur}`}
                                </button>
                            ))}
                        </div>
                        <input type="hidden" name="currency" value={formCurrency} />
                    </div>

                    {/* Title */}
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">消費名稱</label>
                        <input name="title" type="text" placeholder="例：午餐" required autoFocus
                            className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-base" />
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                            金額（{formCurrency}）
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                                {formCurrency === 'TWD' ? 'NT$' : formCurrency}
                            </span>
                            <input name="amount" type="number" inputMode="decimal" placeholder="0" min="0" step="any" required
                                className="w-full pl-14 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-base" />
                        </div>
                        {twdRate && (
                            <p className="text-xs text-slate-400 mt-1.5 ml-1">
                                {formCurrency !== 'TWD'
                                    ? `1 ${foreignCurrency} ≈ ${(1 / twdRate).toFixed(2)} TWD`
                                    : `1 TWD ≈ ${twdRate.toFixed(4)} ${foreignCurrency}`
                                }
                            </p>
                        )}
                    </div>

                    {/* Date */}
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">日期</label>
                        <input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required
                            className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-base" />
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
                        <input name="description" type="text" placeholder="補充說明..."
                            className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-base" />
                    </div>

                    <AddExpenseSubmitButton />
                </form>
            </div>
        </div>,
        document.body
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface ExpenseTabProps {
    expenses: ExpenseItem[];
    currency: string;
    isAuthenticated: boolean;
}

export const ExpenseTab: React.FC<ExpenseTabProps> = ({ expenses, currency: foreignCurrency, isAuthenticated }) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [state, formAction] = useActionState(createExpenseAction, null);
    const [displayCurrency, setDisplayCurrency] = useState<string>(foreignCurrency);
    const [twdRate, setTwdRate] = useState<number | null>(null);
    const [rateLoading, setRateLoading] = useState(false);
    const [formCurrency, setFormCurrency] = useState<string>(foreignCurrency);
    const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

    const toggleDay = (dateStr: string) => {
        setExpandedDays(prev => ({
            ...prev,
            [dateStr]: !prev[dateStr]
        }));
    };

    useEffect(() => {
        if (state?.success) setShowAddForm(false);
    }, [state]);

    useEffect(() => {
        if (!foreignCurrency || foreignCurrency.length !== 3) return;
        setRateLoading(true);
        fetch(`https://open.er-api.com/v6/latest/TWD`)
            .then(r => r.json())
            .then(data => {
                const rate = data.rates?.[foreignCurrency.toUpperCase()];
                if (rate) setTwdRate(rate);
            })
            .catch(console.error)
            .finally(() => setRateLoading(false));
    }, [foreignCurrency]);

    const handleToggleCurrency = () => {
        setDisplayCurrency(prev => prev === 'TWD' ? foreignCurrency : 'TWD');
    };

    const convert = (amount: number, itemCurrency: string): number => {
        if (itemCurrency === displayCurrency) return amount;
        if (!twdRate) return amount;
        if (displayCurrency === 'TWD') return amount / twdRate;
        return amount * twdRate;
    };

    const fmtAmt = (n: number) => {
        if (displayCurrency === 'TWD') {
            return n.toLocaleString('zh-TW', { maximumFractionDigits: 0 });
        }
        return n.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    };

    const total = expenses.reduce((sum, e) => sum + convert(e.amount, e.currency), 0);

    const grouped = expenses.reduce((acc, item) => {
        const date = item.date.slice(0, 10);
        if (!acc[date]) acc[date] = [];
        acc[date].push(item);
        return acc;
    }, {} as Record<string, ExpenseItem[]>);
    const groupDates = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

    const payerTotals = expenses.reduce((acc, e) => {
        const payer = e.payer || '未指定';
        acc[payer] = (acc[payer] || 0) + convert(e.amount, e.currency);
        return acc;
    }, {} as Record<string, number>);
    const payerRows = Object.entries(payerTotals).sort(([, a], [, b]) => b - a);

    const categoryTotals = expenses.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + convert(e.amount, e.currency);
        return acc;
    }, {} as Record<string, number>);
    const categoryRows = Object.entries(categoryTotals).sort(([, a], [, b]) => b - a);

    return (
        <div className="pb-32 pt-4 px-4 relative min-h-full">
            <TripMemoryBanner imageSrc="/couple/walk-square.jpg" className="mx-0" />

            {/* Total Card */}
            <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-3xl p-5 mb-5 text-white shadow-lg shadow-amber-200">
                <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium opacity-80">旅程總花費</p>
                    <CurrencyToggle
                        displayCurrency={displayCurrency}
                        foreignCurrency={foreignCurrency}
                        rateLoading={rateLoading}
                        onToggle={handleToggleCurrency}
                    />
                </div>
                <p className="text-4xl font-bold tracking-tight">
                    {fmtAmt(total)}
                    <span className="text-lg font-medium opacity-70 ml-2">{displayCurrency}</span>
                </p>
                {twdRate && (
                    <p className="text-xs opacity-50 mt-1">
                        1 {foreignCurrency} ≈ {(1 / twdRate).toFixed(2)} TWD
                    </p>
                )}
            </div>

            {payerRows.length > 0 && (
                <div className="bg-white/80 border border-slate-100 rounded-3xl p-5 mb-5 shadow-sm shadow-slate-200/70">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-bold text-slate-700">付款人小計</h3>
                        <span className="text-sm font-bold text-slate-400">{displayCurrency}</span>
                    </div>
                    <div className="space-y-4">
                        {payerRows.map(([payer, amount]) => (
                            <div key={payer} className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 text-sm font-black">
                                        {getPayerBadge(payer)}
                                    </div>
                                    <span className="text-base font-bold text-slate-700 truncate">{payer}</span>
                                </div>
                                <span className="text-lg font-black text-slate-900 tabular-nums">{fmtAmt(amount)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {categoryRows.length > 0 && (
                <div className="bg-white/80 border border-slate-100 rounded-3xl p-5 mb-5 shadow-sm shadow-slate-200/70">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-bold text-slate-700">類別小計</h3>
                        <span className="text-sm font-bold text-slate-400">{displayCurrency}</span>
                    </div>
                    <div className="space-y-4">
                        {categoryRows.map(([cat, amount]) => {
                            const catInfo = getCategoryInfo(cat);
                            return (
                                <div key={cat} className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-lg", catInfo.color)}>
                                            {catInfo.emoji}
                                        </div>
                                        <span className="text-base font-bold text-slate-700 truncate">{catInfo.label}</span>
                                    </div>
                                    <span className="text-lg font-black text-slate-900 tabular-nums">{fmtAmt(amount)}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Expense List */}
            {expenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
                    <Receipt size={48} className="text-slate-200" strokeWidth={1.5} />
                    <p className="text-sm">還沒有記帳紀錄</p>
                    {isAuthenticated && <p className="text-xs text-slate-300">點右下角 + 新增</p>}
                </div>
            ) : (
                <div className="space-y-4">
                    {groupDates.map(dateStr => {
                        const dayItems = grouped[dateStr];
                        const dayTotal = dayItems.reduce((s, i) => s + convert(i.amount, i.currency), 0);
                        const isExpanded = !!expandedDays[dateStr];
                        return (
                            <div
                                key={dateStr}
                                className={cn(
                                    "rounded-2xl transition-all duration-300 overflow-hidden border shadow-sm",
                                    isExpanded ? "bg-white/60 border-amber-100 shadow-md" : "bg-white/40 border-white/60 hover:bg-white/60"
                                )}
                            >
                                <button
                                    onClick={() => toggleDay(dateStr)}
                                    className="w-full p-4 flex items-center justify-between text-left focus:outline-none"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={cn(
                                            "w-1.5 h-1.5 rounded-full transition-colors",
                                            isExpanded ? "bg-amber-500" : "bg-slate-400"
                                        )} />
                                        <span className="text-sm font-bold text-slate-600">
                                            {format(parseISO(dateStr), 'MM/dd EEE', { locale: zhTW })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-sm font-bold text-amber-600">
                                            {fmtAmt(dayTotal)} {displayCurrency}
                                        </span>
                                        <div className={cn(
                                            "p-0.5 rounded-full transition-transform duration-300 text-slate-400",
                                            isExpanded ? "bg-amber-50 text-amber-500 rotate-180" : ""
                                        )}>
                                            <ChevronDown size={16} />
                                        </div>
                                    </div>
                                </button>
                                <AnimatePresence initial={false}>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2, ease: "easeInOut" }}
                                        >
                                            <div className="px-4 pb-4 pt-0 space-y-2 border-t border-slate-100/50 mt-1">
                                                <div className="h-1.5" />
                                                {dayItems.map(item => {
                                                    const catInfo = getCategoryInfo(item.category);
                                                    const displayAmount = convert(item.amount, item.currency);
                                                    const isConverted = item.currency !== displayCurrency;
                                                    return (
                                                        <div key={item.id} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5 shadow-sm border border-slate-100">
                                                            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-lg", catInfo.color)}>
                                                                {catInfo.emoji}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-semibold text-slate-800 truncate">{item.title}</p>
                                                                <p className="text-xs text-slate-400 mt-0.5">
                                                                    {item.payer && item.payer !== '未指定'
                                                                        ? `${item.payer}${isConverted ? ` · 原始 ${item.currency === 'TWD' ? item.amount.toLocaleString('zh-TW', { maximumFractionDigits: 0 }) : item.amount.toLocaleString('en', { maximumFractionDigits: 2 })} ${item.currency}` : item.description ? ` · ${item.description}` : ''}`
                                                                        : isConverted
                                                                            ? `原始 ${item.currency === 'TWD' ? item.amount.toLocaleString('zh-TW', { maximumFractionDigits: 0 }) : item.amount.toLocaleString('en', { maximumFractionDigits: 2 })} ${item.currency}`
                                                                            : item.description || ''
                                                                    }
                                                                </p>
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                <p className="text-base font-bold text-slate-800">{fmtAmt(displayAmount)}</p>
                                                                <p className="text-[10px] text-slate-400">{displayCurrency}</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* FAB - portal to escape motion.div transform */}
            {isAuthenticated && createPortal(
                <button
                    type="button"
                    onClick={() => setShowAddForm(true)}
                    className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-amber-500 text-white shadow-xl shadow-amber-300/60 flex items-center justify-center active:scale-95 transition-all hover:bg-amber-600"
                    aria-label="新增記帳"
                >
                    <Plus size={28} strokeWidth={2.5} />
                </button>,
                document.body
            )}

            {/* Modal - also portal to escape motion.div transform */}
            <AddExpenseModal
                open={showAddForm}
                onClose={() => setShowAddForm(false)}
                formAction={formAction}
                errorMessage={state?.message}
                foreignCurrency={foreignCurrency}
                twdRate={twdRate}
                formCurrency={formCurrency}
                onFormCurrencyChange={setFormCurrency}
            />
        </div>
    );
};
