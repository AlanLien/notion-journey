import { Client } from '@notionhq/client';
import { cache } from 'react';

export interface TripMetadata {
    title: string;
    city: string;
    startDate: string;
    endDate: string;
    exchangeRate: string;
    timezone: string;
    icon?: string;
    infoPage?: {
        id: string;
        title: string;
        blocks: any[];
    };
}

export interface ItineraryItem {
    id: string;
    type: string;
    title: string;
    category: string;
    date: string;
    time: string;
    reserved: string;
    maps: string;
    img: string | null;
    description: string;
    hasContent: boolean;
    icon?: string | null;
    amount: number | null;
    currency: string;
    payer: string;
}

export interface TaskItem {
    id: string;
    title: string;
    date: string | null;
    done: boolean;
}

export interface ExpenseItem {
    id: string;
    title: string;
    date: string;
    amount: number;
    currency: string; // 'TWD' or configured foreign currency
    category: string; // reuses journey select
    payer: string;
    description: string;
}

function normalizeJourneyCategory(categoryName?: string | null): string {
    const normalized = (categoryName || '').toLowerCase();

    if (normalized.includes('mission')) return 'mission';
    if (normalized.includes('restaurant')) return 'restaurant';
    if (normalized.includes('shopping')) return 'shopping';
    if (normalized.includes('transport')) return 'transport';
    if (normalized.includes('hotel')) return 'hotel';
    if (normalized.includes('visit')) return 'visit';

    return categoryName || 'other';
}

function findPropertyName(properties: Record<string, any>, names: string[]) {
    for (const name of names) {
        if (properties[name]) return name;
    }

    const lowerNames = names.map(name => name.toLowerCase());
    return Object.keys(properties).find(key => lowerNames.includes(key.toLowerCase()));
}

/**
 * 將 Emoji 轉換為 SVG Data URL，以便作為 Favicon 使用
 */
