const { Client } = require('pg');

require("dotenv").config();
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DIRECT_URL ou DATABASE_URL requis (voir .env.example)");
}

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log("Connected to database!\n");

    const accs = await client.query('SELECT id, name, "vintedAccountId", "lastSync" FROM "BotAccount" ORDER BY "lastSync" DESC;');
    console.log(`--- BOT ACCOUNTS (${accs.rows.length}) ---`);
    accs.rows.forEach(r => {
      console.log(`Account: ${r.name} (ID: ${r.vintedAccountId}) | LastSync: ${r.lastSync}`);
    });

    const convs = await client.query('SELECT COUNT(*) FROM "VintedConversation";');
    console.log(`\nTotal VintedConversation count: ${convs.rows[0].count}`);

    const items = await client.query('SELECT COUNT(*) FROM "VintedItemMetrics";');
    console.log(`Total VintedItemMetrics (metrics) count: ${items.rows[0].count}`);

    if (accs.rows.length > 0) {
      const lastSyncTime = accs.rows[0].lastSync;
      console.log(`\nMost recent sync across all accounts was at: ${lastSyncTime}`);
    }
    
    console.log("\n--- END OF REPORT ---");

  } catch (e) {
    console.error("Query Error:", e.message);
  } finally {
    await client.end();
  }
}

run();
