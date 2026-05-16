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
    console.log("--- DB DIRECT MESSAGES AUDIT ---");

    // 1. Count convs and messages
    const totalConvsRes = await client.query('SELECT COUNT(*) FROM "VintedConversation";');
    const totalMsgsRes = await client.query('SELECT COUNT(*) FROM "VintedMessage";');
    console.log(`Total Conversations: ${totalConvsRes.rows[0].count}`);
    console.log(`Total Messages: ${totalMsgsRes.rows[0].count}`);

    // 2. Fetch sample conversations
    const sampleConvs = await client.query(`
      SELECT id, "buyerUsername", "lastMessage", "syncedAt"
      FROM "VintedConversation"
      ORDER BY "lastMessageTime" DESC
      LIMIT 5;
    `);

    console.log("\n--- LATEST 5 CONVERSATIONS ---");
    for (const conv of sampleConvs.rows) {
      const msgsForConv = await client.query(`
        SELECT id, "senderUsername", content, "createdAtVinted"
        FROM "VintedMessage"
        WHERE "conversationId" = $1
        ORDER BY "createdAtVinted" ASC;
      `, [conv.id]);

      console.log(`- Conv ID ${conv.id} with @${conv.buyerUsername}`);
      console.log(`  Last Message stored in Conv Header: "${conv.lastMessage}"`);
      console.log(`  Count of actual VintedMessage records in DB: ${msgsForConv.rows.length}`);
      
      if (msgsForConv.rows.length > 0) {
        console.log(`  Sample Message from relation:`);
        msgsForConv.rows.slice(0, 2).forEach(m => {
          console.log(`    * [${m.senderUsername}]: "${m.content}"`);
        });
      } else {
        console.log(`  ⚠️ WARNING: NO MESSAGE RECORDS FOUND FOR THIS CONVERSATION!`);
      }
      console.log("");
    }

  } catch (e) {
    console.error("Query Error:", e.message);
  } finally {
    await client.end();
  }
}

run();
