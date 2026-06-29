"use client";

import React from 'react';
import { Settings, Copy, ExternalLink, ShieldCheck } from 'lucide-react';

const SetupGuide = () => {
    return (
        <div className="min-h-screen bg-white p-6 flex flex-col items-center justify-center text-gray-800">
            <div className="max-w-md w-full space-y-8 animate-fade-in-up">
                <div className="text-center">
                    <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                        <Settings className="text-red-600 w-10 h-10" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">歡迎使用旅遊行程看板</h1>
                    <p className="mt-2 text-gray-600">偵測到尚未完成 Notion API 綁定。請跟著以下步驟完成極簡配置：</p>
                </div>

                <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-start gap-4">
                        <div className="bg-white p-2 rounded-lg shadow-sm">
                            <ShieldCheck className="text-blue-500 w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-semibold">1. 取得 Notion API Key</h3>
                            <p className="text-sm text-gray-500">前往 <a href="https://www.notion.so/my-integrations" target="_blank" className="text-blue-600 underline">My Integrations</a> 建立連結，取得祕鑰。</p>
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-start gap-4">
                        <div className="bg-white p-2 rounded-lg shadow-sm">
                            <Copy className="text-green-500 w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-semibold">2. 複製資料庫 ID</h3>
                            <p className="text-sm text-gray-500">開啟旅行計畫資料庫，複製網址中的 ID 部分。</p>
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-start gap-4">
                        <div className="bg-white p-2 rounded-lg shadow-sm">
                            <ExternalLink className="text-purple-500 w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-semibold">3. 設定環境變數</h3>
                            <p className="text-sm text-gray-500">在 Zeabur / Vercel 管理介面新增：</p>
                            <div className="mt-2 space-y-1">
                                <code className="text-xs bg-gray-200 px-2 py-0.5 rounded block w-fit">NOTION_API_KEY</code>
                                <code className="text-xs bg-gray-200 px-2 py-0.5 rounded block w-fit">NOTION_DATABASE_ID</code>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-4">
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full bg-red-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-red-200 active:scale-95 transition-transform"
                    >
                        完成配置，點我刷新
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SetupGuide;
