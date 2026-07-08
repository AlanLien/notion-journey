import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Plane, Hotel, MapPin, Utensils, ShoppingBag, Info, ExternalLink, Pencil, Check, Loader2, Clock3, Wallet } from 'lucide-react';
import { ItineraryItem } from '@/lib/notion';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { NotionBlockRenderer } from '@/components/NotionBlockRenderer';
import { updateJourneyDateAction, updateJourneyExpenseInfoAction, updateJourneyReservedAction, updateJourneyTimeAction } from '@/app/actions';

// Mapping category strings (from Notion select) to Icons
const TYPE_ICONS: Record<string, any> = {
    transport: Plane,
    hotel: Hotel,
    visit: MapPin,
    restaurant: Utensils,
    shopping: ShoppingBag,
};

const TYPE_COLORS: Record<string, string> = {
    transport: 'bg-blue-100 text-blue-600',
    hotel: 'bg-indigo-100 text-indigo-600',
    visit: 'bg-emerald-100 text-emerald-600',
    restaurant: 'bg-orange-100 text-orange-600',
    shopping: 'bg-pink-100 text-pink-600',
};

const RESERVED_COLORS: Record<string, string> = {
    Reserved: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    'Not Yet': 'bg-red-50 text-red-700 border-red-100',
    'Not yet': 'bg-red-50 text-red-700 border-red-100',
    '⚠️ Not yet': 'bg-red-50 text-red-700 border-red-100',
    'No Need': 'bg-slate-50 text-slate-500 border-slate-100',
    'No need': 'bg-slate-50 text-slate-500 border-slate-100',
};

const RESERVED_OPTIONS = ['Reserved', 'Not Yet', 'No Need'];
const PAYER_OPTIONS = ['Lee Ruei Han', '連子勻'];

const normalizeReservedValue = (value: string) => {
    const normalized = value.toLowerCase();
    if (normalized.includes('reserved')) return 'Reserved';
    if (normalized.includes('not')) return 'Not Yet';
    if (normalized.includes('no need')) return 'No Need';
    return value || 'Reserved';
};

const parsePayers = (value: string) => value
    .split(/[、,]/)
    .map(payer => payer.trim())
    .filter(Boolean);

const formatPayers = (payers: string[]) => payers.join('、');

interface JourneyCardProps {
    item: ItineraryItem;
    isPast?: boolean;
    hideImage?: boolean;
    isAuthenticated?: boolean;
}

