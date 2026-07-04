"use client";

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { ItineraryItem } from '@/lib/notion';
import { Loader2, Info, Clock3 } from 'lucide-react';
import { NotionBlockRenderer } from './NotionBlockRenderer';

interface ItineraryDetailsModalProps {
    item: ItineraryItem | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function ItineraryDetailsModal({ item, isOpen, onClose }: ItineraryDetailsModalProps) {
    const [blocks, setBlocks] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && item?.id) {
            const fetchBlocks = async () => {
                setLoading(true);
                try {
                    const res = await fetch(`/api/notion/page/${item.id}`);
                    const data = await res.json();
                    if (data.blocks) {
                        setBlocks(data.blocks);
                    }
                } catch (error) {
                    console.error("Failed to fetch blocks", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchBlocks();
        } else {
            setBlocks([]);
        }
    }, [isOpen, item]);

    if (!item) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md rounded-3xl p-6 bg-white/95 backdrop-blur-xl border-none shadow-2xl">
                <DialogHeader className="text-left">
                    <DialogTitle className="text-2xl font-black text-gray-900 leading-tight">
                        {item.title}
                    </DialogTitle>
                    <DialogDescription className="text-sm font-medium text-red-600 mt-1">
                        行程詳細資訊
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4 space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {(item.time || item.reserved) && (
                        <div className="grid grid-cols-1 gap-2">
                            {item.time && (
                                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50/80 p-3 rounded-2xl border border-gray-100">
                                    <Clock3 className="w-4 h-4 text-gray-400" />
                                    <span className="font-bold text-gray-800">{item.time}</span>
                                </div>
                            )}
                            {item.reserved && (
                                <div className="flex items-center justify-between gap-3 text-sm text-gray-600 bg-gray-50/80 p-3 rounded-2xl border border-gray-100">
                                    <span className="font-bold text-gray-400">Reservation</span>
                                    <span className="inline-flex px-2 py-0.5 rounded-full border border-slate-100 bg-white text-xs font-bold text-slate-600">
                                        {item.reserved}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {item.description && (
                        <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
                            <div className="flex items-center gap-2 mb-2 text-gray-400">
                                <Info className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">簡要描述</span>
                            </div>
                            <p className="text-gray-700 leading-relaxed font-medium">
                                {item.description}
                            </p>
                        </div>
                    )}

                    <div className="space-y-4">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                <p className="text-xs font-bold uppercase tracking-widest">載入內容中...</p>
                            </div>
                        ) : blocks.length > 0 ? (
                            <NotionBlockRenderer blocks={blocks} />
                        ) : !item.description && (
                            <div className="text-center py-12 text-gray-300 italic font-medium">
                                尚無詳細內容
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
