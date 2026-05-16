const { Client } = require('pg');
require('dotenv').config();

async function cleanup() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    await client.query('DELETE FROM "VintedMessage" WHERE id = $1', ['88888888']);
    await client.query('DELETE FROM "VintedConversation" WHERE id = $1', ['99999999']);
    const r = await client.query('SELECT COUNT(*) FROM "VintedConversation"');
    console.log('Conversations after cleanup:', r.rows[0].count);
    await client.end();
}
cleanup();