export const JourneyCard: React.FC<JourneyCardProps> = ({ item, isPast = false, hideImage = false, isAuthenticated = false }) => {
    const CategoryIcon = TYPE_ICONS[item.category] || Info;
    const colorClass = TYPE_COLORS[item.category] || 'bg-gray-100 text-gray-600';

    const renderIcon = () => {
        if (item.icon) {
            if (item.icon.startsWith('http') || item.icon.startsWith('data:')) {
                return <img src={item.icon} alt="" className="w-4 h-4 object-contain" />;
            }
            return <span className="text-sm leading-none">{item.icon}</span>;
        }
        return <CategoryIcon size={16} />;
    };

    // Content blocks
    const [blocks, setBlocks] = useState<any[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Schedule edit state
    const [editingSchedule, setEditingSchedule] = useState(false);
    const [dateValue, setDateValue] = useState(item.date.split('T')[0]);
    const [timeValue, setTimeValue] = useState(item.time || '00:00');
    const [savingSchedule, setSavingSchedule] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [editingInfoTime, setEditingInfoTime] = useState(false);
    const [editingReserved, setEditingReserved] = useState(false);
    const [editingExpense, setEditingExpense] = useState(false);
    const [savingInfo, setSavingInfo] = useState(false);
    // Local display override after save
    const [displayDate, setDisplayDate] = useState(item.date);
    const [displayTime, setDisplayTime] = useState(item.time);
    const [displayReserved, setDisplayReserved] = useState(item.reserved);
    const [displayAmount, setDisplayAmount] = useState<number | null>(item.amount);
    const [displayCurrency, setDisplayCurrency] = useState(item.currency || 'TWD');
    const [displayPayer, setDisplayPayer] = useState(item.payer || '');
    const [reservedValue, setReservedValue] = useState(normalizeReservedValue(item.reserved));
    const [amountValue, setAmountValue] = useState(item.amount?.toString() || '');
    const [currencyValue, setCurrencyValue] = useState(item.currency || 'TWD');
    const [payerValue, setPayerValue] = useState<string[]>(parsePayers(item.payer || ''));
    const reservedClass = displayReserved ? RESERVED_COLORS[displayReserved] || 'bg-slate-50 text-slate-600 border-slate-100' : '';
    const canShowTimeEditor = isAuthenticated || !!displayTime;
    const canShowExpenseEditor = isAuthenticated || displayAmount !== null || !!displayPayer;
    const currencyOptions = Array.from(new Set([displayCurrency, 'USD', 'TWD'].filter(Boolean)));

    const startEditingInfoTime = () => {
        if (!isAuthenticated) return;
        setTimeValue(displayTime || '00:00');
        setEditingInfoTime(true);
    };

    const fetchBlocks = async () => {
        if (blocks) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/notion/page/${item.id}`);
            if (res.ok) {
                const data = await res.json();
                setBlocks(data.blocks);
            }
        } catch (error) {
            console.error("Failed to load blocks", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveSchedule = async () => {
        if (!dateValue || !timeValue) return;
        setSavingSchedule(true);
        setSaveError(null);
        try {
            const dateResult = await updateJourneyDateAction(item.id, dateValue);
            const timeResult = await updateJourneyTimeAction(item.id, timeValue);
            if (dateResult.success && timeResult.success) {
                setDisplayDate(dateValue);
                setDisplayTime(timeValue);
                setEditingSchedule(false);
            } else {
                setSaveError(dateResult.message || timeResult.message || '儲存失敗');
            }
        } catch (e: any) {
            setSaveError(e.message || '儲存失敗');
        } finally {
            setSavingSchedule(false);
        }
    };

    const handleSaveInfoTime = async () => {
        if (!timeValue) return;
        setSavingInfo(true);
        setSaveError(null);
        try {
            const result = await updateJourneyTimeAction(item.id, timeValue);
            if (result.success) {
                setDisplayTime(timeValue);
                setEditingInfoTime(false);
            } else {
                setSaveError(result.message || '儲存失敗');
            }
        } catch (e: any) {
            setSaveError(e.message || '儲存失敗');
        } finally {
            setSavingInfo(false);
        }
    };

    const handleSaveReserved = async () => {
        setSavingInfo(true);
        setSaveError(null);
        try {
            const result = await updateJourneyReservedAction(item.id, reservedValue);
            if (result.success) {
                setDisplayReserved(reservedValue);
                setEditingReserved(false);
            } else {
                setSaveError(result.message || '儲存失敗');
            }
        } catch (e: any) {
            setSaveError(e.message || '儲存失敗');
        } finally {
            setSavingInfo(false);
        }
    };

    const handleSaveExpense = async () => {
        setSavingInfo(true);
        setSaveError(null);
        try {
            const nextPayer = formatPayers(payerValue);
            const result = await updateJourneyExpenseInfoAction(item.id, amountValue, currencyValue, nextPayer);
            if (result.success) {
                setDisplayAmount(amountValue.trim() ? parseFloat(amountValue) : null);
                setDisplayCurrency(currencyValue);
                setDisplayPayer(nextPayer);
                setEditingExpense(false);
            } else {
                setSaveError(result.message || '儲存失敗');
            }
        } catch (e: any) {
            setSaveError(e.message || '儲存失敗');
        } finally {
            setSavingInfo(false);
        }
    };

    const dateObj = parseISO(displayDate);
    const timeStr = displayTime || format(dateObj, 'HH:mm');
    const dateStr = format(dateObj, 'yyyy-MM-dd');

    return (
        <div className={cn(
            "relative mb-4 rounded-2xl bg-white/80 border border-white/40 shadow-sm backdrop-blur-md transition-all duration-300 overflow-hidden group",
            isPast && "opacity-60 grayscale-[0.5]"
        )}>
            {/* List View Cover Image */}
            {item.img && !hideImage && (
                <div className="h-20 w-full relative overflow-hidden">
                    <img
                        src={item.img}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                </div>
            )}

            <Dialog onOpenChange={(open) => {
                if (open) fetchBlocks();
                if (!open) {
                    setEditingSchedule(false);
                    setEditingInfoTime(false);
                    setEditingReserved(false);
                    setEditingExpense(false);
                    setSaveError(null);
                }
            }}>
                <DialogTrigger asChild>
                    <div className={cn("p-2.5 flex gap-3 cursor-pointer hover:bg-white/50 transition-colors", item.img && !hideImage ? "" : "pt-3")}>
                        {/* Time & Line */}
                        <div className="flex flex-col items-center min-w-[3rem]">
                            <span className="text-xs font-bold text-slate-500 font-mono text-center leading-tight">{timeStr}</span>
                            <div className="flex-1 w-0.5 bg-slate-200 my-1 rounded-full min-h-[1.5rem]" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 pb-2">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className={cn("inline-flex items-center justify-center p-1.5 rounded-lg shadow-sm shrink-0", colorClass)}>
                                            {renderIcon()}
                                        </div>
                                        <h3 className="font-bold text-slate-800 text-base leading-tight">{item.title}</h3>
                                    </div>
                                    {displayReserved && (
                                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold", reservedClass)}>
                                            {displayReserved}
                                        </span>
                                    )}
                                </div>
                                {item.maps && (
                                    <a
                                        href={item.maps}
                                        target="_blank"
                                        rel="noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-slate-400 hover:text-blue-500 transition-colors p-1"
                                    >
                                        <ExternalLink size={18} />
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogTrigger>

                <DialogContent className="max-w-sm w-[90vw] p-0 overflow-hidden rounded-3xl gap-0 border-0 shadow-2xl bg-white max-h-[85vh] flex flex-col">
                    <DialogHeader className="hidden">
                        <DialogTitle>{item.title}</DialogTitle>
                        <DialogDescription>{dateStr}</DialogDescription>
                    </DialogHeader>

                    {/* Dialog Cover */}
                    {item.img ? (
                        <div className="h-48 w-full relative">
                            <img src={item.img} alt={item.title} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <div className="absolute bottom-4 left-4 text-white flex items-end gap-3">
                                <div className={cn("inline-flex items-center justify-center p-1.5 rounded-lg bg-white/20 backdrop-blur-md text-white border border-white/30 shrink-0")}>
                                    {renderIcon()}
                                </div>
                                <h2 className="text-2xl font-bold leading-tight text-white drop-shadow-sm mb-0.5">{item.title}</h2>
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 pb-2 text-left flex items-center gap-3">
                            <div className={cn("inline-flex items-center justify-center p-2 rounded-xl shrink-0", colorClass)}>
                                {renderIcon()}
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800">{item.title}</h2>
                        </div>
                    )}

                    <div className="p-6 pt-4 flex-1 overflow-y-auto">
                        {/* Date/Time Row */}
                        <div className="mb-4">
                            {!editingSchedule ? (
                                <div className="flex items-center gap-2 text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <div className="font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200">
                                        {timeStr}
                                    </div>
                                    <span className="text-sm border-l border-slate-200 pl-2 flex-1">{dateStr}</span>
                                    {isAuthenticated && (
                                        <button
                                            onClick={() => setEditingSchedule(true)}
                                            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-blue-600 transition-colors"
                                            title="編輯日期與時間"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 space-y-2">
                                    <div className="grid grid-cols-[1fr_auto] gap-2">
                                        <input
                                            type="time"
                                            value={timeValue}
                                            onChange={(e) => setTimeValue(e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg bg-white border border-blue-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm font-mono font-bold"
                                        />
                                        <input
                                            type="date"
                                            value={dateValue}
                                            onChange={(e) => setDateValue(e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg bg-white border border-blue-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                                        />
                                    </div>
                                    {saveError && (
                                        <p className="text-xs text-red-500">{saveError}</p>
                                    )}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleSaveSchedule}
                                            disabled={savingSchedule}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-60"
                                        >
                                            {savingSchedule ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                            {savingSchedule ? '儲存中...' : '儲存'}
                                        </button>
                                        <button
                                            onClick={() => { setEditingSchedule(false); setDateValue(displayDate.split('T')[0]); setTimeValue(displayTime || '00:00'); setSaveError(null); }}
                                            disabled={savingSchedule}
                                            className="px-4 py-2 rounded-lg bg-slate-100 text-slate-600 text-sm font-semibold"
                                        >
                                            取消
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {(canShowTimeEditor || displayReserved || canShowExpenseEditor) && (
                            <div className="mb-6 grid grid-cols-1 gap-2">
                                {canShowTimeEditor && (
                                    editingInfoTime ? (
                                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Clock3 size={15} className="text-blue-400" />
                                                <input
                                                    type="time"
                                                    value={timeValue}
                                                    onChange={(e) => setTimeValue(e.target.value)}
                                                    className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-white border border-blue-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm font-mono font-bold"
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleSaveInfoTime}
                                                    disabled={savingInfo}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-60"
                                                >
                                                    {savingInfo ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                                    {savingInfo ? '儲存中...' : '儲存'}
                                                </button>
                                                <button
                                                    onClick={() => { setEditingInfoTime(false); setTimeValue(displayTime || '00:00'); setSaveError(null); }}
                                                    disabled={savingInfo}
                                                    className="px-4 py-2 rounded-lg bg-slate-100 text-slate-600 text-sm font-semibold"
                                                >
                                                    取消
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={startEditingInfoTime}
                                            className={cn(
                                                "w-full flex items-center gap-2 text-sm text-slate-600 bg-white border border-slate-100 rounded-xl px-3 py-2 text-left",
                                                isAuthenticated && "hover:border-blue-200 hover:bg-blue-50/50 transition-colors"
                                            )}
                                        >
                                            <Clock3 size={15} className="text-slate-400" />
                                            <span className={cn(
                                                "font-semibold flex-1",
                                                displayTime ? "text-slate-700" : "text-slate-400"
                                            )}>
                                                {displayTime || '未設定時間'}
                                            </span>
                                            {isAuthenticated && <Pencil size={13} className="text-slate-300" />}
                                        </button>
                                    )
                                )}
                                {displayReserved && (
                                    editingReserved ? (
                                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
                                            <select
                                                value={reservedValue}
                                                onChange={(e) => setReservedValue(e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg bg-white border border-blue-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm font-semibold"
                                            >
                                                {RESERVED_OPTIONS.map(option => (
                                                    <option key={option} value={option}>{option}</option>
                                                ))}
                                            </select>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleSaveReserved}
                                                    disabled={savingInfo}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-60"
                                                >
                                                    {savingInfo ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                                    {savingInfo ? '儲存中...' : '儲存'}
                                                </button>
                                                <button
                                                    onClick={() => { setEditingReserved(false); setReservedValue(normalizeReservedValue(displayReserved)); setSaveError(null); }}
                                                    disabled={savingInfo}
                                                    className="px-4 py-2 rounded-lg bg-slate-100 text-slate-600 text-sm font-semibold"
                                                >
                                                    取消
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => isAuthenticated && setEditingReserved(true)}
                                            className={cn(
                                                "w-full flex items-center justify-between gap-3 text-sm bg-white border border-slate-100 rounded-xl px-3 py-2 text-left",
                                                isAuthenticated && "hover:border-blue-200 hover:bg-blue-50/50 transition-colors"
                                            )}
                                        >
                                            <span className="text-slate-500">Reservation</span>
                                            <span className="inline-flex items-center gap-2">
                                                <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-bold", reservedClass)}>
                                                    {displayReserved}
                                                </span>
                                                {isAuthenticated && <Pencil size={13} className="text-slate-300" />}
                                            </span>
                                        </button>
                                    )
                                )}
                                {canShowExpenseEditor && (
                                    editingExpense ? (
                                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
                                            <div className="grid grid-cols-[1fr_auto] gap-2">
                                                <input
                                                    type="number"
                                                    inputMode="decimal"
                                                    min="0"
                                                    step="any"
                                                    value={amountValue}
                                                    onChange={(e) => setAmountValue(e.target.value)}
                                                    placeholder="Amount"
                                                    className="w-full min-w-0 px-3 py-2 rounded-lg bg-white border border-blue-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm font-bold"
                                                />
                                                <select
                                                    value={currencyValue}
                                                    onChange={(e) => setCurrencyValue(e.target.value)}
                                                    className="w-24 px-2 py-2 rounded-lg bg-white border border-blue-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm font-semibold"
                                                >
                                                    {currencyOptions.map(option => (
                                                        <option key={option} value={option}>{option}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {PAYER_OPTIONS.map(option => {
                                                    const checked = payerValue.includes(option);
                                                    return (
                                                        <label key={option} className={cn(
                                                            "cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold transition-all",
                                                            checked
                                                                ? "border-blue-300 bg-white text-blue-700 shadow-sm"
                                                                : "border-blue-100 bg-white/70 text-slate-500"
                                                        )}>
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={(e) => {
                                                                    setPayerValue(prev => e.target.checked
                                                                        ? [...prev, option]
                                                                        : prev.filter(value => value !== option)
                                                                    );
                                                                }}
                                                                className="sr-only"
                                                            />
                                                            {option}
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleSaveExpense}
                                                    disabled={savingInfo}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-60"
                                                >
                                                    {savingInfo ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                                    {savingInfo ? '儲存中...' : '儲存'}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setEditingExpense(false);
                                                        setAmountValue(displayAmount?.toString() || '');
                                                        setCurrencyValue(displayCurrency);
                                                        setPayerValue(parsePayers(displayPayer));
                                                        setSaveError(null);
                                                    }}
                                                    disabled={savingInfo}
                                                    className="px-4 py-2 rounded-lg bg-slate-100 text-slate-600 text-sm font-semibold"
                                                >
                                                    取消
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!isAuthenticated) return;
                                                setAmountValue(displayAmount?.toString() || '');
                                                setCurrencyValue(displayCurrency);
                                                setPayerValue(parsePayers(displayPayer));
                                                setEditingExpense(true);
                                            }}
                                            className={cn(
                                                "w-full flex items-center justify-between gap-3 text-sm bg-white border border-slate-100 rounded-xl px-3 py-2 text-left",
                                                isAuthenticated && "hover:border-blue-200 hover:bg-blue-50/50 transition-colors"
                                            )}
                                        >
                                            <span className="inline-flex items-center gap-2 text-slate-500">
                                                <Wallet size={15} className="text-slate-400" />
                                                Expense
                                            </span>
                                            <span className="inline-flex items-center gap-2 min-w-0">
                                                <span className={cn(
                                                    "font-bold truncate",
                                                    displayAmount !== null ? "text-slate-800" : "text-slate-400"
                                                )}>
                                                    {displayAmount !== null ? `${displayAmount.toLocaleString('en', { maximumFractionDigits: 2 })} ${displayCurrency}` : '未設定'}
                                                </span>
                                                {displayPayer && <span className="text-xs text-slate-400 truncate max-w-20">{displayPayer}</span>}
                                                {isAuthenticated && <Pencil size={13} className="text-slate-300 shrink-0" />}
                                            </span>
                                        </button>
                                    )
                                )}
                            </div>
                        )}

                        {saveError && !editingSchedule && (
                            <p className="mb-4 text-xs text-red-500">{saveError}</p>
                        )}

                        {/* Content Section */}
                        <div className="text-slate-600 leading-relaxed text-sm">
                            {item.description && (
                                <div className="mb-4 text-base p-3 bg-slate-50 text-slate-700 rounded-lg border border-slate-100">{item.description}</div>
                            )}

                            {isLoading && (
                                <div className="flex items-center justify-center py-8 space-x-2 text-slate-400">
                                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0s' }} />
                                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0.1s' }} />
                                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
                                </div>
                            )}

                            {blocks && blocks.length > 0 && (
                                <NotionBlockRenderer blocks={blocks} editable={isAuthenticated} />
                            )}
                        </div>

                        {/* Button Map */}
                        {item.maps && (
                            <Button asChild className="w-full rounded-xl gap-2 font-bold h-12 text-base shadow-lg shadow-blue-200/50 bg-blue-600 hover:bg-blue-700 mt-6" size="lg">
                                <a href={item.maps} target="_blank" rel="noreferrer">
                                    <MapPin size={18} />
                                    開啟地圖
                                </a>
                            </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog >
        </div >
    );
};