function emojiToDataUrl(emoji: string): string {
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
            <text y=".9em" font-size="90">${emoji}</text>
        </svg>
    `.trim();
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}


export async function getDataSourceId(notion: Client, databaseId: string) {
    try {
        const dbResponse = await notion.databases.retrieve({
            database_id: databaseId,
        }) as any;

        let dbIcon = undefined;
        if (dbResponse.icon) {
            if (dbResponse.icon.type === 'emoji') {
                dbIcon = emojiToDataUrl(dbResponse.icon.emoji);
            } else if (dbResponse.icon.type === 'external') {
                dbIcon = dbResponse.icon.external.url;
            } else if (dbResponse.icon.type === 'file') {
                dbIcon = dbResponse.icon.file.url;
            }
        }

        let dataSourceId = databaseId;
        if (dbResponse.data_sources && dbResponse.data_sources.length > 0) {
            dataSourceId = dbResponse.data_sources[0].id;
        }

        return { dataSourceId, dbIcon };
    } catch (e) {
        console.warn("Failed to retrieve database info, using provided ID as Data Source ID:", e);
        return { dataSourceId: databaseId, dbIcon: undefined };
    }
}

export const getTripData = cache(async () => {
    const apiKey = process.env.NOTION_API_KEY;
    const databaseId = process.env.NOTION_DATABASE_ID;

    if (!apiKey || !databaseId) {
        throw new Error(`Missing Notion credentials. API Key: ${apiKey ? 'set' : 'missing'}, DB ID: ${databaseId ? 'set' : 'missing'}`);
    }

    const notion = new Client({
        auth: apiKey,
    });

    const { dataSourceId, dbIcon } = await getDataSourceId(notion, databaseId);

    const getProperty = (properties: Record<string, any>, names: string[]) => {
        const propertyName = findPropertyName(properties, names);
        return propertyName ? properties[propertyName] : undefined;
    };

    const getPlainText = (property: any): string => {
        if (!property) return '';

        if (property.rich_text) {
            return property.rich_text.map((t: any) => t.plain_text).join('');
        }
        if (property.title) {
            return property.title.map((t: any) => t.plain_text).join('');
        }
        if (property.select) {
            return property.select.name || '';
        }
        if (property.people) {
            return property.people
                .map((person: any) => person.name || person.person?.email || '')
                .filter(Boolean)
                .join('、');
        }
        if (property.date?.start) {
            return property.date.start;
        }
        if (typeof property.number === 'number') {
            return String(property.number);
        }
        if (property.formula) {
            const formula = property.formula;
            if (formula.type === 'string') return formula.string || '';
            if (formula.type === 'number') return typeof formula.number === 'number' ? String(formula.number) : '';
            if (formula.type === 'date') return formula.date?.start || '';
            if (formula.type === 'boolean') return formula.boolean ? 'true' : 'false';
        }

        return '';
    };

    const getSortDate = (item: ItineraryItem) => {
        const dateOnly = item.date.split('T')[0];
        const timeOnly = item.time.match(/\d{1,2}:\d{2}/)?.[0];
        return new Date(timeOnly ? `${dateOnly}T${timeOnly}` : item.date).getTime();
    };

    // Notion API v2025-09-03: dataSources.query
    let response;
    try {
        // @ts-ignore: handling strictly typed client issues
        response = await notion.dataSources.query({
            data_source_id: dataSourceId,
        });
    } catch (error: any) {
        console.error("Notion API Error Detail:", error);
        if (error.status === 401) {
            throw new Error("Notion API Key 無效或是未授權。請檢查 .env.local 檔案中的 NOTION_API_KEY 是否正確，並確認該 Integration 已被邀請至 Database。");
        }
        if (error.status === 404) {
            throw new Error("找不到指定的 Data Source ID。請確認 Database 是否已正確關聯至 Data Source。");
        }
        throw error;
    }

    const results = response.results as any[];

    // 1. 分類：找出 Type = 'config' 的項目
    const configItems = results.filter(r => r.properties.type?.select?.name === 'config');

    const countryRow = configItems.find(r => r.properties.config?.select?.name === 'country');
    const cityRow = configItems.find(r => r.properties.config?.select?.name === 'city');
    const exchangeRow = configItems.find(r => r.properties.config?.select?.name === 'exchange');
    const gmtRow = configItems.find(r => r.properties.config?.select?.name === 'gmt');

    const metadata: TripMetadata = {
        title: countryRow?.properties.title?.title[0]?.plain_text || '我的旅遊行程',
        city: cityRow?.properties.title?.title[0]?.plain_text || '',
        startDate: countryRow?.properties.date?.date?.start || '',
        endDate: countryRow?.properties.date?.date?.end || '',
        exchangeRate: exchangeRow?.properties.title?.title[0]?.plain_text || 'JPY',
        timezone: gmtRow?.properties.title?.title[0]?.plain_text || 'GMT+8',
        icon: dbIcon,
        infoPage: undefined,
    };

    // 1.1 Info Page Content (config=info)
    const infoRow = configItems.find(r => r.properties.config?.select?.name === 'info');
    if (infoRow) {
        try {
            const blocksResponse = await notion.blocks.children.list({
                block_id: infoRow.id,
            });
            metadata.infoPage = {
                id: infoRow.id,
                title: infoRow.properties.title?.title[0]?.plain_text || 'Info',
                blocks: blocksResponse.results
            };
        } catch (e) {
            console.error("Failed to fetch info page blocks", e);
        }
    }

    // 2. 行程：找出 Type = 'journey' 的項目，排除 mission（任務）
    const itinerary: ItineraryItem[] = results
        .filter(r => r.properties.type?.select?.name === 'journey')
        .filter(r => normalizeJourneyCategory(r.properties.journey?.select?.name) !== 'mission')
        .filter(r => r.properties.date?.date?.start)
        .map(page => {
            let coverUrl = null;
            if (page.cover) {
                if (page.cover.type === 'external') {
                    coverUrl = page.cover.external.url;
                } else if (page.cover.type === 'file') {
                    coverUrl = page.cover.file.url;
                }
            }

            const category = normalizeJourneyCategory(page.properties.journey?.select?.name);

            const description = page.properties.description?.rich_text
                ?.map((t: any) => t.plain_text)
                .join('') || '';

            let icon: string | null = null;
            if (page.icon) {
                if (page.icon.type === 'emoji') {
                    icon = page.icon.emoji;
                } else if (page.icon.type === 'external') {
                    icon = page.icon.external.url;
                } else if (page.icon.type === 'file') {
                    icon = page.icon.file.url;
                }
            }

            return {
                id: page.id,
                type: 'journey',
                title: page.properties.title?.title[0]?.plain_text || '未命名項目',
                category: category,
                date: page.properties.date?.date?.start || '',
                time: getPlainText(getProperty(page.properties, ['Time', 'time'])),
                reserved: getProperty(page.properties, ['Reserved', 'reserved'])?.select?.name || '',
                maps: page.properties.maps?.url || '',
                img: coverUrl,
                description: description,
                hasContent: true,
                icon,
                amount: typeof page.properties.amount?.number === 'number' ? page.properties.amount.number : null,
                currency: page.properties.currency?.select?.name || 'TWD',
                payer: getPlainText(getProperty(page.properties, ['payer', 'Payer', 'paid_by', 'paid by', 'Paid By', '付款人'])) || '',
            };
        })
        .sort((a, b) => getSortDate(a) - getSortDate(b));

    // 3. 任務：找出 type='journey' 且 journey='mission' 的項目
    const tasks: TaskItem[] = results
        .filter(r => r.properties.type?.select?.name === 'journey' && normalizeJourneyCategory(r.properties.journey?.select?.name) === 'mission')
        .map(page => ({
            id: page.id,
            title: page.properties.title?.title[0]?.plain_text || '未命名任務',
            date: page.properties.date?.date?.start || null,
            done: page.properties.done?.checkbox ?? false,
        }))
        .sort((a, b) => {
            // 未完成的排前面，同狀態按日期
            if (a.done !== b.done) return a.done ? 1 : -1;
            if (!a.date && !b.date) return 0;
            if (!a.date) return 1;
            if (!b.date) return -1;
            return new Date(a.date).getTime() - new Date(b.date).getTime();
        });

    // 4. 記帳：找出有金額的項目。行程也可以同時是花費，例如露營車、機票。
    const expenses: ExpenseItem[] = results
        .filter(r => typeof r.properties.amount?.number === 'number')
        .filter(r => r.properties.date?.date?.start)
        .map(page => ({
            id: page.id,
            title: page.properties.title?.title[0]?.plain_text || '未命名消費',
            date: page.properties.date?.date?.start || '',
            amount: page.properties.amount?.number ?? 0,
            currency: page.properties.currency?.select?.name || 'TWD',
            category: normalizeJourneyCategory(page.properties.journey?.select?.name),
            payer: getPlainText(getProperty(page.properties, ['payer', 'Payer', 'paid_by', 'paid by', 'Paid By', '付款人'])) || '未指定',
            description: page.properties.description?.rich_text
                ?.map((t: any) => t.plain_text)
                .join('') || '',
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { metadata, itinerary, tasks, expenses };
});

export const getPasswordConfig = cache(async () => {
    const apiKey = process.env.NOTION_API_KEY;
    const databaseId = process.env.NOTION_DATABASE_ID;

    if (!apiKey || !databaseId) return null;

    const notion = new Client({ auth: apiKey });
    const { dataSourceId } = await getDataSourceId(notion, databaseId);

    try {
        // @ts-ignore
        const response = await notion.dataSources.query({
            data_source_id: dataSourceId,
        });

        const results = response.results as any[];
        const passwordRow = results
            .filter(r => r.properties.type?.select?.name === 'config')
            .find(r => r.properties.config?.select?.name === 'password');

        return passwordRow?.properties.title?.title[0]?.plain_text || null;
    } catch (e) {
        console.error("Failed to fetch password config:", e);
        return null;
    }
});

export const getPageBlocks = cache(async (pageId: string) => {
    const apiKey = process.env.NOTION_API_KEY;
    if (!apiKey) {
        throw new Error('Missing Notion API Key');
    }

    const notion = new Client({ auth: apiKey });

    try {
        return await getBlockChildrenRecursive(notion, pageId);
    } catch (error: any) {
        console.error("Notion getPageBlocks Error:", error);
        throw error;
    }
});

async function getBlockChildrenRecursive(notion: Client, blockId: string): Promise<any[]> {
    const children: any[] = [];
    let startCursor: string | undefined;

    do {
        const response = await notion.blocks.children.list({
            block_id: blockId,
            start_cursor: startCursor,
        });

        for (const block of response.results as any[]) {
            if (block.has_children) {
                block.children = await getBlockChildrenRecursive(notion, block.id);
            }
            children.push(block);
        }

        startCursor = response.has_more ? response.next_cursor || undefined : undefined;
    } while (startCursor);

    return children;
}

// ─── Write Functions ──────────────────────────────────────────────────────────

function getNotionClient() {
    const apiKey = process.env.NOTION_API_KEY;
    const databaseId = process.env.NOTION_DATABASE_ID;
    if (!apiKey || !databaseId) throw new Error('Missing Notion credentials');
    return { notion: new Client({ auth: apiKey }), databaseId };
}

function getEditablePropertyName(properties: Record<string, any>, names: string[], label: string) {
    const propertyName = findPropertyName(properties, names);
    if (!propertyName) {
        throw new Error(`找不到 ${label} 欄位`);
    }
    return propertyName;
}

async function resolvePeopleProperty(notion: Client, property: any, payer: string) {
    const names = payer
        .split(/[、,]/)
        .map(name => name.trim())
        .filter(Boolean);

    if (property?.type === 'rich_text') {
        return { rich_text: [{ text: { content: payer } }] };
    }
    if (property?.type === 'select') {
        return payer ? { select: { name: payer } } : { select: null };
    }
    if (property?.type !== 'people') {
        throw new Error(`paid by 欄位目前是 ${property?.type || '未知'} 類型，APP 只能更新 People、文字或 Select 類型`);
    }

    if (names.length === 0) return { people: [] };

    const users: any[] = [];
    let startCursor: string | undefined;
    do {
        const response = await notion.users.list({ start_cursor: startCursor });
        users.push(...(response.results as any[]));
        startCursor = response.has_more ? response.next_cursor || undefined : undefined;
    } while (startCursor);

    const people = names.map(name => {
        const user = users.find(u =>
            u.name?.toLowerCase() === name.toLowerCase()
            || u.person?.email?.toLowerCase() === name.toLowerCase()
        );
        if (!user) {
            throw new Error(`找不到 Notion 使用者：${name}`);
        }
        return { id: user.id };
    });

    return { people };
}

export interface CreateJourneyData {
    title: string;
    date: string; // ISO datetime string e.g. "2026-01-01T09:00"
    category: string;
    description?: string;
    mapsUrl?: string;
}

export async function createJourneyEntry(data: CreateJourneyData) {
    const { notion, databaseId } = getNotionClient();
    const { dataSourceId } = await getDataSourceId(notion, databaseId);

    return notion.pages.create({
        parent: { data_source_id: dataSourceId },
        properties: {
            title: { title: [{ text: { content: data.title } }] },
            date: { date: { start: data.date } },
            type: { select: { name: 'journey' } },
            journey: { select: { name: data.category } },
            ...(data.description && {
                description: { rich_text: [{ text: { content: data.description } }] },
            }),
            ...(data.mapsUrl && {
                maps: { url: data.mapsUrl },
            }),
        },
    });
}

export async function updateJourneyDate(pageId: string, newDate: string) {
    const { notion } = getNotionClient();
    return notion.pages.update({
        page_id: pageId,
        properties: {
            date: { date: { start: newDate } },
        },
    });
}

export async function updateJourneyTime(pageId: string, newTime: string) {
    const { notion } = getNotionClient();
    const page = await notion.pages.retrieve({ page_id: pageId }) as any;
    const propertyName = findPropertyName(page.properties || {}, ['Time', 'time']);

    if (!propertyName) {
        throw new Error('找不到 Time/time 欄位');
    }

    const property = page.properties[propertyName];
    const type = property?.type;

    if (type === 'rich_text') {
        return notion.pages.update({
            page_id: pageId,
            properties: {
                [propertyName]: { rich_text: [{ text: { content: newTime } }] },
            },
        });
    }

    if (type === 'date') {
        const dateStart = page.properties.date?.date?.start || new Date().toISOString().slice(0, 10);
        const dateOnly = dateStart.split('T')[0];
        return notion.pages.update({
            page_id: pageId,
            properties: {
                [propertyName]: { date: { start: `${dateOnly}T${newTime}:00` } },
            },
        });
    }

    throw new Error(`Time 欄位目前是 ${type || '未知'} 類型，APP 只能更新文字或日期類型`);
}

export async function updateJourneyReserved(pageId: string, reserved: string) {
    const { notion } = getNotionClient();
    const page = await notion.pages.retrieve({ page_id: pageId }) as any;
    const propertyName = findPropertyName(page.properties || {}, ['Reserved', 'reserved']);

    if (!propertyName) {
        throw new Error('找不到 Reserved/reserved 欄位');
    }

    return notion.pages.update({
        page_id: pageId,
        properties: {
            [propertyName]: { select: { name: reserved } },
        },
    });
}

export interface UpdateJourneyExpenseInfoData {
    amount: number | null;
    currency: string;
    payer: string;
}

export async function updateJourneyExpenseInfo(pageId: string, data: UpdateJourneyExpenseInfoData) {
    const { notion } = getNotionClient();
    const page = await notion.pages.retrieve({ page_id: pageId }) as any;
    const properties = page.properties || {};

    const amountPropertyName = getEditablePropertyName(properties, ['amount', 'Amount'], 'amount');
    const currencyPropertyName = getEditablePropertyName(properties, ['currency', 'Currency'], 'currency');
    const payerPropertyName = getEditablePropertyName(properties, ['payer', 'Payer', 'paid_by', 'paid by', 'Paid By', '付款人'], 'paid by');

    if (properties[amountPropertyName]?.type !== 'number') {
        throw new Error('amount 欄位必須是 Number 類型');
    }
    if (properties[currencyPropertyName]?.type !== 'select') {
        throw new Error('currency 欄位必須是 Select 類型');
    }

    return notion.pages.update({
        page_id: pageId,
        properties: {
            [amountPropertyName]: { number: data.amount },
            [currencyPropertyName]: data.currency ? { select: { name: data.currency } } : { select: null },
            [payerPropertyName]: await resolvePeopleProperty(notion, properties[payerPropertyName], data.payer),
        },
    });
}

export interface CreateTaskData {
    title: string;
    date?: string;
}

export async function createTask(data: CreateTaskData) {
    const { notion, databaseId } = getNotionClient();
    const { dataSourceId } = await getDataSourceId(notion, databaseId);

    return notion.pages.create({
        parent: { data_source_id: dataSourceId },
        properties: {
            title: { title: [{ text: { content: data.title } }] },
            type: { select: { name: 'journey' } },
            journey: { select: { name: 'mission' } },
            done: { checkbox: false },
            ...(data.date && {
                date: { date: { start: data.date } },
            }),
        },
    });
}

export async function updateTaskDone(pageId: string, done: boolean) {
    const { notion } = getNotionClient();
    return notion.pages.update({
        page_id: pageId,
        properties: {
            done: { checkbox: done },
        },
    });
}

export async function updateToDoBlock(blockId: string, checked: boolean) {
    const { notion } = getNotionClient();
    return notion.blocks.update({
        block_id: blockId,
        to_do: {
            checked,
        },
    });
}

export interface CreateExpenseData {
    title: string;
    date: string;
    amount: number;
    currency: string;
    category: string;
    description?: string;
}

export async function createExpense(data: CreateExpenseData) {
    const { notion, databaseId } = getNotionClient();
    const { dataSourceId } = await getDataSourceId(notion, databaseId);

    return notion.pages.create({
        parent: { data_source_id: dataSourceId },
        properties: {
            title: { title: [{ text: { content: data.title } }] },
            date: { date: { start: data.date } },
            type: { select: { name: 'expense' } },
            journey: { select: { name: data.category } },
            amount: { number: data.amount },
            currency: { select: { name: data.currency } },
            ...(data.description && {
                description: { rich_text: [{ text: { content: data.description } }] },
            }),
        },
    });
}
