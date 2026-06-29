"use client";

import React, { useState, useEffect } from 'react';
import { Calculator, ArrowRightLeft } from 'lucide-react';

interface CurrencyConverterProps {
    targetCurrency: string; // e.g., JPY, USD
}

const CurrencyConverter: React.FC<CurrencyConverterProps> = ({ targetCurrency }) => {
    const [amount, setAmount] = useState<string>('');
    const [rate, setRate] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    // 模擬或抓取匯率，這裡為示範先使用固定匯率映射，
    // 實際專案可替換為 fetch('https://api.exchangerate-api.com/v4/latest/TWD')
    useEffect(() => {
        // 簡單的匯率表 (NTD 為基準)
        // 1 TWD = X TargetCurrency
        // 範例：1 TWD = 4.6 JPY (約 0.217 NTD/JPY)
        // 為了精確，我們希望能獲取 "1 TargetCurrency = ? TWD"

        // 這裡使用一個免費的公開 API 抓取 TWD 對目標幣別的匯率
        const fetchRate = async () => {
            try {
                const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${targetCurrency}`);
                const data = await res.json();
                const twdRate = data.rates.TWD; // 1 Target = ? TWD
                setRate(twdRate);
            } catch (e) {
                console.error("Failed to fetch rate", e);
                // Fallback for demo if API fails or rate limited
                if (targetCurrency === 'JPY') setRate(0.22);
                else if (targetCurrency === 'USD') setRate(31.5);
                else if (targetCurrency === 'KRW') setRate(0.024);
                else setRate(1);
            } finally {
                setLoading(false);
            }
        };

        if (targetCurrency) {
            fetchRate();
        }
    }, [targetCurrency]);

    const converted = amount ? (parseFloat(amount) * (rate || 0)).toFixed(0) : '---';

    return (
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-gray-100 my-4">
            <div className="flex items-center gap-2 mb-3 text-red-700 font-bold">
                <Calculator className="w-5 h-5" />
                <span className="text-sm">匯率換算器</span>
            </div>

            <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                    <label className="text-xs text-gray-500 block mb-1">{targetCurrency}</label>
                    <input
                        type="number"
                        pattern="[0-9]*"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="輸入金額"
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-red-500/20"
                    />
                </div>

                <ArrowRightLeft className="w-5 h-5 text-gray-400 mt-5" />

                <div className="flex-1 text-right">
                    <label className="text-xs text-gray-500 block mb-1">NTD</label>
                    <div className="text-2xl font-bold text-gray-800">
                        ${converted}
                    </div>
                </div>
            </div>

            {loading ? (
                <p className="text-[10px] text-gray-400 mt-2 text-center">更新匯率中...</p>
            ) : (
                <p className="text-[10px] text-gray-400 mt-2 text-center">
                    即時匯率: 1 {targetCurrency} ≈ {rate} TWD
                </p>
            )}
        </div>
    );
};

export default CurrencyConverter;
