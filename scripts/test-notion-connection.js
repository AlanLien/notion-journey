const fs = require('fs');
const path = require('path');
const { Client } = require('@notionhq/client');

function loadEnv() {
    const envPath = path.join(__dirname, '../.env.local');
    if (!fs.existsSync(envPath)) {
        console.error('Error: .env.local file not found!');
        process.exit(1);
    }
    const content = fs.readFileSync(envPath, 'utf8');
    const env = {};
    content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const index = trimmed.indexOf('=');
        if (index === -1) return;
        const key = trimmed.substring(0, index).trim();
        let val = trimmed.substring(index + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.substring(1, val.length - 1);
        }
        env[key] = val;
    });
    return env;
}

async function main() {
    const env = loadEnv();
    const apiKey = env.NOTION_API_KEY;
    const databaseId = env.NOTION_DATABASE_ID;

    if (!apiKey || !databaseId) {
        console.error('Error: NOTION_API_KEY or NOTION_DATABASE_ID is missing in .env.local');
        process.exit(1);
    }

    const notion = new Client({ auth: apiKey });

    try {
        const queryResponse = await notion.dataSources.query({
            data_source_id: databaseId,
        });
        
        console.log(`Queried ${queryResponse.results.length} total items.`);
        
        const expenseItems = queryResponse.results.filter(r => {
            const amountProp = r.properties.amount;
            return amountProp && typeof amountProp.number === 'number';
        });

        console.log(`Found ${expenseItems.length} items with 'amount' property:`);
        expenseItems.forEach((item, index) => {
            console.log(`\n--- Item ${index + 1}: ${item.properties.title?.title?.[0]?.plain_text || 'Untitled'} ---`);
            console.log(`Amount: ${item.properties.amount?.number}`);
            console.log(`Currency: ${item.properties.currency?.select?.name}`);
            console.log(`Type: ${item.properties.type?.select?.name}`);
            
            // Print all property names to see what payer property might be named
            const propNames = Object.keys(item.properties);
            console.log(`All properties present:`, propNames);
            
            // Let's print properties related to "payer", "paid by", "付款人", "支付者", "付款"
            propNames.forEach(pName => {
                const lower = pName.toLowerCase();
                if (lower.includes('pay') || lower.includes('paid') || lower.includes('付款') || lower.includes('支付') || lower.includes('人')) {
                    console.log(`Property [${pName}]:`, JSON.stringify(item.properties[pName]));
                }
            });
        });

    } catch (error) {
        console.error('Error querying Notion:', error.message || error);
    }
}

main();
