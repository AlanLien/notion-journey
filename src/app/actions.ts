'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { getPasswordConfig, createJourneyEntry, updateJourneyDate, updateJourneyTime, updateJourneyReserved, updateJourneyExpenseInfo, createTask, updateTaskDone, createExpense } from '@/lib/notion';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function verifyPasswordAction(prevState: any, formData: FormData) {
    const inputPassword = formData.get('password') as string;

    if (!inputPassword) {
        return { success: false, message: '請輸入密碼' };
    }

    try {
        const correctPassword = await getPasswordConfig();

        if (!correctPassword) {
            console.error("No password configured in Notion.");
            return { success: false, message: '系統未設定密碼，請聯繫管理員' };
        }

        if (inputPassword === correctPassword) {
            const sevenDays = 60 * 60 * 24 * 7 * 1000;
            (await cookies()).set('journey_auth', 'true', {
                maxAge: 60 * 60 * 24 * 7,
                expires: new Date(Date.now() + sevenDays),
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
            });
            return { success: true };
        } else {
            return { success: false, message: '密碼錯誤，請重試' };
        }
    } catch (error) {
        console.error("Password verification error:", error);
        return { success: false, message: '驗證過程發生錯誤' };
    }
}

// ─── Journey ──────────────────────────────────────────────────────────────────

export async function createJourneyAction(prevState: any, formData: FormData) {
    const title = formData.get('title') as string;
    const date = formData.get('date') as string;
    const category = formData.get('category') as string;
    const description = formData.get('description') as string;
    const mapsUrl = formData.get('mapsUrl') as string;

    if (!title?.trim()) return { success: false, message: '請輸入行程名稱' };
    if (!date) return { success: false, message: '請選擇日期' };

    try {
        await createJourneyEntry({ title: title.trim(), date, category, description, mapsUrl });
        revalidatePath('/');
        return { success: true };
    } catch (e: any) {
        console.error('createJourneyAction error:', e);
        return { success: false, message: e.message || '新增失敗' };
    }
}

export async function updateJourneyDateAction(pageId: string, newDate: string) {
    try {
        await updateJourneyDate(pageId, newDate);
        revalidatePath('/');
        return { success: true };
    } catch (e: any) {
        console.error('updateJourneyDateAction error:', e);
        return { success: false, message: e.message || '更新失敗' };
    }
}

export async function updateJourneyTimeAction(pageId: string, newTime: string) {
    if (!newTime?.trim()) return { success: false, message: '請輸入時間' };

    try {
        await updateJourneyTime(pageId, newTime.trim());
        revalidatePath('/');
        return { success: true };
    } catch (e: any) {
        console.error('updateJourneyTimeAction error:', e);
        return { success: false, message: e.message || '更新失敗' };
    }
}

export async function updateJourneyReservedAction(pageId: string, reserved: string) {
    if (!reserved?.trim()) return { success: false, message: '請選擇訂位狀態' };

    try {
        await updateJourneyReserved(pageId, reserved.trim());
        revalidatePath('/');
        return { success: true };
    } catch (e: any) {
        console.error('updateJourneyReservedAction error:', e);
        return { success: false, message: e.message || '更新失敗' };
    }
}

export async function updateJourneyExpenseInfoAction(pageId: string, amountStr: string, currency: string, payer: string) {
    const amount = amountStr.trim() ? parseFloat(amountStr) : null;
    if (amount !== null && (isNaN(amount) || amount < 0)) {
        return { success: false, message: '請輸入有效金額' };
    }
    if (!currency?.trim()) return { success: false, message: '請選擇幣別' };

    try {
        await updateJourneyExpenseInfo(pageId, {
            amount,
            currency: currency.trim(),
            payer: payer.trim(),
        });
        revalidatePath('/');
        return { success: true };
    } catch (e: any) {
        console.error('updateJourneyExpenseInfoAction error:', e);
        return { success: false, message: e.message || '更新失敗' };
    }
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export async function createTaskAction(prevState: any, formData: FormData) {
    const title = formData.get('title') as string;
    const date = formData.get('date') as string;

    if (!title?.trim()) return { success: false, message: '請輸入任務名稱' };

    try {
        await createTask({ title: title.trim(), date: date || undefined });
        revalidatePath('/');
        return { success: true };
    } catch (e: any) {
        console.error('createTaskAction error:', e);
        return { success: false, message: e.message || '新增失敗' };
    }
}

export async function toggleTaskDoneAction(pageId: string, done: boolean) {
    try {
        await updateTaskDone(pageId, done);
        revalidatePath('/');
        return { success: true };
    } catch (e: any) {
        console.error('toggleTaskDoneAction error:', e);
        return { success: false, message: e.message || '更新失敗' };
    }
}

// ─── Expense ──────────────────────────────────────────────────────────────────

export async function createExpenseAction(prevState: any, formData: FormData) {
    const title = formData.get('title') as string;
    const date = formData.get('date') as string;
    const amountStr = formData.get('amount') as string;
    const category = formData.get('category') as string;
    const description = formData.get('description') as string;
    const currency = (formData.get('currency') as string) || 'TWD';

    if (!title?.trim()) return { success: false, message: '請輸入消費名稱' };
    if (!date) return { success: false, message: '請選擇日期' };
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return { success: false, message: '請輸入有效金額' };

    try {
        await createExpense({ title: title.trim(), date, amount, currency, category: category || 'other', description });
        revalidatePath('/');
        return { success: true };
    } catch (e: any) {
        console.error('createExpenseAction error:', e);
        return { success: false, message: e.message || '新增失敗' };
    }
}
